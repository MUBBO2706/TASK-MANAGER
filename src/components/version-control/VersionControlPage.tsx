import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  History, 
  ArrowLeft, 
  ChevronLeft, 
  X, 
  Search, 
  ChevronRight, 
  Database, 
  CheckCircle2, 
  Undo2, 
  Redo2, 
  Filter, 
  Layers,
  Sparkles,
  GitBranch,
  RefreshCw,
  Trash2,
  CheckSquare,
  Square,
  ListChecks,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Project, VersionBackup } from "../../types";
import { VersionDetailView, getActionBadgeConfig } from "./VersionDetailView";
import VersionControlSkeleton, { VersionTimelineSkeleton } from "./VersionControlSkeleton";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useHybridState } from "../../hooks/useHybridState";
import { groupBackupsSequentially, ConsolidatedBackupGroup } from "./consolidation";

const CUSTOM_COL_RESIZE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M8 9L5 12L8 15V9Z' fill='%230f172a'/%3E%3Cpath d='M16 9L19 12L16 15V9Z' fill='%230f172a'/%3E%3Cline x1='12' y1='6' x2='12' y2='18' stroke='%230f172a' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 12 12, col-resize`;

interface VersionControlPageProps {
  isOpen: boolean;
  onClose: () => void;
  versionBackups: VersionBackup[];
  currentProjects?: Project[];
  activeProjectId?: string | null;
  onRestoreBackup: (backup: VersionBackup, type: "undo" | "redo") => Promise<void>;
  onDeleteBackups?: (backupIds: string[]) => Promise<void>;
  isLoading?: boolean;
  sidebarWidth?: number;
  onSidebarWidthChange?: (width: number) => void;
}

export function VersionControlPage({
  isOpen,
  onClose,
  versionBackups,
  currentProjects = [],
  activeProjectId,
  onRestoreBackup,
  onDeleteBackups,
  isLoading = false,
  sidebarWidth: propSidebarWidth,
  onSidebarWidthChange,
}: VersionControlPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlVersionId = searchParams.get("versionId");

  const [searchQuery, setSearchQuery] = useLocalStorage("version-search-query", "");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [filterCategory, setFilterCategory] = useHybridState<"all" | "tasks" | "projects" | "merges">(
    "vCategory",
    "all"
  );
  const [lastVisitedVersionId, setLastVisitedVersionId] = useLocalStorage<string | null>(
    "version-last-visited-id",
    null
  );
  const [isRestoring, setIsRestoring] = useState(false);

  // Selection mode & deletion state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedVersionIds, setSelectedVersionIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Selected version state
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(() => {
    if (urlVersionId) return urlVersionId;
    return null;
  });

  // Mobile detail view toggle
  const [showDetailMobile, setShowDetailMobile] = useState<boolean>(Boolean(urlVersionId));

  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update selected version if URL param changes
  useEffect(() => {
    if (urlVersionId) {
      setSelectedVersionId(urlVersionId);
      setLastVisitedVersionId(urlVersionId);
      setShowDetailMobile(true);
    }
  }, [urlVersionId, setLastVisitedVersionId]);

  // Keyboard shortcut: Escape to close or back
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showDeleteConfirmModal) {
          setShowDeleteConfirmModal(false);
        } else if (isSearchExpanded) {
          setIsSearchExpanded(false);
          setSearchQuery("");
        } else if (isSelectionMode) {
          setIsSelectionMode(false);
          setSelectedVersionIds(new Set());
        } else if (showDetailMobile && !isDesktop) {
          setShowDetailMobile(false);
        } else {
          handleClosePage();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showDetailMobile, isDesktop, isSearchExpanded, isSelectionMode, showDeleteConfirmModal]);

  // Sidebar resize handling
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const resizerHandleRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const rafResizeIdRef = useRef<number | null>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (propSidebarWidth && propSidebarWidth > 0) return propSidebarWidth;
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("versionSidebarWidth");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed > 0) return parsed;
        }
      } catch (_) {}
    }
    return 400;
  });

  const nextSidebarWidthRef = useRef<number>(sidebarWidth);

  useEffect(() => {
    if (propSidebarWidth && propSidebarWidth > 0 && !isResizingRef.current) {
      setSidebarWidth(propSidebarWidth);
    }
  }, [propSidebarWidth]);

  useEffect(() => {
    return () => {
      if (rafResizeIdRef.current !== null) cancelAnimationFrame(rafResizeIdRef.current);
    };
  }, []);

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    e.stopPropagation();

    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const minWidth = 280;
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
          if (sidebarRef.current) {
            sidebarRef.current.style.width = `${nextSidebarWidthRef.current}px`;
          }
          if (resizerHandleRef.current) {
            resizerHandleRef.current.style.left = `${nextSidebarWidthRef.current}px`;
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
      const finalWidth = nextSidebarWidthRef.current;
      setSidebarWidth(finalWidth);
      try {
        window.localStorage.setItem("versionSidebarWidth", JSON.stringify(finalWidth));
      } catch (_) {}
      onSidebarWidthChange?.(finalWidth);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const existingProjectIds = useMemo(
    () => new Set(currentProjects.map((p) => p.id)),
    [currentProjects]
  );

  const activeProject = useMemo(() => {
    return currentProjects.find((p) => p.id === activeProjectId) || null;
  }, [currentProjects, activeProjectId]);

  // Filtered timeline backups
  const filteredBackups = useMemo(() => {
    return versionBackups.filter((b) => {
      // 1. Category filter
      if (filterCategory === "tasks") {
        if (!["create_task", "update_task", "update_status", "delete_task"].includes(b.action))
          return false;
      } else if (filterCategory === "projects") {
        if (
          !["create_project", "rename_project", "delete_project", "clone_project"].includes(
            b.action
          )
        )
          return false;
      } else if (filterCategory === "merges") {
        if (!["merge", "reject", "import_tasks"].includes(b.action)) return false;
      }

      // 2. Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (b.description && b.description.toLowerCase().includes(q)) ||
        (b.action && b.action.toLowerCase().includes(q)) ||
        (b.prodProjectId && b.prodProjectId.toLowerCase().includes(q)) ||
        (b.stagingProjectId && b.stagingProjectId.toLowerCase().includes(q))
      );
    });
  }, [versionBackups, filterCategory, searchQuery]);


  const groupedBackups = useMemo(() => {
    return groupBackupsSequentially(filteredBackups);
  }, [filteredBackups]);

  const selectedGroup = useMemo(() => {
    return groupedBackups.find((g) => g.items.some((b) => b.id === selectedVersionId)) || null;
  }, [groupedBackups, selectedVersionId]);

  const selectedVersionGroup = useMemo(() => {
    return selectedGroup ? selectedGroup.items : null;
  }, [selectedGroup]);

  const selectedVersion = useMemo(() => {
    return versionBackups.find((b) => b.id === selectedVersionId) || null;
  }, [versionBackups, selectedVersionId]);

  const handleSelectVersion = (version: VersionBackup) => {
    setSelectedVersionId(version.id);
    setLastVisitedVersionId(version.id);
    setShowDetailMobile(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("versionId", version.id);
      return next;
    }, { replace: true });
  };

  const handleToggleSelectVersion = (groupItems: VersionBackup[], e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedVersionIds((prev) => {
      const next = new Set(prev);
      const allSelected = groupItems.every(b => next.has(b.id));
      if (allSelected) {
        groupItems.forEach(b => next.delete(b.id));
      } else {
        groupItems.forEach(b => next.add(b.id));
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedVersionIds.size === filteredBackups.length && filteredBackups.length > 0) {
      setSelectedVersionIds(new Set());
    } else {
      setSelectedVersionIds(new Set(filteredBackups.map((b) => b.id)));
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedVersionIds.size === 0 || !onDeleteBackups) return;
    setIsDeleting(true);
    try {
      const idsToDelete = Array.from(selectedVersionIds) as string[];
      await onDeleteBackups(idsToDelete);

      // If the currently viewed version is among deleted ones, clear or switch
      if (selectedVersionId && idsToDelete.includes(selectedVersionId)) {
        const remaining = versionBackups.filter((b) => !idsToDelete.includes(b.id));
        if (remaining.length > 0) {
          setSelectedVersionId(remaining[0].id);
        } else {
          setSelectedVersionId(null);
          setShowDetailMobile(false);
        }
      }

      setSelectedVersionIds(new Set());
      setIsSelectionMode(false);
      setShowDeleteConfirmModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClosePage = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("versionControl");
      next.delete("versionId");
      return next;
    }, { replace: true });
    onClose();
  };

  const handleRestore = async (backup: VersionBackup, type: "undo" | "redo") => {
    setIsRestoring(true);
    try {
      await onRestoreBackup(backup, type);
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <VersionControlSkeleton
        sidebarWidth={sidebarWidth}
        onSidebarWidthChange={setSidebarWidth}
        onClose={handleClosePage}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[1000] flex flex-col bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 font-sans overflow-hidden"
    >
      {/* Resizing Shield Overlay */}
      {isResizing && (
        <div
          className="fixed inset-0 z-[100] select-none pointer-events-auto"
          style={{ cursor: CUSTOM_COL_RESIZE_CURSOR }}
        />
      )}

      {/* Top Application Bar (hidden on mobile when viewing details) */}
      {(!showDetailMobile || isDesktop) && (
        <header className="h-12 px-3 sm:px-4 border-b border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c0e] flex items-center justify-between gap-3 shrink-0 z-30">
          {/* Left: Back chevron & Breadcrumb Heading */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={handleClosePage}
              className="p-1.5 -ml-1 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Back to Workspace"
            >
              <ChevronLeft size={20} className="stroke-[2.25]" />
            </button>

            <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
              {activeProject && (
                <>
                  <span className="truncate hidden md:inline text-xs font-medium text-slate-500 dark:text-zinc-400">
                    {activeProject.name}
                  </span>
                  <ChevronRight size={13} className="hidden md:inline shrink-0 text-slate-350 dark:text-zinc-700" />
                </>
              )}
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                <span>Version Control</span>
              </h1>
            </div>
          </div>

          {/* Right: Snapshots Count & Revisions Info (Plain Text with Separator) */}
          <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 shrink-0 flex items-center gap-1.5">
            <span>{groupedBackups.length} {groupedBackups.length === 1 ? "snapshot" : "snapshots"}</span>
            <span className="text-slate-300 dark:text-zinc-700 font-normal">•</span>
            <span>{versionBackups.length} {versionBackups.length === 1 ? "revision" : "revisions"}</span>
          </div>
        </header>
      )}

      {/* Main Split-Pane Content */}
      <div className={cn("flex-1 flex w-full h-full overflow-hidden min-h-0 relative", isResizing && "select-none")}>
        {/* Left Column: Timeline List */}
        <div
          ref={sidebarRef}
          className={cn(
            "border-r border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c0e] flex flex-col shrink-0 relative h-full",
            showDetailMobile ? "hidden md:flex" : "flex w-full"
          )}
          style={{ width: isDesktop ? `${sidebarWidth}px` : "100%" }}
        >
          {/* Subheader: Category filter, Expandable Live Search & Multi-select Mode */}
          <div className="p-2 sm:p-2.5 border-b border-slate-100 dark:border-zinc-800/60 bg-slate-50/50 dark:bg-zinc-900/30 flex items-center justify-between gap-2 w-full relative min-h-[44px]">
            {isSelectionMode ? (
              /* Selection Action Bar */
              <div className="flex items-center justify-between w-full gap-2 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200/80 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer shrink-0 hover:text-slate-950 dark:hover:text-white"
                  >
                    {selectedVersionIds.size > 0 && selectedVersionIds.size === filteredBackups.length ? (
                      <CheckSquare size={14} className="text-blue-600 dark:text-blue-400 stroke-[2.5]" />
                    ) : (
                      <Square size={14} className="text-slate-500 stroke-[2]" />
                    )}
                    <span>
                      {selectedVersionIds.size === filteredBackups.length && filteredBackups.length > 0
                        ? "Deselect All"
                        : "Select All"}
                    </span>
                  </button>
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                    {selectedVersionIds.size} of {filteredBackups.length} selected
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={selectedVersionIds.size === 0 || isDeleting}
                    onClick={() => setShowDeleteConfirmModal(true)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs",
                      selectedVersionIds.size === 0
                        ? "bg-slate-200/60 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed"
                        : "bg-rose-600 text-white"
                    )}
                  >
                    <Trash2 size={13} className="stroke-[2.25]" />
                    <span>Delete {selectedVersionIds.size > 0 ? `(${selectedVersionIds.size})` : ""}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedVersionIds(new Set());
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    title="Cancel Selection Mode"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              /* Standard Subheader Bar: Category filters on left, Search & Select icons on right */
              <div className="flex items-center justify-between w-full gap-2 relative">
                {/* Category filter tabs (made larger and more prominent) */}
                <div
                  className={cn(
                    "flex items-center gap-1 bg-slate-200/70 dark:bg-zinc-800/70 p-1 rounded-lg shrink-0 transition-opacity duration-150",
                    isSearchExpanded && "opacity-0 pointer-events-none"
                  )}
                >
                  {(["all", "tasks", "projects", "merges"] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFilterCategory(cat)}
                      className={cn(
                        "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap",
                        filterCategory === cat
                          ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Right Actions: Search trigger icon & Multi-select trigger icon */}
                <div
                  className={cn(
                    "flex items-center gap-1 shrink-0 ml-auto transition-opacity duration-150",
                    isSearchExpanded && "opacity-0 pointer-events-none"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setIsSearchExpanded(true)}
                    className={cn(
                      "p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer",
                      searchQuery && "text-blue-600 dark:text-blue-400"
                    )}
                    title="Search Snapshots"
                  >
                    <Search size={16} className="stroke-[2.25]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSelectionMode(true);
                      setSelectedVersionIds(new Set());
                    }}
                    className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    title="Select Snapshots to Delete"
                  >
                    <CheckSquare size={16} className="stroke-[2]" />
                  </button>
                </div>

                {/* Animated Expandable Search Bar across the subheader row */}
                <AnimatePresence>
                  {isSearchExpanded && (
                    <motion.div
                      key="version-search-expanded"
                      initial={{ opacity: 0, width: 28 }}
                      animate={{ opacity: 1, width: "100%" }}
                      exit={{ opacity: 0, width: 28 }}
                      transition={{ type: "spring", stiffness: 420, damping: 30 }}
                      style={{ transformOrigin: "right center" }}
                      className="absolute inset-y-0 right-0 z-20 flex items-center gap-1.5 w-full bg-white dark:bg-[#0c0c0e] px-1"
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
                        type="button"
                        onClick={() => {
                          setIsSearchExpanded(false);
                          setSearchQuery("");
                        }}
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer shrink-0"
                        title="Close Search"
                      >
                        <X size={15} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Timeline List Items */}
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100 dark:divide-zinc-800/60">
            {filteredBackups.length === 0 ? (
              <div className="text-center py-20 text-slate-400 dark:text-zinc-500 px-6">
                <History size={30} className="mx-auto mb-3 opacity-30 stroke-[1.5]" />
                <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  {searchQuery ? "No matching snapshots" : "No version snapshots yet"}
                </p>
                <p className="text-[11px] mt-1 text-slate-400 dark:text-zinc-500 max-w-[220px] mx-auto leading-relaxed">
                  {searchQuery
                    ? "Try adjusting your search terms or filter category"
                    : "Database changes, queries, and merges are automatically audited here."}
                </p>
              </div>
            ) : (
              groupedBackups.map((group) => {
                const backup = group.latestBackup; // representative latest backup for the group
                const badge = getActionBadgeConfig(backup.action);
                const isSelected = selectedVersionId && group.items.some(b => b.id === selectedVersionId);
                const isChecked = group.items.some(b => selectedVersionIds.has(b.id)); // If any checked, show checked for group
                const isProjectDeleted = backup.prodProjectId && !existingProjectIds.has(backup.prodProjectId);

                return (
                  <div
                    key={group.groupKey + "-" + backup.id}
                    onClick={(e) => {
                      if (isSelectionMode) {
                        handleToggleSelectVersion(group.items, e);
                      } else {
                        handleSelectVersion(group.latestBackup);
                      }
                    }}
                    className={cn(
                      "group relative px-3.5 sm:px-4 py-3 cursor-pointer transition-all duration-150 border-l-[3.5px]",
                      isSelectionMode && isChecked
                        ? "bg-blue-50/80 dark:bg-blue-950/30 border-l-blue-600"
                        : isSelected && !isSelectionMode
                        ? "bg-blue-50/70 dark:bg-blue-950/25 border-l-blue-600 shadow-2xs"
                        : backup.isUndone
                        ? "bg-amber-500/5 dark:bg-amber-500/5 border-l-amber-500/70 hover:bg-amber-500/10"
                        : "border-l-transparent hover:bg-slate-50 dark:hover:bg-zinc-900/40 hover:border-l-slate-300 dark:hover:border-l-zinc-700"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Selection Checkbox */}
                      {isSelectionMode && (
                        <div
                          onClick={(e) => handleToggleSelectVersion(group.items, e)}
                          className="shrink-0 text-slate-400 hover:text-blue-600 cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare size={17} className="text-blue-600 dark:text-blue-400 stroke-[2.5]" />
                          ) : (
                            <Square size={17} className="text-slate-400 dark:text-zinc-600 stroke-[2]" />
                          )}
                        </div>
                      )}

                      {/* Content column */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5 sm:gap-2 min-w-0">
                          {/* Action Badge & Tag & Timestamp & Stats */}
                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 flex-nowrap overflow-hidden whitespace-nowrap">
                            <span
                              className={cn(
                                "text-[8.5px] sm:text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1 border whitespace-nowrap",
                                badge.className
                              )}
                            >
                              {badge.icon}
                              <span>{badge.label}</span>
                            </span>

                            <span className="text-slate-300 dark:text-zinc-700 text-[9px] shrink-0">•</span>

                            {group.count > 1 && (
                              <>
                                <span className="text-[10px] sm:text-[11px] font-semibold text-blue-600 dark:text-blue-400 shrink-0 whitespace-nowrap">
                                  {group.count} edits
                                </span>
                                <span className="text-slate-300 dark:text-zinc-700 text-[9px] shrink-0">•</span>
                              </>
                            )}

                            {isProjectDeleted && (
                              <>
                                <span className="text-[10px] sm:text-[11px] font-semibold text-rose-600 dark:text-rose-400 shrink-0 whitespace-nowrap">
                                  Deleted
                                </span>
                                <span className="text-slate-300 dark:text-zinc-700 text-[9px] shrink-0">•</span>
                              </>
                            )}

                            {backup.isUndone && (
                              <>
                                <span className="text-[10px] sm:text-[11px] font-semibold text-amber-600 dark:text-amber-400 shrink-0 whitespace-nowrap">
                                  Undone
                                </span>
                                <span className="text-slate-300 dark:text-zinc-700 text-[9px] shrink-0">•</span>
                              </>
                            )}

                            <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-zinc-500 font-mono shrink-0 whitespace-nowrap">
                              {new Date(backup.timestamp).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              })}
                            </span>

                            <span className="text-slate-300 dark:text-zinc-700 text-[9px] shrink-0">•</span>

                            <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-zinc-400 font-mono shrink-0 whitespace-nowrap truncate">
                              {backup.stateAfter?.tasks?.length || 0} tasks • {backup.stateAfter?.projects?.length || 0} projects
                            </span>
                          </div>

                          {/* Chevron Arrow (hidden in selection mode) */}
                          {!isSelectionMode && (
                            <ChevronRight
                              size={14}
                              className={cn(
                                "transition-colors shrink-0 ml-0.5",
                                isSelected
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-slate-300 dark:text-zinc-700 group-hover:text-slate-500 dark:group-hover:text-zinc-400"
                              )}
                            />
                          )}
                        </div>

                        {/* Title - Strictly single line with ellipsis */}
                        <p
                          className={cn(
                            "text-xs mt-1.5 leading-snug truncate whitespace-nowrap overflow-hidden text-ellipsis",
                            isSelected && !isSelectionMode
                              ? "font-semibold text-slate-900 dark:text-white"
                              : "text-slate-700 dark:text-zinc-300 font-medium"
                          )}
                          title={group.displayTitle}
                        >
                          {group.displayTitle}
                        </p>

                        {group.count > 1 && (
                          <p
                            className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-tight truncate whitespace-nowrap overflow-hidden text-ellipsis font-normal"
                            title={group.displaySubtitle}
                          >
                            {group.displaySubtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Desktop Column Resize Handle */}
        <div
          ref={resizerHandleRef}
          className="hidden md:flex group w-3.5 absolute top-0 bottom-0 z-30 items-center justify-center -ml-[7px] select-none touch-none cursor-pointer"
          style={{
            left: sidebarWidth,
            cursor: CUSTOM_COL_RESIZE_CURSOR,
          }}
          onPointerDown={handleResizePointerDown}
        >
          <div className="absolute inset-y-0 w-[1px] bg-slate-200 dark:border-zinc-800 group-hover:bg-slate-400 dark:group-hover:bg-zinc-600 group-active:bg-slate-500 dark:group-active:bg-zinc-500 transition-colors" />
          <div className="relative z-10 w-3.5 h-7 rounded-full bg-white dark:bg-zinc-900 border border-slate-300/90 dark:border-zinc-700/90 shadow-sm flex items-center justify-center gap-[2px] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-150 pointer-events-none">
            <div className="w-[1.5px] h-3 bg-slate-400 dark:bg-zinc-500 rounded-full" />
            <div className="w-[1.5px] h-3 bg-slate-400 dark:bg-zinc-500 rounded-full" />
          </div>
        </div>

        {/* Right Column: Dedicated Version Detail View */}
        <div
          className={cn(
            "flex-1 flex flex-col h-full bg-white dark:bg-black min-w-0 overflow-hidden",
            !showDetailMobile ? "hidden md:flex" : "flex w-full",
            isResizing && "pointer-events-none select-none"
          )}
        >
          <VersionDetailView
            versionGroup={selectedVersionGroup}
            currentGroup={selectedGroup}
            currentProjects={currentProjects}
            onBack={() => {
              if (isDesktop) {
                setSelectedVersionId(null);
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete("versionId");
                  return next;
                }, { replace: true });
              } else {
                setShowDetailMobile(false);
              }
            }}
            onRestore={handleRestore}
            isRestoring={isRestoring}
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmModal && (
        <div
          className="fixed inset-0 bg-black/60 dark:bg-black/75 z-[10010] flex items-center justify-center p-3 backdrop-blur-xs"
          onClick={() => setShowDeleteConfirmModal(false)}
        >
          <div
            className="bg-white dark:bg-[#0c0c0e] rounded-xl shadow-2xl max-w-[400px] w-full border border-slate-200/80 dark:border-zinc-800/70 overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <Trash2 size={16} className="stroke-[2.25]" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  Delete {selectedVersionIds.size} Version {selectedVersionIds.size === 1 ? "Snapshot" : "Snapshots"}?
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed mt-1">
                Are you sure you want to permanently delete {selectedVersionIds.size === 1 ? "this audit snapshot" : "these audit snapshots"}? This action cannot be undone.
              </p>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 dark:border-zinc-800/70 flex items-center justify-end gap-2.5 bg-slate-50/50 dark:bg-zinc-900/30">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white transition-all duration-150 flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} className="stroke-[2.25]" />
                    <span>Delete {selectedVersionIds.size === 1 ? "Snapshot" : "Snapshots"}</span>
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

export default VersionControlPage;
