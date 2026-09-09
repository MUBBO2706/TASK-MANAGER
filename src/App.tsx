import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Plus,
  Database,
  CheckCircle2,
  Circle,
  Trash2,
  Copy,
  Check,
  ChevronLeft,
  Search,
  CheckSquare,
  X,
  ChevronDown,
  Undo2,
  Redo2,
  DownloadCloud,
  UploadCloud,
  FileCode,
  Moon,
  Sun,
  Pencil,
  PlusCircle,
  GripVertical,
  MoreHorizontal,
  MoreVertical,
  RotateCw,
  Folder,
  FolderClosed,
  FlaskConical,
  History,
  Layers,
  Loader,
  CloudSync,
  Terminal
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from 'sonner';
import JSZip from "jszip";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useHybridState } from "./hooks/useHybridState";
import EdgeFunctionEditor from "./components/EdgeFunctionEditor";
import DiffViewer from "./components/DiffViewer";
import SmartImportModal, { ParsedImportData, ImportMode } from "./components/SmartImportModal";
import { DebouncedCodeEditor, DebouncedTitleInput } from "./components/SharedUI";
import { PWAInstallModal } from "./components/PWAInstallModal";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { VersionControlPage, VersionControlSkeleton } from "./components/version-control";
import SkeletonLoader, { TaskItemSkeleton, EditorSkeleton } from "./components/SkeletonLoader";
import DiffViewerSkeleton, { NoChangesDiffSkeleton } from "./components/DiffViewerSkeleton";
import { SqlTask, Project, ProjectSummary, VersionBackup, VersionBackupData, VersionAction } from "./types";
import { cn } from "./lib/utils";
import { supabase } from "./lib/supabase";

const CUSTOM_COL_RESIZE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M8 9L5 12L8 15V9Z' fill='%230f172a'/%3E%3Cpath d='M16 9L19 12L16 15V9Z' fill='%230f172a'/%3E%3Cline x1='12' y1='6' x2='12' y2='18' stroke='%230f172a' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 12 12, col-resize`;

const devKeysModules = import.meta.glob('./lib/dev-keys.ts', { eager: true });
const devKeys: any = devKeysModules['./lib/dev-keys.ts'] || {};
export const API_KEY_FALLBACK = import.meta.env.VITE_API_KEY || devKeys.VITE_API_KEY || "sk_sync_b4k92jdm10";

interface TaskItemProps {
  task: SqlTask;
  index: number;
  isLast?: boolean;
  isSelectionMode: boolean;
  isSelected: boolean;
  isLastVisited: boolean;
  isSelectedForDeletion: boolean;
  diffStatus?: 'added' | 'modified' | 'deleted';
  onPointerDown: (e: React.PointerEvent, taskId: string) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  cancelLongPress: () => void;
  onTaskClick: (taskId: string) => void;
  onStatusToggle: (taskId: string, currentStatus: string, e: React.MouseEvent) => void;
  onHover?: (taskId: string) => void;
  provided: any;
  snapshot: any;
}

const TaskItem = React.memo(({
  task,
  index,
  isLast,
  isSelectionMode,
  isSelected,
  isLastVisited,
  isSelectedForDeletion,
  diffStatus,
  onPointerDown,
  onPointerMove,
  cancelLongPress,
  onTaskClick,
  onStatusToggle,
  onHover,
  provided,
  snapshot
}: TaskItemProps) => {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      style={{
        ...provided.draggableProps.style,
        opacity: snapshot.isDragging ? 0.9 : 1,
      }}
      onPointerDown={(e) => {
        onHover?.(task.id);
        onPointerDown(e, task.id);
      }}
      onMouseEnter={() => onHover?.(task.id)}
      onPointerMove={onPointerMove}
      onPointerUp={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onClick={() => onTaskClick(task.id)}
      className={cn(
        "flex flex-col gap-1.5 p-3 cursor-pointer transition-colors select-none",
        isLast && !snapshot.isDragging ? "border-b-0" : "border-b",
        isSelected && !isSelectionMode
          ? "bg-blue-50 dark:bg-blue-600/10 border-blue-200 dark:border-blue-800/50 z-10 relative"
          : isLastVisited && !isSelected
          ? "border-blue-400/50 dark:border-blue-500/50 bg-blue-50/30 dark:bg-blue-900/5"
          : "border-slate-200 dark:border-[#0a0a0a] bg-white dark:bg-[#0a0a0a] hover:bg-slate-50 dark:hover:bg-slate-800/50",
        isSelectionMode && isSelectedForDeletion && "border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30",
        snapshot.isDragging && "shadow-xl border-blue-500/70 dark:border-blue-400/70 bg-white dark:bg-zinc-900 rounded-lg z-50 ring-2 ring-blue-500/20",
        diffStatus === 'added' && !isSelected && "bg-emerald-50/50 dark:bg-emerald-950/20 border-l-[3px] border-l-emerald-500",
        diffStatus === 'modified' && !isSelected && "bg-amber-50/50 dark:bg-amber-950/20 border-l-[3px] border-l-amber-500",
        diffStatus === 'deleted' && !isSelected && "bg-red-50/50 dark:bg-red-950/20 border-l-[3px] border-l-red-500 line-through opacity-60"
      )}
    >
      {/* Top Row: Checkbox/Circle, Index, Title, and Drag Handle */}
      <div className="w-full flex items-center gap-2.5">
        {isSelectionMode ? (
          <div className="shrink-0 text-blue-600 dark:text-blue-400" onClick={(e) => { e.stopPropagation(); onTaskClick(task.id); }}>
            {isSelectedForDeletion ? (
              <CheckSquare size={18} />
            ) : (
              <div className="w-[18px] h-[18px] border-2 border-slate-300 dark:border-slate-600 rounded-sm" />
            )}
          </div>
        ) : (
          <button
            onClick={(e) => onStatusToggle(task.id, task.status, e)}
            className={cn(
              "shrink-0 transition-colors",
              task.status === "ran"
                ? "text-emerald-500"
                : "text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400",
            )}
          >
            {task.status === "ran" ? (
              <CheckCircle2 size={18} />
            ) : (
              <Circle size={18} />
            )}
          </button>
        )}
        <span className="text-xs font-mono text-slate-400 dark:text-slate-500 shrink-0">
          {index + 1}.
        </span>
        <h3
          className={cn(
            "flex-1 text-sm font-medium truncate",
            task.status === "ran" && !isSelectionMode && diffStatus !== 'deleted' && "text-slate-500 dark:text-slate-500 line-through",
            !task.title && "text-slate-400 dark:text-slate-500 italic",
            diffStatus === 'added' ? "text-emerald-800 dark:text-emerald-300" :
            diffStatus === 'modified' ? "text-amber-800 dark:text-amber-300" :
            diffStatus === 'deleted' ? "text-red-800 dark:text-red-300" : ""
          )}
        >
          {task.title || "Untitled"}
        </h3>
        <div 
          {...provided.dragHandleProps}
          style={{ ...provided.dragHandleProps?.style, touchAction: 'none' }}
          onClick={(e) => e.stopPropagation()}
          className="drag-handle text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-400 shrink-0 w-7 h-7 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none rounded -mr-1 transition-colors"
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </div>
      </div>

      {/* Bottom Row: Content / Description */}
      <div className="w-full">
        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
          {task.description || (task.type === "edge_function" ? "Edge Function" : task.sql.trim() || "Empty query")}
        </p>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.task === next.task &&
    prev.index === next.index &&
    prev.isSelectionMode === next.isSelectionMode &&
    prev.isSelected === next.isSelected &&
    prev.isLastVisited === next.isLastVisited &&
    prev.isSelectedForDeletion === next.isSelectedForDeletion &&
    prev.diffStatus === next.diffStatus &&
    prev.snapshot.isDragging === next.snapshot.isDragging &&
    prev.snapshot.isDropAnimating === next.snapshot.isDropAnimating &&
    prev.provided.draggableProps.style?.transform === next.provided.draggableProps.style?.transform &&
    prev.provided.draggableProps.style?.transition === next.provided.draggableProps.style?.transition
  );
});

const DebouncedDescriptionTextarea = ({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastReportedValue = useRef(value);

  useEffect(() => {
    if (value !== lastReportedValue.current) {
      setLocalValue(value);
      lastReportedValue.current = value;
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      lastReportedValue.current = newVal;
      onChange(newVal);
      timeoutRef.current = null;
    }, 500); // Faster UI responsiveness
  };

  return (
    <textarea
      autoFocus
      value={localValue}
      onChange={handleChange}
      onBlur={() => {
        if (localValue !== lastReportedValue.current) {
          lastReportedValue.current = localValue;
          onChange(localValue);
        }
      }}
      placeholder={placeholder}
      className={className}
    />
  );
};

export default function App() {
  const navigate = useNavigate();
  const { projectId: urlProjectId, taskId: urlTaskId } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isDiffParam = searchParams.get("diff") === "true";
  const isVersionControlParam = searchParams.get("versionControl") === "true";

  const [tasks, setTasks] = useState<SqlTask[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  const tasksRef = useRef<SqlTask[]>(tasks);
  tasksRef.current = tasks;
  const projectsRef = useRef<any[]>(projects);
  projectsRef.current = projects;
  const versionBackupsRef = useRef<VersionBackup[]>([]);
  const taskEditBaselineRef = useRef<Map<string, SqlTask>>(new Map());
  
  // Use URL params as source of truth for selection
  const selectedProjectId = urlProjectId || null;
  const [lastVisitedProjectId, setLastVisitedProjectId] = useLocalStorage<string | null>("lastVisitedProjectId", null);
  
  useEffect(() => {
    if (selectedProjectId) {
      setLastVisitedProjectId(selectedProjectId);
    }
  }, [selectedProjectId, setLastVisitedProjectId]);
  const selectedTaskId = urlTaskId || null;

  const [theme, setTheme] = useLocalStorage<"light" | "dark">("app-theme", "light");
  const [isLoading, setIsLoading] = useState(true);
  const [loadedProjectIds, setLoadedProjectIds] = useState<Set<string>>(new Set());
  const [isProjectTasksLoading, setIsProjectTasksLoading] = useState(false);
  const [lastVisitedTaskId, setLastVisitedTaskId] = useLocalStorage<string | null>("last-visited-task-id", null);
  const [searchQuery, setSearchQuery] = useLocalStorage("search-query", "");
  const [isSearchExpanded, setIsSearchExpanded] = useLocalStorage("search-expanded", false);
  const [filter, setFilter] = useHybridState<"all" | "pending" | "ran">("filter-status", "all");
  const [activeTab, setActiveTab] = useHybridState<"sql" | "edge_function">("active-tab", "sql");
  const [copied, setCopied] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(
    new Set(),
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isMovedRef = useRef<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [pendingDragUpdate, setPendingDragUpdate] = useState<{ updatedTasks: SqlTask[], originalTasks: SqlTask[] } | null>(null);
  
  // Smart Import / Export state
  const [parsedImportData, setParsedImportData] = useState<ParsedImportData | null>(null);
  const [showSmartImportModal, setShowSmartImportModal] = useState(false);
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isFabSpeedDialOpen, setIsFabSpeedDialOpen] = useState(false);
  const [isFabExportSubmenuOpen, setIsFabExportSubmenuOpen] = useState(false);
  const [isCreateSpeedDialOpen, setIsCreateSpeedDialOpen] = useState(false);

  const handleCloneProject = async (project: {id: string, name: string}) => {
    if (isCloning) return;
    setIsCloning(true);
    const toastId = "clone-project";
    toast.loading(`Creating Staging Replica of ${project.name}...`, { id: toastId });
    try {
      const newProjectId = crypto.randomUUID();
      const newProjectName = `${project.name} [STAGING]`;
      const newProject = { id: newProjectId, name: newProjectName, created_at: Date.now() };

      const { error: projectError } = await supabase.from('projects').insert(newProject);
      if (projectError) throw projectError;

      const { data: sourceTasks, error: tasksError } = await supabase.from('tasks').select('*').eq('project_id', project.id);
      if (tasksError) throw tasksError;

      let mappedDuplicatedTasks: SqlTask[] = [];

      if (sourceTasks && sourceTasks.length > 0) {
        const duplicatedTasksParams = sourceTasks.map(t => ({
          ...t,
          id: crypto.randomUUID(),
          project_id: newProjectId,
          production_task_id: t.id,
          created_at: Date.now(),
          updated_at: Date.now()
        }));

        const { error: insertTasksError } = await supabase.from('tasks').insert(duplicatedTasksParams);
        if (insertTasksError) throw insertTasksError;

        mappedDuplicatedTasks = duplicatedTasksParams.map(t => ({
          id: t.id,
          title: t.title,
          type: t.type,
          sql: t.sql,
          functionCode: t.function_code,
          description: t.description,
          edgeFiles: t.edge_files,
          edgeSecrets: t.edge_secrets,
          status: t.status,
          folderId: t.folder_id,
          projectId: t.project_id,
          productionTaskId: t.production_task_id,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          orderIndex: t.order_index
        }));

        setTasks(prev => {
          const newTasks = mappedDuplicatedTasks.filter(mt => !prev.some(p => p.id === mt.id));
          return [...newTasks, ...prev];
        });
      }

      const updatedProjectsList = [...projects, { id: newProject.id, name: newProject.name, createdAt: newProject.created_at }];
      setProjects(updatedProjectsList);
      setLoadedProjectIds(prev => new Set(prev).add(newProjectId));

      // Snapshot for version control
      const stateBefore: VersionBackupData = {
        projects: projects.filter(p => p.id === project.id),
        tasks: tasks.filter(t => t.projectId === project.id)
      };
      const stateAfter: VersionBackupData = {
        projects: [
          ...projects.filter(p => p.id === project.id),
          { id: newProject.id, name: newProject.name, createdAt: newProject.created_at }
        ],
        tasks: [
          ...tasks.filter(t => t.projectId === project.id),
          ...mappedDuplicatedTasks
        ]
      };
      saveVersionBackup(
        'clone_project',
        project.id,
        newProjectId,
        `Created Staging Replica of "${project.name}"`,
        stateBefore,
        stateAfter
      );

      navigate(`/p/${newProjectId}`);
      toast.success("Replica created successfully!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to create replica", { id: toastId });
    } finally {
      setIsCloning(false);
    }
  };

  const [isMerging, setIsMerging] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [versionBackups, setVersionBackups] = useState<VersionBackup[]>([]);
  
  // Clean up any legacy version_backups from localStorage since backups are fully persisted in Supabase
  useEffect(() => {
    try {
      window.localStorage.removeItem("version_backups");
    } catch (_) {}
  }, []);

  useEffect(() => {
    versionBackupsRef.current = versionBackups;
  }, [versionBackups]);

  // Helper functions to normalize data and detect true changes without whitespace/ordering jitter
  const normalizeTasksForComparison = (tasksList: SqlTask[]) => {
    return (tasksList || []).map((t) => ({
      id: t.id,
      title: (t.title || "").trim(),
      type: t.type || "sql",
      sql: (t.sql || "").trim(),
      functionCode: (t.functionCode || "").trim(),
      description: (t.description || "").trim(),
      edgeFiles: (t.edgeFiles || []).map((f) => ({ name: f.name, code: f.code })),
      edgeSecrets: (t.edgeSecrets || []).map((s) => ({ key: s.key, value: s.value })),
      status: t.status || "pending",
      folderId: t.folderId || null,
      projectId: t.projectId || null,
      orderIndex: t.orderIndex ?? 0,
    })).sort((a, b) => a.id.localeCompare(b.id));
  };

  const normalizeProjectsForComparison = (projList: any[]) => {
    return (projList || []).map((p) => ({
      id: p.id,
      name: (p.name || "").trim(),
    })).sort((a, b) => a.id.localeCompare(b.id));
  };

  const getBackupStateSignature = (data?: VersionBackupData) => {
    if (!data) return "";
    return JSON.stringify({
      p: normalizeProjectsForComparison(data.projects || []),
      t: normalizeTasksForComparison(data.tasks || []),
    });
  };

  const saveVersionBackup = async (
    action: VersionAction | string, 
    prodProjectId: string | null, 
    stagingProjectId: string | null, 
    actionDescription: string, 
    stateBeforeOrApiCall?: VersionBackupData | (() => Promise<void>), 
    stateAfterParam?: VersionBackupData
  ) => {
    let stateBefore: VersionBackupData;
    let stateAfter: VersionBackupData;

    if (typeof stateBeforeOrApiCall === 'function') {
      // API call closure mode (for merges & rejections)
      stateBefore = {
        projects: projectsRef.current.filter(p => p.id === prodProjectId || p.id === stagingProjectId),
        tasks: tasksRef.current.filter(t => t.projectId === prodProjectId || t.projectId === stagingProjectId)
      };

      await stateBeforeOrApiCall();

      const contentResp = await fetch(`/api/content?api_key=${API_KEY_FALLBACK}`);
      let latestTasks = tasksRef.current;
      if (contentResp.ok) {
         latestTasks = await contentResp.json();
         setTasks(latestTasks);
      }
      const projectsResp = await fetch(`/api/projects?api_key=${API_KEY_FALLBACK}`);
      let latestProjects = projectsRef.current;
      if (projectsResp.ok) {
         latestProjects = await projectsResp.json();
         setProjects(latestProjects);
      }

      stateAfter = {
        projects: latestProjects.filter(p => p.id === prodProjectId || p.id === stagingProjectId),
        tasks: latestTasks.filter(t => t.projectId === prodProjectId || t.projectId === stagingProjectId)
      };
    } else {
      stateBefore = stateBeforeOrApiCall || { projects: [], tasks: [] };
      stateAfter = stateAfterParam || { projects: [], tasks: [] };
    }

    const beforeSig = getBackupStateSignature(stateBefore);
    const afterSig = getBackupStateSignature(stateAfter);

    // Rule 1: Discard if stateBefore is identical to stateAfter (no net change, e.g. typed and deleted or canceled)
    if (beforeSig === afterSig) {
      return;
    }

    // Rule 2: Discard if stateAfter is identical to the latest recorded backup's stateAfter (prevent consecutive duplicates)
    if (versionBackupsRef.current && versionBackupsRef.current.length > 0) {
      const latestBackup = versionBackupsRef.current[0];
      const latestAfterSig = getBackupStateSignature(latestBackup.stateAfter);
      if (afterSig === latestAfterSig) {
        return;
      }
    }

    const backup: VersionBackup = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      action: action as VersionAction,
      description: actionDescription,
      isUndone: false,
      prodProjectId: prodProjectId || '',
      stagingProjectId: stagingProjectId || null,
      stateBefore,
      stateAfter
    };

    setVersionBackups(prev => {
      // Deduplicate against existing backups in list
      const filteredPrev = prev.filter(b => getBackupStateSignature(b.stateAfter) !== afterSig);
      return [backup, ...filteredPrev].slice(0, 50); // Keep last 50 snapshots in memory
    });

    // Persist to Supabase version_backups table
    try {
      await supabase.from('version_backups').insert({
        id: backup.id,
        action: backup.action,
        description: backup.description,
        prod_project_id: backup.prodProjectId || null,
        staging_project_id: backup.stagingProjectId || null,
        is_undone: false,
        state_before: backup.stateBefore,
        state_after: backup.stateAfter,
        created_at: backup.timestamp
      });
    } catch (err) {
      console.warn("Failed to persist version backup to Supabase:", err);
    }
  };

  const [showVersionHistory, setShowVersionHistory] = useState(isVersionControlParam);

  useEffect(() => {
    if (isVersionControlParam !== showVersionHistory) {
      setShowVersionHistory(isVersionControlParam);
    }
  }, [isVersionControlParam]);
  const [confirmMerge, setConfirmMerge] = useState(false);

  const handleRestoreBackup = async (backup: any, type: 'undo' | 'redo') => {
    const targetState: VersionBackupData = type === 'undo' ? backup.stateBefore : backup.stateAfter;
    const toastId = "restore-backup";
    toast.loading(`Restoring ${type === 'undo' ? 'previous' : 'newer'} state...`, { id: toastId });

    try {
       // 1. Recreate/Restore Projects in Supabase
       if (targetState.projects && targetState.projects.length > 0) {
         for (const proj of targetState.projects) {
            const { error } = await supabase.from('projects').upsert({
               id: proj.id,
               name: proj.name,
               created_at: proj.createdAt || Date.now()
            });
            if (error) throw error;
         }
       }

       // 2. Identify affected projects to clean up deleted/extraneous items
       const affectedProjectIds = Array.from(new Set([
           backup.prodProjectId, 
           backup.stagingProjectId, 
           ...(backup.stateBefore?.projects || []).map((p: any) => p.id),
           ...(backup.stateAfter?.projects || []).map((p: any) => p.id)
       ])).filter(Boolean);

       // 3. Reconcile tasks for affected projects
       if (affectedProjectIds.length > 0) {
          const currentTasksResponse = await supabase.from('tasks').select('id, project_id').in('project_id', affectedProjectIds);
          const currentTaskIds = currentTasksResponse.data?.map(t => t.id) || [];
          
          const targetTaskIds = new Set((targetState.tasks || []).map((t: any) => t.id));
          const idsToDelete = currentTaskIds.filter(id => !targetTaskIds.has(id));
          
          if (idsToDelete.length > 0) {
              await supabase.from('tasks').delete().in('id', idsToDelete);
          }
       }
       
       // 4. Handle project removals if targetState does not include them
       const targetProjectIds = new Set((targetState.projects || []).map((p: any) => p.id));
       for (const pid of affectedProjectIds) {
           if (!targetProjectIds.has(pid)) {
              await supabase.from('tasks').delete().eq('project_id', pid);
              await supabase.from('folders').delete().eq('project_id', pid);
              await supabase.from('projects').delete().eq('id', pid);
           }
       }

       // 5. Upsert restored tasks
       if (targetState.tasks && targetState.tasks.length > 0) {
          const tasksToUpsert = targetState.tasks.map((t: any) => ({
             id: t.id,
             title: t.title,
             type: t.type || 'sql',
             sql: t.sql || '',
             function_code: t.functionCode || t.function_code || '',
             description: t.description || '',
             edge_files: t.edgeFiles || t.edge_files || [],
             edge_secrets: t.edgeSecrets || t.edge_secrets || [],
             status: t.status || 'pending',
             folder_id: t.folderId || t.folder_id || null,
             project_id: t.projectId || t.project_id,
             production_task_id: t.productionTaskId || t.production_task_id || null,
             created_at: t.createdAt || t.created_at || Date.now(),
             updated_at: t.updatedAt || t.updated_at || Date.now(),
             order_index: t.orderIndex !== undefined ? t.orderIndex : t.order_index
          }));

          const { error } = await supabase.from('tasks').upsert(tasksToUpsert);

          if (error && (error.code === 'PGRST204' || JSON.stringify(error).includes('order_index'))) {
             const fallbackTasks = tasksToUpsert.map(({ order_index, ...rest }) => rest);
             const fallback = await supabase.from('tasks').upsert(fallbackTasks, { onConflict: 'id' });
             if (fallback.error) throw fallback.error;
          } else if (error) {
             throw error;
          }
       }

       // 6. Fetch fresh baseline from Supabase
       const [tasksRes, projectsRes] = await Promise.all([
         supabase.from('tasks').select('*').order('created_at', { ascending: false }),
         supabase.from('projects').select('*').order('created_at', { ascending: false })
       ]);

       let freshProjects: Project[] = [];
       if (projectsRes.data) {
         freshProjects = projectsRes.data.map(p => ({
           id: p.id,
           name: p.name,
           createdAt: p.created_at
         }));
         setProjects(freshProjects);
       }

       if (tasksRes.data) {
         const mappedTasks: SqlTask[] = tasksRes.data.map(t => ({
           id: t.id,
           title: t.title,
           type: t.type,
           sql: t.sql,
           functionCode: t.function_code,
           description: t.description,
           edgeFiles: t.edge_files,
           edgeSecrets: t.edge_secrets,
           status: t.status,
           folderId: t.folder_id,
           projectId: t.project_id,
           productionTaskId: t.production_task_id,
           createdAt: t.created_at,
           updatedAt: t.updated_at,
           orderIndex: t.order_index
         }));
         setTasks(mappedTasks);
       }

       // 7. Update Supabase version_backups record
       try {
         await supabase
           .from('version_backups')
           .update({ is_undone: type === 'undo' })
           .eq('id', backup.id);
       } catch (err) {
         console.warn("Failed to update version_backups is_undone in Supabase:", err);
       }

       setVersionBackups(prev => prev.map(b => b.id === backup.id ? { ...b, isUndone: type === 'undo' } : b));

       // 8. Navigate to restored/resurrected project or active project
       if (targetState.projects && targetState.projects.length > 0) {
         navigate(`/p/${targetState.projects[0].id}`);
       } else if (freshProjects.length > 0) {
         navigate(`/p/${freshProjects[0].id}`);
       } else {
         navigate(`/`);
       }

       toast.success(`${type === 'undo' ? 'Undone' : 'Redone'} successfully!`, { id: toastId });
       setShowVersionHistory(false);
       setSearchParams(prev => {
         const next = new URLSearchParams(prev);
         next.delete("versionControl");
         next.delete("versionId");
         return next;
       }, { replace: true });
    } catch (err) {
       console.error(err);
       toast.error("Failed to restore snapshot", { id: toastId });
    }
  };

  const handleDeleteVersionBackups = async (backupIds: string[]) => {
    if (!backupIds || backupIds.length === 0) return;
    const toastId = "delete-version-backups";
    toast.loading(`Deleting ${backupIds.length} snapshot${backupIds.length > 1 ? "s" : ""}...`, { id: toastId });
    try {
      const { error } = await supabase
        .from("version_backups")
        .delete()
        .in("id", backupIds);

      if (error && error.code !== "42P01") throw error;

      setVersionBackups(prev => prev.filter(b => !backupIds.includes(b.id)));
      toast.success(`Deleted ${backupIds.length} snapshot${backupIds.length > 1 ? "s" : ""} successfully!`, { id: toastId });
    } catch (err) {
      console.error("Failed to delete version backups:", err);
      toast.error("Failed to delete snapshots", { id: toastId });
    }
  };

  const handleMergeToProduction = async (selectedDiffItems?: any[], isAll: boolean = true) => {
    const activeProjectObj = projects.find(p => p.id === selectedProjectId);
    if (!activeProjectObj) return;

    const isStaging = activeProjectObj.name.endsWith(' [STAGING]');
    if (!isStaging) {
      toast.error("You can only merge from a staging project.");
      return;
    }

    const originalName = activeProjectObj.name.replace(' [STAGING]', '');
    const productionProject = projects.find(p => p.name === originalName);

    if (!productionProject) {
      toast.error("Original production project not found (matching name).");
      return;
    }

    setIsMerging(true);
    const toastId = "merge-production";
    toast.loading(isAll ? `Merging all to ${productionProject.name}...` : `Merging ${selectedDiffItems?.length} items...`, { id: toastId });

    try {
      const merges = selectedDiffItems ? selectedDiffItems.map(item => ({
        action: item.status === 'deleted' ? 'delete' : 'upsert',
        stagingTaskId: item.stagingTask?.id,
        prodTaskId: item.prodTask?.id
      })) : undefined;

      await saveVersionBackup(
        'merge', 
        productionProject.id, 
        activeProjectObj.id, 
        isAll ? `Merged all from ${activeProjectObj.name}` : `Merged ${selectedDiffItems?.length} items from ${activeProjectObj.name}`, 
        async () => {
          const response = await fetch(`/api/ai/merge-staging?api_key=${API_KEY_FALLBACK}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stagingProjectId: activeProjectObj.id,
              prodProjectId: productionProject.id,
              merges,
              isAll
            })
          });
          if (!response.ok) throw new Error(await response.text());
        }
      );

      if (isAll) {
        navigate(`/p/${productionProject.id}`);
      }

      toast.success("Merge successful!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to merge", { id: toastId });
    } finally {
      setIsMerging(false);
      setIsDiffViewerOpen(false);
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete("diff");
        next.delete("diffTaskId");
        return next;
      }, { replace: true });
    }
  };

  const handleRejectFromStaging = async (selectedDiffItems?: any[], isAll: boolean = true) => {
    const activeProjectObj = projects.find(p => p.id === selectedProjectId);
    if (!activeProjectObj) return;

    const isStaging = activeProjectObj.name.endsWith(' [STAGING]');
    if (!isStaging) {
      toast.error("You can only reject from a staging project.");
      return;
    }

    const originalName = activeProjectObj.name.replace(' [STAGING]', '');
    const productionProject = projects.find(p => p.name === originalName);

    if (!productionProject) {
      toast.error("Original production project not found.");
      return;
    }

    setIsRejecting(true);
    const toastId = "reject-staging";
    toast.loading(isAll ? `Rejecting all changes...` : `Rejecting ${selectedDiffItems?.length} items...`, { id: toastId });

    try {
      const rejects = selectedDiffItems ? selectedDiffItems.map(item => ({
        action: item.status === 'deleted' ? 'delete' : 'upsert',
        stagingTaskId: item.stagingTask?.id,
        prodTaskId: item.prodTask?.id
      })) : undefined;

      await saveVersionBackup(
        'reject', 
        productionProject.id, 
        activeProjectObj.id, 
        isAll ? `Rejected all changes in ${activeProjectObj.name}` : `Rejected ${selectedDiffItems?.length} changes in ${activeProjectObj.name}`, 
        async () => {
          const response = await fetch(`/api/ai/reject-staging?api_key=${API_KEY_FALLBACK}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stagingProjectId: activeProjectObj.id,
              prodProjectId: productionProject.id,
              rejects,
              isAll
            })
          });
          if (!response.ok) throw new Error(await response.text());
        }
      );

      if (isAll) {
        navigate(`/p/${productionProject.id}`);
      }
      
      toast.success("Rejection successful!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject", { id: toastId });
    } finally {
      setIsRejecting(false);
      setIsDiffViewerOpen(false);
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete("diff");
        next.delete("diffTaskId");
        return next;
      }, { replace: true });
    }
  };

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [projectMoreMenuId, setProjectMoreMenuId] = useState<string | null>(null);
  const [projectMoreMenuPos, setProjectMoreMenuPos] = useState({ right: 0, bottom: 0, width: 0 });
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{id: string, name: string} | null>(null);
  const [projectToRename, setProjectToRename] = useState<{id: string, name: string} | null>(null);
  const [renameProjectName, setRenameProjectName] = useState("");
  const [sidebarWidth, setSidebarWidth] = useLocalStorage("mainSidebarWidth", 384); // Default to 384px (lg:w-96)
  const [edgeSidebarWidthState, setEdgeSidebarWidthState] = useLocalStorage("edgeSidebarWidth", 0);
  const [diffSidebarWidth, setDiffSidebarWidth] = useLocalStorage("diffSidebarWidth", 320);
  const [versionSidebarWidth, setVersionSidebarWidth] = useLocalStorage("versionSidebarWidth", 400);
  const [isResizing, setIsResizing] = useState(false);
  const [isDiffViewerOpen, setIsDiffViewerOpen] = useState(isDiffParam);

  useEffect(() => {
    if (isDiffParam !== isDiffViewerOpen) {
      setIsDiffViewerOpen(isDiffParam);
    }
  }, [isDiffParam]);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const mainSidebarRef = useRef<HTMLDivElement>(null);
  const mainResizerHandleRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const rafResizeIdRef = useRef<number | null>(null);
  const nextSidebarWidthRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (rafResizeIdRef.current !== null) cancelAnimationFrame(rafResizeIdRef.current);
    };
  }, []);

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    e.stopPropagation();

    const container = mainContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const minWidth = 240;
    const maxWidth = window.innerWidth * 0.6;

    isResizingRef.current = true;
    setIsResizing(true);
    nextSidebarWidthRef.current = sidebarWidth;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!isResizingRef.current) return;

      const newWidth = Math.max(
        minWidth,
        Math.min(maxWidth, moveEvent.clientX - containerRect.left)
      );

      nextSidebarWidthRef.current = newWidth;

      if (rafResizeIdRef.current === null) {
        rafResizeIdRef.current = requestAnimationFrame(() => {
          if (mainSidebarRef.current) {
            mainSidebarRef.current.style.width = `${nextSidebarWidthRef.current}px`;
          }
          if (mainResizerHandleRef.current) {
            mainResizerHandleRef.current.style.left = `${nextSidebarWidthRef.current}px`;
          }
          rafResizeIdRef.current = null;
        });
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      if (rafResizeIdRef.current !== null) {
        cancelAnimationFrame(rafResizeIdRef.current);
        rafResizeIdRef.current = null;
      }

      try {
        if (e.currentTarget.hasPointerCapture(upEvent.pointerId)) {
          e.currentTarget.releasePointerCapture(upEvent.pointerId);
        }
      } catch {
        // ignore
      }

      isResizingRef.current = false;
      setIsResizing(false);
      setSidebarWidth(nextSidebarWidthRef.current);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSavesRef = useRef(0);
  const pendingUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTasksToSyncRef = useRef<Map<string, Partial<SqlTask>>>(new Map());
  const [toastPosition, setToastPosition] = useState<"top-right" | "bottom-right">(
    typeof window !== "undefined" && window.innerWidth >= 768 ? "top-right" : "bottom-right"
  );

  useEffect(() => {
    const updatePosition = () => {
      setToastPosition(window.innerWidth >= 768 ? "top-right" : "bottom-right");
    };
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, []);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
      if (metaThemeColor) metaThemeColor.setAttribute("content", "#0a0a0a");
      if (metaStatusBar) metaStatusBar.setAttribute("content", "black-translucent");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
      if (metaThemeColor) metaThemeColor.setAttribute("content", "#ffffff");
      if (metaStatusBar) metaStatusBar.setAttribute("content", "default");
    }
  }, [theme]);

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      if (lastVisitedProjectId && projects.some(p => p.id === lastVisitedProjectId)) {
        navigate(`/p/${lastVisitedProjectId}`, { replace: true });
      } else {
        navigate(`/p/${projects[0].id}`, { replace: true });
      }
    }
  }, [selectedProjectId, projects, navigate, lastVisitedProjectId]);

  // DB Sync helper
  const syncToDB = async (newTasks: Partial<SqlTask>[], successMessage?: string, isManual = false) => {
    pendingSavesRef.current += 1;
    setIsSaving(true);
    const toastId = "db-sync";
    
    if (pendingSavesRef.current === 1 && isManual) {
      toast.loading("Saving to Supabase...", { id: toastId });
    }

    try {
      // Parallel execution for multiple tasks (e.g. re-order operations)
      await Promise.all(
        newTasks.map(async (t) => {
          if (!t.id) return;

          const payload: Record<string, any> = {};
          if (t.title !== undefined) payload.title = t.title;
          if (t.type !== undefined) payload.type = t.type;
          if (t.sql !== undefined) payload.sql = t.sql;
          if (t.functionCode !== undefined) payload.function_code = t.functionCode;
          if (t.description !== undefined) payload.description = t.description;
          if (t.edgeFiles !== undefined) payload.edge_files = t.edgeFiles;
          if (t.edgeSecrets !== undefined) payload.edge_secrets = t.edgeSecrets;
          if (t.status !== undefined) payload.status = t.status;
          if (t.folderId !== undefined) payload.folder_id = t.folderId;
          if (t.projectId !== undefined) payload.project_id = t.projectId;
          if (t.productionTaskId !== undefined) payload.production_task_id = t.productionTaskId;
          if (t.createdAt !== undefined) payload.created_at = t.createdAt;
          if (t.updatedAt !== undefined) payload.updated_at = t.updatedAt;
          if (t.orderIndex !== undefined) payload.order_index = t.orderIndex;

          // Check if payload is a complete task record (for new task insertion/upsert)
          const isCompleteRecord = payload.title !== undefined && payload.created_at !== undefined && payload.project_id !== undefined;

          if (isCompleteRecord) {
            payload.id = t.id;
            let { error } = await supabase
              .from('tasks')
              .upsert(payload, { onConflict: 'id' });

            if (error && (error.code === 'PGRST204' || JSON.stringify(error).includes('order_index'))) {
              const { order_index, ...fallbackPayload } = payload;
              const fallback = await supabase.from('tasks').upsert(fallbackPayload, { onConflict: 'id' });
              error = fallback.error;
            }
            if (error) throw error;
          } else {
            // High Performance Partial Update: standard update uses Prefer: return=minimal (0 bytes response body, ~20ms faster)
            let { error } = await supabase
              .from('tasks')
              .update(payload)
              .eq('id', t.id);

            if (error && (error.code === 'PGRST204' || JSON.stringify(error).includes('order_index'))) {
              const { order_index, ...fallbackPayload } = payload;
              const fallback = await supabase.from('tasks').update(fallbackPayload).eq('id', t.id);
              error = fallback.error;
            }

            if (error) throw error;
          }
        })
      );

      if (pendingSavesRef.current === 1 && isManual) {
        toast.success(successMessage || "Saved to Supabase!", { id: toastId, duration: 2000 });
      }
      return true;
    } catch (error) {
      console.warn("Supabase sync error:", error);
      if (pendingSavesRef.current === 1 && isManual) {
        const errorMessage = error instanceof Error ? error.message : "Supabase error occurred";
        toast.error(`Sync failed: ${errorMessage}`, { 
          id: toastId, 
          duration: 6000
        });
      }
      return false;
    } finally {
      pendingSavesRef.current -= 1;
      if (pendingSavesRef.current <= 0) {
        pendingSavesRef.current = 0;
        setIsSaving(false);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    // 1. Initial fetch from Supabase (Lightweight project metadata summary + on-demand tasks for active project)
    const fetchInitialData = async () => {
      try {
        let projectsList: any[] = [];

        // 1. Try fetching lightweight project summaries view first
        try {
          const { data: viewData, error: viewError } = await supabase
            .from('project_summaries')
            .select('*')
            .order('project_created_at', { ascending: false });

          if (!viewError && viewData && viewData.length > 0) {
            projectsList = viewData.map((row: any) => ({
              id: row.project_id,
              name: row.project_name,
              createdAt: Number(row.project_created_at),
              totalTasks: Number(row.total_tasks || 0),
              sqlCount: Number(row.sql_count || 0),
              functionCount: Number(row.function_count || 0),
              ranCount: Number(row.ran_count || 0)
            }));
          }
        } catch (_) {}

        // Fallback to direct projects query if view is not available
        if (projectsList.length === 0) {
          const { data: pData, error: pError } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

          if (pError && pError.code !== '42P01') throw pError;
          if (pData) {
            projectsList = pData.map((p: any) => ({
              id: p.id,
              name: p.name,
              createdAt: p.created_at,
              totalTasks: 0,
              sqlCount: 0,
              functionCount: 0,
              ranCount: 0
            }));
          }
        }

        // Fetch version backups
        const backupsRes = await supabase
          .from('version_backups')
          .select('id, created_at, action, description, is_undone, prod_project_id, staging_project_id')
          .order('created_at', { ascending: false })
          .limit(50);

        if (backupsRes.error && backupsRes.error.code !== '42P01') {
          console.warn("version_backups table not ready yet:", backupsRes.error);
        }

        if (isMounted) {
          setProjects(projectsList);

          if (backupsRes.data && backupsRes.data.length > 0) {
            const mappedBackups: VersionBackup[] = backupsRes.data.map((b: any) => ({
              id: b.id,
              timestamp: b.created_at,
              action: b.action,
              description: b.description,
              isUndone: b.is_undone,
              prodProjectId: b.prod_project_id,
              stagingProjectId: b.staging_project_id,
              stateBefore: null,
              stateAfter: null
            }));
            setVersionBackups(mappedBackups);
          }

          // Determine target project ID for lazy loading initial tasks
          const targetProjectId = urlProjectId || (projectsList.some(p => p.id === lastVisitedProjectId) ? lastVisitedProjectId : projectsList[0]?.id);

          if (targetProjectId) {
            const targetProj = projectsList.find(p => p.id === targetProjectId);
            const projectIdsToFetch = [targetProjectId];
            if (targetProj?.name.endsWith(' [STAGING]')) {
              const prodProjName = targetProj.name.replace(' [STAGING]', '');
              const prodProj = projectsList.find(p => p.name === prodProjName);
              if (prodProj) projectIdsToFetch.push(prodProj.id);
            }

            let initialTasksData: any[] = [];
            let { data: tData, error: tError } = await supabase
              .from('tasks')
              .select('*')
              .in('project_id', projectIdsToFetch)
              .order('order_index', { ascending: true })
              .order('created_at', { ascending: true });

            if (tError && (tError.code === 'PGRST204' || JSON.stringify(tError).includes('order_index'))) {
              const fallback = await supabase
                .from('tasks')
                .select('*')
                .in('project_id', projectIdsToFetch)
                .order('created_at', { ascending: true });
              initialTasksData = fallback.data || [];
            } else {
              initialTasksData = tData || [];
            }

            const mappedTasks: SqlTask[] = initialTasksData.map(t => ({
              id: t.id,
              title: t.title,
              type: t.type,
              sql: t.sql,
              functionCode: t.function_code,
              description: t.description,
              edgeFiles: t.edge_files,
              edgeSecrets: t.edge_secrets,
              status: t.status,
              folderId: t.folder_id,
              projectId: t.project_id,
              productionTaskId: t.production_task_id,
              createdAt: t.created_at,
              updatedAt: t.updated_at,
              orderIndex: t.order_index
            })).sort((a, b) => {
              if (a.orderIndex !== undefined && a.orderIndex !== null && b.orderIndex !== undefined && b.orderIndex !== null) {
                return a.orderIndex - b.orderIndex;
              }
              if (a.orderIndex !== undefined && a.orderIndex !== null) return -1;
              if (b.orderIndex !== undefined && b.orderIndex !== null) return 1;
              return b.createdAt - a.createdAt;
            });

            setTasks(mappedTasks);
            setLoadedProjectIds(new Set(projectIdsToFetch));

            if (!urlProjectId && targetProjectId) {
              navigate(`/p/${targetProjectId}`, { replace: true });
            }
          }

          setIsLoading(false);
        }
      } catch (err) {
        console.warn("Failed to load initial data from Supabase", err);
        if (isMounted) setIsLoading(false);
      }
    };

    const setupRealtime = () => {
      supabase.getChannels().forEach(c => {
         if (c.topic === 'realtime:schema-db-changes') {
            supabase.removeChannel(c);
         }
      });

      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          (payload) => {
            if (isMounted) {
               if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                  const t = payload.new as any;
                  const mappedTask: Partial<SqlTask> = { id: t.id };
                  if (t.title !== undefined) mappedTask.title = t.title;
                  if (t.type !== undefined) mappedTask.type = t.type;
                  if (t.sql !== undefined) mappedTask.sql = t.sql;
                  if (t.function_code !== undefined) mappedTask.functionCode = t.function_code;
                  if (t.description !== undefined) mappedTask.description = t.description;
                  if (t.edge_files !== undefined) mappedTask.edgeFiles = t.edge_files;
                  if (t.edge_secrets !== undefined) mappedTask.edgeSecrets = t.edge_secrets;
                  if (t.status !== undefined) mappedTask.status = t.status;
                  if (t.folder_id !== undefined) mappedTask.folderId = t.folder_id;
                  if (t.project_id !== undefined) mappedTask.projectId = t.project_id;
                  if (t.production_task_id !== undefined) mappedTask.productionTaskId = t.production_task_id;
                  if (t.created_at !== undefined) mappedTask.createdAt = t.created_at;
                  if (t.updated_at !== undefined) mappedTask.updatedAt = t.updated_at;
                  if (t.order_index !== undefined) mappedTask.orderIndex = t.order_index;
                  
                  setTasks((prev) => {
                     const exists = prev.find(existing => existing.id === mappedTask.id);
                     if (exists) {
                         // Only apply if the incoming update is newer or same time (sometimes they arrive out of order if generated locally)
                         if (mappedTask.updatedAt && exists.updatedAt && mappedTask.updatedAt < exists.updatedAt) {
                             return prev;
                         }
                         return prev.map(existing => existing.id === mappedTask.id ? { ...existing, ...mappedTask } : existing);
                     } else if (payload.eventType === 'INSERT') {
                         return [...prev, mappedTask as SqlTask];
                     }
                     return prev;
                  });
               } else if (payload.eventType === 'DELETE') {
                  setTasks((prev) => prev.filter(existing => existing.id !== payload.old.id));
               }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'projects' },
          (payload) => {
            if (isMounted) {
               if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                  const p = payload.new as any;
                  const mappedProject = { id: p.id, name: p.name, createdAt: p.created_at };
                  setProjects((prev) => {
                     const exists = prev.find(existing => existing.id === mappedProject.id);
                     if (exists) {
                         return prev.map(existing => existing.id === mappedProject.id ? { ...existing, ...mappedProject } : existing);
                     } else {
                         return [...prev, mappedProject];
                     }
                  });
               } else if (payload.eventType === 'DELETE') {
                  setProjects((prev) => prev.filter(existing => existing.id !== payload.old.id));
               }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'version_backups' },
          (payload) => {
            if (isMounted) {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const b = payload.new as any;
                const mappedBackup: VersionBackup = {
                  id: b.id,
                  timestamp: b.created_at,
                  action: b.action,
                  description: b.description,
                  isUndone: b.is_undone,
                  prodProjectId: b.prod_project_id,
                  stagingProjectId: b.staging_project_id,
                  stateBefore: b.state_before,
                  stateAfter: b.state_after
                };
                setVersionBackups((prev) => {
                  const exists = prev.find(item => item.id === mappedBackup.id);
                  if (exists) {
                    return prev.map(item => item.id === mappedBackup.id ? mappedBackup : item);
                  } else {
                    return [mappedBackup, ...prev].slice(0, 50);
                  }
                });
              } else if (payload.eventType === 'DELETE') {
                setVersionBackups((prev) => prev.filter(item => item.id !== payload.old.id));
              }
            }
          }
        )
        .subscribe((status, err) => {
           if (status === 'SUBSCRIBED') {
             console.log('Realtime connected successfully.');
           } else if (status === 'CHANNEL_ERROR') {
             console.warn('Realtime channel error', err);
           } else if (status === 'TIMED_OUT') {
             console.warn('Realtime channel timed out');
           } else if (status === 'CLOSED') {
             console.log('Realtime channel closed');
           }
        });

      return channel;
    };

    fetchInitialData();
    const currentChannel = setupRealtime();

    // Flush any debounced pending changes immediately when user navigates away or closes tab
    const handleBeforeUnload = () => {
      if (pendingUpdateTimeoutRef.current) {
        clearTimeout(pendingUpdateTimeoutRef.current);
      }
      const tasksToSync: Partial<SqlTask>[] = Array.from(pendingTasksToSyncRef.current.values());
      pendingTasksToSyncRef.current.clear();
      if (tasksToSync.length > 0) {
        syncToDB(tasksToSync);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isMounted = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (currentChannel) supabase.removeChannel(currentChannel);
    };
  }, []);

  // 2. On-demand fetch tasks when switching projects
  useEffect(() => {
    if (!selectedProjectId || isLoading) return;
    let isSubscribed = true;

    const activeProj = projectsRef.current.find(p => p.id === selectedProjectId);
    const prodProj = activeProj?.name.endsWith(' [STAGING]')
      ? projectsRef.current.find(p => p.name === activeProj.name.replace(' [STAGING]', ''))
      : null;

    const projectIdsToFetch = [selectedProjectId];
    if (prodProj) projectIdsToFetch.push(prodProj.id);

    const idsNeedingFetch = projectIdsToFetch.filter(
      id => !loadedProjectIds.has(id) && !tasksRef.current.some(t => t.projectId === id)
    );

    if (idsNeedingFetch.length === 0) {
      setIsProjectTasksLoading(false);
      return;
    }

    setIsProjectTasksLoading(true);

    const loadTasksForSelectedProject = async () => {
      const CHUNK_SIZE = 12;
      let offset = 0;
      let hasMore = true;

      try {
        while (hasMore && isSubscribed) {
          let chunkData: any[] = [];
          let { data, error } = await supabase
            .from('tasks')
            .select('*')
            .in('project_id', idsNeedingFetch)
            .order('order_index', { ascending: true })
            .order('created_at', { ascending: true })
            .range(offset, offset + CHUNK_SIZE - 1);

          if (error && (error.code === 'PGRST204' || JSON.stringify(error).includes('order_index'))) {
            const fallback = await supabase
              .from('tasks')
              .select('*')
              .in('project_id', idsNeedingFetch)
              .order('created_at', { ascending: true })
              .range(offset, offset + CHUNK_SIZE - 1);
            chunkData = fallback.data || [];
          } else {
            chunkData = data || [];
          }

          if (!isSubscribed) break;

          if (chunkData.length > 0) {
            const mappedTasks: SqlTask[] = chunkData.map(t => ({
              id: t.id,
              title: t.title,
              type: t.type,
              sql: t.sql,
              functionCode: t.function_code,
              description: t.description,
              edgeFiles: t.edge_files,
              edgeSecrets: t.edge_secrets,
              status: t.status,
              folderId: t.folder_id,
              projectId: t.project_id,
              productionTaskId: t.production_task_id,
              createdAt: t.created_at,
              updatedAt: t.updated_at,
              orderIndex: t.order_index
            }));

            setTasks(prev => {
              const taskMap = new Map<string, SqlTask>(prev.map(t => [t.id, t]));
              mappedTasks.forEach(t => taskMap.set(t.id, t));
              return Array.from(taskMap.values()).sort((a, b) => {
                if (a.orderIndex !== undefined && a.orderIndex !== null && b.orderIndex !== undefined && b.orderIndex !== null) {
                  return a.orderIndex - b.orderIndex;
                }
                if (a.orderIndex !== undefined && a.orderIndex !== null) return -1;
                if (b.orderIndex !== undefined && b.orderIndex !== null) return 1;
                return b.createdAt - a.createdAt;
              });
            });

            // Turn off skeleton loader as soon as the first chunk arrives so user can interact immediately
            setIsProjectTasksLoading(false);
          }

          if (chunkData.length < CHUNK_SIZE) {
            hasMore = false;
          } else {
            offset += CHUNK_SIZE;
          }
        }

        if (isSubscribed) {
          setLoadedProjectIds(prev => {
            const next = new Set(prev);
            idsNeedingFetch.forEach(id => next.add(id));
            return next;
          });
          setIsProjectTasksLoading(false);
        }
      } catch (err) {
        console.warn("Failed to load on-demand project tasks", err);
        if (isSubscribed) {
          setIsProjectTasksLoading(false);
        }
      }
    };

    loadTasksForSelectedProject();

    return () => {
      isSubscribed = false;
    };
  }, [selectedProjectId, isLoading, loadedProjectIds]);

  // History state for Undo/Redo
  const [sqlHistory, setSqlHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lastSavedTime, setLastSavedTime] = useState(0);
  const prevTaskIdRef = useRef<string | null>(null);

  // Lazy Full-Content On-Demand Loading & Hover Pre-fetching
  const [loadingTaskContentId, setLoadingTaskContentId] = useState<string | null>(null);
  const fetchingTaskContentIdsRef = useRef<Set<string>>(new Set());

  const fetchTaskFullContent = async (taskId: string, isSilent = false) => {
    if (!taskId) return;
    const task = tasksRef.current.find(t => t.id === taskId);
    if (task && task.isContentFetched) return;
    if (fetchingTaskContentIdsRef.current.has(taskId)) return;

    fetchingTaskContentIdsRef.current.add(taskId);
    if (!isSilent) {
      setLoadingTaskContentId(taskId);
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, sql, function_code, edge_files, edge_secrets')
        .eq('id', taskId)
        .single();

      if (!error && data) {
        setTasks(prev => prev.map(t => {
          if (t.id === taskId) {
            return {
              ...t,
              sql: data.sql ?? t.sql ?? '',
              functionCode: data.function_code ?? t.functionCode ?? '',
              edgeFiles: data.edge_files ?? t.edgeFiles ?? [],
              edgeSecrets: data.edge_secrets ?? t.edgeSecrets ?? [],
              isContentFetched: true,
            };
          }
          return t;
        }));
      }
    } catch (err) {
      console.warn("Failed to fetch full task content", err);
    } finally {
      fetchingTaskContentIdsRef.current.delete(taskId);
      setLoadingTaskContentId(prev => (prev === taskId ? null : prev));
    }
  };

  const prefetchTaskContent = (taskId: string) => {
    fetchTaskFullContent(taskId, true);
  };

  useEffect(() => {
    if (selectedTaskId) {
      const task = tasksRef.current.find(t => t.id === selectedTaskId);
      if (task && !task.isContentFetched) {
        fetchTaskFullContent(selectedTaskId);
      }
    }
  }, [selectedTaskId]);

  useEffect(() => {
    if (selectedTaskId) {
      setIsEditingDescription(false);
      setIsDescriptionExpanded(false);
      const task = tasks.find((t) => t.id === selectedTaskId);
      if (task) {
        // Only auto-sync activeTab when a task is newly selected or navigated to
        if (prevTaskIdRef.current !== selectedTaskId) {
          const targetTab = task.type === "edge_function" ? "edge_function" : "sql";
          if (activeTab !== targetTab) {
            setActiveTab(targetTab);
          }
          prevTaskIdRef.current = selectedTaskId;
        }
        
        setSqlHistory([
          task.type === "edge_function" ? task.functionCode || "" : task.sql,
        ]);
        setHistoryIndex(0);
      }
    } else {
      prevTaskIdRef.current = null;
      setSqlHistory([]);
      setHistoryIndex(-1);
    }
  }, [selectedTaskId, tasks]);

  const handleTabSwitch = (newTab: "sql" | "edge_function") => {
    if (activeTab === newTab) return;
    setActiveTab(newTab);

    // If currently viewing a task that belongs to the other tab, navigate to project root
    // so desktop view cleanly updates the sidebar list and displays the appropriate empty state
    if (selectedTask) {
      const currentTaskType = selectedTask.type === "edge_function" ? "edge_function" : "sql";
      if (currentTaskType !== newTab && selectedProjectId) {
        navigate(`/p/${selectedProjectId}`);
      }
    }
  };

  const handleSqlChange = (newSql: string) => {
    if (!selectedTaskId) return;

    // For type edge_function we update functionCode instead
    if (selectedTask?.type === "edge_function") {
      handleUpdateTask(selectedTaskId, { functionCode: newSql });
    } else {
      handleUpdateTask(selectedTaskId, { sql: newSql });
    }

    const now = Date.now();
    const newHistory = sqlHistory.slice(0, historyIndex + 1);

    // Group changes if they happen within 500ms of the last save
    if (now - lastSavedTime < 500 && newHistory.length > 1) {
      newHistory[newHistory.length - 1] = newSql;
    } else {
      newHistory.push(newSql);
      if (newHistory.length > 100) newHistory.shift();
    }

    setSqlHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setLastSavedTime(now);
  };

  const handleUndo = () => {
    if (historyIndex > 0 && selectedTaskId) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      if (selectedTask?.type === "edge_function") {
        handleUpdateTask(selectedTaskId, {
          functionCode: sqlHistory[newIndex],
        });
      } else {
        handleUpdateTask(selectedTaskId, { sql: sqlHistory[newIndex] });
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < sqlHistory.length - 1 && selectedTaskId) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      if (selectedTask?.type === "edge_function") {
        handleUpdateTask(selectedTaskId, {
          functionCode: sqlHistory[newIndex],
        });
      } else {
        handleUpdateTask(selectedTaskId, { sql: sqlHistory[newIndex] });
      }
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (filter === "all") return true;
        return t.status === filter;
      })
      .filter((t) => (t.type === "edge_function" ? "edge_function" : "sql") === activeTab)
      .filter((t) => (t.title || "").toLowerCase().includes(searchQuery.toLowerCase()))
      .filter((t) => selectedProjectId ? t.projectId === selectedProjectId : false)
      .sort((a, b) => {
        if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
          return a.orderIndex - b.orderIndex;
        }
        if (a.orderIndex !== undefined) return -1;
        if (b.orderIndex !== undefined) return 1;
        return b.createdAt - a.createdAt;
      });
  }, [tasks, filter, searchQuery, activeTab, selectedProjectId]);

  const handleCreateTask = async (type: "sql" | "edge_function") => {
    if (!selectedProjectId) {
      toast.error("Please create a project first");
      return;
    }
    setShowTypeSelector(false);
    
    // Calculate new bottom-most order index
    const currentMaxOrder = tasks.length > 0 
      ? Math.max(0, ...tasks.map(t => t.orderIndex ?? (tasks.indexOf(t) * 1000)))
      : 0;

    const newTask: SqlTask = {
      id: crypto.randomUUID(),
      title: "",
      type,
      sql: "",
      functionCode: "",
      description: "",
      edgeFiles:
        type === "edge_function"
          ? [{ id: crypto.randomUUID(), name: "index.ts", code: "" }]
          : [],
      edgeSecrets: [],
      status: "pending",
      folderId: null,
      projectId: selectedProjectId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      orderIndex: currentMaxOrder + 1000,
    };
    
    // Back up tasks for rollback
    const originalTasks = [...tasks];
    
    // Snapshot for version control
    const stateBefore: VersionBackupData = {
      projects: projects.filter(p => p.id === selectedProjectId),
      tasks: tasks.filter(t => t.projectId === selectedProjectId)
    };
    const stateAfter: VersionBackupData = {
      projects: projects.filter(p => p.id === selectedProjectId),
      tasks: [...tasks.filter(t => t.projectId === selectedProjectId), newTask]
    };
    saveVersionBackup(
      'create_task',
      selectedProjectId,
      null,
      `Created new ${type === 'edge_function' ? 'Edge Function' : 'SQL'} task`,
      stateBefore,
      stateAfter
    );

    // Optimistically select it and switch tab
    setTasks([...tasks, newTask]);
    setActiveTab(type);
    navigate(`/p/${selectedProjectId}/t/${newTask.id}`);
    setIsSelectionMode(false);
    
    // Consolidate initial creation with updates by queuing it
    const existingUpdates = pendingTasksToSyncRef.current.get(newTask.id) || { id: newTask.id };
    pendingTasksToSyncRef.current.set(newTask.id, { ...existingUpdates, ...newTask });
    
    if (pendingUpdateTimeoutRef.current) {
      clearTimeout(pendingUpdateTimeoutRef.current);
    }
    
    pendingUpdateTimeoutRef.current = setTimeout(() => {
      const tasksToSync: Partial<SqlTask>[] = Array.from(pendingTasksToSyncRef.current.values());
      pendingTasksToSyncRef.current.clear();
      if (tasksToSync.length > 0) {
        syncToDB(tasksToSync);
      }
    }, 1000);
  };

  const handleUpdateTask = React.useCallback(async (id: string, updates: Partial<SqlTask>) => {
    // 1. Capture baseline state if not already recorded for this edit session
    if (!taskEditBaselineRef.current.has(id)) {
      const existing = tasksRef.current.find((t) => t.id === id);
      if (existing) {
        taskEditBaselineRef.current.set(id, JSON.parse(JSON.stringify(existing)));
      }
    }

    // 2. Optimistic local state update
    setTasks(prevTasks => prevTasks.map((t) => {
      if (t.id === id) {
        return { ...t, ...updates, updatedAt: Date.now() };
      }
      return t;
    }));
    
    // 3. Queue task sync for database
    const existingUpdates = pendingTasksToSyncRef.current.get(id) || { id };
    pendingTasksToSyncRef.current.set(id, { ...existingUpdates, ...updates, updatedAt: Date.now() });
    
    if (pendingUpdateTimeoutRef.current) {
      clearTimeout(pendingUpdateTimeoutRef.current);
    }
    
    // Fast debounce for immediate status toggles, 1000ms debounce for typing
    const isStatusOnly = updates.status !== undefined && Object.keys(updates).length <= 2;
    const debounceMs = isStatusOnly ? 50 : 1000;

    pendingUpdateTimeoutRef.current = setTimeout(() => {
      const tasksToSync: Partial<SqlTask>[] = Array.from(pendingTasksToSyncRef.current.values());
      pendingTasksToSyncRef.current.clear();
      if (tasksToSync.length > 0) {
        syncToDB(tasksToSync);
      }

      // Check all baseline tasks and record granular version backup snapshots
      taskEditBaselineRef.current.forEach((baselineTask, taskId) => {
        const updatedTask = tasksRef.current.find((t) => t.id === taskId);
        if (updatedTask && updatedTask.projectId) {
          const projId = updatedTask.projectId;
          const currentProjTasks = tasksRef.current.filter((t) => t.projectId === projId);
          const currentProj = projectsRef.current.filter((p) => p.id === projId);

          const stateBefore: VersionBackupData = {
            projects: currentProj,
            tasks: currentProjTasks.map((t) => t.id === taskId ? baselineTask : t)
          };
          const stateAfter: VersionBackupData = {
            projects: currentProj,
            tasks: currentProjTasks
          };

          let action: VersionAction = "update_task";
          let description = `Updated "${updatedTask.title || "Untitled"}"`;

          if (baselineTask.status !== updatedTask.status) {
            action = "update_status";
            description = `Changed status of "${updatedTask.title || "Untitled"}" to ${updatedTask.status}`;
          } else if (baselineTask.title !== updatedTask.title) {
            description = `Updated title to "${updatedTask.title || "Untitled"}"`;
          } else if (baselineTask.sql !== updatedTask.sql) {
            description = `Updated SQL in "${updatedTask.title || "Untitled"}"`;
          } else if (
            baselineTask.functionCode !== updatedTask.functionCode || 
            JSON.stringify(baselineTask.edgeFiles) !== JSON.stringify(updatedTask.edgeFiles)
          ) {
            description = `Updated code in "${updatedTask.title || "Untitled"}"`;
          } else if (baselineTask.description !== updatedTask.description) {
            description = `Updated description of "${updatedTask.title || "Untitled"}"`;
          } else if (JSON.stringify(baselineTask.edgeSecrets) !== JSON.stringify(updatedTask.edgeSecrets)) {
            description = `Updated secrets in "${updatedTask.title || "Untitled"}"`;
          }

          saveVersionBackup(
            action,
            projId,
            null,
            description,
            stateBefore,
            stateAfter
          );
        }
      });
      taskEditBaselineRef.current.clear();
    }, debounceMs);
  }, [setTasks, syncToDB, saveVersionBackup]);

  const handleShowTypeSelector = () => {
    if (!selectedProjectId) {
      toast.error("Please create or select a project first");
      return;
    }
    setShowTypeSelector(true);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedForDeletion(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedForDeletion.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedForDeletion.size === 0) return;
    setIsDeleting(true);
    
    const deleteCount = selectedForDeletion.size;
    const deletedIds = Array.from(selectedForDeletion);
    const originalTasks = [...tasks];
    
    try {
      // First, attempt to delete from Supabase
      const { error } = await supabase.from('tasks').delete().in('id', deletedIds);
      if (error) throw error;

      // Update UI state
      const remainingTasks = tasks.filter((t) => !selectedForDeletion.has(t.id));
      setTasks(remainingTasks);
      
      // Snapshot for version control
      const stateBefore: VersionBackupData = {
        projects: projects.filter(p => p.id === selectedProjectId),
        tasks: tasks.filter(t => t.projectId === selectedProjectId)
      };
      const stateAfter: VersionBackupData = {
        projects: projects.filter(p => p.id === selectedProjectId),
        tasks: remainingTasks.filter(t => t.projectId === selectedProjectId)
      };
      saveVersionBackup(
        'delete_task',
        selectedProjectId,
        null,
        `Deleted ${deleteCount} task${deleteCount > 1 ? 's' : ''}`,
        stateBefore,
        stateAfter
      );

      if (selectedTaskId && selectedForDeletion.has(selectedTaskId)) {
        navigate(`/p/${selectedProjectId}`);
      }
      setSelectedForDeletion(new Set());
      setIsSelectionMode(false);
      setShowDeleteConfirm(false);
      toast.success(`${deleteCount} task${deleteCount > 1 ? 's' : ''} deleted`);
      
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete tasks. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelLongPress = React.useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerStartPosRef.current = null;
  }, []);

  const handlePointerDown = React.useCallback((e: React.PointerEvent, taskId: string) => {
    if (isSelectionMode) return;
    if ((e.target as Element).closest?.('.drag-handle')) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    cancelLongPress();
    isMovedRef.current = false;
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };

    longPressTimerRef.current = setTimeout(() => {
      setIsSelectionMode(true);
      setSelectedForDeletion(new Set([taskId]));
      longPressTimerRef.current = null;
      pointerStartPosRef.current = null;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(30); } catch (_) {}
      }
    }, 600);
  }, [isSelectionMode, cancelLongPress]);

  const handlePointerMove = React.useCallback((e: React.PointerEvent) => {
    if (!pointerStartPosRef.current) return;
    const dx = Math.abs(e.clientX - pointerStartPosRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartPosRef.current.y);
    if (dx > 7 || dy > 7) {
      isMovedRef.current = true;
      cancelLongPress();
    }
  }, [cancelLongPress]);

  const handleTaskClick = React.useCallback((taskId: string) => {
    cancelLongPress();
    if (isMovedRef.current) {
      isMovedRef.current = false;
      return;
    }
    if (isSelectionMode) {
      setSelectedForDeletion((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(taskId)) newSet.delete(taskId);
        else newSet.add(taskId);
        return newSet;
      });
    } else {
      setLastVisitedTaskId(taskId);
      navigate(`/p/${selectedProjectId}/t/${taskId}`);
    }
  }, [cancelLongPress, isSelectionMode, selectedProjectId, setLastVisitedTaskId, navigate]);

  const handleStatusToggle = React.useCallback((taskId: string, currentStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleUpdateTask(taskId, {
      status: currentStatus === "pending" ? "ran" : "pending",
    });
  }, [handleUpdateTask]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    if (result.source.index === result.destination.index) return;
    
    // We only reorder filteredTasks currently visible
    const items = [...filteredTasks];
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const itemsMap = new Map<string, number>();
    items.forEach((item, index) => {
      itemsMap.set(item.id, index * 1000);
    });

    const updatedTasks = tasks.map((t) => {
      if (itemsMap.has(t.id)) {
        return { ...t, orderIndex: itemsMap.get(t.id), updatedAt: Date.now() };
      }
      return t;
    });

    const originalTasks = [...tasks];
    setTasks(updatedTasks);
    setPendingDragUpdate({ updatedTasks, originalTasks });

    if (selectedProjectId) {
      const stateBefore: VersionBackupData = {
        projects: projectsRef.current.filter((p) => p.id === selectedProjectId),
        tasks: originalTasks.filter((t) => t.projectId === selectedProjectId),
      };
      const stateAfter: VersionBackupData = {
        projects: projectsRef.current.filter((p) => p.id === selectedProjectId),
        tasks: updatedTasks.filter((t) => t.projectId === selectedProjectId),
      };
      saveVersionBackup('update_task', selectedProjectId, null, 'Reordered tasks', stateBefore, stateAfter);
    }
  };

  const handleCopySql = async (sql: string) => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleExportEdgeZip = async (task: SqlTask) => {
    try {
       const zip = new JSZip();
       const edgeFiles = task.edgeFiles || [];
       const edgeSecrets = task.edgeSecrets || [];
       edgeFiles.forEach(f => {
          zip.file(f.name, f.code);
       });
       
       if (edgeSecrets.length > 0) {
          const secretsObj = Object.fromEntries(edgeSecrets.filter(s => s.key).map(s => [s.key, s.value]));
          zip.file("secrets.json", JSON.stringify(secretsObj, null, 2));
       }
       
       const blob = await zip.generateAsync({ type: "blob" });
       const url = URL.createObjectURL(blob);
       const a = document.createElement("a");
       a.href = url;
       a.download = `edge_function_${(task.title || 'export').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(url);
    } catch (error) {
       console.error("Failed to export zip", error);
       alert("Failed to export zip file");
    }
  };

  const handleImportEdgeZip = async (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const zip = new JSZip();
      const content = await zip.loadAsync(file);
      
      const newFiles = [];
      const newSecrets = [];
      
      for (const [path, zipEntry] of Object.entries(content.files)) {
        if (zipEntry.dir) continue;
        
        // Skip common hidden/system files
        if (path.includes('__MACOSX') || path.includes('.DS_Store')) continue;
        
        const fileContent = await zipEntry.async("string");
        
        if (path === 'secrets.json') {
           try {
              const secretsData = JSON.parse(fileContent);
              if (Array.isArray(secretsData)) {
                secretsData.forEach(s => {
                  if (s.key && typeof s.value === 'string') {
                    newSecrets.push({ id: crypto.randomUUID(), key: s.key, value: s.value });
                  }
                });
              } else if (typeof secretsData === 'object' && secretsData !== null) {
                 for (const [key, value] of Object.entries(secretsData)) {
                    if (typeof value === 'string') {
                      newSecrets.push({ id: crypto.randomUUID(), key, value });
                    }
                 }
              }
           } catch (e) { console.error("Failed to parse secrets.json", e); }
           continue;
        }

        newFiles.push({
          id: crypto.randomUUID(),
          name: path,
          code: fileContent
        });
      }
      
      // Auto-add default empty file if completely empty
      if (newFiles.length === 0) {
        newFiles.push({ id: crypto.randomUUID(), name: 'index.ts', code: '' });
      }

      handleUpdateTask(taskId, { edgeFiles: newFiles, edgeSecrets: newSecrets });
      
    } catch (error) {
      console.error("Failed to import zip", error);
      alert("Failed to import zip file");
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleExportProject = (project: { id: string; name: string; createdAt?: number }) => {
    // Filter tasks for this project only
    const projectTasks = tasks
      .filter((t) => t.projectId === project.id)
      .sort((a, b) => {
        if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
          return a.orderIndex - b.orderIndex;
        }
        if (a.orderIndex !== undefined) return -1;
        if (b.orderIndex !== undefined) return 1;
        return b.createdAt - a.createdAt;
      });

    const structuredExport = {
      version: "2.0",
      type: "single_project",
      exportDate: new Date().toISOString(),
      project: {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt || Date.now(),
      },
      metadata: {
        projectName: project.name,
        totalTasks: projectTasks.length,
        sqlTasksCount: projectTasks.filter((t) => t.type === "sql" || !t.type).length,
        edgeFunctionsCount: projectTasks.filter((t) => t.type === "edge_function").length,
      },
      tasks: projectTasks,
      sql_queries: projectTasks
        .filter((t) => t.type === "sql" || !t.type)
        .map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          sql: t.sql,
          description: t.description,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          orderIndex: t.orderIndex,
        })),
      edge_functions: projectTasks
        .filter((t) => t.type === "edge_function")
        .map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          description: t.description,
          files: t.edgeFiles || [],
          secrets: t.edgeSecrets || [],
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          orderIndex: t.orderIndex,
        })),
      _raw_tasks: projectTasks,
    };

    const dataStr = JSON.stringify(structuredExport, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const cleanName =
      (project.name || "project")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "_") || "project";
    a.download = `${cleanName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported project "${project.name}" (${projectTasks.length} tasks)`);
  };

  const handleExportAllProjects = async () => {
    const toastId = "export-all";
    toast.loading("Preparing full workspace export...", { id: toastId });
    try {
      const { data: allTasksData } = await supabase
        .from('tasks')
        .select('*')
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });

      const allTasks = (allTasksData || tasks).map(t => ({
        id: t.id,
        title: t.title,
        type: t.type,
        sql: t.sql,
        functionCode: (t as any).function_code || t.functionCode,
        description: t.description,
        edgeFiles: (t as any).edge_files || t.edgeFiles,
        edgeSecrets: (t as any).edge_secrets || t.edgeSecrets,
        status: t.status,
        folderId: (t as any).folder_id || t.folderId,
        projectId: (t as any).project_id || t.projectId,
        productionTaskId: (t as any).production_task_id || t.productionTaskId,
        createdAt: (t as any).created_at || t.createdAt,
        updatedAt: (t as any).updated_at || t.updatedAt,
        orderIndex: (t as any).order_index || t.orderIndex
      }));

      const structuredExport = {
        version: "2.0",
        type: "multi_project",
        exportDate: new Date().toISOString(),
        metadata: {
          totalProjects: projects.length,
          totalTasks: allTasks.length,
          sqlTasksCount: allTasks.filter((t) => t.type === "sql" || !t.type).length,
          edgeFunctionsCount: allTasks.filter((t) => t.type === "edge_function").length,
        },
        projects: projects,
        tasks: allTasks,
        _raw_tasks: allTasks,
      };

      const dataStr = JSON.stringify(structuredExport, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workspace-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported workspace backup (${projects.length} projects, ${allTasks.length} tasks)`, { id: toastId });
    } catch (err: any) {
      toast.error(`Export failed: ${err?.message || 'Unknown error'}`, { id: toastId });
    }
  };

  const handleExport = () => {
    if (activeProject) {
      handleExportProject(activeProject);
    } else {
      handleExportAllProjects();
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        let detectedType: 'single_project' | 'multi_project' | 'raw_tasks' = 'raw_tasks';
        let extractedProject: { id: string; name: string; createdAt?: number } | undefined = undefined;
        let extractedProjects: Array<{ id: string; name: string; createdAt?: number }> | undefined = undefined;
        let importedTasksRaw: any[] = [];

        // Check if multi-project
        if (
          importedData?.type === 'multi_project' || 
          (Array.isArray(importedData?.projects) && importedData.projects.length > 0 && Array.isArray(importedData?.tasks || importedData?._raw_tasks))
        ) {
          detectedType = 'multi_project';
          extractedProjects = importedData.projects.map((p: any) => ({
            id: p.id || crypto.randomUUID(),
            name: p.name || 'Untitled Project',
            createdAt: p.createdAt || p.created_at || Date.now(),
          }));
          importedTasksRaw = importedData.tasks || importedData._raw_tasks || [];
        }
        // Check if single-project
        else if (
          importedData?.type === 'single_project' ||
          (importedData?.project && (importedData.project.name || importedData.project.id))
        ) {
          detectedType = 'single_project';
          extractedProject = {
            id: importedData.project?.id || crypto.randomUUID(),
            name: importedData.project?.name || importedData.metadata?.projectName || 'Imported Project',
            createdAt: importedData.project?.createdAt || importedData.project?.created_at || Date.now(),
          };
          if (Array.isArray(importedData.tasks)) {
            importedTasksRaw = importedData.tasks;
          } else if (Array.isArray(importedData._raw_tasks)) {
            importedTasksRaw = importedData._raw_tasks;
          } else if (importedData.sql_queries || importedData.edge_functions) {
            const sqlQueries = (importedData.sql_queries || []).map((t: any) => ({ ...t, type: 'sql' }));
            const edgeFunctions = (importedData.edge_functions || []).map((t: any) => ({ ...t, type: 'edge_function' }));
            importedTasksRaw = [...sqlQueries, ...edgeFunctions];
          }
        }
        // Legacy or raw tasks array / object
        else {
          detectedType = 'raw_tasks';
          if (Array.isArray(importedData)) {
            importedTasksRaw = importedData;
          } else if (importedData && importedData._raw_tasks && Array.isArray(importedData._raw_tasks)) {
            importedTasksRaw = importedData._raw_tasks;
          } else if (importedData && importedData.tasks && Array.isArray(importedData.tasks)) {
            importedTasksRaw = importedData.tasks;
          } else if (importedData && (importedData.sql_queries || importedData.edge_functions)) {
            const sqlQueries = (importedData.sql_queries || []).map((t: any) => ({ ...t, type: 'sql' }));
            const edgeFunctions = (importedData.edge_functions || []).map((t: any) => ({ ...t, type: 'edge_function' }));
            importedTasksRaw = [...sqlQueries, ...edgeFunctions];
          }
        }

        if (importedTasksRaw.length === 0 && (!extractedProjects || extractedProjects.length === 0)) {
          toast.error("No valid projects or tasks found in this JSON file.");
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        // Standardize raw tasks into format
        const normalizedTasks = importedTasksRaw.map((t) => {
          const id = t.id || crypto.randomUUID();
          const title = t.title || t.name || "";
          const taskType = t.type || (t.files ? 'edge_function' : 'sql');
          const sql = t.sql || t.query || "";
          const functionCode = t.functionCode || t.function_code || "";
          const description = t.description || "";
          const status = t.status || "pending";
          const createdAt = t.createdAt || t.created_at || Date.now();
          const updatedAt = t.updatedAt || t.updated_at || Date.now();
          const orderIndex = t.orderIndex !== undefined ? t.orderIndex : t.order_index;
          const projectId = t.projectId || t.project_id || (extractedProject ? extractedProject.id : selectedProjectId);
          const edgeFiles = t.edgeFiles || t.edge_files || t.files || (taskType === 'edge_function' ? [{ id: crypto.randomUUID(), name: 'index.ts', code: '' }] : []);
          const edgeSecrets = t.edgeSecrets || t.edge_secrets || t.secrets || [];

          return {
            id,
            title,
            type: taskType as 'sql' | 'edge_function',
            sql,
            functionCode,
            description,
            status,
            projectId,
            folderId: t.folderId || t.folder_id || null,
            createdAt,
            updatedAt,
            orderIndex,
            edgeFiles,
            edgeSecrets,
          };
        });

        // Open Smart Import Dialog
        setParsedImportData({
          type: detectedType,
          project: extractedProject,
          projects: extractedProjects,
          tasks: normalizedTasks,
          rawProjects: importedData.projects,
          fileName: file.name,
          metadata: importedData.metadata,
        });
        setShowSmartImportModal(true);
      } catch (err) {
        console.error("Import error:", err);
        toast.error("Failed to parse file. Please ensure it is a valid JSON file.");
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const handleConfirmSmartImport = async ({
    mode,
    customProjectName,
    parsedData,
    targetProdProject,
  }: {
    mode: ImportMode;
    customProjectName?: string;
    parsedData: ParsedImportData;
    targetProdProject?: Project;
  }) => {
    setIsImportingFile(true);
    const toastId = "smart-import";
    toast.loading("Importing project data...", { id: toastId });

    try {
      if (parsedData.type === 'single_project') {
        const baseName = customProjectName || parsedData.project?.name || "Imported Project";

        if (mode === 'create_staging') {
          // Find matching production project
          const prodProject = targetProdProject || projects.find(
            (p) => !p.name.endsWith(' [STAGING]') && (
              (parsedData.project && (p.id === parsedData.project.id || p.name.toLowerCase().trim() === parsedData.project.name.replace(' [STAGING]', '').toLowerCase().trim())) ||
              (parsedData.metadata?.projectName && p.name.toLowerCase().trim() === parsedData.metadata.projectName.replace(' [STAGING]', '').toLowerCase().trim())
            )
          );

          if (!prodProject) throw new Error("Production project not found to attach Staging replica.");

          const stagingProjectName = `${prodProject.name} [STAGING]`;
          let existingStaging = projects.find((p) => p.name === stagingProjectName);
          let stagingProjectId: string;
          let updatedProjectsList = [...projects];

          if (existingStaging) {
            stagingProjectId = existingStaging.id;
            // Clean up existing tasks in this staging project
            await supabase.from('tasks').delete().eq('project_id', stagingProjectId);
          } else {
            stagingProjectId = crypto.randomUUID();
            const newProjectObj = {
              id: stagingProjectId,
              name: stagingProjectName,
              created_at: Date.now(),
            };
            const { error: pErr } = await supabase.from('projects').upsert(newProjectObj);
            if (pErr) throw pErr;
            const createdProj: Project = { id: newProjectObj.id, name: newProjectObj.name, createdAt: newProjectObj.created_at };
            updatedProjectsList.push(createdProj);
          }

          // Build production lookup maps
          const prodTasks = tasks.filter((t) => t.projectId === prodProject.id);
          const prodById = new Map<string, SqlTask>(prodTasks.map((t) => [t.id, t]));
          const prodByTitle = new Map<string, SqlTask>(prodTasks.map((t) => [t.title.toLowerCase().trim(), t]));

          // Map imported tasks into staging tasks linking production_task_id
          const stagingTasks: SqlTask[] = parsedData.tasks.map((t, idx) => {
            const matchedProd = (t.id && prodById.get(t.id)) || prodByTitle.get((t.title || '').toLowerCase().trim());
            return {
              ...t,
              id: crypto.randomUUID(),
              projectId: stagingProjectId,
              productionTaskId: matchedProd ? matchedProd.id : undefined,
              orderIndex: t.orderIndex !== undefined ? t.orderIndex : idx * 1000,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
          });

          const tasksToInsert = stagingTasks.map((t) => ({
            id: t.id,
            title: t.title,
            type: t.type,
            sql: t.sql,
            function_code: t.functionCode,
            description: t.description,
            edge_files: t.edgeFiles,
            edge_secrets: t.edgeSecrets,
            status: t.status,
            folder_id: t.folderId,
            project_id: t.projectId,
            production_task_id: t.productionTaskId,
            created_at: t.createdAt,
            updated_at: t.updatedAt,
            order_index: t.orderIndex,
          }));

          if (tasksToInsert.length > 0) {
            const { error: tasksErr } = await supabase.from('tasks').upsert(tasksToInsert);
            if (tasksErr) throw tasksErr;
          }

          const otherTasks = tasks.filter((t) => t.projectId !== stagingProjectId);
          setProjects(updatedProjectsList);
          setTasks([...otherTasks, ...stagingTasks]);
          navigate(`/p/${stagingProjectId}`);
          toast.success(`Imported into "${stagingProjectName}" for review! Open Diff Viewer to inspect and merge.`, { id: toastId });
        } else if (mode === 'create_new') {
          // Generate fresh project ID
          const newProjectId = crypto.randomUUID();
          const newProject = {
            id: newProjectId,
            name: baseName,
            created_at: Date.now(),
          };

          // Save new project to Supabase
          const { error: projectErr } = await supabase.from('projects').upsert(newProject);
          if (projectErr) throw projectErr;

          // Map all tasks with new IDs and assign to newProjectId
          const newProjectTasks: SqlTask[] = parsedData.tasks.map((t, idx) => ({
            ...t,
            id: crypto.randomUUID(),
            projectId: newProjectId,
            orderIndex: idx * 1000,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }));

          // Upsert tasks into DB
          const tasksToInsert = newProjectTasks.map((t) => ({
            id: t.id,
            title: t.title,
            type: t.type,
            sql: t.sql,
            function_code: t.functionCode,
            description: t.description,
            edge_files: t.edgeFiles,
            edge_secrets: t.edgeSecrets,
            status: t.status,
            folder_id: t.folderId,
            project_id: t.projectId,
            created_at: t.createdAt,
            updated_at: t.updatedAt,
            order_index: t.orderIndex,
          }));

          if (tasksToInsert.length > 0) {
            const { error: tasksErr } = await supabase.from('tasks').upsert(tasksToInsert);
            if (tasksErr) throw tasksErr;
          }

          // Update local state
          const updatedProjects = [...projects, { id: newProject.id, name: newProject.name, createdAt: newProject.created_at }];
          setProjects(updatedProjects);
          setTasks([...tasks, ...newProjectTasks]);
          navigate(`/p/${newProjectId}`);
          toast.success(`Successfully created "${baseName}" with ${newProjectTasks.length} tasks!`, { id: toastId });
        } else if (mode === 'merge') {
          // Target the matching existing project
          const targetProject = projects.find(
            (p) => p.name.toLowerCase().trim() === (parsedData.project?.name || '').toLowerCase().trim() || p.id === parsedData.project?.id
          );
          if (!targetProject) throw new Error("Target project not found for merge");

          // For tasks: add fresh IDs for imported tasks and assign target project ID
          const mergedTasks: SqlTask[] = parsedData.tasks.map((t, idx) => ({
            ...t,
            id: crypto.randomUUID(),
            projectId: targetProject.id,
            orderIndex: (tasks.length + idx) * 1000,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }));

          const tasksToInsert = mergedTasks.map((t) => ({
            id: t.id,
            title: t.title,
            type: t.type,
            sql: t.sql,
            function_code: t.functionCode,
            description: t.description,
            edge_files: t.edgeFiles,
            edge_secrets: t.edgeSecrets,
            status: t.status,
            folder_id: t.folderId,
            project_id: t.projectId,
            created_at: t.createdAt,
            updated_at: t.updatedAt,
            order_index: t.orderIndex,
          }));

          if (tasksToInsert.length > 0) {
            const { error: tasksErr } = await supabase.from('tasks').upsert(tasksToInsert);
            if (tasksErr) throw tasksErr;
          }

          setTasks([...tasks, ...mergedTasks]);
          navigate(`/p/${targetProject.id}`);
          toast.success(`Merged ${mergedTasks.length} tasks into "${targetProject.name}"!`, { id: toastId });
        } else if (mode === 'overwrite') {
          // Target the matching existing project
          const targetProject = projects.find(
            (p) => p.name.toLowerCase().trim() === (parsedData.project?.name || '').toLowerCase().trim() || p.id === parsedData.project?.id
          );
          if (!targetProject) throw new Error("Target project not found for overwrite");

          // Delete existing tasks for this project
          await supabase.from('tasks').delete().eq('project_id', targetProject.id);

          // Create tasks with fresh IDs under targetProject.id
          const overwrittenTasks: SqlTask[] = parsedData.tasks.map((t, idx) => ({
            ...t,
            id: crypto.randomUUID(),
            projectId: targetProject.id,
            orderIndex: idx * 1000,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }));

          const tasksToInsert = overwrittenTasks.map((t) => ({
            id: t.id,
            title: t.title,
            type: t.type,
            sql: t.sql,
            function_code: t.functionCode,
            description: t.description,
            edge_files: t.edgeFiles,
            edge_secrets: t.edgeSecrets,
            status: t.status,
            folder_id: t.folderId,
            project_id: t.projectId,
            created_at: t.createdAt,
            updated_at: t.updatedAt,
            order_index: t.orderIndex,
          }));

          if (tasksToInsert.length > 0) {
            const { error: tasksErr } = await supabase.from('tasks').upsert(tasksToInsert);
            if (tasksErr) throw tasksErr;
          }

          const remainingOtherTasks = tasks.filter((t) => t.projectId !== targetProject.id);
          setTasks([...remainingOtherTasks, ...overwrittenTasks]);
          navigate(`/p/${targetProject.id}`);
          toast.success(`Overwrote "${targetProject.name}" with ${overwrittenTasks.length} tasks!`, { id: toastId });
        }
      } else if (parsedData.type === 'multi_project') {
        const importedProjectsList = parsedData.projects || [];
        const idMapping = new Map<string, string>();
        const newProjectsToAdd: Project[] = [];

        // Create new projects for all items
        for (const impP of importedProjectsList) {
          const freshId = crypto.randomUUID();
          idMapping.set(impP.id, freshId);
          const hasConflict = projects.some((p) => p.name.toLowerCase().trim() === impP.name.toLowerCase().trim());
          const nameToUse = hasConflict ? `${impP.name} (Imported)` : impP.name;

          const pObj = {
            id: freshId,
            name: nameToUse,
            created_at: Date.now(),
          };
          await supabase.from('projects').upsert(pObj);
          newProjectsToAdd.push({ id: pObj.id, name: pObj.name, createdAt: pObj.created_at });
        }

        // Map tasks
        const newTasksToAdd: SqlTask[] = parsedData.tasks.map((t, idx) => {
          const mappedProjId = idMapping.get(t.projectId) || (newProjectsToAdd[0]?.id || selectedProjectId || '');
          return {
            ...t,
            id: crypto.randomUUID(),
            projectId: mappedProjId,
            orderIndex: idx * 1000,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
        });

        const tasksToInsert = newTasksToAdd.map((t) => ({
          id: t.id,
          title: t.title,
          type: t.type,
          sql: t.sql,
          function_code: t.functionCode,
          description: t.description,
          edge_files: t.edgeFiles,
          edge_secrets: t.edgeSecrets,
          status: t.status,
          folder_id: t.folderId,
          project_id: t.projectId,
          created_at: t.createdAt,
          updated_at: t.updatedAt,
          order_index: t.orderIndex,
        }));

        if (tasksToInsert.length > 0) {
          const { error: tasksErr } = await supabase.from('tasks').upsert(tasksToInsert);
          if (tasksErr) throw tasksErr;
        }

        setProjects([...projects, ...newProjectsToAdd]);
        setTasks([...tasks, ...newTasksToAdd]);
        if (newProjectsToAdd.length > 0) {
          navigate(`/p/${newProjectsToAdd[0].id}`);
        }
        toast.success(`Imported ${newProjectsToAdd.length} projects and ${newTasksToAdd.length} tasks!`, { id: toastId });
      } else {
        // Raw tasks
        if (mode === 'into_active' && selectedProjectId) {
          const newTasks: SqlTask[] = parsedData.tasks.map((t, idx) => ({
            ...t,
            id: crypto.randomUUID(),
            projectId: selectedProjectId,
            orderIndex: (tasks.length + idx) * 1000,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }));

          const tasksToInsert = newTasks.map((t) => ({
            id: t.id,
            title: t.title,
            type: t.type,
            sql: t.sql,
            function_code: t.functionCode,
            description: t.description,
            edge_files: t.edgeFiles,
            edge_secrets: t.edgeSecrets,
            status: t.status,
            folder_id: t.folderId,
            project_id: t.projectId,
            created_at: t.createdAt,
            updated_at: t.updatedAt,
            order_index: t.orderIndex,
          }));

          if (tasksToInsert.length > 0) {
            const { error: tasksErr } = await supabase.from('tasks').upsert(tasksToInsert);
            if (tasksErr) throw tasksErr;
          }

          setTasks([...tasks, ...newTasks]);
          toast.success(`Added ${newTasks.length} tasks to current project!`, { id: toastId });
        } else {
          // Create new project for raw tasks
          const projName = customProjectName || "Imported Tasks";
          const newProjectId = crypto.randomUUID();
          const newProject = {
            id: newProjectId,
            name: projName,
            created_at: Date.now(),
          };

          await supabase.from('projects').upsert(newProject);

          const newTasks: SqlTask[] = parsedData.tasks.map((t, idx) => ({
            ...t,
            id: crypto.randomUUID(),
            projectId: newProjectId,
            orderIndex: idx * 1000,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }));

          const tasksToInsert = newTasks.map((t) => ({
            id: t.id,
            title: t.title,
            type: t.type,
            sql: t.sql,
            function_code: t.functionCode,
            description: t.description,
            edge_files: t.edgeFiles,
            edge_secrets: t.edgeSecrets,
            status: t.status,
            folder_id: t.folderId,
            project_id: t.projectId,
            created_at: t.createdAt,
            updated_at: t.updatedAt,
            order_index: t.orderIndex,
          }));

          if (tasksToInsert.length > 0) {
            const { error: tasksErr } = await supabase.from('tasks').upsert(tasksToInsert);
            if (tasksErr) throw tasksErr;
          }

          setProjects([...projects, { id: newProject.id, name: newProject.name, createdAt: newProject.created_at }]);
          setTasks([...tasks, ...newTasks]);
          navigate(`/p/${newProjectId}`);
          toast.success(`Created project "${projName}" with ${newTasks.length} tasks!`, { id: toastId });
        }
      }

      setShowSmartImportModal(false);
      setParsedImportData(null);
    } catch (err: any) {
      console.error("Smart import error:", err);
      toast.error(`Import failed: ${err.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setIsImportingFile(false);
    }
  };

  const tasksInProject = useMemo(() => tasks.filter(t => selectedProjectId ? t.projectId === selectedProjectId : false), [tasks, selectedProjectId]);
  const pendingCount = tasksInProject.filter((t) => t.status === "pending").length;
  const ranCount = tasksInProject.filter((t) => t.status === "ran").length;
  const progress =
    tasksInProject.length === 0 ? 0 : Math.round((ranCount / tasksInProject.length) * 100);

  const currentTabTasks = useMemo(() => tasksInProject.filter(t => (t.type || 'sql') === activeTab), [tasksInProject, activeTab]);
  const tabPendingCount = currentTabTasks.filter((t) => t.status === "pending").length;
  const tabRanCount = currentTabTasks.filter((t) => t.status === "ran").length;

  const projectMetrics = useMemo(() => {
    const metricsMap: Record<string, { total: number, sql: number, funcs: number, ran: number, progress: number }> = {};
    
    // 1. Pre-populate from project metadata summary
    projects.forEach((p: any) => {
      const total = Number(p.totalTasks ?? 0);
      const sql = Number(p.sqlCount ?? 0);
      const funcs = Number(p.functionCount ?? 0);
      const ran = Number(p.ranCount ?? 0);
      metricsMap[p.id] = {
        total,
        sql,
        funcs,
        ran,
        progress: total === 0 ? 0 : Math.round((ran / total) * 100)
      };
    });

    // 2. For any project whose tasks are loaded in memory (e.g. active project), calculate live counts
    const loadedProjectIds = new Set<string>();
    tasks.forEach(t => {
      if (t.projectId) loadedProjectIds.add(t.projectId);
    });

    loadedProjectIds.forEach(projId => {
      const projTasks = tasks.filter(t => t.projectId === projId);
      const total = projTasks.length;
      const sql = projTasks.filter(t => (t.type || 'sql') === 'sql').length;
      const funcs = projTasks.filter(t => t.type === 'edge_function').length;
      const ran = projTasks.filter(t => t.status === 'ran').length;
      metricsMap[projId] = {
        total,
        sql,
        funcs,
        ran,
        progress: total === 0 ? 0 : Math.round((ran / total) * 100)
      };
    });

    return metricsMap;
  }, [projects, tasks]);

  const stagingDiffData = useMemo(() => {
    const data: Record<string, { count: number, tasks: Record<string, 'added' | 'modified' | 'deleted'>, files: Record<string, { files: string[], secrets: boolean }> }> = {};
    
    projects.filter(p => p.name.endsWith(' [STAGING]')).forEach(stagingProj => {
      const prodName = stagingProj.name.replace(' [STAGING]', '');
      const prodProj = projects.find(p => p.name === prodName);
      if (!prodProj) {
        data[stagingProj.id] = { count: 0, tasks: {}, files: {} };
        return;
      }
      
      const prodTasks = tasks.filter(t => t.projectId === prodProj.id);
      const stagingTasks = tasks.filter(t => t.projectId === stagingProj.id);

      const prodTaskMap = new Map<string, SqlTask>(prodTasks.map(t => [t.id, t]));
      const stagingParentMap = new Map<string, SqlTask>();
      stagingTasks.forEach(st => {
        if (st.productionTaskId) stagingParentMap.set(st.productionTaskId, st);
      });

      let count = 0;
      const tasksMap: Record<string, 'added' | 'modified' | 'deleted'> = {};
      const filesMap: Record<string, { files: string[], secrets: boolean }> = {};
      
      // Find Added and Modified
      stagingTasks.forEach(st => {
        if (!st.productionTaskId || !prodTaskMap.has(st.productionTaskId)) {
          count++; // added
          tasksMap[st.id] = 'added';
        } else {
          const pt = prodTaskMap.get(st.productionTaskId)!;
          let isModified = false;
          const changedFiles: string[] = [];
          let hasSecretsChanged = false;

          if (st.type === 'edge_function') {
            const stFilesStr = JSON.stringify(st.edgeFiles?.map(f => ({ n: f.name, c: f.code })) || []);
            const ptFilesStr = JSON.stringify(pt.edgeFiles?.map(f => ({ n: f.name, c: f.code })) || []);
            if (stFilesStr !== ptFilesStr) {
               isModified = true;
               const sfMap = new Map((st.edgeFiles || []).map(f => [f.name, f.code]));
               const ptMap = new Map((pt.edgeFiles || []).map(f => [f.name, f.code]));
               
               (st.edgeFiles || []).forEach(sf => {
                 if (!ptMap.has(sf.name) || ptMap.get(sf.name) !== sf.code) {
                   if (!changedFiles.includes(sf.name)) changedFiles.push(sf.name);
                 }
               });
               (pt.edgeFiles || []).forEach(pf => {
                 if (!sfMap.has(pf.name)) {
                   if (!changedFiles.includes(pf.name)) changedFiles.push(pf.name);
                 }
               });
            }
            
            const stSecretsStr = JSON.stringify(st.edgeSecrets?.map(s => ({ k: s.key, v: s.value })) || []);
            const ptSecretsStr = JSON.stringify(pt.edgeSecrets?.map(s => ({ k: s.key, v: s.value })) || []);
            if (stSecretsStr !== ptSecretsStr) {
                isModified = true;
                hasSecretsChanged = true;
            }
          } else {
            if (st.sql !== pt.sql) isModified = true;
          }
          if (isModified) {
             count++;
             tasksMap[st.id] = 'modified';
             filesMap[st.id] = { files: changedFiles, secrets: hasSecretsChanged };
          }
        }
      });

      // Find Deleted tasks (they exist in prod but not staging)
      prodTasks.forEach(pt => {
        if (!stagingParentMap.has(pt.id)) {
          count++; // deleted
        }
      });
      
      data[stagingProj.id] = { count, tasks: tasksMap, files: filesMap };
    });
    
    return data;
  }, [projects, tasks]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()));
  }, [projects, projectSearchQuery]);

  const activeProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const activeMetrics = useMemo(() => {
    return selectedProjectId ? projectMetrics[selectedProjectId] || { total: 0, sql: 0, funcs: 0, ran: 0, progress: 0 } : null;
  }, [projectMetrics, selectedProjectId]);

  const isCurrentProjectLoading = Boolean(
    isProjectTasksLoading ||
    (selectedProjectId && !loadedProjectIds.has(selectedProjectId) && !tasks.some(t => t.projectId === selectedProjectId))
  );

  if (isLoading) {
    if (isVersionControlParam) {
      return (
        <VersionControlSkeleton
          sidebarWidth={versionSidebarWidth}
          onSidebarWidthChange={setVersionSidebarWidth}
          onClose={() => {
            setShowVersionHistory(false);
            setSearchParams(prev => {
              const next = new URLSearchParams(prev);
              next.delete("versionControl");
              next.delete("versionId");
              return next;
            }, { replace: true });
          }}
        />
      );
    }
    if (isDiffParam) {
      return (
        <DiffViewerSkeleton
          sidebarWidth={diffSidebarWidth}
          onSidebarWidthChange={setDiffSidebarWidth}
          selectedItemId={searchParams.get("diffTaskId")}
          onClose={() => {
            setIsDiffViewerOpen(false);
            setSearchParams(prev => {
              const next = new URLSearchParams(prev);
              next.delete("diff");
              next.delete("diffTaskId");
              return next;
            }, { replace: true });
          }}
        />
      );
    }
    return (
      <SkeletonLoader
        urlTaskId={urlTaskId}
        urlProjectId={urlProjectId}
        activeTab={activeTab}
        sidebarWidth={sidebarWidth}
        onSidebarWidthChange={setSidebarWidth}
        edgeSidebarWidth={edgeSidebarWidthState}
        onEdgeSidebarWidthChange={setEdgeSidebarWidthState}
      />
    );
  }

  return (
    <div className="flex w-full h-dvh bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-50 font-sans overflow-hidden" ref={mainContainerRef}>
      <Toaster 
        position={toastPosition} 
        richColors 
        theme={theme}
        toastOptions={{
          className: '!w-auto !min-w-fit !max-w-max whitespace-nowrap'
        }}
      />
      <OfflineIndicator />
      <PWAInstallModal />
      {/* Sidebar / List View */}
      <div
        ref={mainSidebarRef}
        className={cn(
          "flex flex-col border-r border-slate-200 dark:border-[#0a0a0a] bg-white dark:bg-[#0a0a0a] h-full relative shrink-0",
          selectedTaskId ? "hidden md:flex" : "flex",
          !isResizing && "transition-[width]"
        )}
        style={{ width: window.innerWidth >= 768 ? `${sidebarWidth}px` : "100%" }}
      >
        <div className="p-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] border-b border-slate-200 dark:border-[#0a0a0a] bg-white dark:bg-[#0a0a0a] sticky top-0 z-30 transition-colors">
          <div className="flex flex-col mb-3 w-full min-w-0 select-none gap-1">
            {/* Top Row: Project Title & Filter / Search Icon with Expandable Search Bar */}
            <div className="relative flex items-center justify-between w-full min-h-[30px] min-w-0">
              {/* Default Left & Right content for Top Row (hidden when search is active) */}
              <div className={cn(
                "flex items-center justify-between w-full min-w-0 transition-opacity duration-150",
                isSearchExpanded ? "opacity-0 pointer-events-none" : "opacity-100"
              )}>
                {/* Left: Project Selector Title */}
                <div className="relative flex-1 min-w-0 mr-1">
                  <button
                    onClick={() => {
                      setIsProjectDropdownOpen(!isProjectDropdownOpen);
                      setProjectSearchQuery(""); // clean search query on open
                    }}
                    className="group/selector flex items-center gap-1 w-full py-0.5 px-0.5 rounded text-left outline-none cursor-pointer min-w-0 bg-transparent"
                  >
                    <span className={cn(
                      "font-extrabold text-sm md:text-[14px] leading-tight truncate block transition-colors duration-150",
                      activeProject?.name.endsWith(' [STAGING]') 
                        ? "text-amber-600 dark:text-amber-400 group-hover/selector:text-amber-500 dark:group-hover/selector:text-amber-300" 
                        : "text-blue-600 dark:text-blue-400 group-hover/selector:text-blue-700 dark:group-hover/selector:text-blue-300"
                    )}>
                      {activeProject ? activeProject.name.replace(' [STAGING]', '') : "Select Project"}
                    </span>
                    <ChevronDown size={12} className={cn(
                      "transition-all duration-300 ml-0.5 shrink-0",
                      activeProject?.name.endsWith(' [STAGING]')
                        ? "text-amber-500/70 group-hover/selector:text-amber-600 dark:group-hover/selector:text-amber-300"
                        : "text-slate-400 dark:text-slate-500 group-hover/selector:text-blue-600 dark:group-hover/selector:text-blue-400",
                      isProjectDropdownOpen && "rotate-180"
                    )} />
                  </button>

                  {/* Dropdown Container animate entrance and support absolute dropdown layout */}
                  <AnimatePresence>
                    {isProjectDropdownOpen && (
                      <>
                        {/* Tap outside to dismiss overlay */}
                        <div
                          className="fixed inset-0 z-40 bg-transparent"
                          onClick={() => setIsProjectDropdownOpen(false)}
                        />
                        
                        {/* Absolute PopoverDropdown - Custom True Dark Black Background */}
                        <div className="absolute left-0 top-full mt-3 w-[calc(100vw-32px)] sm:w-80 bg-white dark:bg-black border border-slate-200 dark:border-slate-850 rounded-xl shadow-none z-50 flex flex-col max-h-[380px] md:max-h-[500px]">
                          {/* Tail pointing up-left */}
                          <div className="absolute left-6 -top-1.5 w-3 h-3 bg-white dark:bg-black border-t border-l border-slate-200 dark:border-slate-850 rotate-45 z-0" />
                          
                          <div className="relative z-10 w-full h-full flex flex-col overflow-hidden rounded-xl bg-white dark:bg-black">
                            {/* Search header area */}
                            <div className="px-3.5 pb-2.5 pt-3 border-b border-slate-100 dark:border-slate-900 shrink-0">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Project Folder
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-450 font-bold whitespace-nowrap">
                                {projects.length} Projects
                              </span>
                            </div>

                            <div className="relative mt-1.5">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                              <input
                                type="text"
                                placeholder="Search project folder..."
                                value={projectSearchQuery}
                                onChange={(e) => setProjectSearchQuery(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-black border border-slate-200/40 dark:border-slate-800/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-sans"
                              />
                              {projectSearchQuery && (
                                <button
                                  onClick={() => setProjectSearchQuery("")}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded shrink-0 cursor-pointer"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Search projects outcome list (Edge to Edge) */}
                          <div className="flex-1 overflow-y-auto max-h-[250px] md:max-h-60 py-0 select-none divide-y divide-slate-200/50 dark:divide-slate-850/50">
                            {filteredProjects.length === 0 ? (
                              <div className="px-4 py-8 text-center text-slate-400/80 dark:text-slate-600 flex flex-col items-center justify-center gap-1.5">
                                <FolderClosed size={20} className="stroke-1 text-slate-350 dark:text-slate-750" />
                                <span className="text-xs font-medium">No projects yet</span>
                              </div>
                            ) : (
                              filteredProjects.map((p) => {
                                const isSelected = selectedProjectId === p.id;
                                const isStaging = p.name.endsWith(' [STAGING]');
                                const displayProjectName = isStaging ? p.name.replace(' [STAGING]', '') : p.name;
                                const pm = projectMetrics[p.id] || { total: 0, sql: 0, funcs: 0, ran: 0, progress: 0 };

                                return (
                                  <div 
                                    key={p.id} 
                                    onClick={() => {
                                      if (navigator.vibrate) navigator.vibrate(50);
                                      navigate(`/p/${p.id}`);
                                      setIsProjectDropdownOpen(false);
                                    }}
                                    className={cn(
                                      "group/item relative flex flex-col px-4 py-2.5 transition-all duration-150 border-l-[3px] cursor-pointer",
                                      isSelected 
                                        ? (isStaging 
                                            ? "bg-amber-500/5 dark:bg-amber-950/20 border-l-amber-500 text-amber-700 dark:text-amber-400 font-semibold" 
                                            : "bg-blue-500/5 dark:bg-blue-950/20 border-l-blue-500 text-blue-705 dark:text-blue-400 font-semibold")
                                        : "border-l-transparent hover:bg-slate-50 dark:hover:bg-zinc-950 text-slate-705 dark:text-slate-305"
                                    )}
                                  >
                                    <div className="flex items-center justify-between gap-1.5 w-full">
                                      <div className="flex flex-col min-w-0 flex-1">
                                        <span className={cn(
                                          "text-xs font-bold truncate block",
                                          isStaging ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-450"
                                        )}>
                                          {displayProjectName}
                                        </span>
                                        
                                        <p className="text-[9.5px] flex items-center text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                          {pm.sql} SQL <span className="mx-1">•</span> {pm.funcs} Funcs
                                          {isStaging && (() => {
                                            const diffs = stagingDiffData[p.id]?.count || 0;
                                            return diffs > 0 ? (
                                              <>
                                                <span className="mx-1 text-slate-300 dark:text-slate-700">•</span>
                                                <span className="text-amber-600 dark:text-amber-400 font-bold">{diffs} change{diffs !== 1 ? 's' : ''}</span>
                                              </>
                                            ) : null;
                                          })()}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {/* Custom Nested Dropdown Menu triggered by MoreVertical 3 dots item */}
                                        <div>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setProjectMoreMenuPos({ right: rect.right, bottom: rect.bottom, width: rect.width });
                                              setProjectMoreMenuId(projectMoreMenuId === p.id ? null : p.id);
                                            }}
                                            className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                                            title="Project Actions"
                                          >
                                            <MoreVertical size={13} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Dynamic micro progress bar for completion metrics */}
                                    <div className="mt-2 w-full bg-slate-100 dark:bg-black/50 overflow-hidden rounded-full h-1 relative shrink-0">
                                      <div
                                        className={cn(
                                          "h-full rounded-full transition-all duration-300 ease-out",
                                          isSelected ? (isStaging ? "bg-amber-500" : "bg-blue-500") : "bg-slate-300 dark:bg-slate-700"
                                        )}
                                        style={{ width: `${pm.progress}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                          
                          {/* Footer add project & import buttons */}
                          <div className="h-px bg-slate-200 dark:border-zinc-800 shrink-0" />
                          
                          <div className="px-3 py-2.5 bg-slate-50/50 dark:bg-black/45 shrink-0 flex items-center gap-2">
                            <button
                              onClick={() => {
                                setIsProjectDropdownOpen(false);
                                fileInputRef.current?.click();
                              }}
                              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/60 dark:border-slate-800"
                              title="Import Project JSON"
                            >
                              <UploadCloud size={13} />
                              Import
                            </button>
                            <button
                              onClick={() => {
                                setIsProjectDropdownOpen(false);
                                setShowNewProjectModal(true);
                              }}
                              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Plus size={13} strokeWidth={2.5} />
                              New Project
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </AnimatePresence>
                </div>

                {/* Right: Filter & Search Trigger Button */}
                <div className="flex items-center gap-1 shrink-0">
                  <div className="relative flex items-center">
                    <button
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                      className="group/filter flex items-center gap-1 text-xs py-0.5 px-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors focus:outline-none cursor-pointer font-medium"
                      title="Filter Tasks"
                    >
                      <span className="capitalize leading-tight">{filter}</span>
                      <ChevronDown size={11} className={cn("text-slate-400 transition-transform duration-200", isFilterOpen && "rotate-180")} />
                    </button>
                    {isFilterOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsFilterOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-black border border-slate-200 dark:border-slate-850 rounded-lg shadow-none z-50 flex flex-col">
                          <div className="absolute right-3 -top-1 w-2 h-2 bg-white dark:bg-black border-t border-r border-slate-200 dark:border-slate-850 -rotate-45 z-0" />
                          <div className="relative z-10 bg-white dark:bg-black rounded-lg py-1 overflow-hidden">
                            {(["all", "pending", "ran"] as const).map((f) => (
                              <button
                                key={f}
                                onClick={() => {
                                  setFilter(f);
                                  setIsFilterOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-1.5 text-xs capitalize transition-colors cursor-pointer",
                                  filter === f
                                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900",
                                )}
                              >
                                {f}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />

                  <button
                    onClick={() => {
                      setIsSearchExpanded(true);
                      setIsProjectDropdownOpen(false);
                    }}
                    className="p-1 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-colors cursor-pointer"
                    title="Search Tasks"
                  >
                    <Search size={14} />
                  </button>
                </div>
              </div>

              {/* Animated Expandable Search Bar across the Top Row */}
              <AnimatePresence>
                {isSearchExpanded && (
                  <motion.div
                    key="top-search-bar"
                    initial={{ opacity: 0, width: 28 }}
                    animate={{ opacity: 1, width: "100%" }}
                    exit={{ opacity: 0, width: 28 }}
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                    style={{ transformOrigin: "right center" }}
                    className="absolute inset-y-0 right-0 z-20 flex items-center gap-1.5 w-full bg-white dark:bg-[#0a0a0a]"
                  >
                    <div className="relative flex-1 flex items-center h-full">
                      <Search className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none" size={13} />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Type search queries here..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-full text-xs outline-none transition-colors"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setIsSearchExpanded(false);
                        setSearchQuery("");
                      }}
                      className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer shrink-0"
                      title="Close search"
                    >
                      <X size={15} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Row: Information row (NEVER HIDES!) */}
            <div className="flex items-center justify-between w-full min-w-0 text-[9.5px] font-semibold text-slate-450 dark:text-slate-500 select-none px-0.5">
              {/* Left Info: SQL, funcs, progress, staging diff, saving */}
              <div className="flex items-center gap-1.5 min-w-0 whitespace-nowrap overflow-hidden">
                <span className="truncate">
                  {activeMetrics 
                    ? `${activeMetrics.sql} sql • ${activeMetrics.funcs} funcs` 
                    : "Task metrics"}
                </span>
                <span className="text-slate-300 dark:text-slate-800">•</span>
                <span className="text-emerald-600 dark:text-emerald-400">{progress}%</span>
                {activeProject?.name.endsWith(' [STAGING]') && (() => {
                  const diffs = stagingDiffData[activeProject.id]?.count || 0;
                  return diffs > 0 ? (
                    <>
                      <span className="text-slate-300 dark:text-slate-800">•</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">{diffs} change{diffs !== 1 ? 's' : ''}</span>
                    </>
                  ) : null;
                })()}
                {isSaving && (
                  <span className="text-blue-500 font-bold text-[10px] ml-1 shrink-0 inline-flex items-center gap-1">
                    <Loader size={10} className="animate-spin text-blue-500" />
                    <span>Saving...</span>
                  </span>
                )}
              </div>

              {/* Right Info: Pending & Ran counts */}
              <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap overflow-hidden">
                {currentTabTasks.length === 0 ? (
                  <span>0 tasks</span>
                ) : (
                  <>
                    <span className="text-amber-600 dark:text-amber-400">{tabPendingCount} pending</span>
                    <span className="text-slate-300 dark:text-slate-800">•</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{tabRanCount} ran</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="w-full bg-slate-100 dark:bg-[#121212] rounded-full h-1.5 mb-2 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div 
          className="flex-1 overflow-y-auto py-0 overscroll-contain"
          onScroll={() => {
            isMovedRef.current = true;
            cancelLongPress();
          }}
        >
          {isCurrentProjectLoading ? (
            (() => {
              const tabCount = activeTab === "sql" ? (activeMetrics?.sql ?? 0) : (activeMetrics?.funcs ?? 0);
              if (tabCount > 0) {
                return (
                  <div className="divide-y divide-slate-100 dark:divide-zinc-900/40">
                    {Array.from({ length: tabCount }).map((_, idx) => (
                      <TaskItemSkeleton key={idx} index={idx} />
                    ))}
                  </div>
                );
              }
              return (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-zinc-500 gap-2">
                  <Loader size={24} className="animate-spin text-slate-400 dark:text-zinc-400" />
                </div>
              );
            })()
          ) : filteredTasks.length === 0 ? (
            <div className="text-center p-8 text-slate-400 dark:text-slate-600">
              <Database size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No {activeTab === "sql" ? "queries" : "edge functions"} found.</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd} onDragStart={cancelLongPress}>
              <Droppable droppableId="tasks-list">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {filteredTasks.map((task, index) => (
                      // @ts-ignore
                      <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={isSelectionMode}>
                        {(provided, snapshot) => (
                          <TaskItem
                            task={task}
                            index={index}
                            isLast={index === filteredTasks.length - 1}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedTaskId === task.id}
                            isLastVisited={lastVisitedTaskId === task.id}
                            isSelectedForDeletion={selectedForDeletion.has(task.id)}
                            diffStatus={activeProject?.name.endsWith(' [STAGING]') ? stagingDiffData[activeProject.id]?.tasks[task.id] : undefined}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            cancelLongPress={cancelLongPress}
                            onTaskClick={handleTaskClick}
                            onStatusToggle={handleStatusToggle}
                            onHover={prefetchTaskContent}
                            provided={provided}
                            snapshot={snapshot}
                          />
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>

        {/* Tab Selection at the Bottom */}
        <div className="relative p-3 bg-white dark:bg-[#0a0a0a] border-t border-slate-200 dark:border-[#0a0a0a] z-[60] pb-[max(env(safe-area-inset-bottom),12px)] shrink-0 transition-colors">
          {pendingDragUpdate && (
            <div className="absolute bottom-full left-3 mb-1.5 z-[70] animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-auto">
              <div className="bg-slate-900/95 dark:bg-white/95 backdrop-blur-md text-white dark:text-slate-900 py-1 px-2.5 rounded-lg shadow-md flex items-center gap-2 text-xs font-medium border border-slate-700/60 dark:border-slate-300/60 select-none">
                <span className="text-xs font-medium text-slate-200 dark:text-slate-800 whitespace-nowrap">
                  Order changed
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    id="reorder-discard-btn"
                    onClick={() => {
                      setTasks(pendingDragUpdate.originalTasks);
                      setPendingDragUpdate(null);
                    }}
                    className="px-2 py-0.5 hover:bg-white/10 dark:hover:bg-black/5 rounded text-slate-300 dark:text-slate-600 transition-colors text-xs font-medium cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    id="reorder-save-btn"
                    onClick={async () => {
                      const { updatedTasks, originalTasks } = pendingDragUpdate;
                      setPendingDragUpdate(null);
                      
                      toast.success("Order saved", { id: "reorder-toast", duration: 2000 });
                      
                      const changedTasks = updatedTasks.filter((t, i) => t.orderIndex !== originalTasks[i].orderIndex);
                      
                      if (changedTasks.length > 0) {
                        const success = await syncToDB(changedTasks);
                        if (!success) setTasks(originalTasks);
                      }
                    }}
                    className="px-2.5 py-0.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded text-xs font-medium shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
          {isSelectionMode ? (
            <div className="flex items-center justify-between mx-auto max-w-[340px] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-full shadow-none p-1.5 px-3">
              <span className="text-xs font-semibold px-2">
                {selectedForDeletion.size} Selected
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    if (selectedForDeletion.size === filteredTasks.length && filteredTasks.length > 0) {
                      setSelectedForDeletion(new Set());
                    } else {
                      setSelectedForDeletion(new Set(filteredTasks.map(t => t.id)));
                    }
                  }}
                  className="flex items-center justify-center px-3 py-1.5 text-xs font-medium bg-white/10 dark:bg-black/5 hover:bg-white/20 dark:hover:bg-black/10 rounded-full transition-colors"
                >
                  {selectedForDeletion.size === filteredTasks.length && filteredTasks.length > 0 ? "None" : "All"}
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedForDeletion.size === 0}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
                <div className="w-px h-4 bg-white/20 dark:bg-black/10 mx-1" />
                <button
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedForDeletion(new Set());
                  }}
                  className="flex items-center justify-center p-1.5 bg-white/10 dark:bg-black/5 hover:bg-white/20 dark:hover:bg-black/10 rounded-full transition-colors"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
                className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors flex-shrink-0" 
                title="Toggle Theme"
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>

              <div className="bg-slate-100 dark:bg-black p-1 rounded-full flex items-center justify-between flex-1 max-w-[280px] mx-auto">
                 <button
                    onClick={() => handleTabSwitch("sql")}
                    className={cn(
                      "flex-1 text-center py-1.5 px-2 sm:px-4 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 truncate w-1/2",
                      activeTab === "sql" ? "bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white" : "text-slate-500 dark:text-[#8E8E93] hover:text-slate-700 dark:hover:text-[#E5E5E5]"
                    )}
                 >
                   SQL
                 </button>
                 <button
                    onClick={() => handleTabSwitch("edge_function")}
                    className={cn(
                      "flex-1 text-center py-1.5 px-2 sm:px-4 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 truncate w-1/2",
                      activeTab === "edge_function" ? "bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white" : "text-slate-500 dark:text-[#8E8E93] hover:text-slate-700 dark:hover:text-[#E5E5E5]"
                    )}
                 >
                   Functions
                 </button>
              </div>

              <div className="relative flex items-center shrink-0">
                <button 
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors flex-shrink-0"
                  title="More Options"
                >
                  <MoreHorizontal size={20} />
                </button>

                {isMoreMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsMoreMenuOpen(false)}
                    />
                    <div className="absolute right-0 bottom-full mb-3 w-48 bg-white dark:bg-black border border-slate-200 dark:border-slate-850 rounded-lg shadow-none z-50 flex flex-col">
                      {/* Tail pointing down-right */}
                      <div className="absolute right-4 -bottom-1 w-2 h-2 bg-white dark:bg-black border-b border-r border-slate-200 dark:border-slate-850 rotate-45 z-0" />
                      
                      <div className="relative z-10 bg-white dark:bg-black rounded-lg overflow-hidden py-1">
                        {selectedProjectId && projects.find(p => p.id === selectedProjectId)?.name.endsWith(' [STAGING]') && (
                          <>
                            <button
                              onClick={() => {
                                setIsDiffViewerOpen(true);
                                setIsMoreMenuOpen(false);
                                setSearchParams(prev => {
                                  const next = new URLSearchParams(prev);
                                  next.set("diff", "true");
                                  return next;
                                }, { replace: true });
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-zinc-900 transition-colors flex items-center gap-2 font-medium"
                            >
                              <RotateCw size={14} />
                              Review Changes
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setConfirmMerge(true);
                                setIsMoreMenuOpen(false);
                              }}
                              disabled={isMerging}
                              className="w-full text-left px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-zinc-900 transition-colors flex items-center gap-2 font-medium"
                            >
                              {isMerging ? (
                                <>
                                  <Loader size={14} className="animate-spin" />
                                  Merging...
                                </>
                              ) : (
                                <>
                                  <Copy size={14} />
                                  Merge to Prod
                                </>
                              )}
                            </button>
                            <div className="h-px bg-slate-100 dark:bg-zinc-900 my-1" />
                          </>
                        )}
                        
                        <button
                          onClick={() => {
                            setIsSelectionMode(!isSelectionMode);
                            setIsMoreMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors flex items-center gap-2"
                        >
                          <CheckSquare size={14} />
                          Bulk Select / Delete
                        </button>
                        
                        <div className="h-px bg-slate-100 dark:bg-zinc-900 my-1" />
                        
                        <button
                          onClick={() => {
                            setShowVersionHistory(true);
                            setSearchParams(prev => {
                              const next = new URLSearchParams(prev);
                              next.set("versionControl", "true");
                              return next;
                            });
                            setIsMoreMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <History size={14} />
                          Version Control
                        </button>
                        

                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Backdrop for FAB Speed Dials */}
        <AnimatePresence>
          {(isFabSpeedDialOpen || isCreateSpeedDialOpen) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-black/25 dark:bg-black/55 backdrop-blur-[1px]"
              onClick={() => {
                setIsFabSpeedDialOpen(false);
                setIsFabExportSubmenuOpen(false);
                setIsCreateSpeedDialOpen(false);
              }}
            />
          )}
        </AnimatePresence>

        {/* FAB Speed Dial Stack - Strictly Absolute Positioning */}
        <div className="absolute bottom-20 right-6 z-50 pointer-events-none w-14 h-14">
          
          {/* Main Primary Add Task Button (Flat, No Glow/Shadow) */}
          <div className="absolute bottom-0 right-0 w-14 h-14 flex items-center justify-center pointer-events-auto z-10">
            <button
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(20);
                setIsFabSpeedDialOpen(false);
                setIsFabExportSubmenuOpen(false);
                setIsCreateSpeedDialOpen(!isCreateSpeedDialOpen);
              }}
              className="w-14 h-14 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full flex items-center justify-center transition-all cursor-pointer focus:outline-none"
              title={isCreateSpeedDialOpen ? "Close Create Menu" : "Create New Task"}
            >
              <Plus 
                size={26} 
                className={cn(
                  "transition-transform duration-300", 
                  isCreateSpeedDialOpen ? "rotate-45" : ""
                )} 
              />
            </button>
          </div>

          {/* Create Speed Dial Animated Options (SQL Query, Edge Function) */}
          <AnimatePresence>
            {isCreateSpeedDialOpen && (
              <>
                {/* 1. SQL Query Task Button */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25, delay: 0.03 }}
                  className="absolute bottom-[68px] right-0 w-14 h-11 flex items-center justify-center pointer-events-auto"
                >
                  <span className="absolute right-full mr-3 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900/90 dark:bg-zinc-900/95 text-white border border-slate-700/50 dark:border-zinc-800 shadow-md backdrop-blur-sm pointer-events-none select-none whitespace-nowrap">
                    SQL Query
                  </span>
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(20);
                      handleCreateTask("sql");
                      setIsCreateSpeedDialOpen(false);
                    }}
                    className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer focus:outline-none shadow-md"
                    title="Create SQL Query"
                  >
                    <Database size={19} />
                  </button>
                </motion.div>

                {/* 2. Edge Function Task Button */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25, delay: 0.07 }}
                  className="absolute bottom-[124px] right-0 w-14 h-11 flex items-center justify-center pointer-events-auto"
                >
                  <span className="absolute right-full mr-3 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900/90 dark:bg-zinc-900/95 text-white border border-slate-700/50 dark:border-zinc-800 shadow-md backdrop-blur-sm pointer-events-none select-none whitespace-nowrap">
                    Edge Function
                  </span>
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(20);
                      handleCreateTask("edge_function");
                      setIsCreateSpeedDialOpen(false);
                    }}
                    className="w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-500 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer focus:outline-none shadow-md"
                    title="Create Edge Function"
                  >
                    <FileCode size={19} />
                  </button>
                </motion.div>

                
              </>
            )}
          </AnimatePresence>

          {/* Consolidated Data Actions FAB Button */}
          <AnimatePresence>
            {!isCreateSpeedDialOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-[68px] right-[4px] w-12 h-12 flex items-center justify-center pointer-events-auto"
              >
                <button
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(25);
                    setIsCreateSpeedDialOpen(false);
                    setIsFabSpeedDialOpen(!isFabSpeedDialOpen);
                    if (isFabSpeedDialOpen) {
                      setIsFabExportSubmenuOpen(false);
                    }
                  }}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer border focus:outline-none shadow-md",
                    isFabSpeedDialOpen
                      ? "bg-slate-900 dark:bg-zinc-800 text-blue-400 border-blue-500/40 ring-2 ring-blue-500/30"
                      : "bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 dark:hover:bg-zinc-700 text-white dark:text-zinc-100 border-slate-700/50 dark:border-zinc-700/60"
                  )}
                  title={isFabSpeedDialOpen ? "Close Actions Menu" : "Project Data Actions (Import / Export)"}
                >
                  <div className="relative w-5 h-5 flex items-center justify-center">
                    <CloudSync 
                      size={20} 
                      className={cn(
                        "transition-all duration-300 ease-out", 
                        isFabSpeedDialOpen 
                          ? "rotate-180 opacity-0 scale-50 pointer-events-none absolute" 
                          : "rotate-0 opacity-100 scale-100 text-white dark:text-zinc-100"
                      )} 
                    />
                    <X 
                      size={20} 
                      className={cn(
                        "transition-all duration-300 ease-out", 
                        isFabSpeedDialOpen 
                          ? "rotate-0 opacity-100 scale-100 text-blue-400" 
                          : "-rotate-180 opacity-0 scale-50 pointer-events-none absolute"
                      )} 
                    />
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Data Actions Speed Dial Animated Options */}
          <AnimatePresence>
            {isFabSpeedDialOpen && !isCreateSpeedDialOpen && (
              <>
                {/* 1. Import FAB Button */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25, delay: 0.03 }}
                  className="absolute bottom-[124px] right-0 w-14 h-11 flex items-center justify-center pointer-events-auto"
                >
                  <span className="absolute right-full mr-3 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900/90 dark:bg-zinc-900/95 text-white border border-slate-700/50 dark:border-zinc-800 shadow-md backdrop-blur-sm pointer-events-none select-none whitespace-nowrap">
                    Import Project (.json)
                  </span>
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(20);
                      fileInputRef.current?.click();
                      setIsFabSpeedDialOpen(false);
                    }}
                    className="w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-md flex items-center justify-center transition-all cursor-pointer focus:outline-none"
                    title="Import Project / Workspace (.json)"
                  >
                    <UploadCloud size={19} />
                  </button>
                </motion.div>

                {/* 2. Export Current Project FAB Button */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25, delay: 0.06 }}
                  className="absolute bottom-[180px] right-0 w-14 h-11 flex items-center justify-center pointer-events-auto"
                >
                  <span className="absolute right-full mr-3 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900/90 dark:bg-zinc-900/95 text-white border border-slate-700/50 dark:border-zinc-800 shadow-md backdrop-blur-sm pointer-events-none select-none whitespace-nowrap flex items-center gap-1.5">
                    <span>Export</span>
                    <span className="max-w-[130px] truncate text-amber-300 font-medium">"{activeProject?.name || "Project"}"</span>
                  </span>
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(20);
                      if (activeProject) {
                        handleExportProject(activeProject);
                      } else {
                        handleExport();
                      }
                      setIsFabSpeedDialOpen(false);
                    }}
                    className="w-11 h-11 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-white shadow-md flex items-center justify-center transition-all cursor-pointer focus:outline-none"
                    title={activeProject ? `Export "${activeProject.name}"` : "Export Project"}
                  >
                    <DownloadCloud size={19} />
                  </button>
                </motion.div>

                {/* 3. Export All Projects FAB Button */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25, delay: 0.09 }}
                  className="absolute bottom-[236px] right-0 w-14 h-11 flex items-center justify-center pointer-events-auto"
                >
                  <span className="absolute right-full mr-3 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900/90 dark:bg-zinc-900/95 text-white border border-slate-700/50 dark:border-zinc-800 shadow-md backdrop-blur-sm pointer-events-none select-none whitespace-nowrap flex items-center gap-1.5">
                    <span>Export All Projects</span>
                    <span className="text-purple-300 text-[10px] font-normal">({projects.length})</span>
                  </span>
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(20);
                      handleExportAllProjects();
                      setIsFabSpeedDialOpen(false);
                    }}
                    className="w-11 h-11 rounded-full bg-purple-600 hover:bg-purple-500 active:scale-95 text-white shadow-md flex items-center justify-center transition-all cursor-pointer focus:outline-none"
                    title={`Export All Projects (${projects.length})`}
                  >
                    <Layers size={19} />
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Resize Handle */}
      <div
        ref={mainResizerHandleRef}
        className="hidden md:flex group w-3.5 absolute top-0 bottom-0 z-30 items-center justify-center -ml-[7px] select-none touch-none"
        style={{
          left: sidebarWidth,
          cursor: CUSTOM_COL_RESIZE_CURSOR,
        }}
        onPointerDown={handleResizePointerDown}
      >
        {/* Sleek Neutral Divider Line */}
        <div className="absolute inset-y-0 w-[1px] bg-slate-200 dark:bg-[#0a0a0a] group-hover:bg-slate-400 dark:group-hover:bg-zinc-600 group-active:bg-slate-500 dark:group-active:bg-zinc-500 transition-colors" />

        {/* Custom Visual Grab Handle Indicator (Sleek pill with dual vertical grip bars) */}
        <div className="relative z-10 w-3.5 h-7 rounded-full bg-white dark:bg-zinc-900 border border-slate-300/90 dark:border-zinc-700/90 shadow-sm flex items-center justify-center gap-[2px] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-150 pointer-events-none">
          <div className="w-[1.5px] h-3 bg-slate-400 dark:bg-zinc-500 rounded-full" />
          <div className="w-[1.5px] h-3 bg-slate-400 dark:bg-zinc-500 rounded-full" />
        </div>
      </div>

      {/* Main Content / Editor */}
      <div
        className={cn(
          "flex-1 flex flex-col h-full bg-slate-50 dark:bg-black relative min-w-0 transition-colors",
          !selectedTaskId ? "hidden md:flex" : "flex",
        )}
      >
        {selectedTask ? (
          !selectedTask.isContentFetched && loadingTaskContentId === selectedTask.id ? (
            <EditorSkeleton
              urlTaskId={selectedTask.id}
              activeTab={selectedTask.type}
              edgeSidebarWidth={edgeSidebarWidthState}
              onEdgeSidebarWidthChange={setEdgeSidebarWidthState}
            />
          ) : (
          <>
            {/* Editor Header */}
            <div className="flex flex-col pt-[env(safe-area-inset-top,0px)] border-b border-slate-200 dark:border-[#0a0a0a] bg-white dark:bg-[#0a0a0a] transition-colors">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/p/${selectedProjectId}`)}
                    className="p-1.5 -ml-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-md shrink-0"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <DebouncedTitleInput
                    value={selectedTask.title || ""}
                    onChange={(newVal) =>
                      handleUpdateTask(selectedTask.id, {
                        title: newVal,
                      })
                    }
                    className="text-base font-semibold bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full truncate placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal dark:text-white"
                    placeholder="Query Title"
                  />
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {selectedTask.type === "edge_function" && (
                    <>
                      <button
                        onClick={() => document.getElementById(`import-zip-main-${selectedTask.id}`)?.click()}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        title="Import Zip"
                      >
                        <input 
                          type="file" 
                          id={`import-zip-main-${selectedTask.id}`} 
                          className="hidden" 
                          accept=".zip" 
                          onChange={(e) => handleImportEdgeZip(selectedTask.id, e)} 
                        />
                        <UploadCloud size={16} />
                      </button>
                      <button
                        onClick={() => handleExportEdgeZip(selectedTask)}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        title="Export Zip"
                      >
                        <DownloadCloud size={16} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() =>
                      handleUpdateTask(selectedTask.id, {
                        status:
                          selectedTask.status === "pending" ? "ran" : "pending",
                      })
                    }
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                      selectedTask.status === "ran"
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
                        : "bg-slate-100 dark:bg-[#0a0a0a] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800",
                    )}
                  >
                    {selectedTask.status === "ran" ? (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Ran</span>
                      </>
                    ) : (
                      <>
                        <Circle size={14} />
                        <span>Mark as Ran</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="px-3 pb-2 mt-1">
                {isEditingDescription ? (
                  <DebouncedDescriptionTextarea
                    value={selectedTask.description || ""}
                    onChange={(newVal) =>
                      handleUpdateTask(selectedTask.id, {
                        description: newVal,
                      })
                    }
                    placeholder="Describe what this does..."
                    className="w-full text-sm bg-slate-50 dark:bg-[#0a0a0a]/50 border border-blue-500 dark:border-blue-500 rounded-md p-2 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-y min-h-[80px] dark:text-slate-200 dark:placeholder:text-slate-600"
                  />
                ) : selectedTask.description ? (
                  <div className="group relative flex items-start justify-between gap-2 py-1.5 transition-all">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    >
                      <p className={cn(
                        "text-xs text-slate-500 dark:text-slate-400 leading-relaxed transition-all",
                        !isDescriptionExpanded && "line-clamp-2"
                      )}>
                        {selectedTask.description}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingDescription(true);
                      }}
                      className="p-1 text-slate-300 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-400 transition-colors shrink-0"
                      title="Edit Description"
                    >
                      <Pencil size={13} strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 bg-slate-50/50 dark:bg-[#0a0a0a]/30 border border-dashed border-slate-200 dark:border-[#2a2a2a] rounded-lg">
                    <button
                      onClick={() => setIsEditingDescription(true)}
                      className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-all px-4 py-1"
                    >
                      <PlusCircle size={14} />
                      Add Description
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Editor Body */}
            {selectedTask.type === "edge_function" ? (
              <div className="flex-1 overflow-hidden min-w-0">
                <EdgeFunctionEditor
                  task={selectedTask}
                  changedFiles={activeProject?.name.endsWith(' [STAGING]') ? stagingDiffData[activeProject.id]?.files[selectedTask.id]?.files : undefined}
                  hasSecretsChanged={activeProject?.name.endsWith(' [STAGING]') ? stagingDiffData[activeProject.id]?.files[selectedTask.id]?.secrets : undefined}
                  onUpdate={(updates) =>
                    handleUpdateTask(selectedTask.id, updates)
                  }
                />
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col relative bg-white dark:bg-black min-w-0 transition-colors">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-[#0a0a0a] border-b border-slate-200 dark:border-[#0a0a0a] text-slate-500 dark:text-slate-400 text-xs font-mono transition-colors">
                  <span>SQL Editor</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUndo}
                      disabled={historyIndex <= 0}
                      className="flex items-center justify-center w-7 h-7 hover:text-slate-900 dark:hover:text-white transition-colors rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Undo"
                    >
                      <Undo2 size={14} />
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={historyIndex >= sqlHistory.length - 1}
                      className="flex items-center justify-center w-7 h-7 hover:text-slate-900 dark:hover:text-white transition-colors rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Redo"
                    >
                      <Redo2 size={14} />
                    </button>
                    <button
                      onClick={() => handleCopySql(selectedTask.sql)}
                      className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 ml-2"
                    >
                      {copied ? (
                        <Check size={14} className="text-emerald-500 dark:text-emerald-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                      {copied ? "Copied!" : "Copy Code"}
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto relative min-w-0 bg-white dark:bg-black text-slate-800 dark:text-slate-300 transition-colors">
                  <DebouncedCodeEditor
                    value={selectedTask.type === "edge_function" ? selectedTask.functionCode || "" : selectedTask.sql || ""}
                    onChange={handleSqlChange}
                    taskType={selectedTask.type}
                  />
                </div>
              </div>
            )}
          </>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 p-8">
            {activeTab === "sql" ? (
              <Database size={48} className="mb-4 opacity-20" />
            ) : (
              <Terminal size={48} className="mb-4 opacity-20" />
            )}
            <h2 className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-2">
              No {activeTab === "sql" ? "Query" : "Function"} Selected
            </h2>
            <p className="text-sm text-center max-w-sm">
              Select a {activeTab === "sql" ? "query" : "function"} from the sidebar or create a new one to start writing code.
            </p>
            <button
              onClick={() => {
                if (!selectedProjectId) {
                  toast.error("Please create or select a project first");
                  return;
                }
                handleCreateTask(activeTab);
              }}
              className="mt-6 flex items-center gap-2 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#2a2a2a] hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-md font-medium transition-colors text-sm"
            >
              <Plus size={16} />
              Create New
            </button>
          </div>
        )}
      </div>

      {/* Type Selector Modal */}
      {showTypeSelector && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowTypeSelector(false)}
        >
          <div
            className="bg-white dark:bg-[#0a0a0a] rounded-xl shadow-none max-w-sm w-full p-4 border border-slate-200 dark:border-[#1a1a1a]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Create New Task
              </h3>
              <button
                onClick={() => setShowTypeSelector(false)}
                className="p-1 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              What type of task do you want to create?
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => handleCreateTask("sql")}
                className="flex-1 border border-slate-200 dark:border-[#2a2a2a] rounded-lg p-3 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/60 dark:hover:bg-blue-500/10 transition-all flex flex-col items-center justify-center gap-2 group text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <div className="bg-slate-100 dark:bg-[#121212] p-2 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  <Database size={20} />
                </div>
                <div className="text-center">
                  <h4 className="text-xs font-semibold mb-0.5 dark:text-slate-200">SQL Query</h4>
                  <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-500">
                    Create or modify tables
                  </p>
                </div>
              </button>
              <button
                onClick={() => handleCreateTask("edge_function")}
                className="flex-1 border border-slate-200 dark:border-[#2a2a2a] rounded-lg p-3 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/60 dark:hover:bg-blue-500/10 transition-all flex flex-col items-center justify-center gap-2 group text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <div className="bg-slate-100 dark:bg-[#121212] p-2 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  <FileCode size={20} />
                </div>
                <div className="text-center">
                  <h4 className="text-xs font-semibold mb-0.5 dark:text-slate-200">Edge Function</h4>
                  <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-500">
                    TypeScript & secrets
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] rounded-lg shadow-none max-w-sm w-full p-6 border border-slate-200 dark:border-[#1a1a1a]">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Delete Tasks?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              Are you sure you want to delete {selectedForDeletion.size}{" "}
              selected {selectedForDeletion.size === 1 ? "task" : "tasks"}?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:hover:bg-red-600 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader size={14} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] rounded-lg shadow-none max-w-sm w-full p-6 border border-slate-200 dark:border-[#1a1a1a]">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Create New Project
            </h3>
            <input
              type="text"
              className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
              placeholder="Project Name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              autoFocus
              disabled={isCreatingProject}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && newProjectName.trim() && !isCreatingProject) {
                  setIsCreatingProject(true);
                  const name = newProjectName.trim();
                  const newProject = { id: crypto.randomUUID(), name, created_at: Date.now() };
                  const { error } = await supabase.from('projects').upsert(newProject);
                  if (!error) {
                    setProjects(prev => {
                      if (prev.some(p => p.id === newProject.id)) return prev;
                      return [...prev, { id: newProject.id, name: newProject.name, createdAt: newProject.created_at }];
                    });
                    setLoadedProjectIds(prev => new Set(prev).add(newProject.id));

                    // Snapshot for version control
                    const stateBefore: VersionBackupData = {
                      projects: [...projects],
                      tasks: []
                    };
                    const stateAfter: VersionBackupData = {
                      projects: [...projects, { id: newProject.id, name: newProject.name, createdAt: newProject.created_at }],
                      tasks: []
                    };
                    saveVersionBackup(
                      'create_project',
                      newProject.id,
                      null,
                      `Created project "${name}"`,
                      stateBefore,
                      stateAfter
                    );

                    navigate(`/p/${newProject.id}`);
                    setShowNewProjectModal(false);
                    setNewProjectName("");
                  } else {
                    toast.error("Failed to create project");
                  }
                  setIsCreatingProject(false);
                } else if (e.key === "Escape" && !isCreatingProject) {
                  setShowNewProjectModal(false);
                  setNewProjectName("");
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewProjectModal(false);
                  setNewProjectName("");
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!newProjectName.trim() || isCreatingProject}
                onClick={async () => {
                  if (newProjectName.trim() && !isCreatingProject) {
                    setIsCreatingProject(true);
                    const name = newProjectName.trim();
                    const newProject = { id: crypto.randomUUID(), name, created_at: Date.now() };
                    const { error } = await supabase.from('projects').upsert(newProject);
                    if (!error) {
                      setProjects(prev => {
                        if (prev.some(p => p.id === newProject.id)) return prev;
                        return [...prev, { id: newProject.id, name: newProject.name, createdAt: newProject.created_at }];
                      });
                      setLoadedProjectIds(prev => new Set(prev).add(newProject.id));

                      // Snapshot for version control
                      const stateBefore: VersionBackupData = {
                        projects: [...projects],
                        tasks: []
                      };
                      const stateAfter: VersionBackupData = {
                        projects: [...projects, { id: newProject.id, name: newProject.name, createdAt: newProject.created_at }],
                        tasks: []
                      };
                      saveVersionBackup(
                        'create_project',
                        newProject.id,
                        null,
                        `Created project "${name}"`,
                        stateBefore,
                        stateAfter
                      );

                      navigate(`/p/${newProject.id}`);
                      setShowNewProjectModal(false);
                      setNewProjectName("");
                    } else {
                      toast.error("Failed to create project");
                    }
                    setIsCreatingProject(false);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 min-w-[80px]"
              >
                {isCreatingProject ? "..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Confirm Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] rounded-lg shadow-none max-w-sm w-full p-6 border border-slate-200 dark:border-[#1a1a1a]">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Delete Project
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              Are you sure you want to delete <span className="font-semibold">{projectToDelete.name}</span> and all of its tasks? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setProjectToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const projTasks = tasks.filter(t => t.projectId === projectToDelete.id);

                    // Snapshot for version control (allows Resurrection of deleted project)
                    const stateBefore: VersionBackupData = {
                      projects: [projectToDelete],
                      tasks: projTasks
                    };
                    const stateAfter: VersionBackupData = {
                      projects: [],
                      tasks: []
                    };
                    saveVersionBackup(
                      'delete_project',
                      projectToDelete.id,
                      null,
                      `Deleted project "${projectToDelete.name}" (${projTasks.length} tasks)`,
                      stateBefore,
                      stateAfter
                    );

                    // Manual cascade: Delete tasks first (includes both sql and edge_function tasks)
                    await supabase.from('tasks').delete().eq('project_id', projectToDelete.id);
                    // Cascade delete for folders
                    await supabase.from('folders').delete().eq('project_id', projectToDelete.id);
                    // Then delete project
                    const { error } = await supabase.from('projects').delete().eq('id', projectToDelete.id);
                    if (error) throw error;
                    
                    let nextSelectedId: string | null = null;
                    setProjects(prev => {
                      const newProjects = prev.filter(p => p.id !== projectToDelete.id);
                      if (selectedProjectId === projectToDelete.id) {
                        nextSelectedId = newProjects.length > 0 ? newProjects[0].id : null;
                      }
                      return newProjects;
                    });
                    setTasks(prev => prev.filter(t => t.projectId !== projectToDelete.id));
                    if (selectedProjectId === projectToDelete.id) {
                      navigate(nextSelectedId ? `/p/${nextSelectedId}` : "/");
                    }
                    toast.success('Project deleted');
                  } catch (err) {
                    toast.error('Failed to delete project');
                  } finally {
                    setIsDeleting(false);
                    setProjectToDelete(null);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader size={14} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Project"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Project Modal */}
      {projectToRename && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] rounded-lg shadow-none max-w-sm w-full p-6 border border-slate-200 dark:border-[#1a1a1a]">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Rename Project
            </h3>
            <input
              type="text"
              className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
              placeholder="Project Name"
              value={renameProjectName}
              onChange={(e) => setRenameProjectName(e.target.value)}
              autoFocus
              onKeyDown={async (e) => {
                if (e.key === "Enter" && renameProjectName.trim()) {
                  const name = renameProjectName.trim();
                  const projTasks = tasks.filter(t => t.projectId === projectToRename.id);
                  const stateBefore: VersionBackupData = {
                    projects: [projectToRename],
                    tasks: projTasks
                  };
                  const stateAfter: VersionBackupData = {
                    projects: [{ ...projectToRename, name }],
                    tasks: projTasks
                  };
                  const { error } = await supabase.from('projects').update({ name }).eq('id', projectToRename.id);
                  if (!error) {
                    setProjects(projects.map(p => p.id === projectToRename.id ? { ...p, name } : p));
                    saveVersionBackup(
                      'rename_project',
                      projectToRename.id,
                      null,
                      `Renamed project "${projectToRename.name}" to "${name}"`,
                      stateBefore,
                      stateAfter
                    );
                    toast.success("Project renamed");
                    setProjectToRename(null);
                  } else {
                    toast.error("Failed to rename project");
                  }
                } else if (e.key === "Escape") {
                  setProjectToRename(null);
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setProjectToRename(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!renameProjectName.trim()}
                onClick={async () => {
                  if (renameProjectName.trim()) {
                    const name = renameProjectName.trim();
                    const projTasks = tasks.filter(t => t.projectId === projectToRename.id);
                    const stateBefore: VersionBackupData = {
                      projects: [projectToRename],
                      tasks: projTasks
                    };
                    const stateAfter: VersionBackupData = {
                      projects: [{ ...projectToRename, name }],
                      tasks: projTasks
                    };
                    const { error } = await supabase.from('projects').update({ name }).eq('id', projectToRename.id);
                    if (!error) {
                      setProjects(projects.map(p => p.id === projectToRename.id ? { ...p, name } : p));
                      saveVersionBackup(
                        'rename_project',
                        projectToRename.id,
                        null,
                        `Renamed project "${projectToRename.name}" to "${name}"`,
                        stateBefore,
                        stateAfter
                      );
                      toast.success("Project renamed");
                      setProjectToRename(null);
                    } else {
                      toast.error("Failed to rename project");
                    }
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Project More Menu Dropdown Portal */}
      {projectMoreMenuId && (() => {
        const p = projects.find(proj => proj.id === projectMoreMenuId);
        if (!p) return null;
        
        const menuWidth = 160;
        const left = Math.max(10, projectMoreMenuPos.right - menuWidth);
        const dropdownRight = left + menuWidth;
        const buttonCenter = projectMoreMenuPos.right - (projectMoreMenuPos.width / 2);
        const tailRight = dropdownRight - buttonCenter - 4;
        
        return (
          <div 
            className="fixed inset-0 z-[9990] bg-transparent"
            onClick={() => setProjectMoreMenuId(null)}
          >
            <div
              className="fixed w-40 bg-white dark:bg-black border border-slate-200 dark:border-slate-850 rounded-lg shadow-none z-[9999] text-left font-sans flex flex-col"
              style={{ 
                left: left,
                top: projectMoreMenuPos.bottom + 6 
              }}
            >
              {/* Elegant Tail pointing up */}
              <div className="absolute -top-1 w-2 h-2 bg-white dark:bg-black border-t border-l border-slate-200 dark:border-slate-850 rotate-45 z-0" style={{ right: tailRight }} />
              
              <div className="relative z-10 bg-white dark:bg-black rounded-lg overflow-hidden py-1">
                <button 
                  onClick={(e) => { 
                    e.stopPropagation();
                    setProjectToRename(p); 
                    setRenameProjectName(p.name); 
                    setProjectMoreMenuId(null); 
                    setIsProjectDropdownOpen(false); 
                  }} 
                  className="w-full px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Pencil size={11} className="text-slate-400" />
                  Rename Project
                </button>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation();
                    handleCloneProject(p); 
                    setProjectMoreMenuId(null); 
                    setIsProjectDropdownOpen(false); 
                  }} 
                  className="w-full px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900 flex items-center gap-2 cursor-pointer transition-colors"
                  disabled={isCloning}
                >
                  <Copy size={11} className="text-slate-400" />
                  Copy To Staging
                </button>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation();
                    handleExportProject(p); 
                    setProjectMoreMenuId(null); 
                    setIsProjectDropdownOpen(false); 
                  }} 
                  className="w-full px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <DownloadCloud size={11} className="text-slate-400" />
                  Export Project (.json)
                </button>
                <div className="h-px bg-slate-100 dark:bg-zinc-900 my-1" />
                <button 
                  onClick={(e) => { 
                    e.stopPropagation();
                    setProjectToDelete(p); 
                    setProjectMoreMenuId(null); 
                    setIsProjectDropdownOpen(false); 
                  }} 
                  className="w-full px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-955/20 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Trash2 size={11} className="text-red-400" />
                  Delete Project
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Dedicated Version Control Full View Page */}
      <VersionControlPage
        isOpen={showVersionHistory}
        onClose={() => {
          setShowVersionHistory(false);
          setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete("versionControl");
            next.delete("versionId");
            return next;
          }, { replace: true });
        }}
        versionBackups={versionBackups}
        currentProjects={projects}
        activeProjectId={selectedProjectId}
        onRestoreBackup={handleRestoreBackup}
        onDeleteBackups={handleDeleteVersionBackups}
        sidebarWidth={versionSidebarWidth}
        onSidebarWidthChange={setVersionSidebarWidth}
      />

      {/* Confirmation Modal for Merge to Prod from More Menu */}
      {confirmMerge && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121212] rounded-xl shadow-none max-w-sm w-full p-6 border border-slate-200 dark:border-[#2a2a2a] transform transition-all">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <Copy className="text-emerald-500" size={20} />
              Confirm Merge to Production
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to merge all staging changes to production? This will overwrite the production environment with your current staging state.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmMerge(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleMergeToProduction();
                  setConfirmMerge(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-[#121212] rounded-lg transition-colors"
              >
                Yes, Merge to Prod
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diff Viewer Modal */}
      {isDiffViewerOpen && selectedProjectId && projects.find(p => p.id === selectedProjectId)?.name.endsWith(' [STAGING]') && (
        <DiffViewer
          theme={theme}
          onClose={() => {
            setIsDiffViewerOpen(false);
            setSearchParams(prev => {
              const next = new URLSearchParams(prev);
              next.delete("diff");
              next.delete("diffTaskId");
              return next;
            }, { replace: true });
          }}
          stagingProjectId={selectedProjectId}
          prodProjectId={projects.find(p => p.name === projects.find(pp => pp.id === selectedProjectId)!.name.replace(' [STAGING]', ''))?.id!}
          expectedDiffCount={stagingDiffData[selectedProjectId]?.count}
          isMerging={isMerging}
          isRejecting={isRejecting}
          onMerge={(selectedDiffItems, isAll) => {
            handleMergeToProduction(selectedDiffItems, isAll);
          }}
          onReject={(selectedDiffItems, isAll) => {
            handleRejectFromStaging(selectedDiffItems, isAll);
          }}
        />
      )}

      {/* Smart Project Import Modal */}
      <SmartImportModal
        isOpen={showSmartImportModal}
        onClose={() => {
          setShowSmartImportModal(false);
          setParsedImportData(null);
        }}
        importData={parsedImportData}
        existingProjects={projects}
        activeProjectId={selectedProjectId}
        onConfirmImport={handleConfirmSmartImport}
        isImporting={isImportingFile}
      />
    </div>
  );
}
