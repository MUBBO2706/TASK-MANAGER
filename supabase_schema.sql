-- Comprehensive and Idempotent Supabase Schema

-- 1. Create tables
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  project_id TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'sql',
  sql TEXT DEFAULT '',
  function_code TEXT DEFAULT '',
  description TEXT DEFAULT '',
  edge_files JSONB DEFAULT '[]',
  edge_secrets JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  folder_id TEXT,
  project_id TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  order_index BIGINT,
  production_task_id TEXT
);

CREATE TABLE IF NOT EXISTS version_backups (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  description TEXT DEFAULT '',
  prod_project_id TEXT,
  staging_project_id TEXT,
  is_undone BOOLEAN DEFAULT false,
  state_before JSONB NOT NULL DEFAULT '{}'::jsonb,
  state_after JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL
);

-- 2. Add any missing columns safely
ALTER TABLE folders ADD COLUMN IF NOT EXISTS project_id TEXT;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS order_index BIGINT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS folder_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS edge_files JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS edge_secrets JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sql TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS function_code TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS production_task_id TEXT;

ALTER TABLE version_backups ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE version_backups ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE version_backups ADD COLUMN IF NOT EXISTS prod_project_id TEXT;
ALTER TABLE version_backups ADD COLUMN IF NOT EXISTS staging_project_id TEXT;
ALTER TABLE version_backups ADD COLUMN IF NOT EXISTS is_undone BOOLEAN DEFAULT false;
ALTER TABLE version_backups ADD COLUMN IF NOT EXISTS state_before JSONB DEFAULT '{}'::jsonb;
ALTER TABLE version_backups ADD COLUMN IF NOT EXISTS state_after JSONB DEFAULT '{}'::jsonb;
ALTER TABLE version_backups ADD COLUMN IF NOT EXISTS created_at BIGINT;

-- 3. Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_backups ENABLE ROW LEVEL SECURITY;

-- 4. Create policies safely (Drop then Create)
DROP POLICY IF EXISTS "Allow public access to projects" ON projects;
CREATE POLICY "Allow public access to projects" ON projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to tasks" ON tasks;
CREATE POLICY "Allow public access to tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to folders" ON folders;
CREATE POLICY "Allow public access to folders" ON folders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to version_backups" ON version_backups;
CREATE POLICY "Allow public access to version_backups" ON version_backups FOR ALL USING (true) WITH CHECK (true);

-- 5. Enable Realtime
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE projects, tasks, folders, version_backups;
COMMIT;

-- 6. Add Foreign Key Constraints for Cascading Deletes
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_project;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_folder;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE;

ALTER TABLE folders DROP CONSTRAINT IF EXISTS fk_folders_project;
ALTER TABLE folders ADD CONSTRAINT fk_folders_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;



