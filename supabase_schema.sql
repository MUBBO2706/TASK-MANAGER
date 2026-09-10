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

-- 7. Optimized Index for project-level task filtering
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

-- 8. Dynamic Project Summary View for fast dropdown metadata and counts
CREATE OR REPLACE VIEW project_summaries AS
SELECT 
  p.id AS project_id,
  p.name AS project_name,
  p.created_at AS project_created_at,
  COUNT(t.id) AS total_tasks,
  COUNT(CASE WHEN t.type = 'sql' OR t.type IS NULL OR t.type = '' THEN 1 END) AS sql_count,
  COUNT(CASE WHEN t.type = 'edge_function' THEN 1 END) AS function_count,
  COUNT(CASE WHEN t.status = 'ran' THEN 1 END) AS ran_count
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
GROUP BY p.id, p.name, p.created_at;

-- 10. Helper function to extract specific task's full state from a version backup
CREATE OR REPLACE FUNCTION get_version_task_state(version_id TEXT, target_task_id TEXT, is_before BOOLEAN)
RETURNS jsonb AS $$
DECLARE
  target_state jsonb;
  found_task jsonb;
BEGIN
  -- Get the state_before or state_after from the version_backups table
  IF is_before THEN
    SELECT state_before INTO target_state FROM version_backups WHERE id = version_id;
  ELSE
    SELECT state_after INTO target_state FROM version_backups WHERE id = version_id;
  END IF;

  -- Extract the specific task object from the tasks array within the JSONB state
  IF jsonb_typeof(target_state->'tasks') = 'array' THEN
    SELECT task_elem INTO found_task
    FROM jsonb_array_elements(target_state->'tasks') AS task_elem
    WHERE (task_elem->>'id') = target_task_id
    LIMIT 1;
  END IF;
  
  RETURN found_task;
END;
$$ LANGUAGE plpgsql STABLE;

-- 11. API Access Logs Table for auditing open API requests, payloads, and responses
CREATE TABLE IF NOT EXISTS api_logs (
  id TEXT PRIMARY KEY,
  created_at BIGINT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INT NOT NULL,
  duration_ms INT NOT NULL DEFAULT 0,
  project_id TEXT,
  action_type TEXT,
  ip_address TEXT,
  user_agent TEXT,
  request_query JSONB DEFAULT '{}'::jsonb,
  request_body JSONB DEFAULT '{}'::jsonb,
  response_body JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  changes_summary JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access to api_logs" ON api_logs;
CREATE POLICY "Allow public access to api_logs" ON api_logs FOR ALL USING (true) WITH CHECK (true);

-- Indexing for high-performance log inspection
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_status_code ON api_logs(status_code);

-- Enable Realtime for api_logs
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE projects, tasks, folders, version_backups, api_logs;
COMMIT;

-- Reload schema cache to ensure the function is immediately available via API
NOTIFY pgrst, 'reload schema';




