export type TaskStatus = 'pending' | 'ran' | 'error';

export interface EdgeFile {
  id: string;
  name: string;
  code: string;
}

export interface EdgeSecret {
  id: string;
  key: string;
  value: string;
}

export interface SqlTask {
  id: string;
  title: string;
  type?: 'sql' | 'edge_function';
  sql: string;
  functionCode?: string;
  description?: string;
  edgeFiles?: EdgeFile[];
  edgeSecrets?: EdgeSecret[];
  status: TaskStatus;
  folderId: string | null;
  projectId: string | null;
  createdAt: number;
  updatedAt: number;
  orderIndex?: number;
  productionTaskId?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface VersionBackupData {
  projects: Project[];
  tasks: SqlTask[];
}

export type VersionAction = 
  | 'merge' 
  | 'reject' 
  | 'create_task' 
  | 'update_task' 
  | 'update_status'
  | 'delete_task' 
  | 'create_project' 
  | 'rename_project' 
  | 'delete_project' 
  | 'clone_project' 
  | 'import_tasks';

export interface VersionBackup {
  id: string;
  timestamp: number;
  action: VersionAction | string;
  description: string;
  isUndone?: boolean;
  prodProjectId: string;
  stagingProjectId: string | null;
  stateBefore: VersionBackupData;
  stateAfter: VersionBackupData;
}
