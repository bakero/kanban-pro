-- ============================================================
-- Kanban Pro - Schema patch for test dataset (non-destructive)
-- Adds missing columns/tables needed by datos_prueba.sql
-- ============================================================

-- Boards: add missing multi-tenant columns
ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS company_id TEXT;

ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS project_id TEXT;

ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Improvements: add missing multi-tenant columns
ALTER TABLE improvements
  ADD COLUMN IF NOT EXISTS company_id TEXT;

ALTER TABLE improvements
  ADD COLUMN IF NOT EXISTS project_id TEXT;

-- Board logs table (if missing)
CREATE TABLE IF NOT EXISTS board_logs (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL,
  board_id    TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  change      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Company backups table (if missing)
CREATE TABLE IF NOT EXISTS company_backups (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL,
  created_by  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  summary     TEXT NOT NULL,
  snapshot    JSONB NOT NULL
);

-- Best-effort fill for existing rows missing company/project
UPDATE boards
SET company_id = COALESCE(company_id, (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1)),
    project_id = COALESCE(project_id, (SELECT id FROM projects ORDER BY created_at ASC LIMIT 1))
WHERE company_id IS NULL OR project_id IS NULL;

UPDATE improvements
SET company_id = COALESCE(company_id, (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1)),
    project_id = COALESCE(project_id, (SELECT id FROM projects ORDER BY created_at ASC LIMIT 1))
WHERE company_id IS NULL OR project_id IS NULL;
