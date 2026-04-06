import { useState, useRef } from "react";
import { FONT, TASK_TYPES, PHASE_COLORS } from "../constants";
import { useTheme } from "../hooks/useTheme";
import { uid, nowStr, formatDur, histEntry } from "../lib/utils";
import { Btn } from "./ui/Btn";
import { TypeIcon } from "./ui/TypeIcon";
import { Toggle } from "./ui/Toggle";
import { FieldRow } from "./ui/FieldRow";
import { Avatar } from "./ui/Avatar";
import { JustifyModal } from "./JustifyModal";
import { ImprovementBtn } from "./ImprovementBtn";
import type { Card, Board, BoardColumn, BoardState, User } from "../types";

interface CardModalProps {
  card: Card;
  board: Board;
  columns: BoardColumn[];
  states: BoardState[];
  users: User[];
  currentUser: User;
  companyId: string;
  showImprovements: boolean;
  allCards: Card[];
  categories: string[];
  onClose: () => void;
  onSave: (c: Card) => void;
  onSaveCat: (cat: string) => void;
  onOpenCard: (id: string) => void;
}

export function CardModal({
  card, board, columns, states, users, currentUser, companyId, showImprovements, allCards, categories,
  onClose, onSave, onSaveCat, onOpenCard,
}: CardModalProps) {
  const T = useTheme();
  const [data, setData]             = useState<Card>({ ...card });
  const [tab, setTab]               = useState("detalle");
  const [comment, setComment]       = useState("");
  const [newCat, setNewCat]         = useState("");
  const [addingCat, setAddingCat]   = useState(false);
  const [depSearch, setDepSearch]   = useState<Record<string, string>>({});
  const [dirty, setDirty]           = useState(false);
  const [pendingState, setPendingState] = useState<{ stateId: string; colId: string; isDiscard?: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const activeUser = currentUser;
  const creator    = users.find(u => u.id === data.creator_id);
  const curState   = states.find(s => s.id === data.state_id);
  const isDiscard  = curState?.name?.toLowerCase().includes("descart");

  const inp: React.CSSProperties = {
    fontFamily: FONT, fontSize: 13, borderRadius: 10,
    border: `1px solid ${T.border}`, padding: "9px 10px",
    width: "100%", boxSizing: "border-box",
    backgroundColor: T.bgElevated, color: T.text, outline: "none",
  };

  function field(key: keyof Card, val: unknown) {
    if (data[key] === val) return;
    setDirty(true);
    setData(d => ({ ...d, [key]: val, history: [...d.history, histEntry(`"${String(key)}" → "${String(val)}"`, activeUser)] }));
  }

  function requestClose() {
    if (!dirty || window.confirm("Hay cambios sin guardar. ¿Deseas salir sin guardar los cambios?")) {
      onClose();
    }
  }

  function changeState(stateId: string) {
    const ns = states.find(s => s.id === stateId);
    const os = states.find(s => s.id === data.state_id);
    const nc = columns.find(c => (c.state_ids || []).includes(stateId)) || columns[0];
    const needsJustify = (os?.phase === "post" || os?.is_discard) && ns?.phase !== "post" && !ns?.is_discard;
    if (needsJustify) { setPendingState({ stateId, colId: nc?.id || data.col_id }); return; }
    if (ns?.is_discard && !os?.is_discard) { setPendingState({ stateId, colId: nc?.id || data.col_id, isDiscard: true }); return; }
    applyState(stateId, nc?.id || data.col_id, null);
  }

  function applyState(stateId: string, colId: string, reason: string | null) {
    const ns = states.find(s => s.id === stateId);
    const hist = [...data.history];
    if (reason) hist.push(histEntry(`Justificación: ${reason}`, activeUser));
    hist.push(histEntry(`Estado → "${ns?.name}"`, activeUser));
    setData(d => ({
      ...d, stateId, state_id: stateId, col_id: colId,
      completed_at: ns?.phase === "post" && !ns?.is_discard ? new Date().toISOString() : (ns?.phase !== "post" ? null : d.completed_at),
      discarded_at: ns?.is_discard ? new Date().toISOString() : null,
      history: hist,
    }));
    setPendingState(null);
  }

  function addComment() {
    if (!comment.trim()) return;
    setData(d => ({
      ...d,
      comments: [...d.comments, { id: uid(), author: activeUser?.name || "Usuario", ts: nowStr(), text: comment.trim() }],
      history: [...d.history, histEntry("Comentario añadido", activeUser)],
    }));
    setComment("");
  }

  function addFile(e: React.ChangeEvent<HTMLInputElement>) {
    const names = Array.from(e.target.files || []).map(f => f.name);
    if (!names.length) return;
    setData(d => ({
      ...d,
      attachments: [...d.attachments, ...names],
      history: [...d.history, histEntry(`Archivo: ${names.join(", ")}`, activeUser)],
    }));
  }

  function addDep(cardId: string, key: "depends_on" | "blocked_by") {
    if ((data[key] || []).includes(cardId)) return;
    const dep = allCards.find(c => c.id === cardId);
    setData(d => ({
      ...d,
      [key]: [...(d[key] || []), cardId],
      history: [...d.history, histEntry(`Dependencia (${key}): ${dep?.card_id}`, activeUser)],
    }));
  }

  function removeDep(cardId: string, key: "depends_on" | "blocked_by") {
    setData(d => ({ ...d, [key]: (d[key] || []).filter(id => id !== cardId) }));
  }

  const allTabs = [
    { id: "detalle",      label: "Detalle",     always: true },
    { id: "dependencias", label: "Dependencias"              },
    { id: "comentarios",  label: "Comentarios", count: data.comments.length },
    { id: "archivos",     label: "Archivos",    count: data.attachments.length },
    { id: "tiempos",      label: "Tiempos"                  },
    { id: "historial",    label: "Historial",   count: data.history.length, always: true },
  ].filter(t => t.always || (board.visible_fields || []).includes(t.id));


  return (
    <div style={{
      position: "absolute", inset: 0, backgroundColor: T.overlay,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      zIndex: 500, padding: "32px 20px", overflowY: "auto",
    }}>
      {pendingState && (
        <JustifyModal
          title={pendingState.isDiscard ? "Descartar tarea" : "Reabrir tarea"}
          onConfirm={r => applyState(pendingState.stateId, pendingState.colId, r)}
          onCancel={() => setPendingState(null)}
        />
      )}
      <div style={{
        backgroundColor: T.bgSidebar, borderRadius: 24, border: `1px solid ${T.borderMed}`,
        width: "100%", maxWidth: 620,
        boxShadow: T.shadowLg, flexShrink: 0, backdropFilter: "blur(18px)",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 20px 0", borderBottom: `1.5px solid ${T.border}`, borderRadius: "20px 20px 0 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
            <TypeIcon type={data.type} size={22} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.textSoft, fontFamily: FONT, textDecoration: isDiscard ? "line-through" : "none" }}>
                  {data.card_id}
                </span>
                {data.blocked && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: T.dangerSoft, color: T.danger, fontFamily: FONT }}>BLOQ.</span>}
                {isDiscard    && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: T.dangerSoft, color: T.danger,  fontFamily: FONT }}>DESCARTADO</span>}
              </div>
              <input value={data.title} onChange={e => field("title", e.target.value)} style={{
                fontFamily: FONT, fontSize: 15, fontWeight: 700, padding: "4px 0",
                border: "none", backgroundColor: "transparent", width: "100%",
                color: T.text, outline: "none", textDecoration: isDiscard ? "line-through" : "none",
              }} />
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
              {showImprovements && (
                <ImprovementBtn
                  companyId={companyId}
                  boardId={board.id}
                  userId={currentUser.id}
                  userName={currentUser.name}
                  context={`tarjeta:${data.card_id}`}
                />
              )}
              <Btn variant="primary" onClick={() => onSave(data)}>Guardar</Btn>
              <Btn variant="outline" onClick={requestClose} style={{ padding: "7px 11px" }}>✕</Btn>
            </div>
          </div>
          {/* Tabs */}
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {allTabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: "7px 12px",
                border: "none", borderBottom: tab === t.id ? `2.5px solid ${T.accent}` : "2.5px solid transparent",
                backgroundColor: "transparent", color: tab === t.id ? T.accent : T.textSoft,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              }}>
                {t.label}
                {(t.count ?? 0) > 0 && (
                  <span style={{ fontSize: 9, background: tab === t.id ? T.accentSoft : T.bgElevated, color: tab === t.id ? T.accent : T.textSoft, borderRadius: 20, padding: "1px 5px", fontWeight: 700 }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 20px", borderRadius: "0 0 20px 20px" }}>

          {tab === "detalle" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(board.visible_fields || []).includes("tipo") && (
                <FieldRow label="Tipo">
                  <select value={data.type} onChange={e => field("type", e.target.value)} style={inp}>
                    {Object.entries(TASK_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </FieldRow>
              )}
              <FieldRow label="Estado">
                <select value={data.state_id || ""} onChange={e => changeState(e.target.value)} style={inp}>
                  {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </FieldRow>
              {(board.visible_fields || []).includes("categoria") && (
                <FieldRow label="Categoría">
                  {addingCat ? (
                    <div style={{ display: "flex", gap: 6, flex: 1 }}>
                      <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Nueva categoría..." style={{ ...inp, flex: 1 }} autoFocus
                        onKeyDown={e => { if (e.key === "Enter" && newCat.trim()) { onSaveCat(newCat.trim()); field("category", newCat.trim()); setAddingCat(false); setNewCat(""); } }} />
                      <Btn variant="primary" onClick={() => { if (newCat.trim()) { onSaveCat(newCat.trim()); field("category", newCat.trim()); setAddingCat(false); setNewCat(""); } }} style={{ padding: "6px 10px", fontSize: 12 }}>OK</Btn>
                      <Btn variant="ghost" onClick={() => setAddingCat(false)} style={{ padding: "6px 8px" }}>✕</Btn>
                    </div>
                  ) : (
                    <select value={data.category} onChange={e => { if (e.target.value === "__new__") { setAddingCat(true); } else { field("category", e.target.value); } }} style={inp}>
                      {categories.map(c => <option key={c}>{c}</option>)}
                      <option value="__new__">+ Añadir categoría...</option>
                    </select>
                  )}
                </FieldRow>
              )}
              {(board.visible_fields || []).includes("dueDate") && (
                <FieldRow label="Fecha entrega">
                  <input type="date" value={data.due_date} onChange={e => field("due_date", e.target.value)} style={inp} />
                </FieldRow>
              )}
              <FieldRow label="Creador">
                <select value={data.creator_id || ""} onChange={e => field("creator_id", e.target.value)} style={inp}>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </FieldRow>
              {(board.visible_fields || []).includes("bloqueado") && (
                <FieldRow label="Bloqueado">
                  <Toggle on={data.blocked} onChange={v => {
                    setData(d => ({ ...d, blocked: v, history: [...d.history, histEntry(`Bloqueado ${v ? "activado" : "desactivado"}`, activeUser)] }));
                  }} />
                  <span style={{ fontSize: 13, fontFamily: FONT, color: T.text, marginLeft: 10 }}>{data.blocked ? "Sí" : "No"}</span>
                </FieldRow>
              )}
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.textSoft, fontFamily: FONT, display: "block", marginBottom: 6 }}>Descripción</span>
                <textarea value={data.description} onChange={e => field("description", e.target.value)} rows={3}
                  style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
              </div>
              {creator && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <Avatar user={creator} size={22} />
                  <span style={{ fontSize: 12, color: T.textSoft, fontFamily: FONT }}>Creado por {creator.name}</span>
                </div>
              )}
            </div>
          )}

          {tab === "dependencias" && (
            <div>
              {(["depends_on", "blocked_by"] as const).map(key => {
                const label = key === "depends_on" ? "Dependo de" : "Dependen de mí";
                const hint  = key === "depends_on" ? "Esta tarea espera a que las siguientes terminen." : "Las siguientes esperan a que esta termine.";
                return (
                  <div key={key} style={{ marginBottom: 20 }}>
                    <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 700, fontFamily: FONT, color: T.text }}>{label}</p>
                    <p style={{ margin: "0 0 10px", fontSize: 11, fontFamily: FONT, color: T.textSoft }}>{hint}</p>
                    {!(data[key] || []).length && (
                      <p style={{ fontSize: 12, color: T.textSoft, fontFamily: FONT, fontStyle: "italic" }}>Sin dependencias</p>
                    )}
                    {(data[key] || []).map(depId => {
                      const dep = allCards.find(c => c.id === depId);
                      if (!dep) return null;
                      const resolved = !!dep.completed_at;
                      return (
                        <div key={depId} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          backgroundColor: T.bgSoft, borderRadius: 10, padding: "8px 12px", marginBottom: 6,
                          border: `1.5px solid ${resolved ? "#1D9E75" : "#E24B4A"}44`,
                        }}>
                          <span style={{ color: resolved ? "#1D9E75" : "#E24B4A", fontSize: 13, fontWeight: 700 }}>{resolved ? "✓" : "⏳"}</span>
                          <TypeIcon type={dep.type} size={13} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: T.textSoft, fontFamily: FONT }}>{dep.card_id}</span>
                          <span onClick={() => onOpenCard(dep.id)} style={{ fontSize: 13, fontFamily: FONT, color: "#7F77DD", flex: 1, cursor: "pointer", textDecoration: "underline" }}>
                            {dep.title}
                          </span>
                          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: resolved ? "#E1F5EE" : "#FCEBEB", color: resolved ? "#085041" : "#c0392b", fontFamily: FONT, fontWeight: 700 }}>
                            {resolved ? "Resuelta" : "Pendiente"}
                          </span>
                          <button onClick={() => removeDep(depId, key)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textSoft, fontSize: 14 }}>✕</button>
                        </div>
                      );
                    })}
                    {(() => {
                      const q = depSearch[key] || "";
                      const results = q.length > 1
                        ? allCards.filter(c => c.id !== data.id && (c.title.toLowerCase().includes(q.toLowerCase()) || c.card_id.toLowerCase().includes(q.toLowerCase())))
                        : [];
                      return (
                        <>
                          <input value={q} onChange={e => setDepSearch(s => ({ ...s, [key]: e.target.value }))} placeholder="Buscar tarea..." style={{ ...inp, marginTop: 8 }} />
                          {results.length > 0 && (
                            <div style={{ backgroundColor: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, marginTop: 4, overflow: "hidden" }}>
                              {results.slice(0, 5).map(c => (
                                <div key={c.id} onClick={() => { addDep(c.id, key); setDepSearch(s => ({ ...s, [key]: "" })); }}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", borderBottom: `1px solid ${T.border}` }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = T.bgSoft)}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                            <TypeIcon type={c.type} size={13} />
                            <span style={{ fontSize: 11, color: T.textSoft, fontFamily: FONT, fontWeight: 600 }}>{c.card_id}</span>
                            <span style={{ fontSize: 13, fontFamily: FONT, color: T.text, flex: 1 }}>{c.title}</span>
                                {c.completed_at && <span style={{ fontSize: 10, color: "#1D9E75" }}>✓</span>}
                              </div>
                            ))}
                          </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}

          {tab === "comentarios" && (
            <div>
              {!data.comments.length && (
                <p style={{ textAlign: "center", padding: "20px 0", color: T.textSoft, fontSize: 13, fontFamily: FONT }}>Sin comentarios.</p>
              )}
              {data.comments.map(c => (
                <div key={c.id} style={{ backgroundColor: T.bgSoft, borderRadius: 12, padding: "10px 13px", marginBottom: 9, border: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", gap: 7, marginBottom: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: FONT, color: T.text }}>{c.author}</span>
                    <span style={{ fontSize: 11, color: T.textSoft, fontFamily: FONT }}>{c.ts}</span>
                  </div>
                  <p style={{ fontSize: 13, margin: 0, fontFamily: FONT, color: T.text, lineHeight: 1.5 }}>{c.text}</p>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input value={comment} onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addComment()}
                  placeholder="Escribe un comentario..." style={{ ...inp, flex: 1 }} />
                <Btn variant="primary" onClick={addComment} style={{ whiteSpace: "nowrap" }}>Añadir</Btn>
              </div>
            </div>
          )}

          {tab === "archivos" && (
            <div>
              {!data.attachments.length && (
                <p style={{ textAlign: "center", padding: "20px 0", color: T.textSoft, fontSize: 13, fontFamily: FONT }}>Sin archivos.</p>
              )}
              {data.attachments.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, backgroundColor: T.bgSoft, borderRadius: 10, padding: "9px 12px", marginBottom: 7, border: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 15 }}>📄</span>
                  <span style={{ fontSize: 13, fontFamily: FONT, color: T.text }}>{a}</span>
                </div>
              ))}
              <input ref={fileRef} type="file" multiple onChange={addFile} style={{ display: "none" }} />
              <button onClick={() => fileRef.current?.click()} style={{
                fontFamily: FONT, fontSize: 12, fontWeight: 600, marginTop: 8, padding: "9px 18px",
                borderRadius: 10, border: `2px dashed ${T.borderMed}`,
                backgroundColor: "transparent", color: T.textSoft, cursor: "pointer", width: "100%",
              }}>
                + Adjuntar archivo
              </button>
            </div>
          )}

          {tab === "tiempos" && (() => {
            const tpc = { ...data.time_per_col };
            tpc[data.col_id] = (tpc[data.col_id] || 0) + (Date.now() - (data.col_since || Date.now()));
            const total = Object.values(tpc).reduce((a, b) => a + b, 0);
            const all = columns.map(c => ({ c, ms: tpc[c.id] || 0 })).filter(x => x.ms > 0).sort((a, b) => b.ms - a.ms);
            return (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.textSoft, fontFamily: FONT }}>Tiempo total</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: T.text, fontFamily: FONT }}>{formatDur(total)}</span>
                </div>
                {all.map(({ c, ms }) => {
                  const pct = total > 0 ? (ms / total) * 100 : 0;
                  const cc = PHASE_COLORS[c.phase] || "#888";
                  return (
                    <div key={c.id} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: cc }} />
                          <span style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT, color: T.text }}>{c.name}</span>
                          {c.id === data.col_id && (
                            <span style={{ fontSize: 9, background: "#7F77DD22", color: "#7F77DD", borderRadius: 20, padding: "1px 5px", fontFamily: FONT, fontWeight: 700 }}>actual</span>
                          )}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: FONT, color: T.text }}>{formatDur(ms)}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 4, backgroundColor: T.bgSoft, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 4, background: cc, width: `${pct}%`, transition: "width .4s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {tab === "historial" && (
            <div>
              {[...data.history].reverse().map((h, i) => {
                const u = users.find(x => x.id === h.userId);
                return (
                  <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${T.border}`, alignItems: "flex-start" }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#7F77DD", marginTop: 6, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, margin: "0 0 3px", fontFamily: FONT, color: T.text, lineHeight: 1.5 }}>{h.msg}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        {u && <Avatar user={u} size={16} />}
                        <span style={{ fontSize: 11, color: T.textSoft, fontFamily: FONT }}>{h.userName || "Sistema"} · {h.ts}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
