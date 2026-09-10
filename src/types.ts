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
  isContentFetched?: boolean;
  isContentStripped?: boolean;
  wasCodeModified?: boolean;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: number;
  totalTasks: number;
  sqlCount: number;
  functionCount: number;
  ranCount: number;
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
  stateBefore?: VersionBackupData | null;
  stateAfter?: VersionBackupData | null;
}

export interface ApiLog {
  id: string;
  createdAt: number;
  endpoint: string;
  method: string;
  statusCode: number;
  durationMs: number;
  projectId?: string | null;
  actionType?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestQuery?: Record<string, any>;
  requestBody?: Record<string, any> | null;
  responseBody?: Record<string, any> | null;
  errorMessage?: string | null;
  changesSummary?: {
    tasksCount?: number;
    title?: string;
    action?: string;
    stagingProjectId?: string;
    stagingProjectName?: string;
    [key: string]: any;
  } | null;
}
