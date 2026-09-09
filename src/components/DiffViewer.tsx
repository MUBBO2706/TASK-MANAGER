import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DiffEditor } from '@monaco-editor/react';
import { FileCode, Database, CheckSquare, Plus, Trash2, Pencil, ChevronLeft, Columns, AlignLeft, ArrowRight, Loader } from 'lucide-react';
import * as Diff from 'diff';
import { cn } from '../lib/utils';
import { SqlTask } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import DiffViewerSkeleton, { DiffCodeSkeleton, NoChangesDiffSkeleton } from './DiffViewerSkeleton';

const CUSTOM_COL_RESIZE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M8 9L5 12L8 15V9Z' fill='%230f172a'/%3E%3Cpath d='M16 9L19 12L16 15V9Z' fill='%230f172a'/%3E%3Cline x1='12' y1='6' x2='12' y2='18' stroke='%230f172a' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 12 12, col-resize`;

interface DiffViewerProps {
  stagingProjectId: string;
  prodProjectId: string;
  theme: "light" | "dark";
  onClose: () => void;
  onMerge: (selectedItems: DiffItem[], isAll: boolean) => void;
  onReject: (selectedItems: DiffItem[], isAll: boolean) => void;
  isMerging: boolean;
  isRejecting?: boolean;
  expectedDiffCount?: number;
}

type DiffStatus = "added" | "deleted" | "modified";

interface DiffItem {
  id: string; // unique key for list
  title: string;
  type: "sql" | "edge_function";
  status: DiffStatus;
  prodTask: SqlTask | null;
  stagingTask: SqlTask | null;
  additions: number;
  deletions: number;
}

export default function DiffViewer({ stagingProjectId, prodProjectId, theme, onClose, onMerge, onReject, isMerging, isRejecting, expectedDiffCount }: DiffViewerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlDiffTaskId = searchParams.get("diffTaskId");

  const [loading, setLoading] = useState(true);
  const [diffItems, setDiffItems] = useState<DiffItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(urlDiffTaskId || null);
  const [showDetailMobile, setShowDetailMobile] = useState<boolean>(Boolean(urlDiffTaskId));
  const [selectedTab, setSelectedTab] = useState<string>('sql');
  const [showFileExplorer, setShowFileExplorer] = useState<boolean>(true);
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());

  const handleBackToBackground = () => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete("diff");
      next.delete("diffTaskId");
      return next;
    }, { replace: true });
    onClose();
  };

  const [showConfirmMerge, setShowConfirmMerge] = useState(false);
  const [showConfirmReject, setShowConfirmReject] = useState(false);

  useEffect(() => {
    setShowConfirmMerge(false);
    setShowConfirmReject(false);
  }, [selectedItemId, showDetailMobile]);

  // Sync state if urlDiffTaskId changes externally
  useEffect(() => {
    if (urlDiffTaskId && urlDiffTaskId !== selectedItemId) {
      setSelectedItemId(urlDiffTaskId);
      setShowDetailMobile(true);
    } else if (!urlDiffTaskId && selectedItemId && !loading) {
      // If diffTaskId was removed from URL
      setSelectedItemId(null);
      setShowDetailMobile(false);
    }
  }, [urlDiffTaskId, loading]);

  const [sidebarWidth, setSidebarWidth] = useLocalStorage("diffSidebarWidth", 320);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const resizerHandleRef = React.useRef<HTMLDivElement>(null);
  const isResizingRef = React.useRef(false);
  const rafResizeIdRef = React.useRef<number | null>(null);
  const nextSidebarWidthRef = React.useRef<number>(0);

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
      setSidebarWidth(nextSidebarWidthRef.current);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const selectedItem = diffItems.find(i => i.id === selectedItemId) || null;

  useEffect(() => {
    const fetchDiffs = async () => {
      try {
        setLoading(true);
        const devKeysModules = import.meta.glob('../lib/dev-keys.ts', { eager: true });
        const devKeys: any = devKeysModules['../lib/dev-keys.ts'] || {};
        const apiKey = import.meta.env.VITE_API_KEY || devKeys.VITE_API_KEY || "sk_sync_b4k92jdm10";
        
        const [prodRes, stagingRes] = await Promise.all([
          fetch(`/export.json?projectId=${prodProjectId}&api_key=${apiKey}`),
          fetch(`/export.json?projectId=${stagingProjectId}&api_key=${apiKey}`)
        ]);

        if (!prodRes.ok || !stagingRes.ok) throw new Error("Failed to fetch project exports");

        const prodExport = await prodRes.json();
        const stagingExport = await stagingRes.json();

        const prodTasks: SqlTask[] = prodExport._raw_tasks || [];
        const stagingTasks: SqlTask[] = stagingExport._raw_tasks || [];

        const prodTaskMap = new Map<string, SqlTask>(prodTasks.map(t => [t.id, t]));
        const stagingParentMap = new Map<string, SqlTask>(); // prodTask_id -> stagingTask
        
        stagingTasks.forEach(st => {
          if (st.productionTaskId) stagingParentMap.set(st.productionTaskId, st);
        });

        const items: DiffItem[] = [];

        // Find Added and Modified
        stagingTasks.forEach(st => {
          if (!st.productionTaskId || !prodTaskMap.has(st.productionTaskId)) {
            // Added
            const sql = st.type === "edge_function" ? 
               (st.edgeFiles?.map(f => f.code).join('\n') || '') + '\n' + (st.edgeSecrets?.map(s => s.key + '=' + s.value).join('\n') || '') 
               : (st.sql || '');
            const lines = sql.trim() ? sql.split('\n').length : 0;
            items.push({
              id: st.id,
              title: st.title || "Untitled",
              type: st.type || 'sql',
              status: "added",
              prodTask: null,
              stagingTask: st,
              additions: lines,
              deletions: 0
            });
          } else {
            // Check Modified
            const pt = prodTaskMap.get(st.productionTaskId)!;
            let isModified = false;
            let stStr = '';
            let ptStr = '';

            if (st.type === 'edge_function') {
               const stFilesStr = JSON.stringify(st.edgeFiles?.map(f => ({ n: f.name, c: f.code })) || []);
               const ptFilesStr = JSON.stringify(pt.edgeFiles?.map(f => ({ n: f.name, c: f.code })) || []);
               if (stFilesStr !== ptFilesStr) isModified = true;
               
               const stSecretsStr = JSON.stringify(st.edgeSecrets?.map(s => ({ k: s.key, v: s.value })) || []);
               const ptSecretsStr = JSON.stringify(pt.edgeSecrets?.map(s => ({ k: s.key, v: s.value })) || []);
               if (stSecretsStr !== ptSecretsStr) isModified = true;
               
               stStr = (st.edgeFiles?.map(f => f.code).join('\n') || '') + '\n' + (st.edgeSecrets?.map(s => s.key + '=' + s.value).join('\n') || '');
               ptStr = (pt.edgeFiles?.map(f => f.code).join('\n') || '') + '\n' + (pt.edgeSecrets?.map(s => s.key + '=' + s.value).join('\n') || '');
            } else {
               if (st.sql !== pt.sql) isModified = true;
               stStr = st.sql || '';
               ptStr = pt.sql || '';
            }

            if (isModified) {
              const diffResult = Diff.diffLines(ptStr, stStr);
              let additions = 0;
              let deletions = 0;
              diffResult.forEach(part => {
                if (part.added) additions += part.count || 0;
                else if (part.removed) deletions += part.count || 0;
              });

              items.push({
                id: st.id,
                title: st.title || "Untitled",
                type: st.type || 'sql',
                status: "modified",
                prodTask: pt,
                stagingTask: st,
                additions,
                deletions
              });
            }
          }
        });

        // Find Deleted
        prodTasks.forEach(pt => {
          if (!stagingParentMap.has(pt.id)) {
            const sql = pt.type === "edge_function" ? 
               (pt.edgeFiles?.map(f => f.code).join('\n') || '') + '\n' + (pt.edgeSecrets?.map(s => s.key + '=' + s.value).join('\n') || '') 
               : (pt.sql || '');
            const lines = sql.trim() ? sql.split('\n').length : 0;
            items.push({
              id: pt.id,
              title: pt.title || "Untitled",
              type: pt.type || 'sql',
              status: "deleted",
              prodTask: pt,
              stagingTask: null,
              additions: 0,
              deletions: lines
            });
          }
        });

        setDiffItems(items);
        setSelectedForMerge(new Set(items.map(i => i.id)));
        const currentTaskId = searchParams.get("diffTaskId");
        if (currentTaskId && items.some(i => i.id === currentTaskId)) {
          setSelectedItemId(currentTaskId);
          setShowDetailMobile(true);
        }
      } catch (err) {
        console.error("Diff fetching error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDiffs();
  }, [prodProjectId, stagingProjectId]);

  // Derived state for the right panel
  const getOldValue = () => {
    if (!selectedItem || selectedItem.status === 'added') return '';
    const task = selectedItem.prodTask;
    if (!task) return '';
    if (selectedItem.type === 'edge_function') {
      if (selectedTab === 'secrets.json') {
         return JSON.stringify(task.edgeSecrets?.map(s => ({ key: s.key, value: s.value })) || [], null, 2).trimEnd();
      }
      const file = task.edgeFiles?.find(f => f.name === selectedTab);
      return (file ? file.code : '').trimEnd();
    }
    return (task.sql || '').trimEnd();
  };

  const getNewValue = () => {
    if (!selectedItem || selectedItem.status === 'deleted') return '';
    const task = selectedItem.stagingTask;
    if (!task) return '';
    if (selectedItem.type === 'edge_function') {
      if (selectedTab === 'secrets.json') {
         return JSON.stringify(task.edgeSecrets?.map(s => ({ key: s.key, value: s.value })) || [], null, 2).trimEnd();
      }
      const file = task.edgeFiles?.find(f => f.name === selectedTab);
      return (file ? file.code : '').trimEnd();
    }
    return (task.sql || '').trimEnd();
  };

  const getEdgeFilesInfo = () => {
    if (!selectedItem || selectedItem.type !== 'edge_function') return [];
    
    const filesMap = new Map<string, { status: string }>();
    const prodFiles = selectedItem.prodTask?.edgeFiles || [];
    const stagingFiles = selectedItem.stagingTask?.edgeFiles || [];
    
    const allFileNames = new Set([...prodFiles.map(f => f.name), ...stagingFiles.map(f => f.name)]);
    
    allFileNames.forEach(name => {
      const p = prodFiles.find(f => f.name === name);
      const s = stagingFiles.find(f => f.name === name);
      if (!p && s) filesMap.set(name, { status: 'added' });
      else if (p && !s) filesMap.set(name, { status: 'deleted' });
      else if (p && s && p.code !== s.code) filesMap.set(name, { status: 'modified' });
      else filesMap.set(name, { status: 'unchanged' });
    });

    const pSecrets = JSON.stringify(selectedItem.prodTask?.edgeSecrets?.map(s => ({ k: s.key, v: s.value })) || []);
    const sSecrets = JSON.stringify(selectedItem.stagingTask?.edgeSecrets?.map(s => ({ k: s.key, v: s.value })) || []);
    
    if (!selectedItem.prodTask?.edgeSecrets?.length && selectedItem.stagingTask?.edgeSecrets?.length) {
      filesMap.set('secrets.json', { status: 'added' });
    } else if (selectedItem.prodTask?.edgeSecrets?.length && !selectedItem.stagingTask?.edgeSecrets?.length) {
      filesMap.set('secrets.json', { status: 'deleted' });
    } else if (pSecrets !== sSecrets) {
      filesMap.set('secrets.json', { status: 'modified' });
    } else {
      filesMap.set('secrets.json', { status: 'unchanged' });
    }
    
    return Array.from(filesMap.entries())
      .map(([name, info]) => ({ name, status: info.status }))
      .sort((a, b) => {
        if (a.name === 'index.ts') return -1;
        if (b.name === 'index.ts') return 1;
        return a.name.localeCompare(b.name);
      });
  };

  useEffect(() => {
    if (selectedItem?.type === 'edge_function') {
      const filesInfo = getEdgeFilesInfo();
      if (filesInfo.length > 0 && !filesInfo.find(f => f.name === selectedTab)) {
         setSelectedTab(filesInfo[0].name);
      }
    } else {
      setSelectedTab('sql');
    }
  }, [selectedItem]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 dark:bg-black font-sans overflow-hidden">
      {loading ? (
        expectedDiffCount === 0 ? (
          <NoChangesDiffSkeleton onClose={handleBackToBackground} />
        ) : (
          <DiffViewerSkeleton
            sidebarWidth={sidebarWidth}
            onSidebarWidthChange={setSidebarWidth}
            selectedItemId={selectedItemId || urlDiffTaskId}
            onClose={handleBackToBackground}
          />
        )
      ) : diffItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 p-6 text-center w-full h-full bg-slate-50 dark:bg-black font-sans">
           <CheckSquare size={32} className="text-slate-400 dark:text-zinc-500 mb-2 stroke-[1.75]" />
           <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-2">No Changes Detected</h3>
           <p className="max-w-xs text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
             Your staging project is completely up to date and identical to the production version.
           </p>
           <button
             id="diff-viewer-no-changes-return-btn"
             onClick={handleBackToBackground}
             className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-transparent border border-slate-200 dark:border-zinc-800 rounded-md hover:bg-slate-100/60 dark:hover:bg-zinc-900/60 active:bg-slate-200/60 dark:active:bg-zinc-800/60 transition-colors cursor-pointer"
           >
             <ChevronLeft size={14} className="shrink-0" />
             <span>Back to Workspace</span>
           </button>
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 flex w-full h-full overflow-hidden min-h-0 pt-0.5 md:pt-0 relative">
          {/* Resizing Shield Overlay */}
          {isResizing && (
            <div
              className="fixed inset-0 z-[100] select-none pointer-events-auto"
              style={{ cursor: CUSTOM_COL_RESIZE_CURSOR }}
            />
          )}

          {/* Sidebar */}
          <div 
            ref={sidebarRef}
            className={cn(
            "w-full border-r border-slate-200 dark:border-[#1a1a1a] bg-white dark:bg-[#0a0a0a] flex-col shrink-0 relative",
            showDetailMobile ? "hidden md:flex" : "flex h-full",
            !isResizing && "transition-[width]"
          )}
          style={{ width: window.innerWidth >= 768 ? `${sidebarWidth}px` : "100%" }}
          >
            <div className="py-2.5 px-3 md:py-3 md:px-4 border-b border-slate-200 dark:border-[#1a1a1a] bg-slate-50/50 dark:bg-[#121212]/50 sticky top-0 z-10 w-full flex flex-row flex-wrap items-center justify-between gap-y-1.5 gap-x-2">
               <div className="flex items-center gap-2 min-w-0">
                 <button 
                   onClick={() => {
                     setSearchParams(prev => {
                       const next = new URLSearchParams(prev);
                       next.delete("diff");
                       next.delete("diffTaskId");
                       return next;
                     }, { replace: true });
                     onClose();
                   }}
                   className="p-1 -ml-1 text-slate-500 hover:text-slate-900 dark:hover:text-white shrink-0 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] rounded-md transition-colors"
                   title="Back / Close"
                 >
                   <ChevronLeft size={18} />
                 </button>
                 <input
                   type="checkbox"
                   checked={selectedForMerge.size === diffItems.length && diffItems.length > 0}
                   onChange={() => {
                     if (selectedForMerge.size === diffItems.length) {
                       setSelectedForMerge(new Set());
                     } else {
                       setSelectedForMerge(new Set(diffItems.map(i => i.id)));
                     }
                   }}
                   className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-600 bg-white dark:bg-black dark:border-slate-700 cursor-pointer"
                 />
                 <h3 className="text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 label-select-all truncate">Changed Tasks <span className="text-slate-500 font-normal">({diffItems.length})</span></h3>
               </div>
               <div className="flex items-center gap-x-2 sm:gap-x-2.5 gap-y-1 text-[10px] sm:text-[11px] shrink-0">
                  <div className="flex items-center gap-1 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> <span className="text-slate-600 dark:text-slate-400 leading-none pb-px">Added</span></div>
                  <div className="flex items-center gap-1 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> <span className="text-slate-600 dark:text-slate-400 leading-none pb-px">Modified</span></div>
                  <div className="flex items-center gap-1 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> <span className="text-slate-600 dark:text-slate-400 leading-none pb-px">Deleted</span></div>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto w-full">
              {diffItems.map(item => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedItemId(item.id);
                    setShowDetailMobile(true);
                    setSearchParams(prev => {
                      const next = new URLSearchParams(prev);
                      next.set("diff", "true");
                      next.set("diffTaskId", item.id);
                      return next;
                    }, { replace: true });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedItemId(item.id);
                      setShowDetailMobile(true);
                    }
                  }}
                  className={cn(
                    "w-full flex flex-col gap-1.5 px-3 sm:px-4 py-3 text-left transition-all outline-none border-b cursor-pointer select-none",
                    selectedItemId === item.id 
                      ? (item.status === 'added' ? "bg-emerald-50/80 dark:bg-emerald-900/15 border-b-emerald-200 dark:border-emerald-800/50"
                        : item.status === 'deleted' ? "bg-red-50/80 dark:bg-red-900/15 border-b-red-200 dark:border-red-800/50"
                        : "bg-blue-50/80 dark:bg-blue-900/15 border-b-blue-200 dark:border-blue-800/50")
                      : "border-b-slate-100 dark:border-b-[#1a1a1a] hover:bg-slate-50 dark:hover:bg-[#161616]"
                  )}
                >
                  {/* Top Row: Checkbox, Icon, Title, and Status Icon */}
                  <div className="w-full flex items-center gap-2.5">
                    <div 
                      className="shrink-0 flex items-center p-0.5 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedForMerge.has(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          const newSet = new Set(selectedForMerge);
                          if (newSet.has(item.id)) newSet.delete(item.id);
                          else newSet.add(item.id);
                          setSelectedForMerge(newSet);
                        }}
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-600 bg-white dark:bg-black dark:border-slate-700 cursor-pointer"
                      />
                    </div>
                    <div className="shrink-0 flex items-center">
                      {item.type === 'edge_function' 
                        ? <FileCode size={14} className={cn(selectedItemId === item.id ? "text-slate-600 dark:text-slate-300" : "text-slate-400")} /> 
                        : <Database size={14} className={cn(selectedItemId === item.id ? "text-slate-600 dark:text-slate-300" : "text-slate-400")} />}
                    </div>
                    <p className={cn(
                        "flex-1 text-xs sm:text-sm font-medium truncate",
                        selectedItemId === item.id
                          ? (item.status === 'added' ? "text-emerald-900 dark:text-emerald-100"
                            : item.status === 'deleted' ? "text-red-900 dark:text-red-100"
                            : "text-blue-900 dark:text-blue-100")
                          : "text-slate-900 dark:text-slate-100"
                    )}>{item.title}</p>
                    <div className="shrink-0 flex items-center">
                      {item.status === 'added' ? <Plus size={14} className={cn(selectedItemId === item.id ? "text-emerald-600" : "text-emerald-500")} /> :
                       item.status === 'deleted' ? <Trash2 size={14} className={cn(selectedItemId === item.id ? "text-red-600" : "text-red-500")} /> :
                       <Pencil size={14} className={cn(selectedItemId === item.id ? "text-blue-600" : "text-blue-500")} />}
                    </div>
                  </div>

                  {/* Bottom Row: Content / Description (Starts direct left under the checkbox and icon) */}
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 w-full min-w-0">
                     <p className="capitalize shrink-0">{item.type.replace('_', ' ')}</p>
                     {(item.additions > 0 || item.deletions > 0) && (
                       <div className="flex items-center gap-1.5 font-mono shrink-0">
                         {item.additions > 0 && <span className="text-emerald-600 dark:text-emerald-400">+{item.additions}</span>}
                         {item.deletions > 0 && <span className="text-red-600 dark:text-red-400">-{item.deletions}</span>}
                       </div>
                     )}

                     {/* Execution Status on Staging / Production */}
                     {item.stagingTask?.status && (
                       <>
                         <span className="text-slate-300 dark:text-slate-800 shrink-0">•</span>
                         <span className={cn(
                           "shrink-0 px-1 py-0.5 rounded text-[9px] font-medium leading-none tracking-wide uppercase",
                           item.stagingTask.status === 'ran' 
                             ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30" 
                             : item.stagingTask.status === 'error'
                             ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100/50 dark:border-red-900/30"
                             : "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30"
                         )}>
                           Staging: {item.stagingTask.status}
                         </span>
                       </>
                     )}

                     {/* Last Updated Timestamp */}
                     {(() => {
                       const ts = item.stagingTask?.updatedAt || item.prodTask?.updatedAt;
                       if (!ts) return null;
                       const formattedDate = new Date(ts).toLocaleDateString(undefined, { 
                         month: 'short', 
                         day: 'numeric', 
                         hour: '2-digit', 
                         minute: '2-digit',
                         hour12: false
                       });
                       return (
                         <>
                           <span className="text-slate-300 dark:text-slate-800 shrink-0">•</span>
                           <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-600">
                             {formattedDate}
                           </span>
                         </>
                       );
                     })()}

                     {/* Truncated Description */}
                     {(() => {
                       const desc = item.stagingTask?.description || item.prodTask?.description;
                       if (!desc) return null;
                       return (
                         <>
                           <span className="text-slate-300 dark:text-slate-800 shrink-0">•</span>
                           <span className="truncate flex-1 min-w-0 text-[10px] text-slate-400 dark:text-slate-600 italic" title={desc}>
                             {desc}
                           </span>
                         </>
                       );
                     })()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resize Handle */}
          <div
            ref={resizerHandleRef}
            className="hidden md:flex group w-3.5 absolute top-0 bottom-0 z-30 items-center justify-center -ml-[7px] select-none touch-none"
            style={{
              left: sidebarWidth,
              cursor: CUSTOM_COL_RESIZE_CURSOR,
            }}
            onPointerDown={handleResizePointerDown}
          >
            {/* Sleek Neutral Divider Line */}
            <div className="absolute inset-y-0 w-[1px] bg-slate-200 dark:bg-[#0a0a0a] group-hover:bg-slate-400 dark:group-hover:bg-zinc-600 group-active:bg-slate-500 dark:group-active:bg-zinc-500 transition-colors" />

            {/* Custom Visual Grab Handle Indicator */}
            <div className="relative z-10 w-3.5 h-7 rounded-full bg-white dark:bg-zinc-900 border border-slate-300/90 dark:border-zinc-700/90 shadow-sm flex items-center justify-center gap-[2px] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-150 pointer-events-none">
              <div className="w-[1.5px] h-3 bg-slate-400 dark:bg-zinc-500 rounded-full" />
              <div className="w-[1.5px] h-3 bg-slate-400 dark:bg-zinc-500 rounded-full" />
            </div>
          </div>

          {/* Main Area */}
          <div className={cn(
            "flex-1 flex-col bg-slate-50 dark:bg-[#0a0a0a] min-w-0 h-full w-full",
            !showDetailMobile ? "hidden md:flex" : "flex"
          )}>
            {selectedItem ? (
              <>
                <div className={cn(
                  "py-2 px-3 md:py-2.5 md:px-4 border-b shrink-0 sticky top-0 z-10 transition-colors duration-200",
                  selectedItem.status === 'added' ? "border-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 dark:border-emerald-700/50" :
                  selectedItem.status === 'deleted' ? "border-red-300 bg-red-100 dark:bg-red-900/40 dark:border-red-700/50" :
                  "border-blue-300 bg-blue-100 dark:bg-blue-900/40 dark:border-blue-700/50"
                )}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <button 
                        className="p-1 -ml-1 text-slate-500 hover:text-slate-900 dark:hover:text-white shrink-0 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-colors"
                        title="Back to Overview"
                        onClick={() => {
                          setShowDetailMobile(false);
                          setSelectedItemId(null);
                          setSearchParams(prev => {
                            const next = new URLSearchParams(prev);
                            next.set("diff", "true");
                            next.delete("diffTaskId");
                            return next;
                          }, { replace: true });
                        }}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <h3 className={cn(
                        "text-sm md:text-base font-bold flex items-center gap-2 truncate",
                        selectedItem.status === 'added' ? "text-emerald-900 dark:text-emerald-100" :
                        selectedItem.status === 'deleted' ? "text-red-900 dark:text-red-100" :
                        "text-blue-900 dark:text-blue-100"
                      )}>
                        <span className="truncate">{selectedItem.title}</span>
                      </h3>
                    </div>
                    {selectedItem?.type === 'edge_function' && (
                      <button 
                        onClick={() => setShowFileExplorer(!showFileExplorer)}
                        className={cn(
                          "flex items-center justify-center px-2 py-1.5 sm:px-3 sm:py-1.5 border text-[11px] sm:text-xs rounded-md font-medium transition-colors whitespace-nowrap shrink-0",
                          showFileExplorer 
                             ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700/50 text-emerald-800 dark:text-emerald-200" 
                             : "bg-white dark:bg-[#1a1a1a] border-slate-200 dark:border-[#2a2a2a] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222]"
                        )}
                        title={showFileExplorer ? "Hide Explorer" : "Show Explorer"}
                      >
                        <Columns size={14} className="mr-0 sm:mr-1.5" />
                        <span className="hidden sm:inline">Explorer</span>
                      </button>
                    )}
                  </div>
                  
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-black md:bg-white md:dark:bg-black min-h-0 relative flex flex-row">
                  {selectedItem?.type === 'edge_function' && showFileExplorer && (
                     <div className="w-40 md:w-48 lg:w-56 border-r border-slate-200 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#0a0a0a] flex flex-col shrink-0 overflow-y-auto">
                        <div className="p-2 sm:px-3 sm:py-2 border-b border-slate-200 dark:border-[#2a2a2a]/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 bg-slate-50/90 dark:bg-[#0a0a0a]/90 backdrop-blur-sm z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-1.5">
                           <span className="truncate">Explorer</span>
                           <span className="text-[9px] sm:text-[10px] bg-slate-200/70 dark:bg-[#222] text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full font-normal whitespace-nowrap self-start xl:self-auto">
                             {getEdgeFilesInfo().filter(f => f.status !== 'unchanged').length} changes
                           </span>
                        </div>
                        <div className="flex flex-col py-1">
                           {getEdgeFilesInfo().map(file => (
                              <button
                                 key={file.name}
                                 onClick={() => setSelectedTab(file.name)}
                                 className={cn(
                                    "flex items-center gap-2 py-1.5 px-3 text-sm cursor-pointer w-full text-left transition-colors relative",
                                    selectedTab === file.name 
                                       ? "bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 font-medium border-l-2"
                                       : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-300 border-l-2 border-transparent",
                                    file.status === 'added' ? 'border-l-emerald-500' :
                                    file.status === 'deleted' ? 'border-l-red-500' :
                                    file.status === 'modified' ? 'border-l-blue-500' : 'border-l-transparent'
                                 )}
                              >
                                 {file.name === 'secrets.json' ? <FileCode size={14} className="shrink-0 text-amber-500" /> : <FileCode size={14} className="shrink-0" />}
                                 <span className="flex-1 truncate">{file.name}</span>
                                 {file.status !== 'unchanged' && (
                                   <div className={cn(
                                     "w-1.5 h-1.5 rounded-full ml-1 shrink-0",
                                     file.status === 'added' && 'bg-emerald-500',
                                     file.status === 'deleted' && 'bg-red-500',
                                     file.status === 'modified' && 'bg-blue-500'
                                   )} />
                                 )}
                              </button>
                           ))}
                        </div>
                     </div>
                  )}
                  <div className="flex-1 relative overflow-hidden min-w-0">
                      <div className="absolute inset-0 flex flex-col bg-white dark:bg-[#0a0a0a]">
                        {/* Custom Header replacing leftTitle & rightTitle */}
                        <div className="flex w-full px-4 py-2 border-b border-slate-200 dark:border-[#1a1a1a] bg-slate-50 dark:bg-[#121212] shrink-0">
                          <div className="flex-1 font-bold text-slate-800 dark:text-slate-200 text-xs text-left">
                            {selectedItem.status !== 'added' && 'Production'}
                          </div>
                          <div className="flex-1 font-bold text-slate-800 dark:text-slate-200 text-xs text-left pl-4">
                            {selectedItem.status !== 'deleted' && 'Staging'}
                          </div>
                        </div>

                        {/* Monaco Diff Engine - Native Split pane, Sync Scroll, No wrap */}
                        <div className="flex-1 w-full relative min-h-0 diff-viewer-container">
                          <style>{`
                            .diff-viewer-container .monaco-editor,
                            .diff-viewer-container .monaco-editor .overflow-guard,
                            .diff-viewer-container .monaco-editor .monaco-scrollable-element,
                            .diff-viewer-container .monaco-editor .lines-content {
                              touch-action: pan-x pan-y !important;
                            }
                            .diff-viewer-container .monaco-editor textarea.inputarea {
                              inputmode: none !important;
                              -webkit-user-select: none !important;
                              user-select: none !important;
                              pointer-events: none !important;
                              opacity: 0 !important;
                            }
                            .diff-viewer-container .monaco-editor-overlaymessage,
                            .diff-viewer-container .monaco-editor .message-widget,
                            .diff-viewer-container .monaco-editor [class*="overlaymessage"],
                            .diff-viewer-container .monaco-editor [class*="message-widget"] {
                              display: none !important;
                              opacity: 0 !important;
                              pointer-events: none !important;
                              visibility: hidden !important;
                            }
                          `}</style>
                          <DiffEditor
                            height="100%"
                            loading={<DiffCodeSkeleton />}
                            language={
                              // Auto-detect language based on edge function extensions
                              selectedItem.type === 'edge_function' && selectedTab.endsWith('.ts') ? 'typescript' : 
                              selectedItem.type === 'edge_function' && selectedTab.endsWith('.json') ? 'json' : 'sql'
                            }
                            original={getOldValue() || ''}
                            modified={getNewValue() || ''}
                            theme={theme === 'dark' ? 'vs-dark' : 'light'}
                            options={{
                              wordWrap: 'off',          
                              renderSideBySide: true,
                              useInlineViewWhenSpaceIsLimited: false,
                              renderIndicators: false,
                              readOnly: true,
                              domReadOnly: true,
                              readOnlyMessage: { value: '' },
                              contextmenu: false,
                              quickSuggestions: false,
                              parameterHints: { enabled: false },
                              suggestOnTriggerCharacters: false,
                              acceptSuggestionOnEnter: 'off',
                              tabCompletion: 'off',
                              wordBasedSuggestions: 'off',
                              scrollBeyondLastLine: false,
                              minimap: { enabled: false }, 
                              renderMarginRevertIcon: false, 
                              scrollbar: {
                                horizontal: 'visible',
                                vertical: 'visible'
                              },
                              folding: false, // Hides folding column
                              glyphMargin: false, // Hides glyph column
                              lineDecorationsWidth: 6, // Clean spacing between line numbers and code
                              lineNumbersMinChars: 3, // Proper width for line numbers up to 3 digits
                            }}
                            onMount={(editor) => {
                              const original = editor.getOriginalEditor();
                              const modified = editor.getModifiedEditor();

                              const disableMobileKeyboard = (ed: any) => {
                                const domNode = ed.getDomNode();
                                if (!domNode) return;

                                // Capture phase listener to prevent focusin events
                                domNode.addEventListener('focusin', (e: Event) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (document.activeElement instanceof HTMLElement) {
                                    document.activeElement.blur();
                                  }
                                }, true);

                                const applyAttributes = () => {
                                  const textareas = domNode.querySelectorAll('textarea');
                                  textareas.forEach((ta: HTMLTextAreaElement) => {
                                    // Override focus method to prevent programmatic focus from opening keypad
                                    ta.focus = () => {};
                                    ta.blur();
                                    ta.disabled = true;
                                    ta.setAttribute('readonly', 'true');
                                    ta.setAttribute('inputmode', 'none');
                                    ta.setAttribute('tabindex', '-1');
                                    ta.setAttribute('aria-hidden', 'true');
                                  });
                                };

                                applyAttributes();

                                const observer = new MutationObserver(() => {
                                  applyAttributes();
                                });
                                observer.observe(domNode, { childList: true, subtree: true });
                              };

                              disableMobileKeyboard(original);
                              disableMobileKeyboard(modified);

                              original.updateOptions({ wordWrap: 'off' });
                              modified.updateOptions({ wordWrap: 'off' });

                              original.onDidScrollChange((e) => {
                                if (e.scrollLeftChanged) {
                                  modified.setScrollLeft(e.scrollLeft);
                                }
                              });
                              modified.onDidScrollChange((e) => {
                                if (e.scrollLeftChanged) {
                                  original.setScrollLeft(e.scrollLeft);
                                }
                              });
                            }}
                          />
                        </div>
                      </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-[#0a0a0a] select-none h-full w-full">
                <FileCode size={36} className="mb-3 text-slate-400 dark:text-zinc-500" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-1">No Task Selected</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-500 max-w-xs leading-relaxed">
                  Select a task from the sidebar list to compare the code differences between Production and Staging.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      {!loading && diffItems.length > 0 && (
        <div className="flex flex-row items-center justify-between px-2 sm:px-4 py-2 sm:py-3 bg-white dark:bg-[#0a0a0a] border-t border-slate-200 dark:border-[#1a1a1a] z-10 shrink-0 gap-2 mt-auto w-full pb-safe overflow-x-auto no-scrollbar">
          {/* Left Side: Always show Review Changes and change stats */}
          <div className="flex flex-row items-center gap-2 sm:gap-3 min-w-0">
            <h2 className="hidden lg:block text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight whitespace-nowrap">Review Changes</h2>
            <div className="flex items-center space-x-2 sm:space-x-3 text-[10px] sm:text-xs font-medium whitespace-nowrap">
               <span className="text-slate-500 dark:text-slate-400 font-semibold border-r border-slate-200 dark:border-slate-800 pr-2 sm:pr-3">{diffItems.length} <span className="md:hidden">Total</span></span>
               {diffItems.some(i => i.status === 'added') && <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500" /> {diffItems.filter(i => i.status === 'added').length} <span className="md:hidden">Added</span></span>}
               {diffItems.some(i => i.status === 'modified') && <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400"><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500" /> {diffItems.filter(i => i.status === 'modified').length} <span className="md:hidden">Modified</span></span>}
               {diffItems.some(i => i.status === 'deleted') && <span className="flex items-center gap-1 text-red-600 dark:text-red-400"><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500" /> {diffItems.filter(i => i.status === 'deleted').length} <span className="md:hidden">Deleted</span></span>}
            </div>
          </div>

          {/* Right Side: Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {selectedItem && (showDetailMobile || window.innerWidth >= 768) ? (
              // Single Task Action Buttons
              <>
                {showConfirmReject && (
                  <>
                    <button 
                      onClick={() => setShowConfirmReject(false)}
                      disabled={isMerging || isRejecting || loading}
                      className="flex items-center justify-center px-3 sm:px-4 py-1.5 border border-slate-200 dark:border-[#2a2a2a] text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 rounded-md font-medium hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        onReject([selectedItem], false);
                        setShowConfirmReject(false);
                      }}
                      disabled={isMerging || isRejecting || loading}
                      className="flex items-center justify-center px-4 sm:px-5 py-1.5 text-white bg-red-700 hover:bg-red-800 text-[11px] sm:text-xs rounded-md font-semibold transition-colors gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ring-2 ring-red-500 ring-offset-1 dark:ring-offset-black whitespace-nowrap"
                    >
                      {isRejecting ? (
                        <>
                          <Loader size={13} className="animate-spin shrink-0" />
                          Rejecting...
                        </>
                      ) : (
                        "Confirm Reject"
                      )}
                    </button>
                  </>
                )}

                {showConfirmMerge && (
                  <>
                    <button 
                      onClick={() => setShowConfirmMerge(false)}
                      disabled={isMerging || isRejecting || loading}
                      className="flex items-center justify-center px-3 sm:px-4 py-1.5 border border-slate-200 dark:border-[#2a2a2a] text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 rounded-md font-medium hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        onMerge([selectedItem], false);
                        setShowConfirmMerge(false);
                      }}
                      disabled={isMerging || isRejecting || loading}
                      className="flex items-center justify-center px-4 sm:px-5 py-1.5 text-white bg-emerald-700 hover:bg-emerald-800 text-[11px] sm:text-xs rounded-md font-semibold transition-colors gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-black whitespace-nowrap"
                    >
                      {isMerging ? (
                        <>
                          <Loader size={13} className="animate-spin shrink-0" />
                          Merging...
                        </>
                      ) : (
                        "Confirm Merge"
                      )}
                    </button>
                  </>
                )}

                {!showConfirmReject && !showConfirmMerge && (
                  <>
                    <button 
                      onClick={() => setShowConfirmReject(true)}
                      disabled={isMerging || isRejecting || loading}
                      className="flex items-center justify-center px-4 sm:px-5 py-1.5 text-white bg-red-600 hover:bg-red-700 text-[11px] sm:text-xs rounded-md font-medium transition-colors gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isRejecting ? (
                        <>
                          <Loader size={13} className="animate-spin shrink-0" />
                          Rejecting...
                        </>
                      ) : (
                        "Reject Task"
                      )}
                    </button>
                    <button 
                      onClick={() => setShowConfirmMerge(true)}
                      disabled={isMerging || isRejecting || loading}
                      className="flex items-center justify-center px-4 sm:px-5 py-1.5 text-white bg-emerald-600 hover:bg-emerald-700 text-[11px] sm:text-xs rounded-md font-medium transition-colors gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isMerging ? (
                        <>
                          <Loader size={13} className="animate-spin shrink-0" />
                          Merging...
                        </>
                      ) : (
                        <>
                          Merge Task
                          <ArrowRight size={14} className="ml-0.5 shrink-0 hidden sm:block" />
                        </>
                      )}
                    </button>
                  </>
                )}
              </>
            ) : (
              // Batch / All Tasks Action Buttons
              <>
                {showConfirmReject && (
                  <>
                    <button 
                      onClick={() => setShowConfirmReject(false)}
                      disabled={isMerging || isRejecting || loading}
                      className="flex items-center justify-center px-3 sm:px-4 py-1.5 border border-slate-200 dark:border-[#2a2a2a] text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 rounded-md font-medium hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        const selectedItems = diffItems.filter(i => selectedForMerge.has(i.id));
                        const isAll = selectedForMerge.size === diffItems.length;
                        onReject(selectedItems, isAll);
                        setShowConfirmReject(false);
                      }}
                      disabled={isMerging || isRejecting || loading || diffItems.length === 0 || selectedForMerge.size === 0}
                      className="flex items-center justify-center px-4 sm:px-5 py-1.5 text-white bg-red-700 hover:bg-red-800 text-[11px] sm:text-xs rounded-md font-semibold transition-colors gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ring-2 ring-red-500 ring-offset-1 dark:ring-offset-black whitespace-nowrap"
                    >
                      {isRejecting ? (
                        <>
                          <Loader size={13} className="animate-spin shrink-0" />
                          Rejecting...
                        </>
                      ) : (
                        `Confirm Reject ${selectedForMerge.size > 0 && selectedForMerge.size !== diffItems.length ? `(${selectedForMerge.size})` : ""}`
                      )}
                    </button>
                  </>
                )}

                {showConfirmMerge && (
                  <>
                    <button 
                      onClick={() => setShowConfirmMerge(false)}
                      disabled={isMerging || isRejecting || loading}
                      className="flex items-center justify-center px-3 sm:px-4 py-1.5 border border-slate-200 dark:border-[#2a2a2a] text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 rounded-md font-medium hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        const selectedItems = diffItems.filter(i => selectedForMerge.has(i.id));
                        const isAll = selectedForMerge.size === diffItems.length;
                        onMerge(selectedItems, isAll);
                        setShowConfirmMerge(false);
                      }}
                      disabled={isMerging || isRejecting || loading || diffItems.length === 0 || selectedForMerge.size === 0}
                      className="flex items-center justify-center px-4 sm:px-5 py-1.5 text-white bg-emerald-700 hover:bg-emerald-800 text-[11px] sm:text-xs rounded-md font-semibold transition-colors gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-black whitespace-nowrap"
                    >
                      {isMerging ? (
                        <>
                          <Loader size={13} className="animate-spin shrink-0" />
                          Merging...
                        </>
                      ) : (
                        `Confirm Merge ${selectedForMerge.size > 0 && selectedForMerge.size !== diffItems.length ? `(${selectedForMerge.size})` : ""}`
                      )}
                    </button>
                  </>
                )}

                {!showConfirmReject && !showConfirmMerge && (
                  <>
                    <button 
                      onClick={() => setShowConfirmReject(true)}
                      disabled={isMerging || isRejecting || loading || diffItems.length === 0 || selectedForMerge.size === 0}
                      className="flex items-center justify-center px-4 sm:px-5 py-1.5 text-white bg-red-600 hover:bg-red-700 text-[11px] sm:text-xs rounded-md font-medium transition-colors gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isRejecting ? (
                        <>
                          <Loader size={13} className="animate-spin shrink-0" />
                          Rejecting...
                        </>
                      ) : (
                        <>Reject {selectedForMerge.size > 0 && selectedForMerge.size !== diffItems.length ? `(${selectedForMerge.size}) ` : ""}</>
                      )}
                    </button>
                    <button 
                      onClick={() => setShowConfirmMerge(true)}
                      disabled={isMerging || isRejecting || loading || diffItems.length === 0 || selectedForMerge.size === 0}
                      className="flex items-center justify-center px-4 sm:px-5 py-1.5 text-white bg-emerald-600 hover:bg-emerald-700 text-[11px] sm:text-xs rounded-md font-medium transition-colors gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isMerging ? (
                        <>
                          <Loader size={13} className="animate-spin shrink-0" />
                          Merging...
                        </>
                      ) : (
                        <>
                          Merge {selectedForMerge.size > 0 && selectedForMerge.size !== diffItems.length ? `(${selectedForMerge.size}) ` : ""}
                          <span className="hidden md:inline">to Production</span>
                          <ArrowRight size={14} className="ml-0.5 shrink-0 hidden sm:block" />
                        </>
                      )}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
