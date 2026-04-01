/**
 * apply-improvements.mjs
 *
 * Automation script — runs at 4am via Windows Task Scheduler.
 * 1. Queries Supabase for ai_pending improvements
 * 2. Reads affected source files
 * 3. Calls Claude API to apply each improvement
 * 4. Writes changes to disk
 * 5. Marks improvements as applied in Supabase
 * 6. Writes a log to logs/improvements-YYYY-MM-DD.log
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname, relative } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ── Logging ──────────────────────────────────────────────────────────────────

const logDir = resolve(ROOT, "logs");
if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });

const logFile = resolve(
  logDir,
  `improvements-${new Date().toISOString().slice(0, 10)}.log`
);

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  writeFileSync(logFile, line + "\n", { flag: "a" });
}

// ── Env ──────────────────────────────────────────────────────────────────────

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    try {
      return Object.fromEntries(
        readFileSync(resolve(ROOT, name), "utf-8")
          .split("\n")
          .filter((l) => l.trim() && !l.startsWith("#") && l.includes("="))
          .map((l) => {
            const i = l.indexOf("=");
            return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
          })
      );
    } catch {
      /* try next */
    }
  }
  throw new Error("No se encontró .env.local ni .env");
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;
const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  log("ERROR: Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local");
  process.exit(1);
}
if (!ANTHROPIC_KEY) {
  log("ERROR: Falta ANTHROPIC_API_KEY en .env.local");
  process.exit(1);
}

// ── Supabase helpers ─────────────────────────────────────────────────────────

async function fetchPendingImprovements() {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/improvements?status=eq.ai_pending&select=*`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  return r.json();
}

async function markApplied(ids, aiResult) {
  await fetch(
    `${SUPABASE_URL}/rest/v1/improvements?id=in.(${ids.join(",")})`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "applied",
        applied_at: new Date().toISOString(),
        ai_result: aiResult,
      }),
    }
  );
}

// ── File helpers ─────────────────────────────────────────────────────────────

function readSrc(relPath) {
  try {
    return readFileSync(resolve(ROOT, relPath), "utf-8");
  } catch {
    return null;
  }
}

function writeSrc(relPath, content) {
  const abs = resolve(ROOT, relPath);
  writeFileSync(abs, content, "utf-8");
}

function listSrcFiles() {
  const { execSync } = require("child_process");
  // Use find to list all relevant source files
  const out = execSync(
    'find src -type f -name "*.tsx" -o -name "*.ts" | grep -v node_modules',
    { cwd: ROOT, encoding: "utf-8" }
  );
  return out.trim().split("\n").filter(Boolean);
}

// ── Claude API ────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

async function applyImprovementWithClaude(improvement, srcFiles) {
  // Build a map of the most relevant files to send
  const fileContents = srcFiles
    .map((f) => ({ path: f, content: readSrc(f) }))
    .filter((f) => f.content !== null);

  const filesBlock = fileContents
    .map((f) => `=== ${f.path} ===\n${f.content}`)
    .join("\n\n");

  const prompt = `Eres un experto en React + TypeScript. Tienes que aplicar la siguiente mejora al código de la aplicación Kanban Pro.

## Mejora a aplicar

- **ID**: ${improvement.id}
- **Descripción**: ${improvement.description}
- **Origen**: ${improvement.context}
- **Propuesto por**: ${improvement.user_name}

## Código fuente actual

${filesBlock}

## Instrucciones

1. Analiza qué archivo(s) deben modificarse para implementar la mejora.
2. Proporciona los cambios necesarios en el siguiente formato JSON exacto:

\`\`\`json
{
  "changes": [
    {
      "file": "src/ruta/al/archivo.tsx",
      "old": "fragmento exacto a reemplazar (mínimo contexto necesario para ser único)",
      "new": "fragmento de reemplazo"
    }
  ],
  "summary": "Descripción en una frase de lo que se cambió"
}
\`\`\`

Solo responde con el bloque JSON. No añadas explicaciones fuera del JSON.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  // Extract JSON from response
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (!match) throw new Error(`Respuesta inesperada de la API: ${text.slice(0, 200)}`);

  return JSON.parse(match[1]);
}

// ── Main ──────────────────────────────────────────────────────────────────────

log("=== Inicio del proceso de mejoras ===");

const improvements = await fetchPendingImprovements();

if (!Array.isArray(improvements) || improvements.length === 0) {
  log("No hay mejoras pendientes. Proceso terminado.");
  process.exit(0);
}

log(`${improvements.length} mejora(s) pendiente(s) encontradas.`);

// List source files once
const { execSync } = await import("child_process");
const srcFilesRaw = execSync(
  'find src -type f \\( -name "*.tsx" -o -name "*.ts" \\)',
  { cwd: ROOT, encoding: "utf-8" }
);
const srcFiles = srcFilesRaw.trim().split("\n").filter(Boolean);
log(`Archivos fuente disponibles: ${srcFiles.length}`);

const appliedIds = [];
const summaries = [];
let errors = 0;

for (const imp of improvements) {
  log(`Aplicando mejora [${imp.id}]: ${imp.description.slice(0, 80)}...`);
  try {
    const result = await applyImprovementWithClaude(imp, srcFiles);

    let changesApplied = 0;
    for (const change of result.changes) {
      const content = readSrc(change.file);
      if (content === null) {
        log(`  ⚠ Archivo no encontrado: ${change.file}`);
        continue;
      }
      if (!content.includes(change.old)) {
        log(`  ⚠ Fragmento no encontrado en ${change.file}. Saltando.`);
        continue;
      }
      writeSrc(change.file, content.replace(change.old, change.new));
      log(`  ✓ ${change.file} actualizado`);
      changesApplied++;
    }

    if (changesApplied > 0) {
      appliedIds.push(imp.id);
      summaries.push(result.summary);
      log(`  ✓ Mejora aplicada: ${result.summary}`);
    } else {
      log(`  ⚠ No se aplicaron cambios para esta mejora.`);
    }
  } catch (e) {
    log(`  ✗ Error aplicando mejora [${imp.id}]: ${e.message}`);
    errors++;
  }
}

// Mark applied in Supabase
if (appliedIds.length > 0) {
  const aiResult = summaries.join(" | ");
  await markApplied(appliedIds, aiResult);
  log(`✓ ${appliedIds.length} mejora(s) marcadas como aplicadas en Supabase.`);
}

log(`=== Proceso terminado. Aplicadas: ${appliedIds.length}, Errores: ${errors} ===`);
