-- ============================================================
-- KANBAN PRO - Migracion 001
-- Propietarios, codigos cortos, idioma, IDs numericos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- USERS: nombre separado, idioma, config UI
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lang       TEXT NOT NULL DEFAULT 'es';
ALTER TABLE users ADD COLUMN IF NOT EXISTS ui_config  JSONB NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Migrar campo name existente a first_name (solo si first_name esta vacio)
UPDATE users SET first_name = name WHERE first_name IS NULL OR first_name = '';

-- ============================================================
-- COMPANIES: propietario independiente + codigo corto para URL
-- ============================================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_id     TEXT REFERENCES users(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_code TEXT UNIQUE;

-- Restriccion de formato: solo alfanumerico, max 10 chars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_code_format'
  ) THEN
    ALTER TABLE companies ADD CONSTRAINT companies_code_format
      CHECK (company_code IS NULL OR company_code ~ '^[A-Za-z0-9]{1,10}$');
  END IF;
END $$;

-- Inicializar owner_id con el creador existente
UPDATE companies SET owner_id = created_by WHERE owner_id IS NULL;

-- ============================================================
-- WORKSPACES: propietario + ID numerico para URL (/workspace/N)
-- ============================================================
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS owner_id   TEXT REFERENCES users(id);
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS numeric_id BIGSERIAL UNIQUE;

UPDATE workspaces SET owner_id = created_by WHERE owner_id IS NULL;

DO $$
DECLARE
  seq_name text;
BEGIN
  SELECT pg_get_serial_sequence('workspaces', 'numeric_id') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    EXECUTE format('UPDATE workspaces SET numeric_id = nextval(%L) WHERE numeric_id IS NULL', seq_name);
  END IF;
END $$;

-- ============================================================
-- PROJECTS: propietario + prefix globalmente unico y validado
-- ============================================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id TEXT REFERENCES users(id);

-- El campo prefix ya existe: anadir restriccion de unicidad global
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_prefix_unique'
  ) THEN
    ALTER TABLE projects ADD CONSTRAINT projects_prefix_unique UNIQUE (prefix);
  END IF;
END $$;

-- Restriccion de formato: solo alfanumerico, max 10 chars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_prefix_format'
  ) THEN
    ALTER TABLE projects ADD CONSTRAINT projects_prefix_format
      CHECK (prefix ~ '^[A-Za-z0-9]{1,10}$');
  END IF;
END $$;

UPDATE projects SET owner_id = created_by WHERE owner_id IS NULL;

-- ============================================================
-- BOARDS: ID numerico para URL (/board/N)
-- ============================================================
ALTER TABLE boards ADD COLUMN IF NOT EXISTS numeric_id BIGSERIAL UNIQUE;

DO $$
DECLARE
  seq_name text;
BEGIN
  SELECT pg_get_serial_sequence('boards', 'numeric_id') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    EXECUTE format('UPDATE boards SET numeric_id = nextval(%L) WHERE numeric_id IS NULL', seq_name);
  END IF;
END $$;

-- ============================================================
-- CARDS: seq_id autoincremental para construir card_id
-- card_id = project.prefix || '-' || seq_id
-- ============================================================
ALTER TABLE cards ADD COLUMN IF NOT EXISTS seq_id BIGSERIAL;

DO $$
DECLARE
  seq_name text;
BEGIN
  SELECT pg_get_serial_sequence('cards', 'seq_id') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    EXECUTE format('UPDATE cards SET seq_id = nextval(%L) WHERE seq_id IS NULL', seq_name);
  END IF;
END $$;

UPDATE cards
SET card_id = UPPER(p.prefix) || '-' || cards.seq_id
FROM boards b
JOIN projects p ON p.id = b.project_id
WHERE cards.board_id = b.id
  AND cards.seq_id IS NOT NULL;

-- ============================================================
-- SUPABASE STORAGE: bucket de avatares
-- Nota: si el bucket ya existe, este INSERT fallara (ignorar el error)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Politica: lectura publica
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Avatar lectura publica' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Avatar lectura publica"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;
END $$;

-- Politica: subida solo para el propio usuario (ruta: {auth_uid}/filename)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Avatar subida propia' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Avatar subida propia"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

-- Politica: actualizacion solo para el propio usuario
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Avatar actualizacion propia' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Avatar actualizacion propia"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

-- ============================================================
-- FIN DE MIGRACION 001
-- ============================================================
