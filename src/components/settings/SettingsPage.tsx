import { useState } from "react";
import { FONT, PHASE_COLORS, PHASE_META, HIDE_DONE_OPTIONS } from "../../constants";
import { useTheme } from "../../hooks/useTheme";
import { uid } from "../../lib/utils";
import { saveBoard, saveColumn, saveState, saveUser, deleteUser, deleteColumn, deleteState } from "../../lib/db";
import { Btn } from "../ui/Btn";
import { Toggle } from "../ui/Toggle";
import { Avatar } from "../ui/Avatar";
import { DragList } from "../ui/DragList";
import { UserModal } from "../UserModal";
import { ImprovementBtn } from "../ImprovementBtn";
import type { Board, BoardColumn, BoardState, User } from "../../types";

interface SettingsPageProps {
  board: Board;
  columns: BoardColumn[];
  states: BoardState[];
  users: User[];
  onBack: () => void;
  onUpdateBoard: (b: Board) => void;
  onUpdateColumns: (cols: BoardColumn[]) => void;
  onUpdateStates: (st: BoardState[]) => void;
  onUpdateUsers: (users: User[]) => void;
}

export function SettingsPage({
  board, columns, states, users, onBack,
  onUpdateBoard, onUpdateColumns, onUpdateStates, onUpdateUsers,
}: SettingsPageProps) {
  const T = useTheme();
  const [section, setSection]               = useState("usuarios");
  const [showUserModal, setShowUserModal]   = useState(false);
  const [newStateName, setNewStateName]     = useState("");
  const [newStatePhase, setNewStatePhase]   = useState<"pre" | "work" | "post">("pre");
  const [newCatName, setNewCatName]         = useState("");

  const inp: React.CSSProperties = {
    fontFamily: FONT, fontSize: 13, borderRadius: 8,
    border: `1.5px solid ${T.border}`, padding: "7px 10px",
    backgroundColor: T.bgSoft, color: T.text, outline: "none", boxSizing: "border-box",
  };

  const sections = [
    { id: "usuarios",   label: "Usuarios"          },
    { id: "estados",    label: "Estados"           },
    { id: "columnas",   label: "Columnas"          },
    { id: "categorias", label: "Categorías"        },
    { id: "campos",     label: "Campos del modal"  },
    { id: "acceso",     label: "Acceso"            },
  ];

  const OPT_FIELDS = [
    { id: "tipo",         label: "Tipo"          },
    { id: "categoria",    label: "Categoría"     },
    { id: "dueDate",      label: "Fecha entrega" },
    { id: "bloqueado",    label: "Bloqueado"     },
    { id: "dependencias", label: "Dependencias"  },
    { id: "comentarios",  label: "Comentarios"   },
    { id: "archivos",     label: "Archivos"      },
    { id: "tiempos",      label: "Tiempos"       },
  ];

  const assignedStateIds = new Set(columns.flatMap(c => c.state_ids || []));
  const unassigned = states.filter(s => !assignedStateIds.has(s.id));

  async function addUser(u: User)       { await saveUser(u);    onUpdateUsers([...users, u]); setShowUserModal(false); }
  async function removeUser(id: string) { await deleteUser(id); onUpdateUsers(users.filter(u => u.id !== id)); }
  async function toggleRole(id: string) {
    const updated = users.map(u => u.id === id ? { ...u, role: (u.role === "MASTER" ? "USER" : "MASTER") as "MASTER" | "USER" } : u);
    await saveUser(updated.find(u => u.id === id)!);
    onUpdateUsers(updated);
  }

  async function addState() {
    if (!newStateName.trim()) return;
    const ns: BoardState = { id: uid(), board_id: board.id, name: newStateName.trim(), phase: newStatePhase, is_discard: false, sort_order: states.length };
    await saveState(ns);
    onUpdateStates([...states, ns]);
    setNewStateName("");
  }
  async function removeStateItem(id: string) { await deleteState(id); onUpdateStates(states.filter(s => s.id !== id)); }
  async function updateStatePhase(id: string, phase: "pre" | "work" | "post") {
    const updated = states.map(s => s.id === id ? { ...s, phase } : s);
    await saveState(updated.find(s => s.id === id)!);
    onUpdateStates(updated);
  }
  async function reorderStates(newStates: BoardState[]) {
    const reindexed = newStates.map((s, i) => ({ ...s, sort_order: i }));
    await Promise.all(reindexed.map(saveState));
    onUpdateStates(reindexed);
  }

  async function addColumn() {
    const nc: BoardColumn = { id: uid(), board_id: board.id, name: "Nueva columna", phase: "pre", state_ids: [], wip_limit: 0, is_wip: false, sort_order: columns.length };
    await saveColumn(nc);
    onUpdateColumns([...columns, nc]);
  }
  async function removeCol(id: string)  { await deleteColumn(id); onUpdateColumns(columns.filter(c => c.id !== id)); }
  async function updateCol(id: string, partial: Partial<BoardColumn>) {
    const updated = columns.map(c => c.id === id ? { ...c, ...partial } : c);
    await saveColumn(updated.find(c => c.id === id)!);
    onUpdateColumns(updated);
  }
  async function reorderCols(newCols: BoardColumn[]) {
    const reindexed = newCols.map((c, i) => ({ ...c, sort_order: i }));
    await Promise.all(reindexed.map(saveColumn));
    onUpdateColumns(reindexed);
  }

  async function addCat() {
    if (!newCatName.trim() || board.categories.includes(newCatName.trim())) return;
    const updated = { ...board, categories: [...board.categories, newCatName.trim()] };
    await saveBoard(updated); onUpdateBoard(updated); setNewCatName("");
  }
  async function removeCat(cat: string) {
    const updated = { ...board, categories: board.categories.filter(c => c !== cat) };
    await saveBoard(updated); onUpdateBoard(updated);
  }
  async function reorderCats(cats: string[]) {
    const updated = { ...board, categories: cats };
    await saveBoard(updated); onUpdateBoard(updated);
  }

  async function toggleField(fid: string, on: boolean) {
    const updated = { ...board, visible_fields: on ? [...board.visible_fields, fid] : board.visible_fields.filter(x => x !== fid) };
    await saveBoard(updated); onUpdateBoard(updated);
  }
  async function updateBoardConfig(partial: Partial<Board["board_config"]>) {
    const updated = { ...board, board_config: { ...board.board_config, ...partial } };
    await saveBoard(updated); onUpdateBoard(updated);
  }

  return (
    <div style={{ fontFamily: FONT, backgroundColor: T.bgSoft, minHeight: "100vh", position: "relative" }}>
      {showUserModal && <UserModal onClose={() => setShowUserModal(false)} onSave={addUser} />}

      {/* Header */}
      <div style={{ backgroundColor: T.bg, borderBottom: `1.5px solid ${T.border}`, padding: "13px 22px", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: 600, color: T.textSoft, padding: 0 }}>
          ← Volver
        </button>
        <span style={{ color: T.border }}>|</span>
        <span style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT, color: T.text, flex: 1 }}>Configuración — {board.title}</span>
        <ImprovementBtn
          boardId={board.id}
          userId={users[0]?.id || ""}
          userName={users[0]?.name || ""}
          context="configuración"
        />
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 52px)" }}>
        {/* Sidebar */}
        <div style={{ width: 185, backgroundColor: T.bg, borderRight: `1.5px solid ${T.border}`, padding: "13px 9px", flexShrink: 0 }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              width: "100%", textAlign: "left", fontFamily: FONT, fontSize: 13,
              fontWeight: section === s.id ? 700 : 500, padding: "9px 13px", borderRadius: 10,
              border: "none", backgroundColor: section === s.id ? "#7F77DD18" : "transparent",
              color: section === s.id ? "#7F77DD" : T.textSoft, cursor: "pointer", marginBottom: 3, display: "block",
            }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "22px 26px", overflowY: "auto" }}>

          {section === "usuarios" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: FONT, color: T.text }}>Usuarios</h2>
                <Btn variant="primary" onClick={() => setShowUserModal(true)}>+ Añadir</Btn>
              </div>
              {users.map(u => (
                <div key={u.id} style={{ backgroundColor: T.bg, borderRadius: 13, border: `1.5px solid ${T.border}`, padding: "11px 15px", display: "flex", alignItems: "center", gap: 11, marginBottom: 7 }}>
                  <Avatar user={u} size={36} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, fontFamily: FONT, color: T.text }}>{u.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: T.textSoft, fontFamily: FONT }}>{u.email}</p>
                  </div>
                  <div onClick={() => toggleRole(u.id)} style={{
                    padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    fontFamily: FONT, cursor: "pointer",
                    background: u.role === "MASTER" ? "#7F77DD22" : "#F1EFE8",
                    color: u.role === "MASTER" ? "#7F77DD" : "#5F5E5A",
                    border: `1.5px solid ${u.role === "MASTER" ? "#7F77DD44" : T.border}`,
                  }}>{u.role}</div>
                  <Btn variant="danger" onClick={() => removeUser(u.id)} style={{ fontSize: 11, padding: "4px 9px" }}>Eliminar</Btn>
                </div>
              ))}
            </div>
          )}

          {section === "estados" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, fontFamily: FONT, color: T.text }}>Estados</h2>
              {(["pre", "work", "post"] as const).map(phase => {
                const pm = PHASE_META[phase];
                const phaseStates = states.filter(s => s.phase === phase);
                return (
                  <div key={phase} style={{ marginBottom: 22 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: pm.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT, color: pm.color }}>{pm.label}</span>
                      <div style={{ flex: 1, height: 1, background: pm.color + "33" }} />
                      <span style={{ fontSize: 11, color: T.textSoft, fontFamily: FONT }}>{phaseStates.length} estado{phaseStates.length !== 1 ? "s" : ""}</span>
                    </div>
                    {!phaseStates.length && <p style={{ fontSize: 12, color: T.textSoft, fontFamily: FONT, fontStyle: "italic", marginLeft: 20 }}>Sin estados</p>}
                    <DragList items={phaseStates} keyFn={s => s.id} onReorder={reordered => reorderStates([...states.filter(s => s.phase !== phase), ...reordered])} renderItem={s => (
                      <div style={{ backgroundColor: T.bg, borderRadius: 11, border: `1.5px solid ${pm.color}44`, padding: "9px 13px", display: "flex", alignItems: "center", gap: 9, marginBottom: 6, marginLeft: 20 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: pm.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT, flex: 1, color: T.text }}>{s.name}</span>
                        <select value={s.phase} onChange={e => updateStatePhase(s.id, e.target.value as "pre" | "work" | "post")} style={{ ...inp, width: "auto", fontSize: 11, padding: "3px 7px" }}>
                          {Object.entries(PHASE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <Btn variant="danger" onClick={() => removeStateItem(s.id)} style={{ fontSize: 11, padding: "3px 8px" }}>✕</Btn>
                      </div>
                    )} />
                  </div>
                );
              })}
              <div style={{ backgroundColor: T.bg, borderRadius: 11, border: `1.5px solid ${T.border}`, padding: 13, marginTop: 6 }}>
                <p style={{ margin: "0 0 9px", fontSize: 13, fontWeight: 700, fontFamily: FONT, color: T.text }}>Añadir estado</p>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <input value={newStateName} onChange={e => setNewStateName(e.target.value)} placeholder="Nombre del estado" style={{ ...inp, flex: 1, minWidth: 100 }} />
                  <select value={newStatePhase} onChange={e => setNewStatePhase(e.target.value as "pre" | "work" | "post")} style={{ ...inp, width: "auto" }}>
                    {Object.entries(PHASE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <Btn variant="primary" onClick={addState}>Añadir</Btn>
                </div>
              </div>
            </div>
          )}

          {section === "columnas" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: FONT, color: T.text }}>Columnas</h2>
                <Btn variant="primary" onClick={addColumn}>+ Añadir</Btn>
              </div>
              {unassigned.length > 0 && (
                <div style={{ backgroundColor: "#FAEEDA", border: "1.5px solid #EF9F27", borderRadius: 11, padding: "10px 14px", marginBottom: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#633806", fontFamily: FONT }}>⚠ Estados sin columna: </span>
                  <span style={{ fontSize: 12, color: "#633806", fontFamily: FONT }}>{unassigned.map(s => s.name).join(", ")}</span>
                </div>
              )}
              <DragList items={columns} keyFn={c => c.id} onReorder={reorderCols} renderItem={c => {
                const cc = PHASE_COLORS[c.phase] || "#888";
                return (
                  <div style={{ backgroundColor: T.bg, borderRadius: 13, border: `2px solid ${cc}55`, overflow: "hidden", marginBottom: 10, cursor: "grab" }}>
                    <div style={{ background: cc, padding: "8px 13px", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>⠿</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: FONT, flex: 1 }}>{c.name}</span>
                      <select value={c.phase} onChange={e => updateCol(c.id, { phase: e.target.value as "pre" | "work" | "post" })}
                        style={{ fontSize: 11, borderRadius: 7, border: "none", padding: "2px 6px", backgroundColor: "rgba(255,255,255,0.2)", color: "#fff", fontFamily: FONT, cursor: "pointer", outline: "none" }}>
                        {Object.entries(PHASE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div style={{ padding: "11px 13px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: T.textSoft, fontFamily: FONT, display: "block", marginBottom: 3 }}>Nombre</label>
                          <input value={c.name} onChange={e => updateCol(c.id, { name: e.target.value })} style={{ ...inp, width: "100%" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: T.textSoft, fontFamily: FONT, display: "block", marginBottom: 3 }}>Límite WIP</label>
                          <input type="number" min={0} value={c.wip_limit || 0}
                            onChange={e => updateCol(c.id, { wip_limit: Math.max(0, parseInt(e.target.value) || 0) })}
                            style={{ ...inp, width: 65, textAlign: "center" }} />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: T.textSoft, fontFamily: FONT, display: "block", marginBottom: 5 }}>Estados asignados</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {states.map(s => {
                            const assigned = (c.state_ids || []).includes(s.id);
                            const pm = PHASE_META[s.phase] || PHASE_META.pre;
                            return (
                              <span key={s.id} onClick={() => updateCol(c.id, { state_ids: assigned ? c.state_ids.filter(id => id !== s.id) : [...(c.state_ids || []), s.id] })}
                                style={{ fontSize: 11, fontWeight: 600, fontFamily: FONT, padding: "3px 10px", borderRadius: 20, cursor: "pointer", background: assigned ? pm.color + "22" : T.bgSoft, color: assigned ? pm.color : T.textSoft, border: `1.5px solid ${assigned ? pm.color + "55" : T.border}` }}>
                                {s.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontFamily: FONT, color: T.text, fontWeight: 600 }}>
                          <input type="checkbox" checked={!!c.is_wip} onChange={e => updateCol(c.id, { is_wip: e.target.checked })} />
                          Es WIP
                        </label>
                        {columns.length > 1 && (
                          <Btn variant="danger" onClick={() => removeCol(c.id)} style={{ fontSize: 11, padding: "3px 9px" }}>Eliminar</Btn>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }} />
            </div>
          )}

          {section === "categorias" && (
            <div>
              <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, fontFamily: FONT, color: T.text }}>Categorías</h2>
              <DragList items={board.categories} keyFn={c => c} onReorder={reorderCats} renderItem={c => (
                <div style={{ backgroundColor: T.bg, borderRadius: 10, border: `1.5px solid ${T.border}`, padding: "9px 13px", display: "flex", alignItems: "center", gap: 9, marginBottom: 6, cursor: "grab" }}>
                  <span style={{ fontSize: 14, color: T.textSoft }}>⠿</span>
                  <span style={{ flex: 1, fontSize: 13, fontFamily: FONT, color: T.text }}>{c}</span>
                  <Btn variant="danger" onClick={() => removeCat(c)} style={{ fontSize: 11, padding: "3px 8px" }}>✕</Btn>
                </div>
              )} />
              <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Nueva categoría..." style={{ ...inp, flex: 1 }} />
                <Btn variant="primary" onClick={addCat}>Añadir</Btn>
              </div>
            </div>
          )}

          {section === "campos" && (
            <div>
              <h2 style={{ margin: "0 0 5px", fontSize: 16, fontWeight: 700, fontFamily: FONT, color: T.text }}>Campos visibles en el modal</h2>
              <p style={{ margin: "0 0 16px", fontSize: 12, color: T.textSoft, fontFamily: FONT }}>Título, estado, descripción y creador siempre visibles.</p>
              {OPT_FIELDS.map(f => (
                <div key={f.id} style={{ backgroundColor: T.bg, borderRadius: 11, border: `1.5px solid ${T.border}`, padding: "11px 15px", display: "flex", alignItems: "center", gap: 11, marginBottom: 7 }}>
                  <Toggle on={(board.visible_fields || []).includes(f.id)} onChange={v => toggleField(f.id, v)} />
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT, color: T.text }}>{f.label}</span>
                </div>
              ))}
            </div>
          )}

          {section === "acceso" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, fontFamily: FONT, color: T.text }}>Acceso</h2>
              {([
                { key: "public"       as const, label: "Acceso público por URL",   desc: "Cualquier persona con el enlace puede ver el tablero." },
                { key: "requireLogin" as const, label: "Requiere autenticación",   desc: "Solo los miembros pueden acceder." },
              ]).map(opt => (
                <div key={opt.key} onClick={() => updateBoardConfig({ [opt.key]: !board.board_config?.[opt.key] })}
                  style={{ backgroundColor: T.bg, borderRadius: 13, border: `2px solid ${board.board_config?.[opt.key] ? "#7F77DD" : T.border}`, padding: "13px 15px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, marginBottom: 9 }}>
                  <Toggle on={!!board.board_config?.[opt.key]} onChange={() => {}} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, fontFamily: FONT, color: board.board_config?.[opt.key] ? "#7F77DD" : T.text }}>{opt.label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, fontFamily: FONT, color: T.textSoft }}>{opt.desc}</p>
                  </div>
                </div>
              ))}
              <div style={{ backgroundColor: T.bg, borderRadius: 13, border: `1.5px solid ${T.border}`, padding: "13px 15px", marginTop: 4 }}>
                <p style={{ margin: "0 0 9px", fontSize: 13, fontWeight: 700, fontFamily: FONT, color: T.text }}>Ocultar tareas completadas</p>
                <select value={board.board_config?.hideDoneAfterDays || 0}
                  onChange={e => updateBoardConfig({ hideDoneAfterDays: parseInt(e.target.value) || 0 })}
                  style={{ fontFamily: FONT, fontSize: 13, borderRadius: 8, border: `1.5px solid ${T.border}`, padding: "8px 10px", backgroundColor: T.bgSoft, color: T.text, outline: "none", width: "100%" }}>
                  {HIDE_DONE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
