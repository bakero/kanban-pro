import { useState, useEffect } from "react";
import { FONT } from "../constants";
import { useTheme } from "../hooks/useTheme";
import { loadImprovements, markImprovementsAiPending } from "../lib/db";
import { Btn } from "./ui/Btn";
import type { Improvement, User } from "../types";

interface ImprovementsPageProps {
  boardId: string;
  currentUser: User;
  onBack: () => void;
}

export function ImprovementsPage({ boardId, currentUser, onBack }: ImprovementsPageProps) {
  const T = useTheme();
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"pending" | "history">("pending");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);

  const isAdmin = currentUser.role === "MASTER";

  useEffect(() => {
    loadImprovements(boardId).then(imps => {
      setImprovements(imps);
      setLoading(false);
    });
  }, [boardId]);

  const pending = improvements.filter(i => i.status === "pending" || i.status === "ai_pending");
  const applied = improvements.filter(i => i.status === "applied");

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const pendingOnly = pending.filter(i => i.status === "pending");
    if (selected.size === pendingOnly.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingOnly.map(i => i.id)));
    }
  }

  async function handleApply() {
    const selectedImps = pending.filter(i => selected.has(i.id));
    if (!selectedImps.length) return;
    setApplying(true);
    await markImprovementsAiPending(selectedImps.map(i => i.id));
    setImprovements(imps => imps.map(i => selected.has(i.id) ? { ...i, status: "ai_pending" } : i));
    // In dev: also write the file as a convenience for Claude Code
    // In production this fetch will fail silently — improvements are in Supabase either way
    saveMejoras(selectedImps).catch(() => undefined);
    setAppliedCount(selectedImps.length);
    setSelected(new Set());
    setApplying(false);
  }

  function buildMejorasContent(imps: Improvement[]): string {
    const now = new Date().toISOString();
    const lines: string[] = [
      `# Mejoras Pendientes — Kanban Pro`,
      `Generado: ${now}`,
      ``,
    ];
    imps.forEach((imp, i) => {
      lines.push(`---`, ``);
      lines.push(`## Mejora ${i + 1} (ID: \`${imp.id}\`)`);
      lines.push(`- **Usuario**: ${imp.user_name}`);
      lines.push(`- **Fecha**: ${new Date(imp.created_at).toLocaleString("es-ES")}`);
      lines.push(`- **Origen**: ${imp.context}`);
      lines.push(`- **Descripción**: ${imp.description}`);
      lines.push(``);
    });
    lines.push(`---`, ``);
    lines.push(`## Instrucciones para Claude Code`, ``);
    lines.push(`Cuando el usuario diga "aplica las mejoras pendientes":`);
    lines.push(`1. Lee cada mejora de este archivo`);
    lines.push(`2. Analiza qué cambio de código es necesario`);
    lines.push(`3. Aplica los cambios en el código fuente`);
    lines.push(`4. Marca las mejoras como aplicadas en Supabase ejecutando:`);
    lines.push(``);
    lines.push("```bash");
    lines.push(`export $(grep -v '^#' .env | xargs)`);
    lines.push(`curl -X PATCH "$VITE_SUPABASE_URL/rest/v1/improvements?status=eq.ai_pending" \\`);
    lines.push(`  -H "apikey: $VITE_SUPABASE_ANON_KEY" \\`);
    lines.push(`  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \\`);
    lines.push(`  -H "Content-Type: application/json" \\`);
    lines.push(`  -d '{"status":"applied","applied_at":"${now}","ai_result":"[Resumen de cambios realizados]"}'`);
    lines.push("```");
    lines.push(`5. Llama a \`/api/delete-file\` con \`{"filename":"MEJORAS_PENDIENTES.md"}\` o elimina el archivo manualmente`);
    return lines.join("\n");
  }

  async function saveMejoras(imps: Improvement[]) {
    const content = buildMejorasContent(imps);
    await fetch("/api/write-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: "MEJORAS_PENDIENTES.md", content }),
    });
  }

  function statusBadge(status: Improvement["status"]) {
    if (status === "ai_pending") return (
      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#FEF3CD", color: "#BA7517", fontFamily: FONT }}>
        ENVIADA A IA
      </span>
    );
    return (
      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: T.bgSoft, color: T.textSoft, fontFamily: FONT }}>
        PENDIENTE
      </span>
    );
  }

  return (
    <div style={{ fontFamily: FONT, backgroundColor: T.bgSoft, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ backgroundColor: T.bg, borderBottom: `1.5px solid ${T.border}`, padding: "13px 22px", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: 600, color: T.textSoft, padding: 0 }}>
          ← Volver
        </button>
        <span style={{ color: T.border }}>|</span>
        <span style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT, color: T.text }}>💡 Mejoras propuestas</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setView(v => v === "pending" ? "history" : "pending")}
          style={{
            fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: "5px 13px",
            borderRadius: 9, border: `1.5px solid ${T.border}`,
            backgroundColor: "transparent", color: T.textSoft, cursor: "pointer",
          }}
        >
          {view === "pending" ? "📋 Ver historial" : "⏳ Ver pendientes"}
        </button>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "22px 20px" }}>
        {loading ? (
          <p style={{ color: T.textSoft, fontFamily: FONT, textAlign: "center", padding: 40 }}>Cargando…</p>
        ) : view === "pending" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: FONT }}>
                Pendientes ({pending.length})
              </span>
              {isAdmin && pending.filter(i => i.status === "pending").length > 0 && (
                <button onClick={toggleAll}
                  style={{ fontSize: 11, fontWeight: 600, fontFamily: FONT, background: "none", border: "none", color: "#7F77DD", cursor: "pointer", padding: 0 }}>
                  {selected.size === pending.filter(i => i.status === "pending").length ? "Deseleccionar todo" : "Seleccionar todo"}
                </button>
              )}
            </div>

            {pending.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: T.textSoft, fontFamily: FONT, fontSize: 13 }}>
                No hay mejoras pendientes
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pending.map(imp => {
                  const canSelect = isAdmin && imp.status === "pending";
                  const isSelected = selected.has(imp.id);
                  return (
                    <div
                      key={imp.id}
                      onClick={() => canSelect && toggleSelect(imp.id)}
                      style={{
                        backgroundColor: T.bgCard || T.bg,
                        border: `1.5px solid ${isSelected ? "#7F77DD" : T.border}`,
                        borderRadius: 12, padding: "12px 14px",
                        cursor: canSelect ? "pointer" : "default",
                        display: "flex", gap: 12, alignItems: "flex-start",
                        backgroundColor: isSelected ? "#7F77DD0D" : (T.bgCard || T.bg),
                      } as React.CSSProperties}
                    >
                      {canSelect && (
                        <div style={{
                          width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                          border: `2px solid ${isSelected ? "#7F77DD" : T.borderMed}`,
                          backgroundColor: isSelected ? "#7F77DD" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {isSelected && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: "0 0 5px", fontSize: 13, color: T.text, fontFamily: FONT }}>
                          {imp.description}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {statusBadge(imp.status)}
                          <span style={{ fontSize: 10, color: T.textSoft, fontFamily: FONT }}>
                            {imp.user_name}
                          </span>
                          <span style={{ fontSize: 10, color: T.textSoft, fontFamily: FONT }}>
                            {new Date(imp.created_at).toLocaleString("es-ES")}
                          </span>
                          <span style={{ fontSize: 10, color: T.textSoft, fontFamily: FONT, background: T.bgSoft, borderRadius: 20, padding: "1px 7px" }}>
                            {imp.context}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {isAdmin && selected.size > 0 && (
              <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                <Btn
                  variant="primary"
                  onClick={handleApply}
                  disabled={applying}
                  style={{ padding: "9px 22px", fontSize: 13 }}
                >
                  {applying ? "Enviando…" : `⚡ APLICAR (${selected.size} seleccionadas)`}
                </Btn>
              </div>
            )}

            {appliedCount > 0 && (
              <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "#1D9E750D", border: "1.5px solid #1D9E7533" }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1D9E75", fontFamily: FONT }}>
                  ✓ {appliedCount} mejora{appliedCount > 1 ? "s" : ""} enviada{appliedCount > 1 ? "s" : ""} al equipo de desarrollo
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: T.textSoft, fontFamily: FONT }}>
                  Se aplicarán en la próxima versión. En el entorno de desarrollo escribe <strong>aplica las mejoras pendientes</strong> en Claude Code.
                </p>
              </div>
            )}

            {isAdmin && !appliedCount && pending.some(i => i.status === "ai_pending") && (
              <p style={{ marginTop: 12, fontSize: 11, color: T.textSoft, fontFamily: FONT, textAlign: "right" }}>
                Hay mejoras pendientes de aplicar. Escribe <strong>aplica las mejoras pendientes</strong> en Claude Code.
              </p>
            )}
          </>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: FONT }}>
                Historial de mejoras aplicadas ({applied.length})
              </span>
            </div>

            {applied.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: T.textSoft, fontFamily: FONT, fontSize: 13 }}>
                Aún no se han aplicado mejoras
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {applied.map(imp => (
                  <div key={imp.id} style={{
                    backgroundColor: T.bgCard || T.bg,
                    border: `1.5px solid ${T.border}`,
                    borderLeft: "4px solid #1D9E75",
                    borderRadius: 12, padding: "12px 14px",
                  }}>
                    <p style={{ margin: "0 0 5px", fontSize: 13, fontWeight: 600, color: T.text, fontFamily: FONT }}>
                      {imp.description}
                    </p>
                    {imp.ai_result && (
                      <p style={{ margin: "0 0 6px", fontSize: 12, color: "#1D9E75", fontFamily: FONT, background: "#1D9E750D", borderRadius: 8, padding: "6px 10px" }}>
                        🤖 {imp.ai_result}
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#D4F5EA", color: "#1D9E75", fontFamily: FONT }}>
                        APLICADA
                      </span>
                      <span style={{ fontSize: 10, color: T.textSoft, fontFamily: FONT }}>{imp.user_name}</span>
                      <span style={{ fontSize: 10, color: T.textSoft, fontFamily: FONT }}>
                        Propuesta: {new Date(imp.created_at).toLocaleString("es-ES")}
                      </span>
                      {imp.applied_at && (
                        <span style={{ fontSize: 10, color: T.textSoft, fontFamily: FONT }}>
                          Aplicada: {new Date(imp.applied_at).toLocaleString("es-ES")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
