import React, { useState, useEffect, useMemo } from "react";
import { 
  FolderPlus, 
  FileCode, 
  Database, 
  RotateCw, 
  Layers,
  FlaskConical,
  Loader,
  GitMerge,
  ChevronDown,
  ChevronUp,
  Search,
  Pencil,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Project, SqlTask } from "../types";
import { cn } from "../lib/utils";

export interface ParsedImportData {
  type: 'single_project' | 'multi_project' | 'raw_tasks';
  project?: {
    id: string;
    name: string;
    createdAt?: number;
  };
  projects?: Array<{
    id: string;
    name: string;
    createdAt?: number;
  }>;
  tasks: any[];
  rawProjects?: any[];
  fileName?: string;
  metadata?: {
    totalTasks?: number;
    sqlTasksCount?: number;
    edgeFunctionsCount?: number;
    projectName?: string;
  };
}

export type ImportMode = 'create_staging' | 'create_new' | 'merge' | 'overwrite' | 'into_active';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importData: ParsedImportData | null;
  existingProjects: Project[];
  activeProjectId: string | null;
  onConfirmImport: (options: {
    mode: ImportMode;
    customProjectName?: string;
    parsedData: ParsedImportData;
    targetProdProject?: Project;
  }) => Promise<void>;
  isImporting: boolean;
}

export default function SmartImportModal({
  isOpen,
  onClose,
  importData,
  existingProjects,
  activeProjectId,
  onConfirmImport,
  isImporting
}: SmartImportModalProps) {
  // Find matching production project (a project whose name does NOT end with ' [STAGING]')
  const matchingProdProject = useMemo(() => {
    if (!importData) return null;
    if (importData.type === 'single_project' && importData.project) {
      const pName = importData.project.name.replace(' [STAGING]', '').toLowerCase().trim();
      return existingProjects.find(
        p => !p.name.endsWith(' [STAGING]') && (p.name.toLowerCase().trim() === pName || p.id === importData.project?.id)
      ) || null;
    }
    return null;
  }, [importData, existingProjects]);

  // Analyze general conflicts
  const singleProjectConflict = useMemo(() => {
    if (!importData || importData.type !== 'single_project' || !importData.project) return null;
    const targetName = importData.project.name.toLowerCase().trim();
    const targetId = importData.project.id;
    return existingProjects.find(p => p.id === targetId || p.name.toLowerCase().trim() === targetName) || null;
  }, [importData, existingProjects]);

  const defaultSuggestedName = useMemo(() => {
    if (!importData) return "";
    if (importData.type === 'single_project') {
      const baseName = importData.project?.name || "Imported Project";
      const hasConflict = existingProjects.some(p => p.name.toLowerCase().trim() === baseName.toLowerCase().trim());
      return hasConflict ? `${baseName} (Copy)` : baseName;
    } else if (importData.type === 'raw_tasks') {
      const cleanFileName = importData.fileName?.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ") || "Imported Tasks";
      return cleanFileName;
    }
    return "";
  }, [importData, existingProjects]);

  const [selectedMode, setSelectedMode] = useState<ImportMode>('create_new');
  const [customName, setCustomName] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSearch, setPreviewSearch] = useState("");

  // Sync mode and default custom name when importData changes
  useEffect(() => {
    if (!importData) return;
    if (matchingProdProject) {
      setSelectedMode('create_staging');
    } else if (importData.type === 'single_project') {
      setSelectedMode('create_new');
    } else if (importData.type === 'raw_tasks') {
      setSelectedMode(activeProjectId ? 'into_active' : 'create_new');
    } else {
      setSelectedMode('create_new');
    }
    setCustomName(defaultSuggestedName);
    setIsPreviewOpen(false);
    setPreviewSearch("");
  }, [importData, matchingProdProject, activeProjectId, defaultSuggestedName]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isImporting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isImporting, onClose]);

  if (!isOpen || !importData) return null;

  const activeProject = existingProjects.find(p => p.id === activeProjectId) || null;
  const sqlCount = importData.tasks.filter(t => t.type === 'sql' || !t.type).length;
  const edgeCount = importData.tasks.filter(t => t.type === 'edge_function').length;
  const totalTasks = importData.tasks.length;

  const filteredPreviewTasks = importData.tasks.filter(t => {
    if (!previewSearch.trim()) return true;
    const q = previewSearch.toLowerCase();
    return (t.title && t.title.toLowerCase().includes(q)) || 
           (t.description && t.description.toLowerCase().includes(q)) ||
           (t.type && t.type.toLowerCase().includes(q));
  });

  const handleExecute = () => {
    onConfirmImport({
      mode: selectedMode,
      customProjectName: customName.trim() || defaultSuggestedName,
      parsedData: importData,
      targetProdProject: matchingProdProject || undefined,
    });
  };

  const importTypeBadge = (() => {
    switch (importData.type) {
      case 'multi_project':
        return { label: 'Multi-Project Backup', color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10' };
      case 'single_project':
        return { label: 'Project Archive', color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' };
      default:
        return { label: 'Bulk Tasks', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' };
    }
  })();

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-4 bg-black/60 dark:bg-black/75 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 6 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="relative w-full max-w-[420px] bg-white dark:bg-[#0c0c0e] text-slate-900 dark:text-zinc-100 rounded-xl shadow-2xl border border-slate-200/80 dark:border-zinc-800/70 overflow-hidden flex flex-col max-h-[88vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Compact Header: No icon, no close button, flush left */}
          <div className="px-4 pt-3.5 pb-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold tracking-tight text-slate-900 dark:text-zinc-100 whitespace-nowrap">
                Smart Bulk Import
              </h2>
              <span className={cn("text-[9.5px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap", importTypeBadge.color)}>
                {importTypeBadge.label}
              </span>
            </div>
            {/* Description starts completely flush left with zero gap */}
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
              {importData.fileName || (importData.project?.name ? `${importData.project.name}.json` : 'JSON file')}
            </p>
          </div>

          {/* Compact Metrics Bar */}
          <div className="px-4 py-1.5 flex items-center justify-between gap-2 border-y border-slate-100 dark:border-zinc-800/60 bg-slate-50/50 dark:bg-zinc-900/30 text-[11px]">
            <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-300 font-medium whitespace-nowrap overflow-hidden">
              <span className="flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
              </span>
              <span className="text-slate-300 dark:text-zinc-700">•</span>
              <span className="flex items-center gap-1 text-slate-500 dark:text-zinc-400 shrink-0">
                <Database size={11} className="text-blue-500" />
                {sqlCount} SQL
              </span>
              {edgeCount > 0 && (
                <>
                  <span className="text-slate-300 dark:text-zinc-700">•</span>
                  <span className="flex items-center gap-1 text-slate-500 dark:text-zinc-400 shrink-0">
                    <FileCode size={11} className="text-violet-500" />
                    {edgeCount} Edge
                  </span>
                </>
              )}
            </div>

            {/* Quick Inspection Toggle */}
            <button
              type="button"
              onClick={() => setIsPreviewOpen(!isPreviewOpen)}
              className="inline-flex items-center gap-1 text-[10.5px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer select-none py-0.5 px-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors shrink-0 whitespace-nowrap"
            >
              <span>{isPreviewOpen ? 'Hide' : 'Inspect'}</span>
              {isPreviewOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          </div>

          {/* Collapsible Inspector Section */}
          <AnimatePresence>
            {isPreviewOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden border-b border-slate-100 dark:border-zinc-800/60 bg-slate-50/70 dark:bg-zinc-950/40 px-4 py-2"
              >
                {totalTasks > 5 && (
                  <div className="relative mb-1.5">
                    <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                    <input
                      type="text"
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      placeholder="Search tasks in this import..."
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md pl-7 pr-2.5 py-1 text-[11px] text-slate-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                    />
                  </div>
                )}
                <div className="max-h-32 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                  {filteredPreviewTasks.length === 0 ? (
                    <div className="text-[11px] text-slate-400 dark:text-zinc-500 py-2 text-center">
                      No matching tasks found.
                    </div>
                  ) : (
                    filteredPreviewTasks.map((t, idx) => (
                      <div 
                        key={t.id || idx} 
                        className="flex items-center justify-between gap-2 py-0.5 px-1.5 rounded hover:bg-white dark:hover:bg-zinc-900/80 transition-colors text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {t.type === 'edge_function' ? (
                            <FileCode size={11} className="text-violet-500 shrink-0" />
                          ) : (
                            <Database size={11} className="text-blue-500 shrink-0" />
                          )}
                          <span className="truncate font-medium text-slate-800 dark:text-zinc-200">
                            {t.title || 'Untitled Task'}
                          </span>
                        </div>
                        <span className={cn(
                          "text-[9px] uppercase font-mono px-1 py-0.2 rounded shrink-0",
                          t.type === 'edge_function' 
                            ? "text-violet-600 dark:text-violet-400 bg-violet-500/10" 
                            : "text-blue-600 dark:text-blue-400 bg-blue-500/10"
                        )}>
                          {t.type === 'edge_function' ? 'Edge' : 'SQL'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal Body - Container-less Edge-to-Edge Import Strategy Selection */}
          <div className="py-2 flex-1 overflow-y-auto">
            <div className="px-4 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Choose Import Strategy
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
              {/* Option 1: Create Staging Branch (Recommended when matching prod exists) */}
              {matchingProdProject && (
                <div 
                  onClick={() => setSelectedMode('create_staging')}
                  className={cn(
                    "group relative px-4 py-2.5 cursor-pointer transition-all duration-150 select-none border-l-[3px]",
                    selectedMode === 'create_staging'
                      ? "bg-amber-500/10 dark:bg-amber-500/10 border-l-amber-500"
                      : "border-l-transparent hover:bg-slate-50 dark:hover:bg-zinc-900/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <FlaskConical size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="font-semibold text-xs text-slate-900 dark:text-zinc-100 truncate whitespace-nowrap">
                        Staging Branch for "{matchingProdProject.name}"
                      </span>
                      <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0 whitespace-nowrap">
                        Safe
                      </span>
                    </div>

                    <div className={cn(
                      "w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all shrink-0",
                      selectedMode === 'create_staging'
                        ? "border-amber-600 bg-amber-600 dark:border-amber-500 dark:bg-amber-500"
                        : "border-slate-300 dark:border-zinc-700 bg-transparent group-hover:border-slate-400 dark:group-hover:border-zinc-500"
                    )}>
                      {selectedMode === 'create_staging' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>

                  {/* Description starts flush from the left edge - no gap */}
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-normal">
                    Imports into an isolated staging copy to review diffs before merging.
                  </p>
                </div>
              )}

              {/* Option 2: New Independent Project */}
              {(importData.type === 'single_project' || importData.type === 'raw_tasks' || importData.type === 'multi_project') && (
                <div 
                  onClick={() => setSelectedMode('create_new')}
                  className={cn(
                    "group relative px-4 py-2.5 cursor-pointer transition-all duration-150 select-none border-l-[3px]",
                    selectedMode === 'create_new'
                      ? "bg-blue-500/10 dark:bg-blue-500/10 border-l-blue-500"
                      : "border-l-transparent hover:bg-slate-50 dark:hover:bg-zinc-900/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <FolderPlus size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="font-semibold text-xs text-slate-900 dark:text-zinc-100 truncate whitespace-nowrap">
                        {importData.type === 'multi_project' ? 'Import as New Projects' : 'New Independent Project'}
                      </span>
                    </div>

                    <div className={cn(
                      "w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all shrink-0",
                      selectedMode === 'create_new'
                        ? "border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500"
                        : "border-slate-300 dark:border-zinc-700 bg-transparent group-hover:border-slate-400 dark:group-hover:border-zinc-500"
                    )}>
                      {selectedMode === 'create_new' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>

                  {/* Description starts flush left */}
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-normal">
                    Creates a separate project with fresh IDs without modifying existing tasks.
                  </p>

                  {/* Container-less Project Name Input */}
                  {selectedMode === 'create_new' && importData.type !== 'multi_project' && (
                    <div className="mt-2 pt-1.5 border-t border-blue-500/20" onClick={(e) => e.stopPropagation()}>
                      <div className="relative flex items-center">
                        <Pencil size={11} className="absolute left-2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="Project name..."
                          className="w-full bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-700/80 rounded-md pl-6 pr-2.5 py-1 text-xs font-medium text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Option 3: Merge into Existing */}
              {singleProjectConflict && (
                <div 
                  onClick={() => setSelectedMode('merge')}
                  className={cn(
                    "group relative px-4 py-2.5 cursor-pointer transition-all duration-150 select-none border-l-[3px]",
                    selectedMode === 'merge'
                      ? "bg-teal-500/10 dark:bg-teal-500/10 border-l-teal-500"
                      : "border-l-transparent hover:bg-slate-50 dark:hover:bg-zinc-900/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <GitMerge size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
                      <span className="font-semibold text-xs text-slate-900 dark:text-zinc-100 truncate whitespace-nowrap">
                        Merge with "{singleProjectConflict.name}"
                      </span>
                    </div>

                    <div className={cn(
                      "w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all shrink-0",
                      selectedMode === 'merge'
                        ? "border-teal-600 bg-teal-600 dark:border-teal-500 dark:bg-teal-500"
                        : "border-slate-300 dark:border-zinc-700 bg-transparent group-hover:border-slate-400 dark:group-hover:border-zinc-500"
                    )}>
                      {selectedMode === 'merge' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>

                  {/* Description starts flush left */}
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-normal">
                    Updates existing tasks by ID/title and appends new queries seamlessly.
                  </p>
                </div>
              )}

              {/* Option 4: Replace / Overwrite Existing */}
              {singleProjectConflict && (
                <div 
                  onClick={() => setSelectedMode('overwrite')}
                  className={cn(
                    "group relative px-4 py-2.5 cursor-pointer transition-all duration-150 select-none border-l-[3px]",
                    selectedMode === 'overwrite'
                      ? "bg-rose-500/10 dark:bg-rose-500/10 border-l-rose-500"
                      : "border-l-transparent hover:bg-slate-50 dark:hover:bg-zinc-900/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <RotateCw size={13} className="text-rose-600 dark:text-rose-400 shrink-0" />
                      <span className="font-semibold text-xs text-rose-600 dark:text-rose-400 truncate whitespace-nowrap">
                        Overwrite "{singleProjectConflict.name}"
                      </span>
                    </div>

                    <div className={cn(
                      "w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all shrink-0",
                      selectedMode === 'overwrite'
                        ? "border-rose-600 bg-rose-600 dark:border-rose-500 dark:bg-rose-500"
                        : "border-slate-300 dark:border-zinc-700 bg-transparent group-hover:border-slate-400 dark:group-hover:border-zinc-500"
                    )}>
                      {selectedMode === 'overwrite' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>

                  {/* Description starts flush left */}
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-normal">
                    Replaces all tasks in "{singleProjectConflict.name}" with this import.
                  </p>
                </div>
              )}

              {/* Option 5: Append to Active Project */}
              {activeProject && importData.type === 'raw_tasks' && (
                <div 
                  onClick={() => setSelectedMode('into_active')}
                  className={cn(
                    "group relative px-4 py-2.5 cursor-pointer transition-all duration-150 select-none border-l-[3px]",
                    selectedMode === 'into_active'
                      ? "bg-indigo-500/10 dark:bg-indigo-500/10 border-l-indigo-500"
                      : "border-l-transparent hover:bg-slate-50 dark:hover:bg-zinc-900/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <Layers size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="font-semibold text-xs text-slate-900 dark:text-zinc-100 truncate whitespace-nowrap">
                        Add to "{activeProject.name}"
                      </span>
                    </div>

                    <div className={cn(
                      "w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all shrink-0",
                      selectedMode === 'into_active'
                        ? "border-indigo-600 bg-indigo-600 dark:border-indigo-500 dark:bg-indigo-500"
                        : "border-slate-300 dark:border-zinc-700 bg-transparent group-hover:border-slate-400 dark:group-hover:border-zinc-500"
                    )}>
                      {selectedMode === 'into_active' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>

                  {/* Description starts flush left */}
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-normal">
                    Appends all {totalTasks} imported tasks directly into your active project.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Compact Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-zinc-800/70 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecute}
              disabled={isImporting || (selectedMode === 'create_new' && !customName.trim() && importData.type !== 'multi_project')}
              className={cn(
                "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none shadow-xs",
                selectedMode === 'create_staging'
                  ? "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white"
                  : selectedMode === 'overwrite'
                  ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white"
                  : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white"
              )}
            >
              {isImporting ? (
                <>
                  <Loader size={12} className="animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <span>
                    {selectedMode === 'create_staging' 
                      ? 'Create Staging Branch' 
                      : selectedMode === 'merge'
                      ? 'Merge Project'
                      : selectedMode === 'overwrite'
                      ? 'Overwrite Project'
                      : selectedMode === 'into_active'
                      ? `Add ${totalTasks} Tasks`
                      : 'Import Project'}
                  </span>
                  <ArrowRight size={12} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
