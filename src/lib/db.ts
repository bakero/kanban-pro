import { supabase } from "./supabase";
import { DEFAULT_VISIBLE } from "../constants";
import { histEntry } from "./utils";
import type { User, Board, BoardState, BoardColumn, Card, AppData, Improvement } from "../types";

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
  makeSeedCard("k1","MIT-001","c1","st1",{ title:"Diseñar nueva homepage", type:"tarea", category:"Diseño",   due_date:"2026-04-01", creator_id:"u3", description:"Rediseño completo.", created_at: new Date(Date.now()-172800000).toISOString(), col_since: Date.now()-172800000 }),
  makeSeedCard("k2","MIT-002","c1","st1",{ title:"API de autenticación",   type:"bug",   category:"Backend",  due_date:"2026-03-20", creator_id:"u2", description:"OAuth2 con JWT.", blocked:true, created_at: new Date(Date.now()-86400000).toISOString(), col_since: Date.now()-86400000 }),
  makeSeedCard("k3","MIT-003","c2","st2",{ title:"Tests unitarios pago",   type:"tarea", category:"QA",       due_date:"2026-03-25", creator_id:"u4", description:"80% cobertura.", created_at: new Date(Date.now()-259200000).toISOString(), col_since: Date.now()-259200000 }),
  makeSeedCard("k4","MIT-004","c3","st4",{ title:"Deploy producción v2.1", type:"epica", category:"DevOps",   due_date:"2026-03-20", creator_id:"u1", description:"Despliegue v2.1.", created_at: new Date(Date.now()-518400000).toISOString(), col_since: Date.now()-3600000, completed_at: new Date(Date.now()-3600000).toISOString(), time_per_col:{"c1":86400000,"c2":172800000} }),
];

// ─── DB helpers ───────────────────────────────────────────

export async function seedIfEmpty() {
  const { data } = await supabase.from("boards").select("id").limit(1);
  if (data && data.length > 0) return;
  await supabase.from("users").upsert(SEED_USERS);
  await supabase.from("boards").upsert([SEED_BOARD]);
  await supabase.from("board_states").upsert(SEED_STATES);
  await supabase.from("board_columns").upsert(SEED_COLS);
  await supabase.from("cards").upsert(SEED_CARDS);
}

export async function loadAll(boardId: string): Promise<AppData> {
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

export async function saveCard(card: Card) {
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

export async function saveBoard(board: Board) {
  const { error } = await supabase.from("boards").upsert(board);
  if (error) console.error("saveBoard error:", error);
}

export async function saveColumn(col: BoardColumn) {
  const { error } = await supabase.from("board_columns").upsert(col);
  if (error) console.error("saveColumn error:", error);
}

export async function saveState(st: BoardState) {
  const { error } = await supabase.from("board_states").upsert(st);
  if (error) console.error("saveState error:", error);
}

export async function saveUser(user: User) {
  const { error } = await supabase.from("users").upsert(user);
  if (error) console.error("saveUser error:", error);
}

export async function deleteUser(id: string) {
  await supabase.from("users").delete().eq("id", id);
}

export async function deleteColumn(id: string) {
  await supabase.from("board_columns").delete().eq("id", id);
  await supabase.from("cards").delete().eq("col_id", id);
}

export async function deleteState(id: string) {
  await supabase.from("board_states").delete().eq("id", id);
}

export async function saveImprovement(imp: Improvement) {
  const { error } = await supabase.from("improvements").upsert(imp);
  if (error) console.error("saveImprovement error:", error);
}

export async function loadImprovements(boardId: string): Promise<Improvement[]> {
  const { data } = await supabase.from("improvements").select("*").eq("board_id", boardId).order("created_at", { ascending: false });
  return (data || []) as Improvement[];
}

export async function markImprovementsAiPending(ids: string[]) {
  if (!ids.length) return;
  await supabase.from("improvements").update({ status: "ai_pending" }).in("id", ids);
}
