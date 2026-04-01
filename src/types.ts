export interface User {
  id: string; name: string; email: string;
  initials: string; color: string; role: "MASTER" | "USER";
}

export interface BoardState {
  id: string; board_id: string; name: string;
  phase: "pre" | "work" | "post"; is_discard: boolean; sort_order: number;
}

export interface BoardColumn {
  id: string; board_id: string; name: string;
  phase: "pre" | "work" | "post"; state_ids: string[];
  wip_limit: number; is_wip: boolean; sort_order: number;
}

export interface HistoryEntry { ts: string; msg: string; userId?: string; userName?: string; }

export interface Comment { id: string; author: string; ts: string; text: string; }

export interface Card {
  id: string; card_id: string; board_id: string;
  col_id: string; state_id: string; title: string;
  description: string; type: "tarea" | "epica" | "iniciativa" | "bug";
  category: string; due_date: string; blocked: boolean;
  creator_id: string; attachments: string[]; comments: Comment[];
  history: HistoryEntry[]; depends_on: string[]; blocked_by: string[];
  time_per_col: Record<string, number>; col_since: number;
  created_at: string; completed_at: string | null; discarded_at: string | null;
}

export interface Board {
  id: string; title: string; prefix: string; card_seq: number;
  board_config: { public: boolean; requireLogin: boolean; hideDoneAfterDays: number };
  visible_fields: string[]; categories: string[];
}

export interface AppData {
  users: User[]; boards: Board[];
  states: BoardState[]; columns: BoardColumn[]; cards: Card[];
}

export interface Improvement {
  id: string;
  board_id: string;
  user_id: string;
  user_name: string;
  description: string;
  context: string;
  status: "pending" | "ai_pending" | "applied";
  created_at: string;
  applied_at: string | null;
  ai_result: string | null;
}
