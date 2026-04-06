// ============================================================
// ROLES
// ============================================================
export type CompanyRole = "company_admin" | "project_manager" | "member" | "viewer";
export type ProjectRole = "project_manager" | "member" | "viewer";

// ============================================================
// USER
// ============================================================
export interface User {
  id: string;
  auth_user_id?: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  initials: string;
  color: string;
  role?: "MASTER" | "USER";
  avatar_url?: string | null;
  lang?: string;
  ui_config?: Record<string, unknown>;
  google_login_enabled?: boolean;
  google_confirmed_at?: string | null;
  activation_email_sent_at?: string | null;
  created_at?: string;
}

// ============================================================
// COMPANY
// ============================================================
export interface Company {
  id: string;
  name: string;
  slug: string;
  company_code?: string | null;
  contact_email: string;
  logo_url?: string | null;
  license_plan: "trial" | "starter" | "professional" | "enterprise";
  license_expires_at?: string | null;
  created_by: string;
  owner_id?: string | null;
  created_at: string;
  is_active: boolean;
}

export interface CompanySettings {
  company_id: string;
  log_retention_days: number;
  backup_retention_count: number;
  backup_enabled: boolean;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: CompanyRole;
  invited_by?: string | null;
  created_at?: string;
  // computed join fields
  user?: User;
}

export interface CompanyInvite {
  id: string;
  company_id: string;
  email: string;
  role: CompanyRole;
  invited_by: string;
  status: "pending" | "accepted";
  created_at: string;
  accepted_at: string | null;
}

// ============================================================
// WORKSPACE  (espacio de trabajo - agrupa proyectos)
// ============================================================
export interface Workspace {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  created_by: string;
  owner_id?: string | null;
  numeric_id?: number | null;
  created_at: string;
  sort_order: number;
}

// ============================================================
// PROJECT
// ============================================================
export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  prefix: string;
  created_by: string;
  owner_id?: string | null;
  created_at: string;
  sort_order: number;
  is_archived: boolean;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  assigned_by?: string | null;
  created_at?: string;
  // computed join fields
  user?: User;
}

// ============================================================
// FEATURE FLAGS
// ============================================================
export interface Feature {
  id: string;
  key: string;
  label: string;
  description?: string;
  default_on: boolean;
  is_mandatory: boolean;
  sort_order: number;
}

export interface CompanyFeature {
  id: string;
  company_id: string;
  feature_key: string;
  is_enabled: boolean;
  updated_by?: string | null;
  updated_at: string;
}

export interface ProjectFeature {
  id: string;
  project_id: string;
  feature_key: string;
  is_enabled: boolean;
  updated_by?: string | null;
  updated_at: string;
}

// Mapa resuelto de flags para uso en componentes: featureFlags['metrics']
export type FeatureFlags = Record<string, boolean>;

// ============================================================
// BOARD
// ============================================================
export interface Board {
  id: string;
  company_id: string;
  project_id: string;
  title: string;
  prefix: string;
  card_seq: number;
  owner_user_id: string;
  numeric_id?: number | null;
  board_config: { public: boolean; requireLogin: boolean; hideDoneAfterDays: number };
  visible_fields: string[];
  categories: string[];
  created_at?: string;
  sort_order?: number;
}

// ============================================================
// BOARD STATE / COLUMN / CARD
// ============================================================
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
  seq_id?: number | null;
  created_at: string; completed_at: string | null; discarded_at: string | null;
}

export interface BoardLog {
  id: string;
  company_id: string;
  board_id: string;
  user_id: string;
  entity_id: string;
  entity_type: string;
  change: string;
  created_at: string;
}

export interface CompanyAdminLog {
  id: string;
  company_id: string;
  user_id: string;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export interface CompanyBackup {
  id: string;
  company_id: string;
  created_by: string;
  created_at: string;
  summary: string;
  snapshot: Record<string, unknown>;
}

// ============================================================
// IMPROVEMENTS
// ============================================================
export interface Improvement {
  id: string;
  company_id: string;
  project_id?: string | null;
  board_id: string;
  user_id: string;
  user_name: string;
  description: string;
  context: string;
  status: "pending" | "ai_pending" | "applied";
  created_at: string;
  applied_at: string | null;
  ai_result: string | null;
  vote_count?: number;
  current_user_voted?: boolean;
  board_title?: string | null;
}

export interface ImprovementVote {
  id: string;
  improvement_id: string;
  user_id: string;
  created_at: string;
}

export interface BoardInvite {
  id: string;
  board_id: string;
  email: string;
  invited_by_user_id: string;
  status: "pending" | "accepted";
  created_at: string;
  accepted_at: string | null;
}

export interface AdminBoardSummary extends Board {
  owner_name?: string | null;
  member_count: number;
  card_count: number;
}

export interface AdminConsoleData {
  users: User[];
  boards: AdminBoardSummary[];
  improvements: Improvement[];
}

// ============================================================
// APP DATA  (estado global en App.tsx)
// ============================================================
export interface AppData {
  company: Company | null;
  workspaces: Workspace[];
  projects: Project[];
  activeWorkspaceId: string | null;
  activeProjectId: string | null;
  featureFlags: FeatureFlags;
  users: User[];
  boards: Board[];
  states: BoardState[];
  columns: BoardColumn[];
  cards: Card[];
  invites?: BoardInvite[];
  activeBoardId: string | null;
}
