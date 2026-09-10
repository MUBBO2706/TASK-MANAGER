import React, { useState, useMemo, useEffect } from "react";
import { 
  Undo2, 
  Redo2, 
  History, 
  X, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  FileCode, 
  ArrowLeft, 
  Database, 
  FlaskConical, 
  Layers, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Loader, 
  FolderPlus, 
  FolderMinus, 
  Pencil, 
  Trash2, 
  GitMerge, 
  Copy, 
  Check, 
  UploadCloud, 
  FilePlus2, 
  Code2, 
  Diff as DiffIcon,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Project, VersionBackup, SqlTask } from "../../types";
import { SideBySideDiff } from "./SideBySideDiff";
import { WordDiffView } from "./WordDiffView";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useHybridState } from "../../hooks/useHybridState";
import { ConsolidatedBackupGroup } from "./consolidation";
import { DiffCodeSkeleton, CodeBlockSkeleton } from "../DiffViewerSkeleton";
import { VersionDetailSkeleton } from "./VersionControlSkeleton";

interface VersionDetailViewProps {
  versionGroup?: VersionBackup[] | null;
  currentGroup?: ConsolidatedBackupGroup | null;
  currentProjects?: Project[];
  onBack?: () => void;
  onRestore: (backup: VersionBackup, type: "undo" | "redo") => Promise<void>;
  isRestoring?: boolean;
  detailLoading?: boolean;
  activeProjectId?: string | null;
}

export function getActionBadgeConfig(action: string) {
  switch (action) {
    case "merge":
      return {
        label: "MERGE",
        className: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
        icon: <GitMerge size={12} className="stroke-[2.5]" />
      };
    case "reject":
      return {
        label: "REJECT",
        className: "text-rose-700 dark:text-rose-300 bg-rose-500/15 border-rose-500/30",
        icon: <X size={12} className="stroke-[2.5]" />
      };
    case "create_task":
      return {
        label: "NEW TASK",
        className: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
        icon: <FilePlus2 size={12} className="stroke-[2.5]" />
      };
    case "update_task":
      return {
        label: "EDIT TASK",
        className: "text-sky-700 dark:text-sky-300 bg-sky-500/15 border-sky-500/30",
        icon: <Pencil size={12} className="stroke-[2.5]" />
      };
    case "update_status":
      return {
        label: "STATUS",
        className: "text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/30",
        icon: <CheckCircle2 size={12} className="stroke-[2.5]" />
      };
    case "delete_task":
      return {
        label: "DELETE TASK",
        className: "text-rose-700 dark:text-rose-300 bg-rose-500/15 border-rose-500/30",
        icon: <Trash2 size={12} className="stroke-[2.5]" />
      };
    case "create_project":
      return {
        label: "NEW PROJECT",
        className: "text-teal-700 dark:text-teal-300 bg-teal-500/15 border-teal-500/30",
        icon: <FolderPlus size={12} className="stroke-[2.5]" />
      };
    case "rename_project":
      return {
        label: "RENAME PROJ",
        className: "text-purple-700 dark:text-purple-300 bg-purple-500/15 border-purple-500/30",
        icon: <Pencil size={12} className="stroke-[2.5]" />
      };
    case "delete_project":
      return {
        label: "DELETE PROJ",
        className: "text-rose-700 dark:text-rose-300 bg-rose-500/15 border-rose-500/30",
        icon: <FolderMinus size={12} className="stroke-[2.5]" />
      };
    case "clone_project":
      return {
        label: "REPLICA",
        className: "text-indigo-700 dark:text-indigo-300 bg-indigo-500/15 border-indigo-500/30",
        icon: <Copy size={12} className="stroke-[2.5]" />
      };
    case "import_tasks":
      return {
        label: "IMPORT",
        className: "text-blue-700 dark:text-blue-300 bg-blue-500/15 border-blue-500/30",
        icon: <UploadCloud size={12} className="stroke-[2.5]" />
      };
    default:
      return {
        label: (action || "SNAPSHOT").toUpperCase(),
        className: "text-slate-700 dark:text-zinc-300 bg-slate-500/15 border-slate-500/30",
        icon: <History size={12} className="stroke-[2.5]" />
      };
  }
}

// Helper to calculate diff between two task arrays for an individual revision
function computeTaskDiffs(tasksBefore: SqlTask[], tasksAfter: SqlTask[]) {
  const beforeTaskIds = new Set(tasksBefore.map((t) => t.id));
  const afterTaskIds = new Set(tasksAfter.map((t) => t.id));

  const addedTasks = tasksAfter.filter((t) => !beforeTaskIds.has(t.id));
  const removedTasks = tasksBefore.filter((t) => !afterTaskIds.has(t.id));

  const modifiedTaskDiffs: Array<{
    task: SqlTask;
    oldTask: SqlTask;
    oldCode: string;
    newCode: string;
    codeChanged: boolean;
    titleChanged: boolean;
    statusChanged: boolean;
    descriptionChanged: boolean;
    orderChanged: boolean;
  }> = [];

  tasksAfter.forEach((newTask) => {
    if (!beforeTaskIds.has(newTask.id)) return;
    const oldTask = tasksBefore.find((b) => b.id === newTask.id);
    if (!oldTask) return;

    const oldCode =
      oldTask.sql ||
      oldTask.functionCode ||
      (oldTask as any).function_code ||
      "";
    const newCode =
      newTask.sql ||
      newTask.functionCode ||
      (newTask as any).function_code ||
      "";

    const codeChanged = (oldTask as any).isContentStripped || (newTask as any).isContentStripped 
      ? !!((oldTask as any).wasCodeModified || (newTask as any).wasCodeModified) 
      : oldCode.trim() !== newCode.trim();
    const titleChanged = (oldTask.title || "") !== (newTask.title || "");
    const statusChanged = (oldTask.status || "") !== (newTask.status || "");
    const descriptionChanged = (oldTask.description || "") !== (newTask.description || "");
    const orderChanged = (oldTask.orderIndex !== undefined ? oldTask.orderIndex : null) !== (newTask.orderIndex !== undefined ? newTask.orderIndex : null);

    if (codeChanged || titleChanged || statusChanged || descriptionChanged || orderChanged) {
      modifiedTaskDiffs.push({
        task: newTask,
        oldTask,
        oldCode,
        newCode,
        codeChanged,
        titleChanged,
        statusChanged,
        descriptionChanged,
        orderChanged,
      });
    }
  });

  return { addedTasks, removedTasks, modifiedTaskDiffs };
}

export function VersionDetailView({
  versionGroup,
  currentGroup,
  currentProjects = [],
  onBack,
  onRestore,
  isRestoring = false,
  detailLoading = false,
  activeProjectId,
}: VersionDetailViewProps) {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [taskSearch, setTaskSearch] = useLocalStorage("version-detail-task-search", "");
  const [selectedTaskTab, setSelectedTaskTab] = useHybridState<"all" | "sql" | "edge">("vTaskTab", "all");
  const [activeViewTab, setActiveViewTab] = useHybridState<"diff" | "snapshot">("vViewTab", "diff");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [expandedDiffId, setExpandedDiffId] = useState<string | null>(null);
  const [expandedAddedId, setExpandedAddedId] = useState<string | null>(null);
  const [expandedRemovedId, setExpandedRemovedId] = useState<string | null>(null);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(true);
  const [expandedRevisionIds, setExpandedRevisionIds] = useState<Set<string>>(new Set());
  const [fetchedTaskStates, setFetchedTaskStates] = useState<Record<string, { stateBefore?: any, stateAfter?: any }>>({});
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<"undo" | "redo" | null>(null);
  const [targetVersionId, setTargetVersionId] = useState<string | null>(null);

  const version = versionGroup && versionGroup.length > 0 ? versionGroup[0] : null;
  const oldestVersionInGroup = versionGroup && versionGroup.length > 0 ? versionGroup[versionGroup.length - 1] : null;

  const handleExpandTaskForDiff = async (taskId: string, currentExpandedId: string | null, setter: React.Dispatch<React.SetStateAction<string | null>>, task1: SqlTask | undefined, task2: SqlTask | undefined) => {

    const isExpanding = currentExpandedId !== taskId;

    setter(isExpanding ? taskId : null);



    if (isExpanding && versionGroup && versionGroup.length > 0) {

      const needsFetch = (task1 && task1.isContentStripped) || (task2 && task2.isContentStripped);

      if (needsFetch && !fetchedTaskStates[taskId]) {

        try {

          setLoadingTaskId(taskId);

          const oldest = versionGroup[versionGroup.length - 1];

          const latest = versionGroup[0];



          const devKeysModules = import.meta.glob("../../lib/dev-keys.ts", { eager: true });

          const devKeys: any = devKeysModules["../../lib/dev-keys.ts"] || {};

          const apiKey = import.meta.env.VITE_API_KEY || devKeys.VITE_API_KEY || "sk_sync_b4k92jdm10";



          let url = `/api/version-task-state?taskId=${taskId}&api_key=${apiKey}`;

          if (task1) url += `&versionIdBefore=${oldest.id}`;

          if (task2) url += `&versionIdAfter=${latest.id}`;



          const res = await fetch(url);

          if (res.ok) {

            const data = await res.json();

            setFetchedTaskStates(prev => ({ ...prev, [taskId]: data }));

          }

        } catch (err) {

          console.error("Failed to fetch full task details", err);

        } finally {

          setLoadingTaskId(null);

        }

      }

    }

  };

  const existingProjectIds = useMemo(
    () => new Set(currentProjects.map((p) => p.id)),
    [currentProjects]
  );

  const targetProjectId = useMemo(() => {
    if (activeProjectId === version?.stagingProjectId) {
      return version?.stagingProjectId;
    }
    return version?.prodProjectId;
  }, [activeProjectId, version]);

  const tasksBefore = useMemo(() => {
    const rawTasks = oldestVersionInGroup?.stateBefore?.tasks || [];
    const filtered = targetProjectId 
      ? rawTasks.filter((t: SqlTask) => t.projectId === targetProjectId)
      : rawTasks;
    return filtered.map((t: SqlTask) => {
      if (fetchedTaskStates[t.id]?.stateBefore) {
         return { ...t, ...fetchedTaskStates[t.id].stateBefore };
      }
      return t;
    });
  }, [oldestVersionInGroup, fetchedTaskStates, targetProjectId]);

  const tasksAfter = useMemo(() => {
    const rawTasks = version?.stateAfter?.tasks || [];
    const filtered = targetProjectId 
      ? rawTasks.filter((t: SqlTask) => t.projectId === targetProjectId)
      : rawTasks;
    return filtered.map((t: SqlTask) => {
      if (fetchedTaskStates[t.id]?.stateAfter) {
         return { ...t, ...fetchedTaskStates[t.id].stateAfter };
      }
      return t;
    });
  }, [version, fetchedTaskStates, targetProjectId]);

  const projectsBefore = useMemo(() => oldestVersionInGroup?.stateBefore?.projects || [], [oldestVersionInGroup]);
  const projectsAfter = useMemo(() => version?.stateAfter?.projects || [], [version]);

  const tasksDelta = tasksAfter.length - tasksBefore.length;

  const beforeTaskIds = useMemo(() => new Set(tasksBefore.map((t) => t.id)), [tasksBefore]);
  const afterTaskIds = useMemo(() => new Set(tasksAfter.map((t) => t.id)), [tasksAfter]);

  const { addedTasks, removedTasks, modifiedTaskDiffs } = useMemo(
    () => computeTaskDiffs(tasksBefore, tasksAfter),
    [tasksBefore, tasksAfter]
  );

  // Compute per-revision diffs for consolidated session
  const granularRevisionDiffs = useMemo(() => {
    if (!versionGroup || versionGroup.length <= 1) return [];
    
    return versionGroup.map((rev, idx) => {
      const revTasksBefore = (rev.stateBefore?.tasks || []).map((t: SqlTask) => {
         if (fetchedTaskStates[t.id]?.stateBefore) return { ...t, ...fetchedTaskStates[t.id].stateBefore };
         return t;
      });
      const revTasksAfter = (rev.stateAfter?.tasks || []).map((t: SqlTask) => {
         if (fetchedTaskStates[t.id]?.stateAfter) return { ...t, ...fetchedTaskStates[t.id].stateAfter };
         return t;
      });
      const diffs = computeTaskDiffs(revTasksBefore, revTasksAfter);
      return {
        revision: rev,
        index: idx,
        versionNumber: versionGroup.length - idx,
        ...diffs,
        hasChanges: diffs.addedTasks.length > 0 || diffs.removedTasks.length > 0 || diffs.modifiedTaskDiffs.length > 0
      };
    });
  }, [versionGroup, fetchedTaskStates]);

  // When confirmRestore opens, initialize targetVersionId
  useEffect(() => {
    if (confirmRestore) {
      if (confirmRestore === "undo") {
        setTargetVersionId(oldestVersionInGroup?.id || version?.id || null);
      } else {
        setTargetVersionId(version?.id || null);
      }
    }
  }, [confirmRestore, oldestVersionInGroup?.id, version?.id]);

  const toggleRevisionExpand = (revId: string) => {
    setExpandedRevisionIds((prev) => {
      const next = new Set(prev);
      if (next.has(revId)) {
        next.delete(revId);
      } else {
        next.add(revId);
      }
      return next;
    });
  };

  // Set default expanded diff when version changes - expand ONLY the first modified task
  // But wait! Only do this on mobile if we want desktop to NOT pre-select?
  // User says: "jab desktop mein koi version control open kare to task pehle se selected na ho iska behaviour same SQL and function ke selection ki tarah ho"
  useEffect(() => {
    if (!isDesktop && modifiedTaskDiffs.length > 0) {
      setExpandedDiffId(modifiedTaskDiffs[0].task.id);
    } else {
      setExpandedDiffId(null);
    }
    setExpandedAddedId(null);
    setExpandedRemovedId(null);
    setExpandedTaskId(null);
  }, [version?.id, detailLoading, isDesktop]);

  if (detailLoading) {
    return (
      <VersionDetailSkeleton
        isMobile={!isDesktop}
        onBack={onBack}
      />
    );
  }

  if (!version) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-slate-50/50 dark:bg-black/50 p-6 sm:p-8 text-center">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center text-slate-400 dark:text-zinc-600 mb-4 border border-slate-200 dark:border-zinc-800">
          <History size={24} className="stroke-[1.75]" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-tight">
          No Version Snapshot Selected
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mt-1.5 leading-relaxed">
          Select any version snapshot or audit event from the timeline to inspect its full state specifications, changes, and perform 1-click rollbacks.
        </p>
      </div>
    );
  }

  const badge = getActionBadgeConfig(version.action);
  const isProjectDeleted =
    version.prodProjectId && !existingProjectIds.has(version.prodProjectId);

  const hasAnyDiffs =
    addedTasks.length > 0 ||
    removedTasks.length > 0 ||
    modifiedTaskDiffs.length > 0 ||
    version.action === "delete_project" ||
    projectsBefore.length !== projectsAfter.length;

  const filteredTasks = tasksAfter.filter((task) => {
    if (selectedTaskTab === "sql" && task.type === "edge_function") return false;
    if (selectedTaskTab === "edge" && task.type !== "edge_function") return false;
    if (!taskSearch.trim()) return true;
    const q = taskSearch.toLowerCase();
    return (
      (task.title && task.title.toLowerCase().includes(q)) ||
      (task.description && task.description.toLowerCase().includes(q)) ||
      (task.id && task.id.toLowerCase().includes(q))
    );
  });

  const executeRestore = async (type: "undo" | "redo") => {
    try {
      // Find chosen target version
      const chosenBackup = versionGroup?.find(b => b.id === targetVersionId) || version;
      
      let restorePayload: VersionBackup;
      if (type === "undo") {
        // Revert workspace back to chosenBackup's stateBefore
        restorePayload = {
          ...chosenBackup,
          stateBefore: chosenBackup.stateBefore,
          stateAfter: version.stateAfter
        };
      } else {
        // Redo to chosenBackup's stateAfter
        restorePayload = {
          ...chosenBackup,
          stateBefore: oldestVersionInGroup?.stateBefore || chosenBackup.stateBefore,
          stateAfter: chosenBackup.stateAfter
        };
      }

      await onRestore(restorePayload, type);
      setConfirmRestore(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-black min-w-0 overflow-hidden">
      {/* Top Sticky Header */}
      <div className="px-3 sm:px-5 py-2 sm:py-2.5 border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-[#0c0c0e]/95 sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Left info & Mobile Back */}
          <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar py-0.5">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1 -ml-1 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer shrink-0 rounded-md"
                title="Back to Timeline"
              >
                <ChevronLeft size={18} className="stroke-[2.25]" />
              </button>
            )}

            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={cn(
                  "text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded-md border shrink-0 flex items-center gap-1 whitespace-nowrap",
                  badge.className
                )}
              >
                {badge.icon}
                <span>{badge.label}</span>
              </span>

              {isProjectDeleted && (
                <>
                  <span className="text-slate-300 dark:text-zinc-700 text-[10px] shrink-0">•</span>
                  <span className="text-[10px] sm:text-xs text-rose-600 dark:text-rose-400 font-medium shrink-0 whitespace-nowrap">
                    Deleted
                  </span>
                </>
              )}

              {versionGroup && versionGroup.length > 1 && (
                <>
                  <span className="text-slate-300 dark:text-zinc-700 text-[10px] shrink-0">•</span>
                  <span className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 shrink-0 whitespace-nowrap">
                    <Layers size={12} className="text-blue-500 shrink-0" />
                    <span>{versionGroup.length} revisions</span>
                  </span>
                </>
              )}

              <span className="text-slate-300 dark:text-zinc-700 text-[10px] shrink-0">•</span>
              {version.isUndone ? (
                <span className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-medium shrink-0 whitespace-nowrap">
                  Undone
                </span>
              ) : (
                <span className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0 whitespace-nowrap">
                  Active
                </span>
              )}
            </div>
          </div>

          {/* Right Actions: Timestamp & Desktop Undo/Redo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-[9.5px] sm:text-[11px] text-slate-400 dark:text-zinc-500 font-mono shrink-0 whitespace-nowrap">
              {new Date(version.timestamp).toLocaleString(undefined, {
                dateStyle: "short",
                timeStyle: "short",
                hour12: false,
              })}
            </div>

            {/* Desktop Undo and Redo Action Buttons */}
            <div className="hidden md:flex items-center gap-1.5 shrink-0">
              {detailLoading ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="h-7 w-16 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                  <div className="h-7 w-14 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmRestore("undo")}
                    disabled={version.isUndone || isRestoring}
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap",
                      version.isUndone
                        ? "bg-slate-100 dark:bg-zinc-900 text-slate-400 dark:text-zinc-600 cursor-not-allowed border border-slate-200 dark:border-zinc-800"
                        : "bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white"
                    )}
                  >
                    <Undo2 size={13} className="stroke-[2.5]" />
                    <span>
                      {version.action === "delete_project" ? "Resurrect" : "Undo"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmRestore("redo")}
                    disabled={!version.isUndone || isRestoring}
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap",
                      !version.isUndone
                        ? "bg-slate-100 dark:bg-zinc-900 text-slate-400 dark:text-zinc-600 cursor-not-allowed border border-slate-200 dark:border-zinc-800"
                        : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white"
                    )}
                  >
                    <Redo2 size={13} className="stroke-[2.5]" />
                    <span>Redo</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Rotating Loader if detailLoading, otherwise Specifications Content */}
      {detailLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Loader size={28} className="animate-spin text-slate-400 dark:text-zinc-500" />
        </div>
      ) : (
        /* Main Specifications Content - Container-less Architecture */
        <div className="flex-1 px-3.5 sm:px-5 pt-3.5 sm:pt-5 pb-0 space-y-3 sm:space-y-4 overflow-y-auto">
        {/* Scope & Targets inline bar - Containerless */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pb-3 border-b border-slate-100 dark:border-zinc-800/60">
          <div className="flex items-center gap-2 min-w-0">
            <Database size={13} className="text-emerald-500 shrink-0" />
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider shrink-0">
              Prod Target:
            </span>
            <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-zinc-200 truncate">
              {version.prodProjectId || "Workspace Root"}
            </span>
          </div>

          <div className="flex items-center gap-2 min-w-0 sm:justify-end">
            <FlaskConical size={13} className="text-amber-500 shrink-0" />
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider shrink-0">
              Staging Branch:
            </span>
            <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-zinc-200 truncate">
              {version.stagingProjectId || "Direct / None"}
            </span>
          </div>
        </div>

        {/* Operation Description - Containerless */}
        <div className="pb-3 border-b border-slate-100 dark:border-zinc-800/60">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block mb-0.5">
            {versionGroup && versionGroup.length > 1 ? "Consolidated Snapshot Summary" : "Operation Description"}
          </span>
          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-zinc-100 leading-relaxed">
            {currentGroup?.displayTitle || version.description || "Database snapshot recorded"}
          </p>
          {versionGroup && versionGroup.length > 1 && (
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-normal">
              {currentGroup?.displaySubtitle || `${versionGroup.length} consecutive individual revisions consolidated into this snapshot.`}
            </p>
          )}
        </div>

        {/* Consolidated Granular Sequence - Containerless & Collapsible with Chevron on Right */}
        {versionGroup && versionGroup.length > 1 && (
          <div className={cn("border-b border-slate-100 dark:border-zinc-800/60", isTimelineExpanded ? "pb-0" : "pb-3")}>
            {/* Header with expand/collapse chevron on the RIGHT */}
            <div 
              onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
              className="flex items-center justify-between gap-2 cursor-pointer select-none group/toggle py-1"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Layers size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">
                  Granular Sequence:
                </span>
                <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-zinc-200">
                  {versionGroup.length} revisions
                </span>
              </div>

              {/* Right side: Chevron replacing the expand/collapse text */}
              <div className="text-slate-400 dark:text-zinc-500 group-hover/toggle:text-slate-700 dark:group-hover/toggle:text-zinc-200 transition-colors shrink-0">
                {isTimelineExpanded ? (
                  <ChevronDown size={15} className="stroke-[2.25]" />
                ) : (
                  <ChevronRight size={15} className="stroke-[2.25]" />
                )}
              </div>
            </div>

            {/* Collapsible Revisions List (Without timeline line/dots, with per-version expansion) */}
            {isTimelineExpanded && (
              <div className="pt-2 space-y-1.5 divide-y divide-slate-100 dark:divide-zinc-800/60">
                {granularRevisionDiffs.map(({ revision, index, versionNumber, addedTasks: revAdded, removedTasks: revRemoved, modifiedTaskDiffs: revModified, hasChanges }) => {
                  const isRevExpanded = expandedRevisionIds.has(revision.id);
                  const isLatest = index === 0;
                  const isOldest = index === versionGroup.length - 1;
                  const date = new Date(revision.timestamp);
                  const exactTime = date.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  });
                  const dateStr = date.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <div key={revision.id} className="pt-1.5 first:pt-0">
                      {/* Revision Header Row */}
                      <div
                        onClick={() => toggleRevisionExpand(revision.id)}
                        className="py-1 px-1 sm:px-1.5 flex items-center justify-between gap-2 cursor-pointer select-none rounded hover:bg-slate-50/70 dark:hover:bg-zinc-900/40 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-slate-400 dark:text-zinc-500 shrink-0">
                            {isRevExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </span>

                          <span className="font-mono text-[10.5px] font-bold text-slate-700 dark:text-zinc-300 shrink-0">
                            v{versionNumber}
                          </span>

                          <span className="font-mono text-[10px] text-slate-400 dark:text-zinc-500 shrink-0 whitespace-nowrap">
                            {dateStr}, {exactTime}
                          </span>

                          <span className="text-slate-300 dark:text-zinc-700 text-[10px] shrink-0">•</span>

                          <span className="text-xs font-medium text-slate-800 dark:text-zinc-200 truncate min-w-0 flex-1" title={revision.description}>
                            {revision.description || "Snapshot edit"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                          {isLatest && (
                            <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              Latest
                            </span>
                          )}
                          {isOldest && (
                            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                              Baseline
                            </span>
                          )}

                          {/* Diff Counter Text */}
                          <div className="flex items-center gap-1 text-[10px] font-mono">
                            {revAdded.length > 0 && (
                              <span className="text-emerald-600 font-semibold">+{revAdded.length}</span>
                            )}
                            {revModified.length > 0 && (
                              <span className="text-sky-600 font-semibold">~{revModified.length}</span>
                            )}
                            {revRemoved.length > 0 && (
                              <span className="text-rose-600 font-semibold">-{revRemoved.length}</span>
                            )}
                            {!hasChanges && (
                              <span className="text-slate-400">no diff</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Revision Diff - Containerless */}
                      {isRevExpanded && (
                        <div className="pt-1.5 pb-0 px-1 sm:px-2 space-y-2 mt-0.5">
                          {!hasChanges ? (
                            <div className="py-1 text-xs text-slate-400 dark:text-zinc-500 italic">
                              No task mutations recorded in this revision.
                            </div>
                          ) : (
                            <div className="space-y-2 pt-0.5 pb-0">
                              {/* Modified Tasks in this Revision - Containerless */}
                              {revModified.length > 0 && (
                                <div className="space-y-1.5 pb-0">
                                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">
                                    Modified in v{versionNumber} ({revModified.length})
                                  </span>
                                  <div className="space-y-1.5 pb-0">
                                    {revModified.map((mod) => (
                                      <div key={mod.task.id} className="pt-1 pb-0 space-y-1 text-xs border-b border-slate-100/60 dark:border-zinc-800/40 last:border-b-0 last:pb-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-bold text-slate-900 dark:text-zinc-100 truncate">
                                            {mod.task.title || "Untitled Task"}
                                          </span>
                                          <span className="text-[9px] font-mono text-slate-400">
                                            ID: {mod.task.id.slice(0, 8)}
                                          </span>
                                        </div>

                                        {/* Field Diffs */}
                                        {mod.titleChanged && (
                                          <WordDiffView
                                            label="Title"
                                            oldText={mod.oldTask.title || ""}
                                            newText={mod.task.title || ""}
                                          />
                                        )}

                                        {mod.descriptionChanged && (
                                          <WordDiffView
                                            label="Description"
                                            oldText={mod.oldTask.description || ""}
                                            newText={mod.task.description || ""}
                                            isLongText={true}
                                          />
                                        )}

                                        {mod.statusChanged && (
                                          <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 sm:w-20">Status:</span>
                                            <span className="text-red-600 dark:text-red-400 line-through">{mod.oldTask.status}</span>
                                            <ArrowRight size={10} className="text-slate-400 shrink-0" />
                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{mod.task.status}</span>
                                          </div>
                                        )}

                                        {mod.codeChanged && (
                                          <div className="mt-1.5 mb-0 -mx-3.5 sm:-mx-5">
                                            <SideBySideDiff
                                              oldValue={mod.oldCode}
                                              newValue={mod.newCode}
                                              oldTitle={`v${versionNumber - 1} (Before)`}
                                              newTitle={`v${versionNumber} (After)`}
                                              maxHeight="220px"
                                              borderless={true}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Added in this Revision - Containerless */}
                              {revAdded.length > 0 && (
                                <div className="space-y-1 pt-0.5">
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                                    Added in v{versionNumber} (+{revAdded.length})
                                  </span>
                                  <div className="space-y-1">
                                    {revAdded.map((t: any) => (
                                      <div key={t.id} className="py-1 px-0.5 text-xs flex items-center justify-between">
                                        <span className="font-semibold text-slate-800 dark:text-zinc-200 truncate">{t.title}</span>
                                        <span className="text-[10px] font-semibold text-emerald-600 uppercase">New Task</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Removed in this Revision - Containerless */}
                              {revRemoved.length > 0 && (
                                <div className="space-y-1 pt-0.5">
                                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                                    Removed in v{versionNumber} (-{revRemoved.length})
                                  </span>
                                  <div className="space-y-1">
                                    {revRemoved.map((t: any) => (
                                      <div key={t.id} className="py-1 px-0.5 text-xs flex items-center justify-between">
                                        <span className="font-semibold text-slate-800 dark:text-zinc-200 line-through truncate">{t.title}</span>
                                        <span className="text-[10px] font-semibold text-rose-600 uppercase">Deleted</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Metrics & State Transition - Containerless */}
        <div className="pb-3 border-b border-slate-100 dark:border-zinc-800/60 flex items-center justify-between gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-300 flex-nowrap shrink-0">
            <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 dark:text-zinc-500 shrink-0">
              State:
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
              <span>{tasksBefore.length} tasks</span>
              <ArrowRight size={10} className="text-slate-400 dark:text-zinc-600 shrink-0" />
              <span className="font-bold text-slate-900 dark:text-zinc-100">
                {tasksAfter.length} tasks
              </span>
              {tasksDelta !== 0 && (
                <span
                  className={cn(
                    "text-[9px] font-bold px-1.5 py-0.2 rounded font-sans shrink-0",
                    tasksDelta > 0
                      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/15"
                      : "text-rose-700 dark:text-rose-300 bg-rose-500/15"
                  )}
                >
                  {tasksDelta > 0 ? `+${tasksDelta}` : tasksDelta}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-zinc-400 font-mono flex-nowrap shrink-0">
            <span>{projectsAfter.length} proj</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              {addedTasks.length > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  +{addedTasks.length} added
                </span>
              )}
              {modifiedTaskDiffs.length > 0 && (
                <span className="text-sky-600 dark:text-sky-400 font-semibold">
                  ~{modifiedTaskDiffs.length} mod
                </span>
              )}
              {removedTasks.length > 0 && (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  -{removedTasks.length} del
                </span>
              )}
              {!hasAnyDiffs && "Baseline snapshot"}
            </span>
          </div>
        </div>

        {/* Safe Rollback Info - Containerless & Inline */}
        <div className="pb-3 border-b border-slate-100 dark:border-zinc-800/60 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
          <span className="inline-flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 mr-1.5">
            <CheckCircle2 size={13} className="shrink-0 -mt-0.5" />
            {version.action === "delete_project"
              ? "Project Resurrection Ready:"
              : version.isUndone
              ? "Undone Snapshot:"
              : "Safe Rollback:"}
          </span>
          {version.action === "delete_project"
            ? "Undoing will automatically recreate the deleted project and all its tasks in Supabase."
            : version.isUndone
            ? "Currently rolled back. Clicking \"Redo Snapshot\" will re-apply all operations."
            : "Undoing will synchronize your projects, tasks, and code with the pre-operation baseline."}
        </div>

        {/* Primary View Switcher: Changes Diff (Old vs New) vs Full Snapshot - Compact Tab Bar */}
        <div className="pt-0.5 sm:pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-zinc-800/80 pb-2">
            {/* Compact 2-Tab Segmented Control - Hugs Content Width */}
            <div className="inline-flex items-center bg-slate-100/80 dark:bg-zinc-900 p-0.5 rounded-lg text-xs font-semibold w-fit shrink-0">
              <button
                type="button"
                onClick={() => setActiveViewTab("diff")}
                className={cn(
                  "px-2 sm:px-2.5 py-1 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap text-xs min-h-[28px] sm:min-h-[30px] shrink-0",
                  activeViewTab === "diff"
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 font-medium"
                )}
              >
                <DiffIcon size={12} className="shrink-0" />
                <span>Actual Changes</span>
                {hasAnyDiffs && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-blue-500/15 text-blue-600 dark:text-blue-400 font-mono">
                    {addedTasks.length + removedTasks.length + modifiedTaskDiffs.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveViewTab("snapshot")}
                className={cn(
                  "px-2 sm:px-2.5 py-1 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap text-xs min-h-[28px] sm:min-h-[30px] shrink-0",
                  activeViewTab === "snapshot"
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 font-medium"
                )}
              >
                <Layers size={12} className="shrink-0" />
                <span>Full Snapshot</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-mono">
                  {tasksAfter.length}
                </span>
              </button>
            </div>

            {activeViewTab === "snapshot" && (
              <div className="flex items-center gap-1.5 justify-between sm:justify-end w-full sm:w-auto">
                {/* Type Filter Pills - Compact */}
                <div className="flex items-center bg-slate-100/80 dark:bg-zinc-800 rounded-md p-0.5 text-[10px]">
                  {(["all", "sql", "edge"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedTaskTab(tab)}
                      className={cn(
                        "px-2 py-0.5 rounded font-medium capitalize transition-all cursor-pointer",
                        selectedTaskTab === tab
                          ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                      )}
                    >
                      {tab === "edge" ? "Edge" : tab}
                    </button>
                  ))}
                </div>

                {/* Task search input - Compact */}
                <div className="relative flex-1 sm:flex-initial">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="Filter tasks..."
                    className="w-full sm:w-32 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md pl-6 pr-2 py-0.5 text-[10.5px] text-slate-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* TAB 1: ACTUAL CHANGES DIFF (OLD vs NEW) */}
          {activeViewTab === "diff" && (
            <div className="pt-2.5 pb-0 space-y-4">
              {!hasAnyDiffs ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-zinc-400 border-y border-dashed border-slate-200 dark:border-zinc-800 my-2">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                  <p className="font-semibold text-slate-700 dark:text-zinc-300">Baseline Snapshot / Initial State</p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    No task code mutations occurred in this step. Switch to the &quot;Full State Snapshot&quot; tab to inspect all {tasksAfter.length} tasks.
                  </p>
                </div>
              ) : (
                <>
                  {/* 1. Modified Tasks with Side-by-Side Diff - Container-less List */}
                  {modifiedTaskDiffs.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-1.5">
                          <Code2 size={14} className="text-sky-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                            Modified Tasks ({modifiedTaskDiffs.length})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                          Tap to expand diff
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-zinc-800/70">
                        {modifiedTaskDiffs.map(({ task, oldTask, oldCode, newCode, codeChanged, titleChanged, statusChanged, descriptionChanged, orderChanged }, idx) => {
                          const isDiffExpanded = expandedDiffId === task.id;
                          const isEdge = task.type === "edge_function";
                          const isLast = idx === modifiedTaskDiffs.length - 1;

                          return (
                            <div key={task.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                              {/* Task Row Header */}
                              <div
                                onClick={() => handleExpandTaskForDiff(task.id, expandedDiffId, setExpandedDiffId, oldTask, task)}
                                className={cn(
                                  "px-1 sm:px-2 flex items-center justify-between gap-2 cursor-pointer transition-colors",
                                  isDiffExpanded ? "pt-2 sm:pt-2.5 pb-1" : "py-2 sm:py-2.5"
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {isEdge ? (
                                    <FileCode size={14} className="text-violet-500 shrink-0" />
                                  ) : (
                                    <Database size={14} className="text-blue-500 shrink-0" />
                                  )}
                                  <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                                    {task.title || "Untitled Task"}
                                  </span>
                                  <span className="text-slate-300 dark:text-zinc-700 text-[10px] shrink-0">•</span>
                                  <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider shrink-0">
                                    Modified
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 text-slate-400">
                                  {statusChanged && (
                                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 shrink-0">
                                      {oldTask.status} ➔ {task.status}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono hidden sm:inline text-slate-400 dark:text-zinc-500">
                                    ID: {task.id.slice(0, 8)}
                                  </span>
                                  {loadingTaskId === task.id ? (
                                    <Loader size={14} className="animate-spin text-blue-500" />
                                  ) : isDiffExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>
                              </div>

                              {/* Changes Body & Side-by-Side Diff - Container-less Flush View */}
                              {isDiffExpanded && (
                                <div className={cn("pt-0.5 space-y-1.5", isLast ? "pb-0" : "pb-1")}>
                                  {loadingTaskId === task.id ? (
                                    <div className="px-1 sm:px-2">
                                      <DiffCodeSkeleton />
                                    </div>
                                  ) : (
                                    <>
                                      {/* Containerless responsive layout for metadata changes (old vs new) */}
                                      <div className="text-xs space-y-1.5 py-0.5 px-1 sm:px-2">
                                        {titleChanged && (
                                          <WordDiffView
                                            label="Title"
                                            oldText={oldTask.title || "Untitled"}
                                            newText={task.title || "Untitled"}
                                          />
                                        )}
                                        {statusChanged && (
                                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider sm:w-24">Status:</span>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="text-red-600 dark:text-red-400 line-through truncate">{oldTask.status}</span>
                                              <ArrowRight size={10} className="text-slate-400 shrink-0" />
                                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate">{task.status}</span>
                                            </div>
                                          </div>
                                        )}
                                        {descriptionChanged && (
                                          <WordDiffView
                                            label="Description"
                                            oldText={oldTask.description || ""}
                                            newText={task.description || ""}
                                            isLongText={true}
                                          />
                                        )}
                                        {orderChanged && (
                                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider sm:w-24">Order:</span>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="text-red-600 dark:text-red-400 line-through truncate">{oldTask.orderIndex ?? "None"}</span>
                                              <ArrowRight size={10} className="text-slate-400 shrink-0" />
                                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate">{task.orderIndex ?? "None"}</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Side-by-side Diff Component is ONLY shown if code actually changed */}
                                      {codeChanged && (
                                        <div className="-mx-3.5 sm:-mx-5 mt-1.5 mb-0">
                                          <SideBySideDiff
                                            oldValue={oldCode}
                                            newValue={newCode}
                                            oldTitle="Old (Before)"
                                            newTitle="New (After)"
                                            maxHeight="360px"
                                            borderless={true}
                                          />
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. Added Tasks - Container-less List */}
                  {addedTasks.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-1.5">
                          <FilePlus2 size={14} className="text-emerald-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                            Added Tasks (+{addedTasks.length})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                          Tap to inspect code
                        </span>
                      </div>

                      <div className="divide-y divide-emerald-100 dark:divide-emerald-950/50">
                        {addedTasks.map((task: any, idx: number) => {
                          const code = task.sql || task.functionCode || task.function_code || "";
                          const isEdge = task.type === "edge_function";
                          const isExpanded = expandedAddedId === task.id;
                          const isLast = idx === addedTasks.length - 1;

                          return (
                            <div key={task.id} className="transition-colors hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10">
                              <div
                                onClick={() => handleExpandTaskForDiff(task.id, expandedAddedId, setExpandedAddedId, undefined, task)}
                                className={cn(
                                  "px-1 sm:px-2 flex items-center justify-between gap-2 cursor-pointer transition-colors",
                                  isExpanded ? "pt-2 sm:pt-2.5 pb-1" : "py-2 sm:py-2.5"
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {isEdge ? (
                                    <FileCode size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  ) : (
                                    <Database size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  )}
                                  <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                                    {task.title || "Untitled Task"}
                                  </span>
                                  <span className="text-slate-300 dark:text-zinc-700 text-[10px] shrink-0">•</span>
                                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider shrink-0">
                                    Added
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                                    {task.status || "created"}
                                  </span>
                                  {loadingTaskId === task.id ? (
                                    <Loader size={14} className="animate-spin text-emerald-500" />
                                  ) : isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                </div>
                              </div>

                              {isExpanded && (
                                <div className={cn("pt-0.5", isLast ? "pb-0" : "pb-1")}>
                                  {loadingTaskId === task.id ? (
                                    <div className="px-1 sm:px-2">
                                      <DiffCodeSkeleton />
                                    </div>
                                  ) : (
                                    <div className="-mx-3.5 sm:-mx-5 mb-0">
                                      <SideBySideDiff
                                        oldValue=""
                                        newValue={code}
                                        oldTitle="None (Before)"
                                        newTitle="Created Code"
                                        maxHeight="280px"
                                        borderless={true}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Removed Tasks - Container-less List */}
                  {removedTasks.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-1.5">
                          <Trash2 size={14} className="text-rose-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                            Removed Tasks (-{removedTasks.length})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                          Tap to inspect deleted code
                        </span>
                      </div>

                      <div className="divide-y divide-rose-100 dark:divide-rose-950/50">
                        {removedTasks.map((task: any, idx: number) => {
                          const code = task.sql || task.functionCode || task.function_code || "";
                          const isEdge = task.type === "edge_function";
                          const isExpanded = expandedRemovedId === task.id;
                          const isLast = idx === removedTasks.length - 1;

                          return (
                            <div key={task.id} className="transition-colors hover:bg-rose-50/30 dark:hover:bg-rose-950/10">
                              <div
                                onClick={() => handleExpandTaskForDiff(task.id, expandedRemovedId, setExpandedRemovedId, task, undefined)}
                                className={cn(
                                  "px-1 sm:px-2 flex items-center justify-between gap-2 cursor-pointer transition-colors",
                                  isExpanded ? "pt-2 sm:pt-2.5 pb-1" : "py-2 sm:py-2.5"
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {isEdge ? (
                                    <FileCode size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
                                  ) : (
                                    <Database size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
                                  )}
                                  <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate line-through">
                                    {task.title || "Untitled Task"}
                                  </span>
                                  <span className="text-slate-300 dark:text-zinc-700 text-[10px] shrink-0">•</span>
                                  <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider shrink-0">
                                    Deleted
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] font-mono text-rose-700 dark:text-rose-400">
                                    Removed
                                  </span>
                                  {loadingTaskId === task.id ? (
                                    <Loader size={14} className="animate-spin text-rose-500" />
                                  ) : isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                </div>
                              </div>

                              {isExpanded && (
                                <div className={cn("pt-0.5", isLast ? "pb-0" : "pb-1")}>
                                  {loadingTaskId === task.id ? (
                                    <div className="px-1 sm:px-2">
                                      <DiffCodeSkeleton />
                                    </div>
                                  ) : (
                                    <div className="-mx-3.5 sm:-mx-5 mb-0">
                                      <SideBySideDiff
                                        oldValue={code}
                                        newValue=""
                                        oldTitle="Deleted Code"
                                        newTitle="None (After)"
                                        maxHeight="280px"
                                        borderless={true}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 4. Project & Workspace Changes - Containerless */}
                  {(version.action === "delete_project" || projectsBefore.length !== projectsAfter.length) && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-1.5 px-1">
                        <FolderMinus size={14} className="text-amber-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                          Project Environment Changes
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-xs">
                        <div className="py-2 px-1 flex items-center justify-between">
                          <span className="text-slate-500">Target Production Project:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                            {version.prodProjectId || "Global Workspace"}
                          </span>
                        </div>
                        <div className="py-2 px-1 flex items-center justify-between">
                          <span className="text-slate-500">Staging Branch:</span>
                          <span className="font-mono text-slate-700 dark:text-zinc-300">
                            {version.stagingProjectId || "Direct Push / None"}
                          </span>
                        </div>
                        <div className="py-2 px-1 flex items-center justify-between">
                          <span className="text-slate-500">Project Count:</span>
                          <span className="font-mono text-slate-700 dark:text-zinc-300">
                            {projectsBefore.length} projects ➔ {projectsAfter.length} projects
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 2: FULL STATE SNAPSHOT (ALL TASKS) - Container-less Layout */}
          {activeViewTab === "snapshot" && (
            <div className="pt-2 pb-0">
              <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {filteredTasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 dark:text-zinc-500">
                    {taskSearch ? "No tasks matching your search query." : "No tasks in this snapshot."}
                  </div>
                ) : (
                  filteredTasks.map((task: any, taskIdx: number) => {
                    const isExpanded = expandedTaskId === task.id;
                    const isEdge = task.type === "edge_function";
                    const isAdded = addedTasks.some((t) => t.id === task.id);
                    const modifiedDiff = modifiedTaskDiffs.find((d) => d.task.id === task.id);
                    const isLast = taskIdx === filteredTasks.length - 1;

                    return (
                      <div key={task.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                        <div
                          onClick={() => handleExpandTaskForDiff(task.id, expandedTaskId, setExpandedTaskId, undefined, task)}
                          className={cn(
                            "px-1 sm:px-2 flex items-center justify-between gap-3 cursor-pointer transition-colors",
                            isExpanded ? "pt-2 sm:pt-2.5 pb-1" : "py-2 sm:py-2.5"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isEdge ? (
                              <FileCode size={13} className="text-violet-500 shrink-0" />
                            ) : (
                              <Database size={13} className="text-blue-500 shrink-0" />
                            )}
                            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                              {task.title || "Untitled Task"}
                            </span>

                            {isAdded && (
                              <>
                                <span className="text-slate-300 dark:text-zinc-700 text-[10px] shrink-0">•</span>
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider shrink-0">
                                  Added
                                </span>
                              </>
                            )}
                            {modifiedDiff && (
                              <>
                                <span className="text-slate-300 dark:text-zinc-700 text-[10px] shrink-0">•</span>
                                <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider shrink-0">
                                  Modified
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={cn(
                                "text-[10px] uppercase font-mono font-semibold",
                                task.status === "ran"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-slate-500 dark:text-zinc-400"
                              )}
                            >
                              {task.status || "pending"}
                            </span>
                            {loadingTaskId === task.id ? (
                              <Loader size={13} className="animate-spin text-blue-500" />
                            ) : isExpanded ? (
                              <ChevronUp size={13} className="text-slate-400" />
                            ) : (
                              <ChevronDown size={13} className="text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Expandable Task Code Inspector & Diff Shortcut - Container-less Flush */}
                        {isExpanded && (
                          <div className={cn("pt-0.5 space-y-1.5", isLast ? "pb-0" : "pb-1")}>
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-zinc-500 px-1 sm:px-2">
                              <span className="uppercase">
                                {isEdge ? "Edge Function Payload" : "SQL Script Content"}
                              </span>
                              <span>ID: {task.id}</span>
                            </div>

                            {loadingTaskId === task.id ? (
                              <div className="px-1 sm:px-2">
                                {modifiedDiff || isAdded ? (
                                  <DiffCodeSkeleton />
                                ) : (
                                  <CodeBlockSkeleton />
                                )}
                              </div>
                            ) : modifiedDiff ? (
                              <div>
                                <div className="text-[10.5px] font-semibold text-sky-600 dark:text-sky-400 mb-1 flex items-center gap-1 px-1 sm:px-2">
                                  <DiffIcon size={12} />
                                  <span>Modified in this snapshot (Side-by-side Diff):</span>
                                </div>
                                <div className="-mx-3.5 sm:-mx-5 mb-0">
                                  <SideBySideDiff
                                    oldValue={modifiedDiff.oldCode}
                                    newValue={modifiedDiff.newCode}
                                    oldTitle="Old (Before)"
                                    newTitle="New (After)"
                                    maxHeight="250px"
                                    borderless={true}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="px-1 sm:px-2">
                                <pre className="text-[11px] font-mono p-2.5 rounded bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 max-h-48 overflow-y-auto whitespace-pre-wrap select-text">
                                  {task.sql || task.functionCode || task.function_code || "-- (No script content recorded)"}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Mobile Only Bottom Footer for Undo & Redo Controls (Desktop removed) */}
      <div className="md:hidden sticky bottom-0 left-0 right-0 z-20 px-3 py-2 border-t border-slate-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md flex items-center justify-end gap-2 shrink-0">
        {detailLoading ? (
          <div className="flex items-center justify-end gap-2 w-full">
            <div className="h-7.5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-7.5 w-16 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setConfirmRestore("undo")}
              disabled={version.isUndone || isRestoring}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap",
                version.isUndone
                  ? "bg-slate-100 dark:bg-zinc-900 text-slate-400 dark:text-zinc-600 cursor-not-allowed border border-slate-200 dark:border-zinc-800"
                  : "bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white"
              )}
            >
              <Undo2 size={13} className="stroke-[2.5]" />
              <span>
                {version.action === "delete_project" ? "Resurrect" : "Undo"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmRestore("redo")}
              disabled={!version.isUndone || isRestoring}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap",
                !version.isUndone
                  ? "bg-slate-100 dark:bg-zinc-900 text-slate-400 dark:text-zinc-600 cursor-not-allowed border border-slate-200 dark:border-zinc-800"
                  : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white"
              )}
            >
              <Redo2 size={13} className="stroke-[2.5]" />
              <span>Redo</span>
            </button>
          </>
        )}
      </div>

      {/* Confirmation Dialog - With Version Selection for Consolidated Sessions */}
      {confirmRestore && (
        <div
          className="fixed inset-0 bg-black/60 dark:bg-black/75 z-[10010] flex items-center justify-center p-3 backdrop-blur-xs"
          onClick={() => setConfirmRestore(null)}
        >
          <div
            className="bg-white dark:bg-[#0c0c0e] rounded-xl shadow-2xl max-w-[460px] w-full border border-slate-200/80 dark:border-zinc-800/70 overflow-hidden text-left max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertTriangle size={15} className="stroke-[2.5]" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  {version.action === "delete_project" && confirmRestore === "undo"
                    ? "Confirm Project Resurrection"
                    : `Confirm ${confirmRestore === "undo" ? "Undo Action" : "Redo Action"}`}
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed mt-1">
                {version.action === "delete_project" && confirmRestore === "undo"
                  ? "This will restore and recreate the deleted project and all of its tasks directly into Supabase."
                  : versionGroup && versionGroup.length > 1
                  ? `This snapshot contains ${versionGroup.length} consolidated revisions. Select which version state you want to revert to:`
                  : `Are you sure you want to ${confirmRestore} this version snapshot? Your workspace state will synchronize with this baseline.`}
              </p>
            </div>

            {/* Consolidated Sessions: Version Revert Target Selector - Containerless */}
            {versionGroup && versionGroup.length > 1 ? (
              <div className="px-5 py-2 overflow-y-auto max-h-56 divide-y divide-slate-100 dark:divide-zinc-800/60 border-y border-slate-200/70 dark:border-zinc-800/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block py-1">
                  Choose Target Reversion State:
                </span>
                {versionGroup.map((item, idx) => {
                  const isSelected = targetVersionId === item.id;
                  const isLatest = idx === 0;
                  const isOldest = idx === versionGroup.length - 1;
                  const versionNum = versionGroup.length - idx;
                  const date = new Date(item.timestamp);
                  const exactTime = date.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  });

                  return (
                    <div
                      key={item.id}
                      onClick={() => setTargetVersionId(item.id)}
                      className={cn(
                        "py-2.5 px-1 text-xs cursor-pointer transition-colors flex items-start justify-between gap-2",
                        isSelected
                          ? "bg-blue-50/50 dark:bg-blue-950/20"
                          : "hover:bg-slate-50/60 dark:hover:bg-zinc-900/40"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className={cn(
                            "font-bold font-mono text-[11px]",
                            isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-zinc-300"
                          )}>
                            v{versionNum}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                            {exactTime}
                          </span>
                          {isLatest && (
                            <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                              Latest
                            </span>
                          )}
                          {isOldest && (
                            <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                              Baseline Before Edits
                            </span>
                          )}
                        </div>
                        <p className={cn(
                          "text-[11px] leading-relaxed break-words",
                          isSelected ? "text-slate-900 dark:text-zinc-100 font-medium" : "text-slate-600 dark:text-zinc-400"
                        )}>
                          {item.description || "Revision state recorded"}
                        </p>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        <div className={cn(
                          "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 dark:border-zinc-700 bg-transparent"
                        )}>
                          {isSelected && <Check size={10} className="stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Single Snapshot Info Box - Containerless */
              <div className="px-5 py-3 border-y border-slate-200/70 dark:border-zinc-800/70 text-xs">
                <p className="font-semibold text-slate-800 dark:text-zinc-200 italic leading-relaxed">
                  &ldquo;{version.description || "Baseline state modification"}&rdquo;
                </p>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 block font-mono">
                  {new Date(version.timestamp).toLocaleString()}
                </span>
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-zinc-800/70 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmRestore(null)}
                disabled={isRestoring}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeRestore(confirmRestore)}
                disabled={isRestoring}
                className={cn(
                  "px-4 py-1.5 text-xs font-semibold rounded-lg text-white transition-all duration-150 flex items-center gap-1.5 cursor-pointer shadow-xs min-h-[36px]",
                  confirmRestore === "undo"
                    ? "bg-orange-600 hover:bg-orange-700 active:bg-orange-800"
                    : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                )}
              >
                {isRestoring ? (
                  <>
                    <Loader size={13} className="animate-spin" />
                    <span>Restoring...</span>
                  </>
                ) : (
                  <>
                    {confirmRestore === "undo" ? (
                      <Undo2 size={13} className="stroke-[2.5]" />
                    ) : (
                      <Redo2 size={13} className="stroke-[2.5]" />
                    )}
                    <span>
                      {version.action === "delete_project" && confirmRestore === "undo"
                        ? "Resurrect Project"
                        : confirmRestore === "undo"
                        ? "Confirm Undo"
                        : "Confirm Redo"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
