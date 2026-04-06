-- ============================================================
-- KANBAN PRO â€” Schema completo
-- Ejecutar en Supabase SQL Editor (Fresh install)
-- ============================================================

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                       TEXT PRIMARY KEY,
  auth_user_id             TEXT UNIQUE,
  name                     TEXT NOT NULL,
  email                    TEXT NOT NULL UNIQUE,
  initials                 TEXT NOT NULL,
  color                    TEXT NOT NULL,
  avatar_url               TEXT,
  google_login_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  google_confirmed_at      TIMESTAMPTZ,
  activation_email_sent_at TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COMPANIES  (tenant raÃ­z â€” cada empresa compra una licencia)
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  contact_email       TEXT NOT NULL,
  logo_url            TEXT,
  license_plan        TEXT NOT NULL DEFAULT 'trial',
  license_expires_at  TIMESTAMPTZ,
  created_by          TEXT NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- COMPANY MEMBERS  (usuarios dentro de una empresa)
-- ============================================================
CREATE TABLE IF NOT EXISTS company_members (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member',
  -- roles: 'company_admin' | 'project_manager' | 'member' | 'viewer'
  invited_by  TEXT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, user_id),
  UNIQUE(user_id)
);

-- ============================================================
-- COMPANY INVITES  (invitaciones pendientes a la empresa)
-- ============================================================
CREATE TABLE IF NOT EXISTS company_invites (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member',
  invited_by  TEXT NOT NULL REFERENCES users(id),
  status      TEXT NOT NULL DEFAULT 'pending',
  -- status: 'pending' | 'accepted'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(company_id, email)
);

-- ============================================================
-- COMPANY SETTINGS  (retencion de logs y backups)
-- ============================================================
CREATE TABLE IF NOT EXISTS company_settings (
  company_id             TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  log_retention_days     INTEGER NOT NULL DEFAULT 30,
  backup_retention_count INTEGER NOT NULL DEFAULT 10,
  backup_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- WORKSPACES  (espacios de trabajo â€” agrupan proyectos)
-- ============================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_by  TEXT NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- PROJECTS  (proyectos â€” agrupan tableros y configuran features)
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  prefix       TEXT NOT NULL,
  created_by   TEXT NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_archived  BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================================
-- PROJECT MEMBERS  (roles por proyecto)
-- ============================================================
CREATE TABLE IF NOT EXISTS project_members (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member',
  -- roles: 'project_manager' | 'member' | 'viewer'
  assigned_by TEXT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- ============================================================
-- FEATURES CATALOG  (catÃ¡logo global gestionado por super admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS features (
  id           TEXT PRIMARY KEY,
  key          TEXT NOT NULL UNIQUE,
  label        TEXT NOT NULL,
  description  TEXT,
  default_on   BOOLEAN NOT NULL DEFAULT TRUE,
  is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order   INTEGER NOT NULL DEFAULT 0
);

-- Seed del catÃ¡logo de funcionalidades
INSERT INTO features (id, key, label, description, default_on, is_mandatory, sort_order)
VALUES
  ('feat-metrics',         'metrics',               'Metricas minimas',        'Lead time, cycle time, throughput, WIP global y tiempos por columna', TRUE,  TRUE,  0),
  ('feat-metrics-burnup',  'metrics_burnup',        'Burnup chart',            'Grafico avanzado de progreso',                                       FALSE, FALSE, 1),
  ('feat-metrics-burndown','metrics_burndown',      'Burndown chart',          'Grafico avanzado de progreso',                                       FALSE, FALSE, 2),
  ('feat-improvements',    'improvements',          'Mejoras',                 'Backlog de mejoras con votacion',                                    TRUE,  TRUE,  3),
  ('feat-wip',             'wip',                   'Control WIP',             'Limites WIP en columnas',                                            TRUE,  TRUE,  4),
  ('feat-timecol',         'time_tracking',         'Tiempos por columna',     'Registro de tiempo por columna',                                     TRUE,  TRUE,  5),
  ('feat-filters',         'filters',               'Filtros',                 'Filtros de tarjetas',                                                TRUE,  TRUE,  6),
  ('feat-deps',            'dependencies',          'Dependencias',            'Relaciones entre tarjetas',                                          FALSE, FALSE, 7),
  ('feat-types',           'card_types',            'Tipos de trabajo',        'Epica, iniciativa, bug, tarea',                                      FALSE, FALSE, 8),
  ('feat-categories',      'categories',            'Categorias',              'Categorizacion de tarjetas',                                         FALSE, FALSE, 9),
  ('feat-workspaces',      'workspaces',            'Workspaces',              'Empresa -> Workspace -> Proyecto',                                  FALSE, FALSE, 10),
  ('feat-company-admin',   'company_admin_console', 'Consola empresa',         'Consola administrativa por empresa con trazas',                      FALSE, FALSE, 11),
  ('feat-logs-backups',    'logs_backups',          'Logs y backups',           'Trazas y backups por empresa',                                       FALSE, FALSE, 12),
  ('feat-auth',            'auth_isolation',        'Auth y aislamiento',      'Autenticacion y aislamiento por empresa',                            FALSE, FALSE, 13)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- COMPANY FEATURES  (overrides de funcionalidades por empresa)
-- ============================================================
CREATE TABLE IF NOT EXISTS company_features (
  id           TEXT PRIMARY KEY,
  company_id   TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  feature_key  TEXT NOT NULL REFERENCES features(key) ON DELETE CASCADE,
  is_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by   TEXT REFERENCES users(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, feature_key)
);

-- ============================================================
-- PROJECT FEATURES  (override de features por proyecto)
-- ============================================================
CREATE TABLE IF NOT EXISTS project_features (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feature_key  TEXT NOT NULL REFERENCES features(key) ON DELETE CASCADE,
  is_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by   TEXT REFERENCES users(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, feature_key)
);

-- ============================================================
-- BOARDS  (tableros â€” pertenecen a un proyecto)
-- ============================================================
CREATE TABLE IF NOT EXISTS boards (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  prefix          TEXT NOT NULL,
  card_seq        INTEGER NOT NULL DEFAULT 1,
  owner_user_id   TEXT NOT NULL REFERENCES users(id),
  board_config    JSONB NOT NULL DEFAULT '{"public":false,"requireLogin":true,"hideDoneAfterDays":0}',
  visible_fields  JSONB NOT NULL DEFAULT '[]',
  categories      JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sort_order      INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- BOARD STATES
-- ============================================================
CREATE TABLE IF NOT EXISTS board_states (
  id          TEXT PRIMARY KEY,
  board_id    TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phase       TEXT NOT NULL DEFAULT 'pre',
  is_discard  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- BOARD COLUMNS
-- ============================================================
CREATE TABLE IF NOT EXISTS board_columns (
  id          TEXT PRIMARY KEY,
  board_id    TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phase       TEXT NOT NULL DEFAULT 'pre',
  state_ids   JSONB NOT NULL DEFAULT '[]',
  wip_limit   INTEGER NOT NULL DEFAULT 0,
  is_wip      BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- CARDS  (tarjetas / trabajos)
-- ============================================================
CREATE TABLE IF NOT EXISTS cards (
  id            TEXT PRIMARY KEY,
  card_id       TEXT NOT NULL,
  board_id      TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  col_id        TEXT NOT NULL,
  state_id      TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  type          TEXT NOT NULL DEFAULT 'tarea',
  category      TEXT,
  due_date      TEXT,
  blocked       BOOLEAN NOT NULL DEFAULT FALSE,
  creator_id    TEXT NOT NULL REFERENCES users(id),
  attachments   JSONB NOT NULL DEFAULT '[]',
  comments      JSONB NOT NULL DEFAULT '[]',
  history       JSONB NOT NULL DEFAULT '[]',
  depends_on    JSONB NOT NULL DEFAULT '[]',
  blocked_by    JSONB NOT NULL DEFAULT '[]',
  time_per_col  JSONB NOT NULL DEFAULT '{}',
  col_since     BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  discarded_at  TIMESTAMPTZ
);

-- ============================================================
-- BOARD LOGS  (registro de cambios por tablero)
-- ============================================================
CREATE TABLE IF NOT EXISTS board_logs (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  board_id    TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id),
  entity_id   TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  change      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COMPANY ADMIN LOGS  (trazas de acciones en consola de empresa)
-- ============================================================
CREATE TABLE IF NOT EXISTS company_admin_logs (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COMPANY BACKUPS  (snapshot del estado de la empresa)
-- ============================================================
CREATE TABLE IF NOT EXISTS company_backups (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by  TEXT NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  summary     TEXT NOT NULL,
  snapshot    JSONB NOT NULL
);

-- ============================================================
-- IMPROVEMENTS  (mejoras â€” scoped a proyecto, con contexto de tablero)
-- ============================================================
CREATE TABLE IF NOT EXISTS improvements (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  board_id    TEXT REFERENCES boards(id) ON DELETE SET NULL,
  user_id     TEXT NOT NULL REFERENCES users(id),
  user_name   TEXT NOT NULL,
  description TEXT NOT NULL,
  context     TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  -- status: 'pending' | 'ai_pending' | 'applied'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at  TIMESTAMPTZ,
  ai_result   TEXT
);

-- ============================================================
-- IMPROVEMENT VOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS improvement_votes (
  id               TEXT PRIMARY KEY,
  improvement_id   TEXT NOT NULL REFERENCES improvements(id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(improvement_id, user_id)
);

