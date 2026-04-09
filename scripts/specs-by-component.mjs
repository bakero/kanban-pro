import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const specsDir = path.join(root, ".specify", "specs");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else if (e.isFile() && e.name === "spec.md") files.push(full);
  }
  return files;
}

function extractComponent(content) {
  const match = content.match(/\*\*Componente principal\*\*:\s*(.+)/i);
  return match ? match[1].trim() : "(sin componente)";
}

const specs = fs.existsSync(specsDir) ? walk(specsDir) : [];
const grouped = new Map();

for (const file of specs) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const content = fs.readFileSync(file, "utf8");
  const comp = extractComponent(content);
  if (!grouped.has(comp)) grouped.set(comp, []);
  grouped.get(comp).push(rel);
}

for (const [comp, files] of grouped) {
  console.log(`\n${comp}`);
  files.forEach(f => console.log(`- ${f}`));
}
