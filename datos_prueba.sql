-- ============================================================
-- Kanban Pro - Datos de prueba (multi-tenant)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- USERS
-- ============================================================
INSERT INTO users (id, auth_user_id, name, email, initials, color, google_login_enabled, google_confirmed_at)
VALUES
  ('user-super',      'user-super',      'B Kasero',        'bkasero@gmail.com',       'BK', '#E24B4A', TRUE, NOW()),
  ('user-acme-admin', 'user-acme-admin', 'Alicia Admin',    'admin@acme.com',          'AA', '#1D9E75', TRUE, NOW()),
  ('user-acme-dev',   'user-acme-dev',   'Carlos Dev',      'dev@acme.com',            'CD', '#378ADD', TRUE, NOW()),
  ('user-beta-admin', 'user-beta-admin', 'Bea Admin',       'admin@beta.com',          'BA', '#7F77DD', TRUE, NOW()),
  ('user-beta-ops',   'user-beta-ops',   'Oscar Ops',       'ops@beta.com',            'OO', '#888780', TRUE, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- COMPANIES
-- ============================================================
INSERT INTO companies (id, name, slug, contact_email, license_plan, created_by, is_active)
VALUES
  ('comp-acme', 'Acme Studio', 'acme-studio', 'admin@acme.com', 'professional', 'user-super', TRUE),
  ('comp-beta', 'Beta Labs',   'beta-labs',   'admin@beta.com', 'starter',       'user-super', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- COMPANY SETTINGS
-- ============================================================
INSERT INTO company_settings (company_id, log_retention_days, backup_retention_count, backup_enabled, updated_at)
VALUES
  ('comp-acme', 45, 12, TRUE, NOW()),
  ('comp-beta', 20, 8,  TRUE, NOW())
ON CONFLICT (company_id) DO NOTHING;

-- ============================================================
-- COMPANY MEMBERS (1 usuario = 1 empresa)
-- ============================================================
INSERT INTO company_members (id, company_id, user_id, role, invited_by)
VALUES
  ('cm-acme-admin', 'comp-acme', 'user-acme-admin', 'company_admin', 'user-super'),
  ('cm-acme-dev',   'comp-acme', 'user-acme-dev',   'member',        'user-acme-admin'),
  ('cm-beta-admin', 'comp-beta', 'user-beta-admin', 'company_admin', 'user-super'),
  ('cm-beta-ops',   'comp-beta', 'user-beta-ops',   'member',        'user-beta-admin')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- WORKSPACES
-- ============================================================
INSERT INTO workspaces (id, company_id, name, description, created_by, sort_order)
VALUES
  ('ws-acme-main', 'comp-acme', 'Principal', 'Workspace principal Acme', 'user-acme-admin', 0),
  ('ws-beta-main', 'comp-beta', 'Principal', 'Workspace principal Beta', 'user-beta-admin', 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PROJECTS
-- ============================================================
INSERT INTO projects (id, workspace_id, name, description, prefix, created_by, sort_order, is_archived)
VALUES
  ('prj-acme-web', 'ws-acme-main', 'Web Kanban', 'Proyecto web de Acme', 'ACM', 'user-acme-admin', 0, FALSE),
  ('prj-beta-app', 'ws-beta-main', 'Mobile App', 'Proyecto mobile de Beta', 'BET', 'user-beta-admin', 0, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PROJECT MEMBERS
-- ============================================================
INSERT INTO project_members (id, project_id, user_id, role, assigned_by)
VALUES
  ('pm-acme-admin', 'prj-acme-web', 'user-acme-admin', 'project_manager', 'user-acme-admin'),
  ('pm-acme-dev',   'prj-acme-web', 'user-acme-dev',   'member',          'user-acme-admin'),
  ('pm-beta-admin', 'prj-beta-app', 'user-beta-admin', 'project_manager', 'user-beta-admin'),
  ('pm-beta-ops',   'prj-beta-app', 'user-beta-ops',   'member',          'user-beta-admin')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- BOARDS
-- ============================================================
INSERT INTO boards (id, company_id, project_id, title, prefix, card_seq, owner_user_id, board_config, visible_fields, categories, sort_order)
VALUES
  ('board-acme-main', 'comp-acme', 'prj-acme-web', 'Tablero principal', 'ACM', 3, 'user-acme-admin',
    '{"public":false,"requireLogin":true,"hideDoneAfterDays":0}', '["tipo","categoria","estado","dueDate","creador","bloqueado","descripcion","comentarios"]',
    '["Frontend","Backend","Producto"]', 0),
  ('board-beta-main', 'comp-beta', 'prj-beta-app', 'Roadmap app', 'BET', 3, 'user-beta-admin',
    '{"public":false,"requireLogin":true,"hideDoneAfterDays":3}', '["tipo","categoria","estado","dueDate","creador","bloqueado","descripcion","comentarios"]',
    '["Mobile","Infra"]', 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- BOARD STATES
-- ============================================================
INSERT INTO board_states (id, board_id, name, phase, is_discard, sort_order)
VALUES
  ('st-acme-1', 'board-acme-main', 'Pendiente',  'pre',  FALSE, 0),
  ('st-acme-2', 'board-acme-main', 'En curso',   'work', FALSE, 1),
  ('st-acme-3', 'board-acme-main', 'Completado', 'post', FALSE, 2),
  ('st-acme-4', 'board-acme-main', 'Descartado', 'post', TRUE,  3),
  ('st-beta-1', 'board-beta-main', 'Pendiente',  'pre',  FALSE, 0),
  ('st-beta-2', 'board-beta-main', 'En curso',   'work', FALSE, 1),
  ('st-beta-3', 'board-beta-main', 'Completado', 'post', FALSE, 2),
  ('st-beta-4', 'board-beta-main', 'Descartado', 'post', TRUE,  3)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- BOARD COLUMNS
-- ============================================================
INSERT INTO board_columns (id, board_id, name, phase, state_ids, wip_limit, is_wip, sort_order)
VALUES
  ('col-acme-1', 'board-acme-main', 'Por hacer',    'pre',  '["st-acme-1"]', 0, FALSE, 0),
  ('col-acme-2', 'board-acme-main', 'En progreso',  'work', '["st-acme-2"]', 3, TRUE,  1),
  ('col-acme-3', 'board-acme-main', 'Hecho',        'post', '["st-acme-3"]', 0, FALSE, 2),
  ('col-acme-4', 'board-acme-main', 'Descartado',   'post', '["st-acme-4"]', 0, FALSE, 3),
  ('col-beta-1', 'board-beta-main', 'Por hacer',    'pre',  '["st-beta-1"]', 0, FALSE, 0),
  ('col-beta-2', 'board-beta-main', 'En progreso',  'work', '["st-beta-2"]', 2, TRUE,  1),
  ('col-beta-3', 'board-beta-main', 'Hecho',        'post', '["st-beta-3"]', 0, FALSE, 2),
  ('col-beta-4', 'board-beta-main', 'Descartado',   'post', '["st-beta-4"]', 0, FALSE, 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- CARDS
-- ============================================================
INSERT INTO cards (id, card_id, board_id, col_id, state_id, title, description, type, category, due_date, blocked, creator_id, attachments, comments, history, depends_on, blocked_by, time_per_col, col_since, created_at, completed_at, discarded_at)
VALUES
  ('card-acme-1', 'ACM-001', 'board-acme-main', 'col-acme-1', 'st-acme-1', 'Preparar kickoff', 'Reunión inicial del equipo', 'tarea', 'Producto', '', FALSE, 'user-acme-admin',
    '[]', '[]', '[{"ts":"2026-04-01T08:00:00Z","msg":"Tarjeta creada","userId":"user-acme-admin","userName":"Alicia Admin"}]', '[]', '[]', '{}', 1711958400000, NOW(), NULL, NULL),
  ('card-acme-2', 'ACM-002', 'board-acme-main', 'col-acme-2', 'st-acme-2', 'Implementar login', 'Auth con Supabase', 'tarea', 'Backend', '', FALSE, 'user-acme-dev',
    '[]', '[]', '[{"ts":"2026-04-01T09:00:00Z","msg":"Tarjeta creada","userId":"user-acme-dev","userName":"Carlos Dev"}]', '[]', '[]', '{}', 1711962000000, NOW(), NULL, NULL),
  ('card-beta-1', 'BET-001', 'board-beta-main', 'col-beta-1', 'st-beta-1', 'Definir roadmap', 'Estrategia Q2', 'iniciativa', 'Mobile', '', FALSE, 'user-beta-admin',
    '[]', '[]', '[{"ts":"2026-04-01T08:30:00Z","msg":"Tarjeta creada","userId":"user-beta-admin","userName":"Bea Admin"}]', '[]', '[]', '{}', 1711960200000, NOW(), NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- IMPROVEMENTS
-- ============================================================
INSERT INTO improvements (id, company_id, project_id, board_id, user_id, user_name, description, context, status, created_at, applied_at, ai_result)
VALUES
  ('imp-acme-1', 'comp-acme', 'prj-acme-web', 'board-acme-main', 'user-acme-dev', 'Carlos Dev', 'Añadir filtro por prioridad', 'board', 'pending', NOW(), NULL, NULL),
  ('imp-beta-1', 'comp-beta', 'prj-beta-app', 'board-beta-main', 'user-beta-ops', 'Oscar Ops', 'Vista rápida de bloqueadas', 'board', 'ai_pending', NOW(), NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO improvement_votes (id, improvement_id, user_id, created_at)
VALUES
  ('vote-acme-1', 'imp-acme-1', 'user-acme-admin', NOW()),
  ('vote-acme-2', 'imp-acme-1', 'user-acme-dev', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- COMPANY FEATURES (override)
-- ============================================================
INSERT INTO company_features (id, company_id, feature_key, is_enabled, updated_by, updated_at)
VALUES
  ('cf-acme-filters', 'comp-acme', 'filters', TRUE,  'user-acme-admin', NOW()),
  ('cf-beta-filters', 'comp-beta', 'filters', FALSE, 'user-beta-admin', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- BOARD LOGS
-- ============================================================
INSERT INTO board_logs (id, company_id, board_id, user_id, entity_id, entity_type, change, created_at)
VALUES
  ('log-acme-1', 'comp-acme', 'board-acme-main', 'user-acme-admin', 'board-acme-main', 'board', 'board_upsert', NOW()),
  ('log-acme-2', 'comp-acme', 'board-acme-main', 'user-acme-dev',   'card-acme-2',    'card',  'card_upsert',  NOW()),
  ('log-beta-1', 'comp-beta', 'board-beta-main', 'user-beta-admin', 'card-beta-1',    'card',  'card_upsert',  NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- COMPANY BACKUPS
-- ============================================================
INSERT INTO company_backups (id, company_id, created_by, summary, snapshot, created_at)
VALUES
  ('backup-acme-1', 'comp-acme', 'user-acme-admin', 'Backup inicial', '{"boards":["board-acme-main"]}', NOW()),
  ('backup-beta-1', 'comp-beta', 'user-beta-admin', 'Backup inicial', '{"boards":["board-beta-main"]}', NOW())
ON CONFLICT (id) DO NOTHING;
