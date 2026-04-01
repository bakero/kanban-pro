// ============================================================
// KANBAN PRO — App.tsx
// Stack: React + TypeScript + Vite + Supabase
// Despliegue: Vercel (frontend) + Supabase (PostgreSQL)
//
// SETUP:
//   1. npm create vite@latest kanban-pro -- --template react-ts
//   2. cd kanban-pro && npm install @supabase/supabase-js
//   3. Copia este fichero a src/App.tsx
//   4. Crea .env.local con:
//        VITE_SUPABASE_URL=https://xxx.supabase.co
//        VITE_SUPABASE_ANON_KEY=eyJ...
//   5. npm run dev
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase client ──────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ─── Types ────────────────────────────────────────────────
interface User {
  id: string; name: string; email: string;
  initials: string; color: string; role: "MASTER" | "USER";
}
interface BoardState {
  id: string; board_id: string; name: string;
  phase: "pre" | "work" | "post"; is_discard: boolean; sort_order: number;
}
interface BoardColumn {
  id: string; board_id: string; name: string;
  phase: "pre" | "work" | "post"; state_ids: string[];
  wip_limit: number; is_wip: boolean; sort_order: number;
}
interface HistoryEntry { ts: string; msg: string; userId?: string; userName?: string; }
interface Comment { id: string; author: string; ts: string; text: string; }
interface Card {
  id: string; card_id: string; board_id: string;
  col_id: string; state_id: string; title: string;
  description: string; type: "tarea" | "epica" | "iniciativa" | "bug";
  category: string; due_date: string; blocked: boolean;
  creator_id: string; attachments: string[]; comments: Comment[];
  history: HistoryEntry[]; depends_on: string[]; blocked_by: string[];
  time_per_col: Record<string, number>; col_since: number;
  created_at: string; completed_at: string | null; discarded_at: string | null;
}
interface Board {
  id: string; title: string; prefix: string; card_seq: number;
  board_config: { public: boolean; requireLogin: boolean; hideDoneAfterDays: number };
  visible_fields: string[]; categories: string[];
}
interface AppData {
  users: User[]; boards: Board[];
  states: BoardState[]; columns: BoardColumn[]; cards: Card[];
}

// ─── Constants ────────────────────────────────────────────
const FONT = "'Montserrat', sans-serif";
const PHASE_COLORS: Record<string, string> = { pre: "#888780", work: "#378ADD", post: "#1D9E75" };
const TASK_TYPES = {
  tarea:      { label: "Tarea",      color: "#1D9E75", icon: "✓" },
  epica:      { label: "Épica",      color: "#7F77DD", icon: "⬡" },
  iniciativa: { label: "Iniciativa", color: "#2c2c2e", icon: "◈" },
  bug:        { label: "Bug",        color: "#E24B4A", icon: "⚡" },
};
const PHASE_META = {
  pre:  { label: "Pre-trabajo",  color: "#888780" },
  work: { label: "En trabajo",   color: "#378ADD" },
  post: { label: "Post-trabajo", color: "#1D9E75" },
};
const HIDE_DONE_OPTIONS = [
  { value: 0,  label: "Nunca ocultar" },
  { value: 1,  label: "Después de 1 día" },
  { value: 3,  label: "Después de 3 días" },
  { value: 5,  label: "Después de 5 días" },
  { value: 7,  label: "Después de 7 días" },
  { value: 15, label: "Después de 15 días" },
  { value: 21, label: "Después de 21 días" },
  { value: 30, label: "Después de 30 días" },
];
const DEFAULT_VISIBLE = ["tipo","categoria","estado","dueDate","creador","bloqueado","descripcion","dependencias","comentarios","archivos","tiempos","historial"];
const isDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
const T = {
  bg:        isDark ? "#1c1c1e" : "#ffffff",
  bgSoft:    isDark ? "#2c2c2e" : "#f4f4f5",
  bgCard:    isDark ? "#242426" : "#ffffff",
  text:      isDark ? "#f2f2f7" : "#1c1c1e",
  textSoft:  isDark ? "#98989f" : "#6b6b72",
  border:    isDark ? "#3a3a3c" : "#d1d1d6",
  borderMed: isDark ? "#48484a" : "#bcbcc0",
  iconBtn:   isDark ? "#f2f2f7" : "#1c1c1e",
};

// ─── Utils ────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const nowStr = () => new Date().toLocaleString("es-ES");
const daysSince = (ts: number) => Math.max(0, Math.floor((Date.now() - ts) / 86400000));
const formatDur = (ms: number) => {
  if (!ms || ms <= 0) return "—";
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`; if (h > 0) return `${h}h ${m}m`; return `${m}m`;
};
const nameInitials = (n: string) => n.trim().split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");
const strColor = (s: string) => {
  const COLS = ["#7F77DD","#1D9E75","#D85A30","#378ADD","#D4537E","#BA7517","#639922","#E24B4A"];
  let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return COLS[Math.abs(h) % COLS.length];
};
const genPrefix = (name: string) => {
  const w = name.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  if (!w.length) return "KAN"; if (w.length === 1) return w[0].slice(0, 6).padEnd(3, "X");
  return w.map(x => x[0]).join("").slice(0, 6).padEnd(3, "X");
};
const histEntry = (msg: string, user?: User): HistoryEntry => ({
  ts: nowStr(), msg, userId: user?.id, userName: user?.name || "Sistema",
});

// ─── Seed data ────────────────────────────────────────────
const SEED_USERS: User[] = [
  { id: "u1", name: "Ana García",  email: "ana@empresa.com",    initials: "AG", color: "#7F77DD", role: "MASTER" },
  { id: "u2", name: "Carlos Ruiz", email: "carlos@empresa.com", initials: "CR", color: "#1D9E75", role: "USER"   },
  { id: "u3", name: "María López", email: "maria@empresa.com",  initials: "ML", color: "#D85A30", role: "USER"   },
  { id: "u4", name: "Pedro Sanz",  email: "pedro@empresa.com",  initials: "PS", color: "#378ADD", role: "USER"   },
];
const SEED_BOARD: Board = {
  id: "b1", title: "Mi tablero", prefix: "MIT", card_seq: 5,
  board_config: { public: false, requireLogin: true, hideDoneAfterDays: 0 },
  visible_fields: DEFAULT_VISIBLE,
  categories: ["Frontend","Backend","Diseño","QA","DevOps","Producto"],
};
const SEED_STATES: BoardState[] = [
  { id: "st1", board_id: "b1", name: "Pendiente",  phase: "pre",  is_discard: false, sort_order: 0 },
  { id: "st2", board_id: "b1", name: "En curso",   phase: "work", is_discard: false, sort_order: 1 },
  { id: "st3", board_id: "b1", name: "Revisión",   phase: "work", is_discard: false, sort_order: 2 },
  { id: "st4", board_id: "b1", name: "Completado", phase: "post", is_discard: false, sort_order: 3 },
  { id: "st5", board_id: "b1", name: "Descartado", phase: "post", is_discard: true,  sort_order: 4 },
];
const SEED_COLS: BoardColumn[] = [
  { id: "c1", board_id: "b1", name: "Por hacer",   phase: "pre",  state_ids: ["st1"],       wip_limit: 0, is_wip: false, sort_order: 0 },
  { id: "c2", board_id: "b1", name: "En progreso", phase: "work", state_ids: ["st2","st3"], wip_limit: 3, is_wip: true,  sort_order: 1 },
  { id: "c3", board_id: "b1", name: "Hecho",       phase: "post", state_ids: ["st4"],       wip_limit: 0, is_wip: false, sort_order: 2 },
  { id: "c4", board_id: "b1", name: "Descartado",  phase: "post", state_ids: ["st5"],       wip_limit: 0, is_wip: false, sort_order: 3 },
];
function makeSeedCard(id: string, cardId: string, colId: string, stateId: string, extra: Partial<Card>): Card {
  return {
    id, card_id: cardId, board_id: "b1", col_id: colId, state_id: stateId,
    title: "Nueva tarjeta", type: "tarea", category: "Frontend",
    due_date: "", blocked: false, creator_id: "u1",
    description: "", attachments: [], comments: [],
    history: [histEntry("Tarjeta creada", SEED_USERS[0])],
    depends_on: [], blocked_by: [], time_per_col: {},
    col_since: Date.now(), created_at: new Date().toISOString(),
    completed_at: null, discarded_at: null,
    ...extra,
  };
}
const SEED_CARDS: Card[] = [
  makeSeedCard("k1","MIT-001","c1","st1",{ title:"Diseñar nueva homepage", type:"tarea", category:"Diseño", due_date:"2026-04-01", creator_id:"u3", description:"Rediseño completo.", created_at: new Date(Date.now()-172800000).toISOString(), col_since: Date.now()-172800000 }),
  makeSeedCard("k2","MIT-002","c1","st1",{ title:"API de autenticación",   type:"bug",   category:"Backend",due_date:"2026-03-20", creator_id:"u2", description:"OAuth2 con JWT.", blocked:true, created_at: new Date(Date.now()-86400000).toISOString(), col_since: Date.now()-86400000 }),
  makeSeedCard("k3","MIT-003","c2","st2",{ title:"Tests unitarios pago",   type:"tarea", category:"QA",    due_date:"2026-03-25", creator_id:"u4", description:"80% cobertura.", created_at: new Date(Date.now()-259200000).toISOString(), col_since: Date.now()-259200000 }),
  makeSeedCard("k4","MIT-004","c3","st4",{ title:"Deploy producción v2.1", type:"epica", category:"DevOps",due_date:"2026-03-20", creator_id:"u1", description:"Despliegue v2.1.", created_at: new Date(Date.now()-518400000).toISOString(), col_since: Date.now()-3600000, completed_at: new Date(Date.now()-3600000).toISOString(), time_per_col:{"c1":86400000,"c2":172800000} }),
];

// ─── DB helpers ───────────────────────────────────────────
async function seedIfEmpty() {
  const { data } = await supabase.from("boards").select("id").limit(1);
  if (data && data.length > 0) return;
  await supabase.from("users").upsert(SEED_USERS);
  await supabase.from("boards").upsert([SEED_BOARD]);
  await supabase.from("board_states").upsert(SEED_STATES);
  await supabase.from("board_columns").upsert(SEED_COLS);
  await supabase.from("cards").upsert(SEED_CARDS);
}

async function loadAll(boardId: string): Promise<AppData> {
  const [u, b, s, c, k] = await Promise.all([
    supabase.from("users").select("*"),
    supabase.from("boards").select("*"),
    supabase.from("board_states").select("*").eq("board_id", boardId).order("sort_order"),
    supabase.from("board_columns").select("*").eq("board_id", boardId).order("sort_order"),
    supabase.from("cards").select("*").eq("board_id", boardId),
  ]);
  return {
    users:   (u.data || []) as User[],
    boards:  (b.data || []) as Board[],
    states:  (s.data || []) as BoardState[],
    columns: (c.data || []) as BoardColumn[],
    cards:   (k.data || []) as Card[],
  };
}

async function saveCard(card: Card) {
  const { error } = await supabase.from("cards").upsert({
    id: card.id, card_id: card.card_id, board_id: card.board_id,
    col_id: card.col_id, state_id: card.state_id, title: card.title,
    description: card.description, type: card.type, category: card.category,
    due_date: card.due_date || null, blocked: card.blocked, creator_id: card.creator_id,
    attachments: card.attachments, comments: card.comments, history: card.history,
    depends_on: card.depends_on, blocked_by: card.blocked_by,
    time_per_col: card.time_per_col, col_since: card.col_since,
    completed_at: card.completed_at, discarded_at: card.discarded_at,
  });
  if (error) console.error("saveCard error:", error);
}

async function saveBoard(board: Board) {
  const { error } = await supabase.from("boards").upsert(board);
  if (error) console.error("saveBoard error:", error);
}

async function saveColumn(col: BoardColumn) {
  const { error } = await supabase.from("board_columns").upsert(col);
  if (error) console.error("saveColumn error:", error);
}

async function saveState(st: BoardState) {
  const { error } = await supabase.from("board_states").upsert(st);
  if (error) console.error("saveState error:", error);
}

async function saveUser(user: User) {
  const { error } = await supabase.from("users").upsert(user);
  if (error) console.error("saveUser error:", error);
}

async function deleteUser(id: string) {
  await supabase.from("users").delete().eq("id", id);
}

async function deleteColumn(id: string) {
  await supabase.from("board_columns").delete().eq("id", id);
  await supabase.from("cards").delete().eq("col_id", id);
}

async function deleteState(id: string) {
  await supabase.from("board_states").delete().eq("id", id);
}

// ─── UI Primitives ────────────────────────────────────────
function Avatar({ user, size = 28 }: { user: User; size?: number }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:user.color+"22", border:`2px solid ${user.color}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.34, fontWeight:700, color:user.color, flexShrink:0, fontFamily:FONT }}>
      {user.initials}
    </div>
  );
}

function Btn({ children, onClick, variant = "outline", style: s = {}, disabled = false }: { children: React.ReactNode; onClick?: () => void; variant?: string; style?: React.CSSProperties; disabled?: boolean }) {
  const vars: Record<string, React.CSSProperties> = {
    primary:  { background:"#7F77DD", color:"#fff", border:"none" },
    danger:   { background:"#fdecea", color:"#c0392b", border:"none" },
    outline:  { background:T.bg, color:T.textSoft, border:`1.5px solid ${T.border}` },
    ghost:    { background:"transparent", color:T.textSoft, border:"none" },
    filter:   { background:T.bgSoft, color:T.textSoft, border:`1.5px solid ${T.border}` },
    filterOn: { background:"#7F77DD18", color:"#7F77DD", border:"1.5px solid #7F77DD" },
  };
  return (
    <button disabled={disabled} onClick={onClick}
      style={{ fontFamily:FONT, fontSize:13, fontWeight:700, padding:"7px 14px", borderRadius:10, cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.5:1, ...vars[variant], ...s }}>
      {children}
    </button>
  );
}

function TypeIcon({ type, size = 16 }: { type: string; size?: number }) {
  const t = TASK_TYPES[type as keyof typeof TASK_TYPES] || TASK_TYPES.tarea;
  return (
    <span style={{ width:size, height:size, borderRadius:4, background:t.color+"22", border:`1.5px solid ${t.color}55`, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:size*0.6, color:t.color, flexShrink:0, fontWeight:700 }}>
      {t.icon}
    </span>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!on)} style={{ width:42, height:24, borderRadius:12, backgroundColor:on?"#7F77DD":T.bgSoft, border:`1.5px solid ${T.border}`, cursor:"pointer", position:"relative", transition:"background .2s", flexShrink:0 }}>
      <div style={{ width:18, height:18, borderRadius:"50%", backgroundColor:"#fff", position:"absolute", top:2, left:on?20:2, transition:"left .2s", boxShadow:"0 1px 4px rgba(0,0,0,.25)" }} />
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
      <span style={{ fontSize:12, fontWeight:600, color:T.textSoft, width:105, flexShrink:0, fontFamily:FONT }}>{label}</span>
      <div style={{ flex:1, display:"flex", alignItems:"center" }}>{children}</div>
    </div>
  );
}

// ─── DragList ─────────────────────────────────────────────
function DragList<T>({ items, renderItem, onReorder, keyFn }: { items: T[]; renderItem: (item: T, i: number) => React.ReactNode; onReorder: (items: T[]) => void; keyFn: (item: T) => string }) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver]         = useState<number | null>(null);
  function drop(toIdx: number) {
    if (dragging === null || dragging === toIdx) return;
    const next = [...items]; const [moved] = next.splice(dragging, 1); next.splice(toIdx, 0, moved);
    onReorder(next); setDragging(null); setOver(null);
  }
  return (
    <div>
      {items.map((item, i) => (
        <div key={keyFn(item)} draggable
          onDragStart={e => { e.stopPropagation(); setDragging(i); }}
          onDragOver={e  => { e.preventDefault(); setOver(i); }}
          onDrop={e      => { e.preventDefault(); drop(i); }}
          onDragEnd={()  => { setDragging(null); setOver(null); }}
          style={{ opacity:dragging===i?0.4:1, outline:over===i&&dragging!==i?`2px solid #7F77DD`:"none", borderRadius:10 }}>
          {renderItem(item, i)}
        </div>
      ))}
    </div>
  );
}

// ─── JustifyModal ─────────────────────────────────────────
function JustifyModal({ title, onConfirm, onCancel }: { title: string; onConfirm: (r: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState("");
  const inp: React.CSSProperties = { fontFamily:FONT, fontSize:13, borderRadius:8, border:`1.5px solid ${T.border}`, padding:"8px 10px", width:"100%", boxSizing:"border-box", backgroundColor:T.bgSoft, color:T.text, outline:"none", resize:"vertical" };
  return (
    <div style={{ position:"absolute", inset:0, backgroundColor:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:800, padding:20 }}>
      <div style={{ backgroundColor:T.bg, borderRadius:20, border:`2px solid #E24B4A`, width:"100%", maxWidth:420, padding:24 }}>
        <p style={{ margin:"0 0 8px", fontSize:15, fontWeight:700, fontFamily:FONT, color:"#c0392b" }}>⚠ {title}</p>
        <p style={{ margin:"0 0 14px", fontSize:13, fontFamily:FONT, color:T.textSoft }}>Es obligatorio indicar el motivo:</p>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} placeholder="Escribe la justificación..." style={inp} />
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <Btn variant="outline" onClick={onCancel} style={{ flex:1 }}>Cancelar</Btn>
          <Btn variant="danger" onClick={() => reason.trim() && onConfirm(reason)} disabled={!reason.trim()} style={{ flex:1 }}>Confirmar</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── UserModal ────────────────────────────────────────────
function UserModal({ onClose, onSave }: { onClose: () => void; onSave: (u: User) => void }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [role, setRole] = useState<"MASTER"|"USER">("USER"); const [err, setErr] = useState("");
  const inp: React.CSSProperties = { fontFamily:FONT, fontSize:13, borderRadius:8, border:`1.5px solid ${T.border}`, padding:"9px 12px", width:"100%", boxSizing:"border-box", backgroundColor:T.bgSoft, color:T.text, outline:"none" };
  function submit() {
    if (!name.trim()) { setErr("Nombre obligatorio."); return; }
    if (!email.trim() || !email.includes("@")) { setErr("Email inválido."); return; }
    onSave({ id:uid(), name:name.trim(), email:email.trim(), initials:nameInitials(name), color:strColor(email), role });
  }
  return (
    <div style={{ position:"absolute", inset:0, backgroundColor:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:700, padding:20 }}>
      <div style={{ backgroundColor:T.bg, borderRadius:20, border:`2px solid ${T.borderMed}`, width:"100%", maxWidth:380, padding:22 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <span style={{ fontSize:15, fontWeight:700, fontFamily:FONT, color:T.text }}>Nuevo usuario</span>
          <Btn variant="ghost" onClick={onClose} style={{ padding:"2px 8px" }}>✕</Btn>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
          <div><label style={{ fontSize:11, fontWeight:700, color:T.textSoft, fontFamily:FONT, display:"block", marginBottom:4 }}>Nombre</label><input value={name} onChange={e => setName(e.target.value)} style={inp} /></div>
          <div><label style={{ fontSize:11, fontWeight:700, color:T.textSoft, fontFamily:FONT, display:"block", marginBottom:4 }}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} /></div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:T.textSoft, fontFamily:FONT, display:"block", marginBottom:7 }}>Rol</label>
            <div style={{ display:"flex", gap:8 }}>
              {(["MASTER","USER"] as const).map(r => (
                <div key={r} onClick={() => setRole(r)} style={{ flex:1, padding:"9px 11px", borderRadius:11, border:`2px solid ${role===r?"#7F77DD":T.border}`, backgroundColor:role===r?"#7F77DD11":T.bgSoft, cursor:"pointer" }}>
                  <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:700, fontFamily:FONT, color:role===r?"#7F77DD":T.text }}>{r}</p>
                  <p style={{ margin:0, fontSize:11, fontFamily:FONT, color:T.textSoft }}>{r==="MASTER"?"Configura todo":"Crea y mueve"}</p>
                </div>
              ))}
            </div>
          </div>
          {err && <p style={{ margin:0, fontSize:12, color:"#c0392b", fontFamily:FONT }}>{err}</p>}
          <div style={{ display:"flex", gap:8, marginTop:4 }}>
            <Btn variant="outline" onClick={onClose} style={{ flex:1 }}>Cancelar</Btn>
            <Btn variant="primary" onClick={submit} style={{ flex:1 }}>Añadir</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NewKanbanModal ───────────────────────────────────────
function NewKanbanModal({ onClose, onCreate }: { onClose: () => void; onCreate: (title: string, mode: string) => void }) {
  const [mode, setMode] = useState("empty"); const [title, setTitle] = useState("");
  const inp: React.CSSProperties = { fontFamily:FONT, fontSize:13, borderRadius:8, border:`1.5px solid ${T.border}`, padding:"9px 12px", width:"100%", boxSizing:"border-box", backgroundColor:T.bgSoft, color:T.text, outline:"none" };
  return (
    <div style={{ position:"absolute", inset:0, backgroundColor:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:700, padding:20 }}>
      <div style={{ backgroundColor:T.bg, borderRadius:20, border:`2px solid ${T.borderMed}`, width:"100%", maxWidth:380, padding:22 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <span style={{ fontSize:15, fontWeight:700, fontFamily:FONT, color:T.text }}>Nuevo Kanban</span>
          <Btn variant="ghost" onClick={onClose} style={{ padding:"2px 8px" }}>✕</Btn>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div><label style={{ fontSize:11, fontWeight:700, color:T.textSoft, fontFamily:FONT, display:"block", marginBottom:4 }}>Título</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Proyecto Alpha" style={inp} /></div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:T.textSoft, fontFamily:FONT, display:"block", marginBottom:7 }}>Configuración</label>
            <div style={{ display:"flex", gap:8 }}>
              {[["empty","Vacío","Desde cero"],["copy","Copiar actual","Mismas columnas y estados"]].map(([m,l,d]) => (
                <div key={m} onClick={() => setMode(m)} style={{ flex:1, padding:"9px 11px", borderRadius:11, border:`2px solid ${mode===m?"#7F77DD":T.border}`, backgroundColor:mode===m?"#7F77DD11":T.bgSoft, cursor:"pointer" }}>
                  <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:700, fontFamily:FONT, color:mode===m?"#7F77DD":T.text }}>{l}</p>
                  <p style={{ margin:0, fontSize:11, fontFamily:FONT, color:T.textSoft }}>{d}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:4 }}>
            <Btn variant="outline" onClick={onClose} style={{ flex:1 }}>Cancelar</Btn>
            <Btn variant="primary" onClick={() => title.trim() && onCreate(title.trim(), mode)} disabled={!title.trim()} style={{ flex:1 }}>Crear</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── KCard ────────────────────────────────────────────────
function KCard({ card, columns, states, users, allCards, onOpen, onDragStart }: { card: Card; columns: BoardColumn[]; states: BoardState[]; users: User[]; allCards: Card[]; onOpen: (id: string) => void; onDragStart: (e: React.DragEvent, id: string) => void }) {
  const creator   = users.find(u => u.id === card.creator_id);
  const due       = card.due_date ? new Date(card.due_date) : null;
  const overdue   = due && due < new Date();
  const col       = columns.find(c => c.id === card.col_id);
  const colColor  = PHASE_COLORS[col?.phase || "pre"];
  const state     = states.find(s => s.id === card.state_id);
  const isDiscard = state?.name?.toLowerCase().includes("descart");
  const daysInCol = daysSince(card.col_since || Date.now());
  const deps      = (card.depends_on || []).map(id => allCards.find(c => c.id === id)).filter(Boolean) as Card[];
  const hasDeps   = deps.length > 0;
  const allResolved = hasDeps && deps.every(d => !!d.completed_at);

  return (
    <div draggable onDragStart={e => { e.stopPropagation(); onDragStart(e, card.id); }} onClick={() => onOpen(card.id)}
      style={{ backgroundColor:T.bgCard, borderRadius:12, border:`1.5px solid ${T.border}`, borderLeft:`4px solid ${colColor}`, padding:"10px 12px", cursor:"pointer", userSelect:"none", marginBottom:8, boxSizing:"border-box", transition:"transform .15s,box-shadow .15s", opacity:isDiscard?0.65:1 }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 5px 16px rgba(0,0,0,${isDark?0.3:0.1})`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
        <TypeIcon type={card.type} size={15} />
        <span style={{ fontSize:10, fontWeight:700, color:T.textSoft, fontFamily:FONT, flex:1, textDecoration:isDiscard?"line-through":"none" }}>{card.card_id}</span>
        {card.blocked && <span style={{ fontSize:9, fontWeight:700, color:"#c0392b", background:"#fdecea", borderRadius:20, padding:"1px 5px", fontFamily:FONT }}>BLOQ.</span>}
        {creator && <Avatar user={creator} size={20} />}
      </div>
      <p style={{ fontSize:13, fontWeight:600, color:T.text, margin:"0 0 8px", lineHeight:1.4, fontFamily:FONT, textDecoration:isDiscard?"line-through":"none" }}>{card.title}</p>
      <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
        <span style={{ fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:20, background:T.bgSoft, color:T.textSoft, fontFamily:FONT }}>{card.category}</span>
        <div style={{ flex:1 }} />
        {hasDeps && <span style={{ fontSize:12, fontWeight:700, color:allResolved?"#1D9E75":"#E24B4A" }} title={deps.map(d => d.title).join(", ")}>⬆</span>}
        {card.due_date && <span style={{ fontSize:10, fontWeight:600, fontFamily:FONT, background:overdue?"#E24B4A":T.bgSoft, color:overdue?"#fff":T.textSoft, padding:"2px 6px", borderRadius:8 }}>{card.due_date}</span>}
        <div style={{ width:22, height:22, borderRadius:"50%", backgroundColor:daysInCol>7?"#E24B4A":daysInCol>3?"#BA7517":"#7F77DD", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"#fff", flexShrink:0 }} title={`${daysInCol} días en este estado`}>{daysInCol}</div>
      </div>
    </div>
  );
}

// ─── CardModal ────────────────────────────────────────────
function CardModal({ card, board, columns, states, users, allCards, categories, onClose, onSave, onSaveCat, onOpenCard }: {
  card: Card; board: Board; columns: BoardColumn[]; states: BoardState[]; users: User[]; allCards: Card[]; categories: string[];
  onClose: () => void; onSave: (c: Card) => void; onSaveCat: (cat: string) => void; onOpenCard: (id: string) => void;
}) {
  const [data, setData]         = useState<Card>({ ...card });
  const [tab, setTab]           = useState("detalle");
  const [comment, setComment]   = useState("");
  const [newCat, setNewCat]     = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [depSearch, setDepSearch] = useState("");
  const [pendingState, setPendingState] = useState<{ stateId: string; colId: string; isDiscard?: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const activeUser = users[0];
  const creator    = users.find(u => u.id === data.creator_id);
  const curState   = states.find(s => s.id === data.state_id);
  const isDiscard  = curState?.name?.toLowerCase().includes("descart");
  const inp: React.CSSProperties = { fontFamily:FONT, fontSize:13, borderRadius:8, border:`1.5px solid ${T.border}`, padding:"8px 10px", width:"100%", boxSizing:"border-box", backgroundColor:T.bgSoft, color:T.text, outline:"none" };

  function field(key: keyof Card, val: unknown) {
    const old = data[key];
    if (old === val) return;
    setData(d => ({ ...d, [key]: val, history: [...d.history, histEntry(`"${String(key)}" → "${String(val)}"`, activeUser)] }));
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
    setData(d => ({ ...d, stateId, state_id: stateId, col_id: colId,
      completed_at: ns?.phase === "post" && !ns?.is_discard ? new Date().toISOString() : (ns?.phase !== "post" ? null : d.completed_at),
      discarded_at: ns?.is_discard ? new Date().toISOString() : null,
      history: hist }));
    setPendingState(null);
  }
  function addComment() {
    if (!comment.trim()) return;
    setData(d => ({ ...d, comments: [...d.comments, { id:uid(), author:activeUser?.name||"Usuario", ts:nowStr(), text:comment.trim() }], history: [...d.history, histEntry("Comentario añadido", activeUser)] }));
    setComment("");
  }
  function addFile(e: React.ChangeEvent<HTMLInputElement>) {
    const names = Array.from(e.target.files || []).map(f => f.name); if (!names.length) return;
    setData(d => ({ ...d, attachments: [...d.attachments, ...names], history: [...d.history, histEntry(`Archivo: ${names.join(", ")}`, activeUser)] }));
  }
  function addDep(cardId: string, key: "depends_on" | "blocked_by") {
    if ((data[key] || []).includes(cardId)) return;
    const dep = allCards.find(c => c.id === cardId);
    setData(d => ({ ...d, [key]: [...(d[key] || []), cardId], history: [...d.history, histEntry(`Dependencia (${key}): ${dep?.card_id}`, activeUser)] }));
  }
  function removeDep(cardId: string, key: "depends_on" | "blocked_by") {
    setData(d => ({ ...d, [key]: (d[key] || []).filter(id => id !== cardId) }));
  }

  const allTabs = [
    { id:"detalle",      label:"Detalle",      always:true },
    { id:"dependencias", label:"Dependencias"              },
    { id:"comentarios",  label:"Comentarios",  count:data.comments.length },
    { id:"archivos",     label:"Archivos",     count:data.attachments.length },
    { id:"tiempos",      label:"Tiempos"                  },
    { id:"historial",    label:"Historial",    count:data.history.length, always:true },
  ].filter(t => t.always || (board.visible_fields || []).includes(t.id));

  const searchCards = depSearch.length > 1
    ? allCards.filter(c => c.id !== data.id && (c.title.toLowerCase().includes(depSearch.toLowerCase()) || c.card_id.toLowerCase().includes(depSearch.toLowerCase())))
    : [];

  return (
    <div style={{ position:"absolute", inset:0, backgroundColor:"rgba(0,0,0,0.55)", display:"flex", alignItems:"flex-start", justifyContent:"center", zIndex:500, padding:"32px 20px", overflowY:"auto" }}>
      {pendingState && (
        <JustifyModal title={pendingState.isDiscard ? "Descartar tarea" : "Reabrir tarea"}
          onConfirm={r => applyState(pendingState.stateId, pendingState.colId, r)}
          onCancel={() => setPendingState(null)} />
      )}
      <div style={{ backgroundColor:T.bg, borderRadius:20, border:`2px solid ${T.borderMed}`, width:"100%", maxWidth:620, boxShadow:`0 24px 64px rgba(0,0,0,${isDark?0.6:0.25})`, flexShrink:0 }}>
        {/* Header */}
        <div style={{ padding:"18px 20px 0", borderBottom:`1.5px solid ${T.border}`, backgroundColor:T.bg, borderRadius:"20px 20px 0 0" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:12 }}>
            <TypeIcon type={data.type} size={22} />
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                <span style={{ fontSize:11, fontWeight:700, color:T.textSoft, fontFamily:FONT, textDecoration:isDiscard?"line-through":"none" }}>{data.card_id}</span>
                {data.blocked && <span style={{ fontSize:9, fontWeight:700, padding:"1px 7px", borderRadius:20, background:"#fdecea", color:"#c0392b", fontFamily:FONT }}>BLOQ.</span>}
                {isDiscard  && <span style={{ fontSize:9, fontWeight:700, padding:"1px 7px", borderRadius:20, background:"#FCEBEB", color:"#E24B4A",  fontFamily:FONT }}>DESCARTADO</span>}
              </div>
              <input value={data.title} onChange={e => field("title", e.target.value)}
                style={{ fontFamily:FONT, fontSize:15, fontWeight:700, padding:"4px 0", border:"none", backgroundColor:"transparent", width:"100%", color:T.text, outline:"none", textDecoration:isDiscard?"line-through":"none" }} />
            </div>
            <div style={{ display:"flex", gap:6, flexShrink:0 }}>
              <Btn variant="primary" onClick={() => onSave(data)}>Guardar</Btn>
              <Btn variant="outline" onClick={onClose} style={{ padding:"7px 11px" }}>✕</Btn>
            </div>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap" }}>
            {allTabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ fontFamily:FONT, fontSize:12, fontWeight:600, padding:"7px 12px", border:"none", borderBottom:tab===t.id?"2.5px solid #7F77DD":"2.5px solid transparent", backgroundColor:"transparent", color:tab===t.id?"#7F77DD":T.textSoft, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                {t.label}
                {t.count! > 0 && <span style={{ fontSize:9, background:tab===t.id?"#7F77DD22":T.bgSoft, color:tab===t.id?"#7F77DD":T.textSoft, borderRadius:20, padding:"1px 5px", fontWeight:700 }}>{t.count}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:"18px 20px", backgroundColor:T.bg, borderRadius:"0 0 20px 20px" }}>
          {tab === "detalle" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {(board.visible_fields||[]).includes("tipo") && (
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
              {(board.visible_fields||[]).includes("categoria") && (
                <FieldRow label="Categoría">
                  {addingCat ? (
                    <div style={{ display:"flex", gap:6, flex:1 }}>
                      <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Nueva categoría..." style={{ ...inp, flex:1 }} autoFocus
                        onKeyDown={e => { if (e.key==="Enter" && newCat.trim()) { onSaveCat(newCat.trim()); field("category", newCat.trim()); setAddingCat(false); setNewCat(""); } }} />
                      <Btn variant="primary" onClick={() => { if (newCat.trim()) { onSaveCat(newCat.trim()); field("category", newCat.trim()); setAddingCat(false); setNewCat(""); } }} style={{ padding:"6px 10px", fontSize:12 }}>OK</Btn>
                      <Btn variant="ghost" onClick={() => setAddingCat(false)} style={{ padding:"6px 8px" }}>✕</Btn>
                    </div>
                  ) : (
                    <select value={data.category} onChange={e => { if (e.target.value === "__new__") { setAddingCat(true); } else { field("category", e.target.value); } }} style={inp}>
                      {categories.map(c => <option key={c}>{c}</option>)}
                      <option value="__new__">+ Añadir categoría...</option>
                    </select>
                  )}
                </FieldRow>
              )}
              {(board.visible_fields||[]).includes("dueDate") && (
                <FieldRow label="Fecha entrega"><input type="date" value={data.due_date} onChange={e => field("due_date", e.target.value)} style={inp} /></FieldRow>
              )}
              <FieldRow label="Creador">
                <select value={data.creator_id || ""} onChange={e => field("creator_id", e.target.value)} style={inp}>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </FieldRow>
              {(board.visible_fields||[]).includes("bloqueado") && (
                <FieldRow label="Bloqueado">
                  <Toggle on={data.blocked} onChange={v => { setData(d => ({ ...d, blocked:v, history:[...d.history, histEntry(`Bloqueado ${v?"activado":"desactivado"}`, activeUser)] })); }} />
                  <span style={{ fontSize:13, fontFamily:FONT, color:T.text, marginLeft:10 }}>{data.blocked ? "Sí" : "No"}</span>
                </FieldRow>
              )}
              <div>
                <span style={{ fontSize:12, fontWeight:600, color:T.textSoft, fontFamily:FONT, display:"block", marginBottom:6 }}>Descripción</span>
                <textarea value={data.description} onChange={e => field("description", e.target.value)} rows={3} style={{ ...inp, resize:"vertical", lineHeight:1.6 }} />
              </div>
            </div>
          )}

          {tab === "dependencias" && (
            <div>
              {(["depends_on", "blocked_by"] as const).map(key => {
                const label = key === "depends_on" ? "Dependo de" : "Dependen de mí";
                const hint  = key === "depends_on" ? "Esta tarea espera a que las siguientes terminen." : "Las siguientes esperan a que esta termine.";
                return (
                  <div key={key} style={{ marginBottom:20 }}>
                    <p style={{ margin:"0 0 3px", fontSize:13, fontWeight:700, fontFamily:FONT, color:T.text }}>{label}</p>
                    <p style={{ margin:"0 0 10px", fontSize:11, fontFamily:FONT, color:T.textSoft }}>{hint}</p>
                    {!(data[key] || []).length && <p style={{ fontSize:12, color:T.textSoft, fontFamily:FONT, fontStyle:"italic" }}>Sin dependencias</p>}
                    {(data[key] || []).map(depId => {
                      const dep = allCards.find(c => c.id === depId); if (!dep) return null;
                      const resolved = !!dep.completed_at;
                      return (
                        <div key={depId} style={{ display:"flex", alignItems:"center", gap:8, backgroundColor:T.bgSoft, borderRadius:10, padding:"8px 12px", marginBottom:6, border:`1.5px solid ${resolved?"#1D9E75":"#E24B4A"}44` }}>
                          <span style={{ color:resolved?"#1D9E75":"#E24B4A", fontSize:13, fontWeight:700 }}>{resolved?"✓":"⏳"}</span>
                          <TypeIcon type={dep.type} size={13} />
                          <span style={{ fontSize:11, fontWeight:700, color:T.textSoft, fontFamily:FONT }}>{dep.card_id}</span>
                          <span onClick={() => onOpenCard(dep.id)} style={{ fontSize:13, fontFamily:FONT, color:"#7F77DD", flex:1, cursor:"pointer", textDecoration:"underline" }}>{dep.title}</span>
                          <span style={{ fontSize:10, padding:"2px 7px", borderRadius:20, background:resolved?"#E1F5EE":"#FCEBEB", color:resolved?"#085041":"#c0392b", fontFamily:FONT, fontWeight:700 }}>{resolved?"Resuelta":"Pendiente"}</span>
                          <button onClick={() => removeDep(depId, key)} style={{ background:"none", border:"none", cursor:"pointer", color:T.textSoft, fontSize:14 }}>✕</button>
                        </div>
                      );
                    })}
                    <input value={depSearch} onChange={e => setDepSearch(e.target.value)} placeholder="Buscar tarea..." style={{ ...inp, marginTop:8 }} />
                    {searchCards.length > 0 && (
                      <div style={{ backgroundColor:T.bg, border:`1.5px solid ${T.border}`, borderRadius:10, marginTop:4, overflow:"hidden" }}>
                        {searchCards.slice(0, 5).map(c => (
                          <div key={c.id} onClick={() => { addDep(c.id, key); setDepSearch(""); }}
                            style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", cursor:"pointer", borderBottom:`1px solid ${T.border}` }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = T.bgSoft)}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                            <TypeIcon type={c.type} size={13} />
                            <span style={{ fontSize:11, color:T.textSoft, fontFamily:FONT, fontWeight:600 }}>{c.card_id}</span>
                            <span style={{ fontSize:13, fontFamily:FONT, color:T.text, flex:1 }}>{c.title}</span>
                            {c.completed_at && <span style={{ fontSize:10, color:"#1D9E75" }}>✓</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === "comentarios" && (
            <div>
              {!data.comments.length && <p style={{ textAlign:"center", padding:"20px 0", color:T.textSoft, fontSize:13, fontFamily:FONT }}>Sin comentarios.</p>}
              {data.comments.map(c => (
                <div key={c.id} style={{ backgroundColor:T.bgSoft, borderRadius:12, padding:"10px 13px", marginBottom:9, border:`1px solid ${T.border}` }}>
                  <div style={{ display:"flex", gap:7, marginBottom:4, alignItems:"center" }}>
                    <span style={{ fontSize:12, fontWeight:700, fontFamily:FONT, color:T.text }}>{c.author}</span>
                    <span style={{ fontSize:11, color:T.textSoft, fontFamily:FONT }}>{c.ts}</span>
                  </div>
                  <p style={{ fontSize:13, margin:0, fontFamily:FONT, color:T.text, lineHeight:1.5 }}>{c.text}</p>
                </div>
              ))}
              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === "Enter" && addComment()} placeholder="Escribe un comentario..." style={{ ...inp, flex:1 }} />
                <Btn variant="primary" onClick={addComment} style={{ whiteSpace:"nowrap" }}>Añadir</Btn>
              </div>
            </div>
          )}

          {tab === "archivos" && (
            <div>
              {!data.attachments.length && <p style={{ textAlign:"center", padding:"20px 0", color:T.textSoft, fontSize:13, fontFamily:FONT }}>Sin archivos.</p>}
              {data.attachments.map((a, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:9, backgroundColor:T.bgSoft, borderRadius:10, padding:"9px 12px", marginBottom:7, border:`1px solid ${T.border}` }}>
                  <span style={{ fontSize:15 }}>📄</span>
                  <span style={{ fontSize:13, fontFamily:FONT, color:T.text }}>{a}</span>
                </div>
              ))}
              <input ref={fileRef} type="file" multiple onChange={addFile} style={{ display:"none" }} />
              <button onClick={() => fileRef.current?.click()} style={{ fontFamily:FONT, fontSize:12, fontWeight:600, marginTop:8, padding:"9px 18px", borderRadius:10, border:`2px dashed ${T.borderMed}`, backgroundColor:"transparent", color:T.textSoft, cursor:"pointer", width:"100%" }}>+ Adjuntar archivo</button>
            </div>
          )}

          {tab === "tiempos" && (() => {
            const tpc = { ...data.time_per_col };
            tpc[data.col_id] = (tpc[data.col_id] || 0) + (Date.now() - (data.col_since || Date.now()));
            const total = Object.values(tpc).reduce((a, b) => a + b, 0);
            const all = columns.map(c => ({ c, ms: tpc[c.id] || 0 })).filter(x => x.ms > 0).sort((a, b) => b.ms - a.ms);
            return (
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:T.textSoft, fontFamily:FONT }}>Tiempo total</span>
                  <span style={{ fontSize:20, fontWeight:700, color:T.text, fontFamily:FONT }}>{formatDur(total)}</span>
                </div>
                {all.map(({ c, ms }) => {
                  const pct = total > 0 ? (ms / total) * 100 : 0;
                  const cc = PHASE_COLORS[c.phase] || "#888";
                  return (
                    <div key={c.id} style={{ marginBottom:12 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:8, height:8, borderRadius:"50%", background:cc }} />
                          <span style={{ fontSize:12, fontWeight:600, fontFamily:FONT, color:T.text }}>{c.name}</span>
                          {c.id === data.col_id && <span style={{ fontSize:9, background:"#7F77DD22", color:"#7F77DD", borderRadius:20, padding:"1px 5px", fontFamily:FONT, fontWeight:700 }}>actual</span>}
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, fontFamily:FONT, color:T.text }}>{formatDur(ms)}</span>
                      </div>
                      <div style={{ height:5, borderRadius:4, backgroundColor:T.bgSoft, overflow:"hidden" }}>
                        <div style={{ height:"100%", borderRadius:4, background:cc, width:`${pct}%`, transition:"width .4s" }} />
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
                  <div key={i} style={{ display:"flex", gap:10, paddingBottom:10, marginBottom:10, borderBottom:`1px solid ${T.border}`, alignItems:"flex-start" }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:"#7F77DD", marginTop:6, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13, margin:"0 0 3px", fontFamily:FONT, color:T.text, lineHeight:1.5 }}>{h.msg}</p>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        {u && <Avatar user={u} size={16} />}
                        <span style={{ fontSize:11, color:T.textSoft, fontFamily:FONT }}>{h.userName || "Sistema"} · {h.ts}</span>
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

// ─── SettingsPage ─────────────────────────────────────────
function SettingsPage({ board, columns, states, users, onBack, onUpdateBoard, onUpdateColumns, onUpdateStates, onUpdateUsers }: {
  board: Board; columns: BoardColumn[]; states: BoardState[]; users: User[];
  onBack: () => void;
  onUpdateBoard: (b: Board) => void;
  onUpdateColumns: (cols: BoardColumn[]) => void;
  onUpdateStates: (st: BoardState[]) => void;
  onUpdateUsers: (users: User[]) => void;
}) {
  const [section, setSection]         = useState("usuarios");
  const [showUserModal, setShowUserModal] = useState(false);
  const [newStateName, setNewStateName]   = useState("");
  const [newStatePhase, setNewStatePhase] = useState<"pre"|"work"|"post">("pre");
  const [newCatName, setNewCatName]       = useState("");
  const inp: React.CSSProperties = { fontFamily:FONT, fontSize:13, borderRadius:8, border:`1.5px solid ${T.border}`, padding:"7px 10px", backgroundColor:T.bgSoft, color:T.text, outline:"none", boxSizing:"border-box" };
  const sections = [
    { id:"usuarios",  label:"Usuarios"        },
    { id:"estados",   label:"Estados"         },
    { id:"columnas",  label:"Columnas"        },
    { id:"categorias",label:"Categorías"      },
    { id:"campos",    label:"Campos del modal"},
    { id:"acceso",    label:"Acceso"          },
  ];
  const OPT_FIELDS = [
    { id:"tipo",         label:"Tipo"           },
    { id:"categoria",    label:"Categoría"      },
    { id:"dueDate",      label:"Fecha entrega"  },
    { id:"bloqueado",    label:"Bloqueado"      },
    { id:"dependencias", label:"Dependencias"   },
    { id:"comentarios",  label:"Comentarios"    },
    { id:"archivos",     label:"Archivos"       },
    { id:"tiempos",      label:"Tiempos"        },
  ];
  const assignedStateIds = new Set(columns.flatMap(c => c.state_ids || []));
  const unassigned = states.filter(s => !assignedStateIds.has(s.id));

  async function addUser(u: User) { await saveUser(u); onUpdateUsers([...users, u]); setShowUserModal(false); }
  async function removeUser(id: string) { await deleteUser(id); onUpdateUsers(users.filter(u => u.id !== id)); }
  async function toggleRole(id: string) {
    const updated = users.map(u => u.id === id ? { ...u, role: (u.role === "MASTER" ? "USER" : "MASTER") as "MASTER"|"USER" } : u);
    await saveUser(updated.find(u => u.id === id)!);
    onUpdateUsers(updated);
  }
  async function addState() {
    if (!newStateName.trim()) return;
    const ns: BoardState = { id:uid(), board_id:board.id, name:newStateName.trim(), phase:newStatePhase, is_discard:false, sort_order:states.length };
    await saveState(ns); onUpdateStates([...states, ns]); setNewStateName("");
  }
  async function removeStateItem(id: string) { await deleteState(id); onUpdateStates(states.filter(s => s.id !== id)); }
  async function updateStatePhase(id: string, phase: "pre"|"work"|"post") {
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
    const COLS = ["#7F77DD","#1D9E75","#D85A30","#378ADD","#D4537E","#BA7517"];
    const nc: BoardColumn = { id:uid(), board_id:board.id, name:"Nueva columna", phase:"pre", state_ids:[], wip_limit:0, is_wip:false, sort_order:columns.length };
    await saveColumn(nc); onUpdateColumns([...columns, nc]);
  }
  async function removeCol(id: string) { await deleteColumn(id); onUpdateColumns(columns.filter(c => c.id !== id)); }
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
    <div style={{ fontFamily:FONT, backgroundColor:T.bgSoft, minHeight:"100vh", position:"relative" }}>
      {showUserModal && <UserModal onClose={() => setShowUserModal(false)} onSave={addUser} />}
      <div style={{ backgroundColor:T.bg, borderBottom:`1.5px solid ${T.border}`, padding:"13px 22px", display:"flex", alignItems:"center", gap:14 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:FONT, fontSize:13, fontWeight:600, color:T.textSoft, padding:0 }}>← Volver</button>
        <span style={{ color:T.border }}>|</span>
        <span style={{ fontSize:15, fontWeight:700, fontFamily:FONT, color:T.text }}>Configuración — {board.title}</span>
      </div>
      <div style={{ display:"flex", minHeight:"calc(100vh - 52px)" }}>
        <div style={{ width:185, backgroundColor:T.bg, borderRight:`1.5px solid ${T.border}`, padding:"13px 9px", flexShrink:0 }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              style={{ width:"100%", textAlign:"left", fontFamily:FONT, fontSize:13, fontWeight:section===s.id?700:500, padding:"9px 13px", borderRadius:10, border:"none", backgroundColor:section===s.id?"#7F77DD18":"transparent", color:section===s.id?"#7F77DD":T.textSoft, cursor:"pointer", marginBottom:3, display:"block" }}>
              {s.label}
            </button>
          ))}
        </div>
        <div style={{ flex:1, padding:"22px 26px", overflowY:"auto" }}>

          {section === "usuarios" && (
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <h2 style={{ margin:0, fontSize:16, fontWeight:700, fontFamily:FONT, color:T.text }}>Usuarios</h2>
                <Btn variant="primary" onClick={() => setShowUserModal(true)}>+ Añadir</Btn>
              </div>
              {users.map(u => (
                <div key={u.id} style={{ backgroundColor:T.bg, borderRadius:13, border:`1.5px solid ${T.border}`, padding:"11px 15px", display:"flex", alignItems:"center", gap:11, marginBottom:7 }}>
                  <Avatar user={u} size={36} />
                  <div style={{ flex:1 }}>
                    <p style={{ margin:0, fontSize:13, fontWeight:700, fontFamily:FONT, color:T.text }}>{u.name}</p>
                    <p style={{ margin:0, fontSize:11, color:T.textSoft, fontFamily:FONT }}>{u.email}</p>
                  </div>
                  <div onClick={() => toggleRole(u.id)} style={{ padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700, fontFamily:FONT, cursor:"pointer", background:u.role==="MASTER"?"#7F77DD22":"#F1EFE8", color:u.role==="MASTER"?"#7F77DD":"#5F5E5A", border:`1.5px solid ${u.role==="MASTER"?"#7F77DD44":T.border}` }}>{u.role}</div>
                  <Btn variant="danger" onClick={() => removeUser(u.id)} style={{ fontSize:11, padding:"4px 9px" }}>Eliminar</Btn>
                </div>
              ))}
            </div>
          )}

          {section === "estados" && (
            <div>
              <h2 style={{ margin:"0 0 16px", fontSize:16, fontWeight:700, fontFamily:FONT, color:T.text }}>Estados</h2>
              {(["pre","work","post"] as const).map(phase => {
                const pm = PHASE_META[phase];
                const phaseStates = states.filter(s => s.phase === phase);
                return (
                  <div key={phase} style={{ marginBottom:22 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:10 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:pm.color, flexShrink:0 }} />
                      <span style={{ fontSize:13, fontWeight:700, fontFamily:FONT, color:pm.color }}>{pm.label}</span>
                      <div style={{ flex:1, height:1, background:pm.color+"33" }} />
                      <span style={{ fontSize:11, color:T.textSoft, fontFamily:FONT }}>{phaseStates.length} estado{phaseStates.length!==1?"s":""}</span>
                    </div>
                    {!phaseStates.length && <p style={{ fontSize:12, color:T.textSoft, fontFamily:FONT, fontStyle:"italic", marginLeft:20 }}>Sin estados</p>}
                    {phaseStates.map(s => (
                      <div key={s.id} style={{ backgroundColor:T.bg, borderRadius:11, border:`1.5px solid ${pm.color}44`, padding:"9px 13px", display:"flex", alignItems:"center", gap:9, marginBottom:6, marginLeft:20 }}>
                        <div style={{ width:7, height:7, borderRadius:"50%", background:pm.color, flexShrink:0 }} />
                        <span style={{ fontSize:13, fontWeight:600, fontFamily:FONT, flex:1, color:T.text }}>{s.name}</span>
                        <select value={s.phase} onChange={e => updateStatePhase(s.id, e.target.value as "pre"|"work"|"post")} style={{ ...inp, width:"auto", fontSize:11, padding:"3px 7px" }}>
                          {Object.entries(PHASE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <Btn variant="danger" onClick={() => removeStateItem(s.id)} style={{ fontSize:11, padding:"3px 8px" }}>✕</Btn>
                      </div>
                    ))}
                  </div>
                );
              })}
              <div style={{ backgroundColor:T.bg, borderRadius:11, border:`1.5px solid ${T.border}`, padding:"13px", marginTop:6 }}>
                <p style={{ margin:"0 0 9px", fontSize:13, fontWeight:700, fontFamily:FONT, color:T.text }}>Añadir estado</p>
                <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                  <input value={newStateName} onChange={e => setNewStateName(e.target.value)} placeholder="Nombre del estado" style={{ ...inp, flex:1, minWidth:100 }} />
                  <select value={newStatePhase} onChange={e => setNewStatePhase(e.target.value as "pre"|"work"|"post")} style={{ ...inp, width:"auto" }}>
                    {Object.entries(PHASE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <Btn variant="primary" onClick={addState}>Añadir</Btn>
                </div>
              </div>
            </div>
          )}

          {section === "columnas" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                <h2 style={{ margin:0, fontSize:16, fontWeight:700, fontFamily:FONT, color:T.text }}>Columnas</h2>
                <Btn variant="primary" onClick={addColumn}>+ Añadir</Btn>
              </div>
              {unassigned.length > 0 && (
                <div style={{ backgroundColor:"#FAEEDA", border:"1.5px solid #EF9F27", borderRadius:11, padding:"10px 14px", marginBottom:14 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:"#633806", fontFamily:FONT }}>⚠ Estados sin columna: </span>
                  <span style={{ fontSize:12, color:"#633806", fontFamily:FONT }}>{unassigned.map(s => s.name).join(", ")}</span>
                </div>
              )}
              <DragList items={columns} keyFn={c => c.id} onReorder={reorderCols} renderItem={c => {
                const cc = PHASE_COLORS[c.phase] || "#888";
                return (
                  <div style={{ backgroundColor:T.bg, borderRadius:13, border:`2px solid ${cc}55`, overflow:"hidden", marginBottom:10, cursor:"grab" }}>
                    <div style={{ background:cc, padding:"8px 13px", display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:11, color:"rgba(255,255,255,0.6)" }}>⠿</span>
                      <span style={{ fontSize:13, fontWeight:700, color:"#fff", fontFamily:FONT, flex:1 }}>{c.name}</span>
                      <select value={c.phase} onChange={e => updateCol(c.id, { phase: e.target.value as "pre"|"work"|"post" })} style={{ fontSize:11, borderRadius:7, border:"none", padding:"2px 6px", backgroundColor:"rgba(255,255,255,0.2)", color:"#fff", fontFamily:FONT, cursor:"pointer", outline:"none" }}>
                        {Object.entries(PHASE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div style={{ padding:"11px 13px", display:"flex", flexDirection:"column", gap:10 }}>
                      <div style={{ display:"flex", gap:9, flexWrap:"wrap" }}>
                        <div style={{ flex:1 }}>
                          <label style={{ fontSize:11, fontWeight:600, color:T.textSoft, fontFamily:FONT, display:"block", marginBottom:3 }}>Nombre</label>
                          <input value={c.name} onChange={e => updateCol(c.id, { name: e.target.value })} style={{ ...inp, width:"100%" }} />
                        </div>
                        <div>
                          <label style={{ fontSize:11, fontWeight:600, color:T.textSoft, fontFamily:FONT, display:"block", marginBottom:3 }}>Límite</label>
                          <input type="number" min={0} value={c.wip_limit || 0} onChange={e => updateCol(c.id, { wip_limit: Math.max(0, parseInt(e.target.value)||0) })} style={{ ...inp, width:65, textAlign:"center" }} />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize:11, fontWeight:600, color:T.textSoft, fontFamily:FONT, display:"block", marginBottom:5 }}>Estados asignados</label>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                          {states.map(s => {
                            const assigned = (c.state_ids || []).includes(s.id);
                            const pm = PHASE_META[s.phase] || PHASE_META.pre;
                            return (
                              <span key={s.id} onClick={() => updateCol(c.id, { state_ids: assigned ? c.state_ids.filter(id => id !== s.id) : [...(c.state_ids||[]), s.id] })}
                                style={{ fontSize:11, fontWeight:600, fontFamily:FONT, padding:"3px 10px", borderRadius:20, cursor:"pointer", background:assigned?pm.color+"22":T.bgSoft, color:assigned?pm.color:T.textSoft, border:`1.5px solid ${assigned?pm.color+"55":T.border}` }}>
                                {s.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                        <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:12, fontFamily:FONT, color:T.text, fontWeight:600 }}>
                          <input type="checkbox" checked={!!c.is_wip} onChange={e => updateCol(c.id, { is_wip: e.target.checked })} />Es WIP
                        </label>
                        {columns.length > 1 && <Btn variant="danger" onClick={() => removeCol(c.id)} style={{ fontSize:11, padding:"3px 9px" }}>Eliminar</Btn>}
                      </div>
                    </div>
                  </div>
                );
              }} />
            </div>
          )}

          {section === "categorias" && (
            <div>
              <h2 style={{ margin:"0 0 14px", fontSize:16, fontWeight:700, fontFamily:FONT, color:T.text }}>Categorías</h2>
              <DragList items={board.categories} keyFn={c => c} onReorder={reorderCats} renderItem={c => (
                <div style={{ backgroundColor:T.bg, borderRadius:10, border:`1.5px solid ${T.border}`, padding:"9px 13px", display:"flex", alignItems:"center", gap:9, marginBottom:6, cursor:"grab" }}>
                  <span style={{ fontSize:14, color:T.textSoft }}>⠿</span>
                  <span style={{ flex:1, fontSize:13, fontFamily:FONT, color:T.text }}>{c}</span>
                  <Btn variant="danger" onClick={() => removeCat(c)} style={{ fontSize:11, padding:"3px 8px" }}>✕</Btn>
                </div>
              )} />
              <div style={{ display:"flex", gap:7, marginTop:8 }}>
                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Nueva categoría..." style={{ ...inp, flex:1 }} />
                <Btn variant="primary" onClick={addCat}>Añadir</Btn>
              </div>
            </div>
          )}

          {section === "campos" && (
            <div>
              <h2 style={{ margin:"0 0 5px", fontSize:16, fontWeight:700, fontFamily:FONT, color:T.text }}>Campos visibles en el modal</h2>
              <p style={{ margin:"0 0 16px", fontSize:12, color:T.textSoft, fontFamily:FONT }}>Título, estado, descripción y creador siempre visibles.</p>
              {OPT_FIELDS.map(f => (
                <div key={f.id} style={{ backgroundColor:T.bg, borderRadius:11, border:`1.5px solid ${T.border}`, padding:"11px 15px", display:"flex", alignItems:"center", gap:11, marginBottom:7 }}>
                  <Toggle on={(board.visible_fields||[]).includes(f.id)} onChange={v => toggleField(f.id, v)} />
                  <span style={{ fontSize:13, fontWeight:600, fontFamily:FONT, color:T.text }}>{f.label}</span>
                </div>
              ))}
            </div>
          )}

          {section === "acceso" && (
            <div>
              <h2 style={{ margin:"0 0 16px", fontSize:16, fontWeight:700, fontFamily:FONT, color:T.text }}>Acceso</h2>
              {[{ key:"public" as const, label:"Acceso público por URL", desc:"Cualquier persona con el enlace puede ver el tablero." },
                { key:"requireLogin" as const, label:"Requiere autenticación", desc:"Solo los miembros pueden acceder." }].map(opt => (
                <div key={opt.key} onClick={() => updateBoardConfig({ [opt.key]: !board.board_config?.[opt.key] })}
                  style={{ backgroundColor:T.bg, borderRadius:13, border:`2px solid ${board.board_config?.[opt.key]?"#7F77DD":T.border}`, padding:"13px 15px", cursor:"pointer", display:"flex", alignItems:"center", gap:12, marginBottom:9 }}>
                  <Toggle on={!!board.board_config?.[opt.key]} onChange={() => {}} />
                  <div>
                    <p style={{ margin:0, fontSize:13, fontWeight:700, fontFamily:FONT, color:board.board_config?.[opt.key]?"#7F77DD":T.text }}>{opt.label}</p>
                    <p style={{ margin:"2px 0 0", fontSize:12, fontFamily:FONT, color:T.textSoft }}>{opt.desc}</p>
                  </div>
                </div>
              ))}
              <div style={{ backgroundColor:T.bg, borderRadius:13, border:`1.5px solid ${T.border}`, padding:"13px 15px", marginTop:4 }}>
                <p style={{ margin:"0 0 9px", fontSize:13, fontWeight:700, fontFamily:FONT, color:T.text }}>Ocultar tareas completadas</p>
                <select value={board.board_config?.hideDoneAfterDays || 0} onChange={e => updateBoardConfig({ hideDoneAfterDays: parseInt(e.target.value)||0 })}
                  style={{ fontFamily:FONT, fontSize:13, borderRadius:8, border:`1.5px solid ${T.border}`, padding:"8px 10px", backgroundColor:T.bgSoft, color:T.text, outline:"none", width:"100%" }}>
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

// ─── Main App ─────────────────────────────────────────────
export default function App() {
  const [boards,  setBoards]  = useState<Board[]>([]);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [states,  setStates]  = useState<BoardState[]>([]);
  const [users,   setUsers]   = useState<User[]>([]);
  const [cards,   setCards]   = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBoardId, setActiveBoardId] = useState("b1");
  const [page, setPage]         = useState<"board"|"settings">("board");
  const [modal, setModal]       = useState<Card | null>(null);
  const [justifyPending, setJustifyPending] = useState<{ cardId: string; colId: string; stateId: string; isDiscard?: boolean } | null>(null);
  const [showMetrics,   setShowMetrics]   = useState(true);
  const [showNewKanban, setShowNewKanban] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const dragCardId = useRef<string | null>(null);

  // ── Initial load ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      await seedIfEmpty();
      const data = await loadAll("b1");
      setUsers(data.users); setBoards(data.boards);
      setStates(data.states); setColumns(data.columns); setCards(data.cards);
      setLoading(false);
    })();
  }, []);

  // ── Realtime ────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel("cards-rt")
      .on("postgres_changes", { event:"*", schema:"public", table:"cards", filter:`board_id=eq.${activeBoardId}` }, payload => {
        if (payload.eventType === "INSERT") setCards(cs => [...cs, payload.new as Card]);
        if (payload.eventType === "UPDATE") setCards(cs => cs.map(c => c.id === (payload.new as Card).id ? payload.new as Card : c));
        if (payload.eventType === "DELETE") setCards(cs => cs.filter(c => c.id !== (payload.old as Card).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeBoardId]);

  const board = boards.find(b => b.id === activeBoardId) || boards[0];

  // ── Metrics ─────────────────────────────────────────────
  const discardStateIds = new Set(states.filter(s => s.name.toLowerCase().includes("descart")).map(s => s.id));
  const wipColIds       = columns.filter(c => c.is_wip).map(c => c.id);
  const doneColIds      = columns.filter(c => c.phase === "post").map(c => c.id);
  const activeCards     = cards.filter(c => !discardStateIds.has(c.state_id));
  const completedCards  = activeCards.filter(c => c.completed_at && doneColIds.includes(c.col_id));
  const leadTimes       = completedCards.map(c => new Date(c.completed_at!).getTime() - new Date(c.created_at).getTime()).filter(v => v > 0);
  const avgLead         = leadTimes.length ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0;
  const cycleTimes      = activeCards.map(c => { const tpc = { ...c.time_per_col }; if (wipColIds.includes(c.col_id)) tpc[c.col_id] = (tpc[c.col_id]||0) + (Date.now() - (c.col_since||Date.now())); return wipColIds.reduce((a, id) => a + (tpc[id]||0), 0); }).filter(v => v > 0);
  const avgCycle        = cycleTimes.length ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0;
  const throughput      = completedCards.filter(c => new Date(c.completed_at!).getTime() >= Date.now() - 7*24*3600000).length;
  const metricDefs = [
    { label:"Lead time medio",  sub:"Creación → Hecho",    value:formatDur(avgLead),  color:"#7F77DD", hint:leadTimes.length?`${leadTimes.length} completadas`:"Sin datos" },
    { label:"Cycle time medio", sub:"Tiempo en WIP",       value:formatDur(avgCycle), color:"#BA7517", hint:columns.filter(c=>c.is_wip).map(c=>c.name).join(", ")||"Sin WIP" },
    { label:"Throughput",       sub:"Completadas / semana",value:String(throughput),  color:"#1D9E75", hint:"Últimos 7 días" },
  ];

  // ── Filters ─────────────────────────────────────────────
  const FILTERS = [
    { id:"mine",    label:"Mis tareas",     fn: (c: Card) => c.creator_id === users[0]?.id },
    { id:"recent",  label:"Act. 24h",       fn: (c: Card) => { const l = c.history[c.history.length-1]; try { return l && (Date.now() - new Date(l.ts).getTime()) < 86400000; } catch { return false; } } },
    { id:"blocked", label:"Bloqueadas",     fn: (c: Card) => c.blocked },
    { id:"overdue", label:"Entrega pasada", fn: (c: Card) => !!c.due_date && new Date(c.due_date) < new Date() },
  ];
  function cardVisible(c: Card) {
    const hide = board?.board_config?.hideDoneAfterDays || 0;
    if (hide > 0 && c.completed_at && daysSince(new Date(c.completed_at).getTime()) >= hide) return false;
    if (!activeFilters.length) return true;
    return activeFilters.every(fid => { const f = FILTERS.find(x => x.id === fid); return f ? f.fn(c) : true; });
  }

  // ── Card ops ─────────────────────────────────────────────
  function openCard(id: string) { setModal(cards.find(c => c.id === id) || null); }

  async function onSaveCard(updated: Card) {
    const prev = cards.find(c => c.id === updated.id);
    if (prev && prev.col_id !== updated.col_id) {
      const elapsed = Date.now() - (prev.col_since || Date.now());
      const tpc = { ...prev.time_per_col }; tpc[prev.col_id] = (tpc[prev.col_id]||0) + elapsed;
      updated = { ...updated, time_per_col: tpc, col_since: Date.now() };
    }
    setCards(cs => cs.map(c => c.id === updated.id ? updated : c));
    setModal(null);
    await saveCard(updated);
  }

  async function newCard() {
    if (!board || !columns.length) return;
    const seq = board.card_seq;
    const updatedBoard = { ...board, card_seq: seq + 1 };
    setBoards(bs => bs.map(b => b.id === board.id ? updatedBoard : b));
    await saveBoard(updatedBoard);
    const firstCol   = columns[0];
    const firstState = states.find(s => (firstCol?.state_ids||[]).includes(s.id)) || states[0];
    const c: Card = {
      id: uid(), card_id:`${board.prefix}-${String(seq).padStart(3,"0")}`,
      board_id: board.id, col_id: firstCol?.id, state_id: firstState?.id,
      title:"Nueva tarjeta", type:"tarea", category: board.categories[0]||"Frontend",
      due_date:"", blocked:false, creator_id: users[0]?.id,
      description:"", attachments:[], comments:[],
      history:[histEntry("Tarjeta creada", users[0])],
      depends_on:[], blocked_by:[], time_per_col:{},
      col_since: Date.now(), created_at: new Date().toISOString(),
      completed_at:null, discarded_at:null,
    };
    setCards(cs => [c, ...cs]);
    setModal(c);
    await saveCard(c);
  }

  function onDragStart(e: React.DragEvent, id: string) { dragCardId.current = id; e.dataTransfer.effectAllowed = "move"; }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }

  async function onDrop(e: React.DragEvent, colId: string) {
    e.preventDefault(); e.stopPropagation();
    const id = dragCardId.current; dragCardId.current = null;
    if (!id) return;
    const card = cards.find(c => c.id === id); if (!card) return;
    const col  = columns.find(c => c.id === colId); if (!col) return;
    const colCards = cards.filter(c => c.col_id === colId);
    if (col.wip_limit > 0 && colCards.length >= col.wip_limit && card.col_id !== colId) return;
    const newStateId = (col.state_ids || [])[0] || states[0]?.id;
    const newState   = states.find(s => s.id === newStateId);
    const prevState  = states.find(s => s.id === card.state_id);
    const needsJustify  = (prevState?.phase === "post" || prevState?.is_discard) && newState?.phase !== "post" && !newState?.is_discard;
    const movingDiscard = !!newState?.is_discard && !prevState?.is_discard;
    if (needsJustify || movingDiscard) { setJustifyPending({ cardId:id, colId, stateId:newStateId, isDiscard:movingDiscard }); return; }
    await applyDrop(id, colId, newStateId, null);
  }

  async function applyDrop(cardId: string, colId: string, stateId: string, reason: string | null) {
    const card = cards.find(c => c.id === cardId); if (!card) return;
    const newState = states.find(s => s.id === stateId);
    const elapsed  = Date.now() - (card.col_since || Date.now());
    const tpc = { ...card.time_per_col }; tpc[card.col_id] = (tpc[card.col_id]||0) + elapsed;
    const hist = [...card.history];
    if (reason) hist.push(histEntry(`Justificación: ${reason}`, users[0]));
    hist.push(histEntry(`Movida a "${columns.find(c=>c.id===colId)?.name}" (${newState?.name})`, users[0]));
    const isDone    = newState?.phase === "post" && !newState?.is_discard;
    const isDiscard = !!newState?.is_discard;
    const updated: Card = { ...card, col_id:colId, state_id:stateId, time_per_col:tpc, col_since:Date.now(), history:hist,
      completed_at: isDone && !card.completed_at ? new Date().toISOString() : (!isDone && !isDiscard ? null : card.completed_at),
      discarded_at: isDiscard ? new Date().toISOString() : null,
    };
    setCards(cs => cs.map(c => c.id === cardId ? updated : c));
    setJustifyPending(null);
    await saveCard(updated);
  }

  async function createBoard(title: string, mode: string) {
    const prefix = genPrefix(title); const id = uid();
    const nb: Board = {
      id, title, prefix, card_seq:1,
      board_config: { public:false, requireLogin:true, hideDoneAfterDays:0 },
      visible_fields: DEFAULT_VISIBLE,
      categories: mode === "copy" ? [...(board?.categories||[])] : ["Frontend","Backend"],
    };
    const newCols: BoardColumn[] = mode === "copy"
      ? columns.map(c => ({ ...c, id:uid(), board_id:id }))
      : [
          { id:uid(), board_id:id, name:"Por hacer",   phase:"pre",  state_ids:[], wip_limit:0, is_wip:false, sort_order:0 },
          { id:uid(), board_id:id, name:"En progreso", phase:"work", state_ids:[], wip_limit:3, is_wip:true,  sort_order:1 },
          { id:uid(), board_id:id, name:"Hecho",       phase:"post", state_ids:[], wip_limit:0, is_wip:false, sort_order:2 },
        ];
    const newStates: BoardState[] = mode === "copy"
      ? states.map(s => ({ ...s, id:uid(), board_id:id }))
      : [
          { id:uid(), board_id:id, name:"Pendiente",  phase:"pre",  is_discard:false, sort_order:0 },
          { id:uid(), board_id:id, name:"En curso",   phase:"work", is_discard:false, sort_order:1 },
          { id:uid(), board_id:id, name:"Completado", phase:"post", is_discard:false, sort_order:2 },
        ];
    await saveBoard(nb);
    await Promise.all(newCols.map(saveColumn));
    await Promise.all(newStates.map(saveState));
    setBoards(bs => [...bs, nb]);
    setColumns(cs => [...cs, ...newCols]);
    setStates(ss => [...ss, ...newStates]);
    setActiveBoardId(id);
    setShowNewKanban(false);
  }

  async function onSaveCat(cat: string) {
    if (!board || board.categories.includes(cat)) return;
    const updated = { ...board, categories: [...board.categories, cat] };
    setBoards(bs => bs.map(b => b.id === board.id ? updated : b));
    await saveBoard(updated);
  }

  // WIP stats
  const wipCols  = columns.filter(c => c.is_wip);
  const wipTotal = cards.filter(c => wipCols.some(w => w.id === c.col_id) && !discardStateIds.has(c.state_id)).length;

  // ── Loading ──────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:T.bg, fontFamily:FONT }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:16, color:"#7F77DD" }}>⬡</div>
        <p style={{ fontSize:15, fontWeight:600, color:T.textSoft, fontFamily:FONT, margin:0 }}>Cargando Kanban Pro…</p>
      </div>
    </div>
  );

  // ── Settings page ────────────────────────────────────────
  if (page === "settings" && board) return (
    <SettingsPage
      board={board}
      columns={columns}
      states={states}
      users={users}
      onBack={() => setPage("board")}
      onUpdateBoard={b => { setBoards(bs => bs.map(x => x.id === b.id ? b : x)); saveBoard(b); }}
      onUpdateColumns={cols => setColumns(cols)}
      onUpdateStates={sts => setStates(sts)}
      onUpdateUsers={us => setUsers(us)}
    />
  );

  // ── Board page ───────────────────────────────────────────
  return (
    <div style={{ fontFamily:FONT, backgroundColor:T.bgSoft, minHeight:"100vh", position:"relative" }}>

      {/* Modals */}
      {modal && board && (
        <CardModal
          card={modal} board={board} columns={columns} states={states}
          users={users} allCards={cards} categories={board.categories}
          onClose={() => setModal(null)}
          onSave={onSaveCard}
          onSaveCat={onSaveCat}
          onOpenCard={openCard}
        />
      )}
      {justifyPending && (
        <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:900, padding:20 }}>
          <JustifyModal
            title={justifyPending.isDiscard ? "Descartar tarea" : "Reabrir tarea"}
            onConfirm={r => applyDrop(justifyPending.cardId, justifyPending.colId, justifyPending.stateId, r)}
            onCancel={() => setJustifyPending(null)}
          />
        </div>
      )}
      {showNewKanban && (
        <NewKanbanModal onClose={() => setShowNewKanban(false)} onCreate={createBoard} />
      )}

      {/* Header */}
      <div style={{ backgroundColor:T.bg, borderBottom:`1.5px solid ${T.border}`, padding:"0 20px", display:"flex", alignItems:"center", gap:12, height:52, position:"sticky", top:0, zIndex:100 }}>
        <span style={{ fontSize:18, fontWeight:800, color:"#7F77DD", fontFamily:FONT, letterSpacing:-0.5 }}>⬡ Kanban Pro</span>
        <div style={{ width:1, height:24, background:T.border, flexShrink:0 }} />
        {/* Board selector */}
        <select value={activeBoardId} onChange={e => setActiveBoardId(e.target.value)}
          style={{ fontFamily:FONT, fontSize:13, fontWeight:700, border:`1.5px solid ${T.border}`, borderRadius:9, padding:"5px 10px", backgroundColor:T.bgSoft, color:T.text, outline:"none", cursor:"pointer", maxWidth:200 }}>
          {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
        </select>
        <button onClick={() => setShowNewKanban(true)}
          style={{ fontFamily:FONT, fontSize:12, fontWeight:600, padding:"5px 11px", borderRadius:9, border:`1.5px dashed ${T.borderMed}`, backgroundColor:"transparent", color:T.textSoft, cursor:"pointer" }}>
          + Nuevo tablero
        </button>
        <div style={{ flex:1 }} />
        {/* WIP indicator */}
        {wipCols.length > 0 && (
          <span style={{ fontSize:12, fontWeight:700, color:wipTotal > 0 ? "#BA7517" : T.textSoft, fontFamily:FONT, background:T.bgSoft, borderRadius:20, padding:"4px 10px", border:`1.5px solid ${T.border}` }}>
            WIP {wipTotal}/{wipCols.reduce((a,c) => a + (c.wip_limit||0), 0) || "∞"}
          </span>
        )}
        <button onClick={() => setShowMetrics(v => !v)}
          style={{ fontFamily:FONT, fontSize:12, fontWeight:600, padding:"5px 11px", borderRadius:9, border:`1.5px solid ${showMetrics?"#7F77DD":T.border}`, backgroundColor:showMetrics?"#7F77DD18":"transparent", color:showMetrics?"#7F77DD":T.textSoft, cursor:"pointer" }}>
          {showMetrics ? "▼ Métricas" : "▶ Métricas"}
        </button>
        <button onClick={() => setPage("settings")}
          style={{ fontFamily:FONT, fontSize:12, fontWeight:600, padding:"5px 11px", borderRadius:9, border:`1.5px solid ${T.border}`, backgroundColor:"transparent", color:T.textSoft, cursor:"pointer" }}>
          ⚙ Config.
        </button>
        <button onClick={newCard}
          style={{ fontFamily:FONT, fontSize:13, fontWeight:700, padding:"6px 16px", borderRadius:9, border:"none", backgroundColor:"#7F77DD", color:"#fff", cursor:"pointer" }}>
          + Nueva tarjeta
        </button>
      </div>

      {/* Metrics bar */}
      {showMetrics && (
        <div style={{ backgroundColor:T.bg, borderBottom:`1.5px solid ${T.border}`, padding:"10px 20px", display:"flex", gap:12, overflowX:"auto" }}>
          {metricDefs.map(m => (
            <div key={m.label} style={{ backgroundColor:T.bgSoft, borderRadius:12, border:`1.5px solid ${T.border}`, padding:"10px 16px", minWidth:140, flexShrink:0 }}>
              <p style={{ margin:"0 0 2px", fontSize:11, fontWeight:600, color:T.textSoft, fontFamily:FONT }}>{m.label}</p>
              <p style={{ margin:"0 0 2px", fontSize:20, fontWeight:800, color:m.color, fontFamily:FONT }}>{m.value}</p>
              <p style={{ margin:0, fontSize:10, color:T.textSoft, fontFamily:FONT }}>{m.hint}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ padding:"8px 20px", display:"flex", gap:6, alignItems:"center", borderBottom:`1px solid ${T.border}`, backgroundColor:T.bg }}>
        <span style={{ fontSize:11, fontWeight:600, color:T.textSoft, fontFamily:FONT, marginRight:4 }}>Filtros:</span>
        {FILTERS.map(f => {
          const on = activeFilters.includes(f.id);
          return (
            <button key={f.id} onClick={() => setActiveFilters(fs => on ? fs.filter(x => x !== f.id) : [...fs, f.id])}
              style={{ fontFamily:FONT, fontSize:12, fontWeight:600, padding:"4px 12px", borderRadius:20, border:`1.5px solid ${on?"#7F77DD":T.border}`, backgroundColor:on?"#7F77DD18":"transparent", color:on?"#7F77DD":T.textSoft, cursor:"pointer" }}>
              {f.label}
            </button>
          );
        })}
        {activeFilters.length > 0 && (
          <button onClick={() => setActiveFilters([])} style={{ fontFamily:FONT, fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:20, border:"none", backgroundColor:"transparent", color:"#E24B4A", cursor:"pointer" }}>
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* Columns */}
      <div style={{ display:"flex", gap:14, padding:"16px 20px", overflowX:"auto", alignItems:"flex-start", minHeight:"calc(100vh - 160px)" }}>
        {columns.map(col => {
          const colColor  = PHASE_COLORS[col.phase] || "#888";
          const colCards  = cards.filter(c => c.col_id === col.id && cardVisible(c));
          const wipOver   = col.is_wip && col.wip_limit > 0 && colCards.length > col.wip_limit;
          return (
            <div key={col.id}
              onDragOver={onDragOver}
              onDrop={e => onDrop(e, col.id)}
              style={{ width:270, minWidth:270, flexShrink:0, backgroundColor:T.bg, borderRadius:16, border:`1.5px solid ${wipOver?"#E24B4A":T.border}`, borderTop:`3px solid ${colColor}`, display:"flex", flexDirection:"column", maxHeight:"calc(100vh - 180px)" }}>
              {/* Column header */}
              <div style={{ padding:"12px 14px 8px", borderBottom:`1px solid ${T.border}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:colColor, flexShrink:0 }} />
                  <span style={{ fontSize:13, fontWeight:700, color:T.text, fontFamily:FONT, flex:1 }}>{col.name}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:wipOver?"#E24B4A":T.textSoft, fontFamily:FONT, background:T.bgSoft, borderRadius:20, padding:"1px 8px", border:`1px solid ${T.border}` }}>
                    {colCards.length}{col.wip_limit > 0 ? `/${col.wip_limit}` : ""}
                  </span>
                </div>
                {col.is_wip && (
                  <span style={{ fontSize:9, fontWeight:700, color:wipOver?"#E24B4A":"#BA7517", fontFamily:FONT, background:wipOver?"#FCEBEB":"#FEF3CD", borderRadius:20, padding:"1px 7px", marginTop:4, display:"inline-block" }}>
                    WIP{wipOver?" — LÍMITE SUPERADO":""}
                  </span>
                )}
              </div>
              {/* Cards */}
              <div style={{ padding:"10px 10px", overflowY:"auto", flex:1 }}>
                {colCards.length === 0 && (
                  <div style={{ textAlign:"center", padding:"24px 0", color:T.textSoft, fontSize:12, fontFamily:FONT, fontStyle:"italic", border:`2px dashed ${T.border}`, borderRadius:10 }}>
                    Sin tarjetas
                  </div>
                )}
                {colCards.map(card => (
                  <KCard key={card.id} card={card} columns={columns} states={states} users={users} allCards={cards} onOpen={openCard} onDragStart={onDragStart} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}