-- ============================================================
-- Kanban Pro - Datos de prueba (multi-tenant)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- USERS (incluye super admin existente)
-- ============================================================
INSERT INTO users (id, auth_user_id, name, email, initials, color, google_login_enabled, google_confirmed_at, activation_email_sent_at)
VALUES
  ('user-super',        'user-super',        'B Kasero',        'bkasero@gmail.com',   'BK', '#E24B4A', TRUE, NOW(), NOW()),
  ('user-acme-admin',   'user-acme-admin',   'Alicia Admin',    'admin@acme.com',      'AA', '#1D9E75', TRUE, NOW(), NOW()),
  ('user-acme-dev',     'user-acme-dev',     'Carlos Dev',      'dev@acme.com',        'CD', '#378ADD', TRUE, NOW(), NOW()),
  ('user-acme-pm',      'user-acme-pm',      'Paula PM',        'pm@acme.com',         'PP', '#D85A30', TRUE, NOW(), NOW()),
  ('user-beta-admin',   'user-beta-admin',   'Bea Admin',       'admin@beta.com',      'BA', '#7F77DD', TRUE, NOW(), NOW()),
  ('user-beta-ops',     'user-beta-ops',     'Oscar Ops',       'ops@beta.com',        'OO', '#888780', TRUE, NOW(), NOW()),
  ('user-beta-viewer',  'user-beta-viewer',  'Vera Viewer',     'viewer@beta.com',     'VV', '#BA7517', TRUE, NOW(), NOW())
ON CONFLICT (email) DO UPDATE
SET
  auth_user_id = EXCLUDED.auth_user_id,
  name = EXCLUDED.name,
  initials = EXCLUDED.initials,
  color = EXCLUDED.color,
  google_login_enabled = EXCLUDED.google_login_enabled,
  google_confirmed_at = EXCLUDED.google_confirmed_at,
  activation_email_sent_at = EXCLUDED.activation_email_sent_at;

-- ============================================================
-- COMPANIES
-- ============================================================
INSERT INTO companies (id, name, slug, contact_email, license_plan, created_by, is_active)
SELECT
  v.id, v.name, v.slug, v.contact_email, v.license_plan,
  (SELECT id FROM users WHERE email = 'bkasero@gmail.com' LIMIT 1) AS created_by,
  v.is_active
FROM (
  VALUES
    ('comp-acme', 'Acme Studio', 'acme-studio', 'admin@acme.com', 'professional', TRUE),
    ('comp-beta', 'Beta Labs',   'beta-labs',   'admin@beta.com', 'starter',       TRUE)
) AS v(id, name, slug, contact_email, license_plan, is_active)
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
-- COMPANY INVITES (para probar invitaciones pendientes/aceptadas)
-- ============================================================
INSERT INTO company_invites (id, company_id, email, role, invited_by, status, created_at, accepted_at)
VALUES
  ('cinv-acme-1', 'comp-acme', 'newhire@acme.com', 'member', 'user-acme-admin', 'pending',  NOW() - interval '2 days', NULL),
  ('cinv-beta-1', 'comp-beta', 'qa@beta.com',      'viewer', 'user-beta-admin', 'accepted', NOW() - interval '6 days', NOW() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- COMPANY MEMBERS (1 usuario = 1 empresa)
-- ============================================================
INSERT INTO company_members (id, company_id, user_id, role, invited_by)
SELECT
  'cm-acme-admin', 'comp-acme', 'user-acme-admin', 'company_admin',
  (SELECT id FROM users WHERE email = 'bkasero@gmail.com' LIMIT 1)
UNION ALL SELECT
  'cm-acme-dev',   'comp-acme', 'user-acme-dev',   'member',          'user-acme-admin'
UNION ALL SELECT
  'cm-acme-pm',    'comp-acme', 'user-acme-pm',    'project_manager', 'user-acme-admin'
UNION ALL SELECT
  'cm-beta-admin', 'comp-beta', 'user-beta-admin', 'company_admin',
  (SELECT id FROM users WHERE email = 'bkasero@gmail.com' LIMIT 1)
UNION ALL SELECT
  'cm-beta-ops',   'comp-beta', 'user-beta-ops',   'member',          'user-beta-admin'
UNION ALL SELECT
  'cm-beta-view',  'comp-beta', 'user-beta-viewer','viewer',          'user-beta-admin'
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- WORKSPACES
-- ============================================================
INSERT INTO workspaces (id, company_id, name, description, created_by, sort_order)
VALUES
  ('ws-acme-main', 'comp-acme', 'Principal', 'Workspace principal Acme', 'user-acme-admin', 0),
  ('ws-acme-ops',  'comp-acme', 'Ops',       'Workspace de operaciones', 'user-acme-admin', 1),
  ('ws-beta-main', 'comp-beta', 'Principal', 'Workspace principal Beta', 'user-beta-admin', 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PROJECTS
-- ============================================================
INSERT INTO projects (id, workspace_id, name, description, prefix, created_by, sort_order, is_archived)
VALUES
  ('prj-acme-web',   'ws-acme-main', 'Web Kanban',   'Proyecto web de Acme',     'ACM', 'user-acme-admin', 0, FALSE),
  ('prj-acme-ops',   'ws-acme-ops',  'Operaciones',  'Backoffice y soporte',     'OPS', 'user-acme-admin', 0, FALSE),
  ('prj-beta-app',   'ws-beta-main', 'Mobile App',   'Proyecto mobile de Beta', 'BET', 'user-beta-admin', 0, FALSE),
  ('prj-beta-arch',  'ws-beta-main', 'Legacy',       'Proyecto archivado',       'LEG', 'user-beta-admin', 1, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PROJECT MEMBERS
-- ============================================================
INSERT INTO project_members (id, project_id, user_id, role, assigned_by)
VALUES
  ('pm-acme-admin', 'prj-acme-web',  'user-acme-admin', 'project_manager', 'user-acme-admin'),
  ('pm-acme-dev',   'prj-acme-web',  'user-acme-dev',   'member',          'user-acme-admin'),
  ('pm-acme-pm',    'prj-acme-web',  'user-acme-pm',    'project_manager', 'user-acme-admin'),
  ('pm-acme-ops',   'prj-acme-ops',  'user-acme-pm',    'project_manager', 'user-acme-admin'),
  ('pm-beta-admin', 'prj-beta-app',  'user-beta-admin', 'project_manager', 'user-beta-admin'),
  ('pm-beta-ops',   'prj-beta-app',  'user-beta-ops',   'member',          'user-beta-admin'),
  ('pm-beta-view',  'prj-beta-app',  'user-beta-viewer','viewer',          'user-beta-admin')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FEATURES CATALOG (solo si no existe)
-- ============================================================
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
-- COMPANY FEATURES (overrides por empresa)
-- ============================================================
INSERT INTO company_features (id, company_id, feature_key, is_enabled, updated_by, updated_at)
VALUES
  ('cf-acme-filters',   'comp-acme', 'filters',       TRUE,  'user-acme-admin', NOW()),
  ('cf-acme-deps',      'comp-acme', 'dependencies',  TRUE,  'user-acme-admin', NOW()),
  ('cf-beta-filters',   'comp-beta', 'filters',       FALSE, 'user-beta-admin', NOW()),
  ('cf-beta-metrics',   'comp-beta', 'metrics',       TRUE,  'user-beta-admin', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- BOARDS
-- ============================================================
INSERT INTO boards (id, company_id, project_id, title, prefix, card_seq, owner_user_id, board_config, visible_fields, categories, sort_order)
VALUES
  ('board-acme-main',      'comp-acme', 'prj-acme-web', 'Tablero principal', 'ACM', 7, 'user-acme-admin',
    '{"public":false,"requireLogin":true,"hideDoneAfterDays":2}',
    '["tipo","categoria","estado","dueDate","creador","bloqueado","descripcion","comentarios","archivos","dependencias","tiempos"]',
    '["Frontend","Backend","Producto","Infra"]', 0),
  ('board-acme-marketing', 'comp-acme', 'prj-acme-web', 'Marketing',         'MKT', 3, 'user-acme-pm',
    '{"public":false,"requireLogin":true,"hideDoneAfterDays":0}',
    '["tipo","categoria","estado","dueDate","creador","bloqueado","descripcion","comentarios","archivos","dependencias","tiempos"]',
    '["Contenido","Campanas","Eventos"]', 1),
  ('board-acme-ops',       'comp-acme', 'prj-acme-ops', 'Ops & Soporte',      'OPS', 2, 'user-acme-pm',
    '{"public":false,"requireLogin":true,"hideDoneAfterDays":5}',
    '["tipo","categoria","estado","dueDate","creador","bloqueado","descripcion","comentarios","archivos","dependencias","tiempos"]',
    '["Soporte","Incidentes"]', 0),
  ('board-beta-main',      'comp-beta', 'prj-beta-app', 'Roadmap app',        'BET', 3, 'user-beta-admin',
    '{"public":false,"requireLogin":true,"hideDoneAfterDays":3}',
    '["tipo","categoria","estado","dueDate","creador","bloqueado","descripcion","comentarios","archivos","dependencias","tiempos"]',
    '["Mobile","Infra"]', 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- BOARD STATES
-- ============================================================
INSERT INTO board_states (id, board_id, name, phase, is_discard, sort_order)
VALUES
  ('st-acme-1',  'board-acme-main',      'Pendiente',  'pre',  FALSE, 0),
  ('st-acme-2',  'board-acme-main',      'En curso',   'work', FALSE, 1),
  ('st-acme-3',  'board-acme-main',      'Completado', 'post', FALSE, 2),
  ('st-acme-4',  'board-acme-main',      'Descartado', 'post', TRUE,  3),
  ('st-mkt-1',   'board-acme-marketing', 'Pendiente',  'pre',  FALSE, 0),
  ('st-mkt-2',   'board-acme-marketing', 'En curso',   'work', FALSE, 1),
  ('st-mkt-3',   'board-acme-marketing', 'Completado', 'post', FALSE, 2),
  ('st-mkt-4',   'board-acme-marketing', 'Descartado', 'post', TRUE,  3),
  ('st-ops-1',   'board-acme-ops',       'Pendiente',  'pre',  FALSE, 0),
  ('st-ops-2',   'board-acme-ops',       'En curso',   'work', FALSE, 1),
  ('st-ops-3',   'board-acme-ops',       'Completado', 'post', FALSE, 2),
  ('st-ops-4',   'board-acme-ops',       'Descartado', 'post', TRUE,  3),
  ('st-beta-1',  'board-beta-main',      'Pendiente',  'pre',  FALSE, 0),
  ('st-beta-2',  'board-beta-main',      'En curso',   'work', FALSE, 1),
  ('st-beta-3',  'board-beta-main',      'Completado', 'post', FALSE, 2),
  ('st-beta-4',  'board-beta-main',      'Descartado', 'post', TRUE,  3)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- BOARD COLUMNS
-- ============================================================
INSERT INTO board_columns (id, board_id, name, phase, state_ids, wip_limit, is_wip, sort_order)
VALUES
  ('col-acme-1',  'board-acme-main',      'Por hacer',    'pre',  '["st-acme-1"]', 0, FALSE, 0),
  ('col-acme-2',  'board-acme-main',      'En progreso',  'work', '["st-acme-2"]', 3, TRUE,  1),
  ('col-acme-3',  'board-acme-main',      'Hecho',        'post', '["st-acme-3"]', 0, FALSE, 2),
  ('col-acme-4',  'board-acme-main',      'Descartado',   'post', '["st-acme-4"]', 0, FALSE, 3),
  ('col-mkt-1',   'board-acme-marketing', 'Por hacer',    'pre',  '["st-mkt-1"]',  0, FALSE, 0),
  ('col-mkt-2',   'board-acme-marketing', 'En progreso',  'work', '["st-mkt-2"]',  2, TRUE,  1),
  ('col-mkt-3',   'board-acme-marketing', 'Hecho',        'post', '["st-mkt-3"]',  0, FALSE, 2),
  ('col-mkt-4',   'board-acme-marketing', 'Descartado',   'post', '["st-mkt-4"]',  0, FALSE, 3),
  ('col-ops-1',   'board-acme-ops',       'Por hacer',    'pre',  '["st-ops-1"]',  0, FALSE, 0),
  ('col-ops-2',   'board-acme-ops',       'En progreso',  'work', '["st-ops-2"]',  1, TRUE,  1),
  ('col-ops-3',   'board-acme-ops',       'Hecho',        'post', '["st-ops-3"]',  0, FALSE, 2),
  ('col-ops-4',   'board-acme-ops',       'Descartado',   'post', '["st-ops-4"]',  0, FALSE, 3),
  ('col-beta-1',  'board-beta-main',      'Por hacer',    'pre',  '["st-beta-1"]', 0, FALSE, 0),
  ('col-beta-2',  'board-beta-main',      'En progreso',  'work', '["st-beta-2"]', 2, TRUE,  1),
  ('col-beta-3',  'board-beta-main',      'Hecho',        'post', '["st-beta-3"]', 0, FALSE, 2),
  ('col-beta-4',  'board-beta-main',      'Descartado',   'post', '["st-beta-4"]', 0, FALSE, 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- CARDS (cubre filtros, dependencias, comentarios, archivos, tiempos, descartes)
-- ============================================================
INSERT INTO cards (id, card_id, board_id, col_id, state_id, title, description, type, category, due_date, blocked, creator_id, attachments, comments, history, depends_on, blocked_by, time_per_col, col_since, created_at, completed_at, discarded_at)
VALUES
  (
    'card-acme-1', 'ACM-001', 'board-acme-main', 'col-acme-1', 'st-acme-1',
    'Preparar kickoff', 'Reunion inicial del equipo y objetivos.', 'tarea', 'Producto', '2026-04-12', FALSE, 'user-acme-admin',
    jsonb_build_array('agenda.pdf','kickoff-notes.txt'),
    jsonb_build_array(
      jsonb_build_object('id','cmt-acme-1','author','Alicia Admin','ts',to_char(now() - interval '3 hours','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'text','Agenda revisada.'),
      jsonb_build_object('id','cmt-acme-2','author','Carlos Dev','ts',to_char(now() - interval '2 hours','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'text','Inclui objetivos tecnicos.')
    ),
    jsonb_build_array(
      jsonb_build_object('ts',to_char(now() - interval '1 day','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Tarjeta creada','userId','user-acme-admin','userName','Alicia Admin'),
      jsonb_build_object('ts',to_char(now() - interval '2 hours','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Descripcion actualizada','userId','user-acme-admin','userName','Alicia Admin')
    ),
    jsonb_build_array(), jsonb_build_array(),
    '{"col-acme-1": 14400000}'::jsonb,
    floor(extract(epoch from now() - interval '2 hours')*1000),
    now() - interval '1 day', NULL, NULL
  ),
  (
    'card-acme-2', 'ACM-002', 'board-acme-main', 'col-acme-2', 'st-acme-2',
    'Implementar login', 'Auth con Supabase y roles.', 'tarea', 'Backend', '2026-04-01', TRUE, 'user-acme-dev',
    jsonb_build_array('auth-flow.png'),
    jsonb_build_array(
      jsonb_build_object('id','cmt-acme-3','author','Paula PM','ts',to_char(now() - interval '5 hours','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'text','Prioridad alta por demo.')
    ),
    jsonb_build_array(
      jsonb_build_object('ts',to_char(now() - interval '4 days','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Tarjeta creada','userId','user-acme-dev','userName','Carlos Dev'),
      jsonb_build_object('ts',to_char(now() - interval '1 hours','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Bloqueado activado','userId','user-acme-dev','userName','Carlos Dev')
    ),
    jsonb_build_array('card-acme-3'), jsonb_build_array('card-acme-6'),
    '{"col-acme-1": 21600000, "col-acme-2": 7200000}'::jsonb,
    floor(extract(epoch from now() - interval '1 hours')*1000),
    now() - interval '4 days', NULL, NULL
  ),
  (
    'card-acme-3', 'ACM-003', 'board-acme-main', 'col-acme-3', 'st-acme-3',
    'API de tablero', 'Endpoints de tableros y columnas.', 'tarea', 'Backend', NULL, FALSE, 'user-acme-dev',
    jsonb_build_array(),
    jsonb_build_array(),
    jsonb_build_array(
      jsonb_build_object('ts',to_char(now() - interval '6 days','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Tarjeta creada','userId','user-acme-dev','userName','Carlos Dev'),
      jsonb_build_object('ts',to_char(now() - interval '1 day','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Movida a "Hecho" (Completado)','userId','user-acme-admin','userName','Alicia Admin')
    ),
    jsonb_build_array(), jsonb_build_array(),
    '{"col-acme-1": 28800000, "col-acme-2": 18000000}'::jsonb,
    floor(extract(epoch from now() - interval '1 day')*1000),
    now() - interval '6 days', now() - interval '1 day', NULL
  ),
  (
    'card-acme-4', 'ACM-004', 'board-acme-main', 'col-acme-3', 'st-acme-3',
    'Documentar tablero', 'Guia rapida para usuarios.', 'tarea', 'Producto', NULL, FALSE, 'user-acme-admin',
    jsonb_build_array('guia.pdf'),
    jsonb_build_array(),
    jsonb_build_array(
      jsonb_build_object('ts',to_char(now() - interval '12 days','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Tarjeta creada','userId','user-acme-admin','userName','Alicia Admin'),
      jsonb_build_object('ts',to_char(now() - interval '10 days','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Movida a "Hecho" (Completado)','userId','user-acme-admin','userName','Alicia Admin')
    ),
    jsonb_build_array(), jsonb_build_array(),
    '{"col-acme-1": 14400000, "col-acme-2": 21600000}'::jsonb,
    floor(extract(epoch from now() - interval '10 days')*1000),
    now() - interval '12 days', now() - interval '10 days', NULL
  ),
  (
    'card-acme-5', 'ACM-005', 'board-acme-main', 'col-acme-4', 'st-acme-4',
    'Spike externo', 'Descartado por cambio de alcance.', 'tarea', 'Producto', NULL, FALSE, 'user-acme-pm',
    jsonb_build_array(),
    jsonb_build_array(),
    jsonb_build_array(
      jsonb_build_object('ts',to_char(now() - interval '5 days','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Tarjeta creada','userId','user-acme-pm','userName','Paula PM'),
      jsonb_build_object('ts',to_char(now() - interval '3 days','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Justificacion: sin presupuesto','userId','user-acme-pm','userName','Paula PM'),
      jsonb_build_object('ts',to_char(now() - interval '3 days','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Movida a "Descartado" (Descartado)','userId','user-acme-pm','userName','Paula PM')
    ),
    jsonb_build_array(), jsonb_build_array(),
    '{"col-acme-1": 7200000}'::jsonb,
    floor(extract(epoch from now() - interval '3 days')*1000),
    now() - interval '5 days', NULL, now() - interval '3 days'
  ),
  (
    'card-acme-6', 'ACM-006', 'board-acme-main', 'col-acme-2', 'st-acme-2',
    'Resolver dependencias', 'Coordinar entregas con marketing.', 'iniciativa', 'Producto', '2026-04-15', FALSE, 'user-acme-pm',
    jsonb_build_array('plan.xlsx'),
    jsonb_build_array(
      jsonb_build_object('id','cmt-acme-4','author','Paula PM','ts',to_char(now() - interval '4 hours','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'text','Necesitamos feedback de diseno.')
    ),
    jsonb_build_array(
      jsonb_build_object('ts',to_char(now() - interval '2 days','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Tarjeta creada','userId','user-acme-pm','userName','Paula PM'),
      jsonb_build_object('ts',to_char(now() - interval '30 minutes','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Movida a "En progreso" (En curso)','userId','user-acme-pm','userName','Paula PM')
    ),
    jsonb_build_array('card-acme-1'), jsonb_build_array(),
    '{"col-acme-1": 10800000, "col-acme-2": 3600000}'::jsonb,
    floor(extract(epoch from now() - interval '30 minutes')*1000),
    now() - interval '2 days', NULL, NULL
  ),
  (
    'card-mkt-1', 'MKT-001', 'board-acme-marketing', 'col-mkt-2', 'st-mkt-2',
    'Campana primavera', 'Landing y anuncios pagos.', 'epica', 'Campanas', '2026-04-20', FALSE, 'user-acme-pm',
    jsonb_build_array('brief.pdf','creatives.zip'),
    jsonb_build_array(),
    jsonb_build_array(
      jsonb_build_object('ts',to_char(now() - interval '3 days','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Tarjeta creada','userId','user-acme-pm','userName','Paula PM')
    ),
    jsonb_build_array(), jsonb_build_array(),
    '{"col-mkt-2": 7200000}'::jsonb,
    floor(extract(epoch from now() - interval '1 day')*1000),
    now() - interval '3 days', NULL, NULL
  ),
  (
    'card-mkt-2', 'MKT-002', 'board-acme-marketing', 'col-mkt-3', 'st-mkt-3',
    'Post lanzamiento', 'Resumen de resultados.', 'tarea', 'Contenido', NULL, FALSE, 'user-acme-admin',
    jsonb_build_array(),
    jsonb_build_array(),
    jsonb_build_array(
      jsonb_build_object('ts',to_char(now() - interval '7 days','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Tarjeta creada','userId','user-acme-admin','userName','Alicia Admin'),
      jsonb_build_object('ts',to_char(now() - interval '1 day','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Movida a "Hecho" (Completado)','userId','user-acme-admin','userName','Alicia Admin')
    ),
    jsonb_build_array(), jsonb_build_array(),
    '{"col-mkt-1": 14400000, "col-mkt-2": 21600000}'::jsonb,
    floor(extract(epoch from now() - interval '1 day')*1000),
    now() - interval '7 days', now() - interval '1 day', NULL
  ),
  (
    'card-ops-1', 'OPS-001', 'board-acme-ops', 'col-ops-2', 'st-ops-2',
    'Incidente proxy', 'Latencia alta en region EU.', 'bug', 'Incidentes', '2026-04-05', TRUE, 'user-acme-dev',
    jsonb_build_array('logs.txt'),
    jsonb_build_array(),
    jsonb_build_array(
      jsonb_build_object('ts',to_char(now() - interval '12 hours','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Tarjeta creada','userId','user-acme-dev','userName','Carlos Dev')
    ),
    jsonb_build_array(), jsonb_build_array(),
    '{"col-ops-2": 21600000}'::jsonb,
    floor(extract(epoch from now() - interval '12 hours')*1000),
    now() - interval '12 hours', NULL, NULL
  ),
  (
    'card-beta-1', 'BET-001', 'board-beta-main', 'col-beta-1', 'st-beta-1',
    'Definir roadmap', 'Estrategia Q2', 'iniciativa', 'Mobile', '2026-04-18', FALSE, 'user-beta-admin',
    jsonb_build_array(),
    jsonb_build_array(),
    jsonb_build_array(
      jsonb_build_object('ts',to_char(now() - interval '2 days','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Tarjeta creada','userId','user-beta-admin','userName','Bea Admin')
    ),
    jsonb_build_array(), jsonb_build_array(),
    '{"col-beta-1": 7200000}'::jsonb,
    floor(extract(epoch from now() - interval '2 days')*1000),
    now() - interval '2 days', NULL, NULL
  ),
  (
    'card-beta-2', 'BET-002', 'board-beta-main', 'col-beta-3', 'st-beta-3',
    'MVP listo', 'Entrega version 0.1', 'tarea', 'Mobile', NULL, FALSE, 'user-beta-ops',
    jsonb_build_array('release-notes.md'),
    jsonb_build_array(),
    jsonb_build_array(
      jsonb_build_object('ts',to_char(now() - interval '9 days','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Tarjeta creada','userId','user-beta-ops','userName','Oscar Ops'),
      jsonb_build_object('ts',to_char(now() - interval '4 days','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'msg','Movida a "Hecho" (Completado)','userId','user-beta-admin','userName','Bea Admin')
    ),
    jsonb_build_array(), jsonb_build_array(),
    '{"col-beta-2": 14400000}'::jsonb,
    floor(extract(epoch from now() - interval '4 days')*1000),
    now() - interval '9 days', now() - interval '4 days', NULL
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- IMPROVEMENTS
-- ============================================================
INSERT INTO improvements (id, company_id, project_id, board_id, user_id, user_name, description, context, status, created_at, applied_at, ai_result)
VALUES
  ('imp-acme-1', 'comp-acme', 'prj-acme-web',  'board-acme-main', 'user-acme-dev',  'Carlos Dev',  'Filtro por prioridad',          'board',    'pending',    NOW() - interval '3 days', NULL, NULL),
  ('imp-acme-2', 'comp-acme', 'prj-acme-web',  'board-acme-main', 'user-acme-pm',   'Paula PM',    'Vista compacta de dependencias', 'board',    'ai_pending', NOW() - interval '5 days', NULL, NULL),
  ('imp-acme-3', 'comp-acme', 'prj-acme-ops',  'board-acme-ops',  'user-acme-admin','Alicia Admin','Exportar logs a CSV',            'settings', 'applied',    NOW() - interval '10 days', NOW() - interval '2 days', 'Se agrego boton de exportacion en logs con descarga CSV.'),
  ('imp-beta-1', 'comp-beta', 'prj-beta-app',  'board-beta-main', 'user-beta-ops',  'Oscar Ops',   'Vista rapida de bloqueadas',      'board',    'pending',    NOW() - interval '2 days', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO improvement_votes (id, improvement_id, user_id, created_at)
VALUES
  ('vote-acme-1', 'imp-acme-1', 'user-acme-admin', NOW() - interval '2 days'),
  ('vote-acme-2', 'imp-acme-1', 'user-acme-dev',   NOW() - interval '1 day'),
  ('vote-beta-1', 'imp-beta-1', 'user-beta-admin', NOW() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- BOARD LOGS
-- ============================================================
INSERT INTO board_logs (id, company_id, board_id, user_id, entity_id, entity_type, change, created_at)
VALUES
  ('log-acme-1', 'comp-acme', 'board-acme-main', 'user-acme-admin', 'board-acme-main', 'board', 'board_upsert', NOW() - interval '4 days'),
  ('log-acme-2', 'comp-acme', 'board-acme-main', 'user-acme-dev',   'card-acme-2',    'card',  'card_upsert',  NOW() - interval '1 day'),
  ('log-acme-3', 'comp-acme', 'board-acme-main', 'user-acme-pm',    'card-acme-5',    'card',  'card_discard', NOW() - interval '3 days'),
  ('log-mkt-1',  'comp-acme', 'board-acme-marketing', 'user-acme-pm','card-mkt-1',    'card',  'card_upsert',  NOW() - interval '2 days'),
  ('log-ops-1',  'comp-acme', 'board-acme-ops',       'user-acme-dev','card-ops-1',   'card',  'card_upsert',  NOW() - interval '12 hours'),
  ('log-beta-1', 'comp-beta', 'board-beta-main', 'user-beta-admin', 'card-beta-1',    'card',  'card_upsert',  NOW() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- COMPANY BACKUPS
-- ============================================================
INSERT INTO company_backups (id, company_id, created_by, summary, snapshot, created_at)
VALUES
  ('backup-acme-1', 'comp-acme', 'user-acme-admin', 'Backup inicial', '{"boards":["board-acme-main","board-acme-marketing","board-acme-ops"]}', NOW() - interval '7 days'),
  ('backup-acme-2', 'comp-acme', 'user-acme-admin', 'Backup previo demo', '{"boards":["board-acme-main"]}', NOW() - interval '1 day'),
  ('backup-beta-1', 'comp-beta', 'user-beta-admin', 'Backup inicial', '{"boards":["board-beta-main"]}', NOW() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

