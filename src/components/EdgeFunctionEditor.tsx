import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Key,
  FileCode,
  Check,
  Copy,
  Pencil,
  X,
  MoreVertical,
  Globe,
  Terminal,
  FileText,
  Eye,
  Code,
  Code2,
  Columns,
  Braces,
  Palette,
  RotateCw,
  Loader,
  ChevronsRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { SqlTask, EdgeFile, EdgeSecret } from "../types";
import { cn } from "../lib/utils";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useHybridState } from "../hooks/useHybridState";
import { DebouncedCodeEditor, DebouncedTitleInput } from "./SharedUI";

const CUSTOM_COL_RESIZE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M8 9L5 12L8 15V9Z' fill='%230f172a'/%3E%3Cpath d='M16 9L19 12L16 15V9Z' fill='%230f172a'/%3E%3Cline x1='12' y1='6' x2='12' y2='18' stroke='%230f172a' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 12 12, col-resize`;

const HtmlLivePreview = ({
  code,
  reloadKey,
  isReloading,
  onLoaded,
}: {
  code: string;
  reloadKey: number;
  isReloading?: boolean;
  onLoaded?: () => void;
}) => {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const scrollPosRef = React.useRef({ x: 0, y: 0 });

  // Save scroll position before layout changes or unmounts
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const saveScroll = () => {
      try {
        if (iframe.contentWindow) {
          scrollPosRef.current = { x: iframe.contentWindow.scrollX, y: iframe.contentWindow.scrollY };
        }
      } catch (e) {
        // cross-origin access can be blocked, ignore
      }
    };

    // Save scroll frequently in case of user interaction before re-render
    const interval = setInterval(saveScroll, 500);
    return () => clearInterval(interval);
  }, []);

  // Restore scroll position after load
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.scrollTo(scrollPosRef.current.x, scrollPosRef.current.y);
        }
      } catch (e) {
        console.warn("Could not restore iframe scroll position", e);
      }
      onLoaded?.();
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [code, reloadKey, onLoaded]);

  const htmlCode = code || "<html><body></body></html>";

  // Inject a small script to make sure external links load in the iframe, 
  // and relative links don't break the srcdoc if possible
  const scriptToInject = `<script>
    document.addEventListener('click', function(e) {
      const a = e.target.closest('a');
      if (a && a.getAttribute('href')) {
        const href = a.getAttribute('href');
        if (!href || href === '#' || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
           a.target = '_blank';
        } else {
           e.preventDefault();
           window.parent.postMessage({ type: 'OPEN_FILE', file: href }, '*');
        }
      }
    });
    document.addEventListener('submit', function(e) {
      const form = e.target;
      if (form) {
        const action = form.getAttribute('action');
        if (action && !action.startsWith('http://') && !action.startsWith('https://') && !action.startsWith('//') && !action.startsWith('#') && !action.startsWith('javascript:')) {
          e.preventDefault();
          window.parent.postMessage({ type: 'OPEN_FILE', file: action }, '*');
        }
      }
    });
  </script>`;

  const injectedCode = htmlCode.includes('</body>') 
    ? htmlCode.replace('</body>', scriptToInject + '</body>') 
    : htmlCode + scriptToInject;

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden bg-white dark:bg-black">
      <iframe
        key={`iframe-${reloadKey}`}
        ref={iframeRef}
        title="HTML Preview"
        srcDoc={injectedCode}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        onLoad={onLoaded}
        className="w-full h-full border-none bg-transparent block bg-white"
      />
      <AnimatePresence>
        {isReloading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/40 dark:bg-black/60 backdrop-blur-[2px] select-none"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2.5 text-white drop-shadow-md select-none"
            >
              <Loader size={22} className="animate-spin text-teal-400 shrink-0" />
              <span className="text-sm font-medium tracking-wide text-white drop-shadow">
                Reloading...
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface EdgeFunctionEditorProps {
  task: SqlTask;
  changedFiles?: string[];
  hasSecretsChanged?: boolean;
  onUpdate: (updates: Partial<SqlTask>) => void;
}

export default function EdgeFunctionEditor({
  task,
  changedFiles = [],
  hasSecretsChanged = false,
  onUpdate,
}: EdgeFunctionEditorProps) {
  const edgeFiles = task.edgeFiles || [];
  const edgeSecrets = task.edgeSecrets || [];

  const [activeFileName, setActiveFileName] = useHybridState<string>(
    "edge-active-file", edgeFiles[0]?.name || ""
  );
  const [activeTab, setActiveTab] = useHybridState<"files" | "secrets">("edge-active-tab", "files");
  const [copied, setCopied] = useState(false);
  const [htmlViewMode, setHtmlViewMode] = useHybridState<"edit" | "split" | "preview">("edge-html-mode", "edit");
  const [htmlReloadKey, setHtmlReloadKey] = useState<number>(0);
  const [isHtmlFabOpen, setIsHtmlFabOpen] = useState<boolean>(false);
  const [realtimeCode, setRealtimeCode] = useState<string>("");
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("edgeHtmlFabPosition");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isDraggingFab, setIsDraggingFab] = useState<boolean>(false);
  const fabContainerRef = React.useRef<HTMLDivElement>(null);
  const isDraggingFabRef = React.useRef<boolean>(false);
  const rafFabIdRef = React.useRef<number | null>(null);
  const nextFabPosRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartFabRef = React.useRef<{
    startX: number;
    startY: number;
    fabStartX: number;
    fabStartY: number;
    hasMoved: boolean;
  }>({ startX: 0, startY: 0, fabStartX: 0, fabStartY: 0, hasMoved: false });

  const reloadTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleReload = () => {
    if (isReloading) return;
    if (navigator.vibrate) navigator.vibrate(20);
    setIsReloading(true);
    setHtmlReloadKey((prev) => prev + 1);

    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    // 500ms delay synced with preview overlay backdrop and rotating loader
    reloadTimerRef.current = setTimeout(() => {
      setIsReloading(false);
      toast.success("Live preview reloaded successfully", {
        id: "html-preview-reload",
        duration: 2000,
      });
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      if (rafFabIdRef.current !== null) cancelAnimationFrame(rafFabIdRef.current);
    };
  }, []);

  // Bounds checking on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const clampBounds = () => {
      setFabPos((prev) => {
        if (!prev) return prev;
        const rect = container.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return prev;
        const maxX = Math.max(16, rect.width - 56 - 16);
        const maxY = Math.max(16, rect.height - 56 - 16);
        const clampedX = Math.max(16, Math.min(maxX, prev.x));
        const clampedY = Math.max(16, Math.min(maxY, prev.y));
        if (clampedX !== prev.x || clampedY !== prev.y) {
          return { x: clampedX, y: clampedY };
        }
        return prev;
      });
    };

    window.addEventListener("resize", clampBounds);
    const observer = new ResizeObserver(clampBounds);
    observer.observe(container);

    return () => {
      window.removeEventListener("resize", clampBounds);
      observer.disconnect();
    };
  }, []);

  // Ultra-smooth Hardware-Accelerated RAF Drag handlers for FAB (max device FPS: 60/90/120/144Hz+)
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;

    const container = containerRef.current;
    const fabEl = fabContainerRef.current;
    if (!container || !fabEl) return;

    const containerRect = container.getBoundingClientRect();
    const fabRect = fabEl.getBoundingClientRect();

    const currentX = fabRect.left - containerRect.left;
    const currentY = fabRect.top - containerRect.top;

    dragStartFabRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      fabStartX: currentX,
      fabStartY: currentY,
      hasMoved: false,
    };
    nextFabPosRef.current = { x: currentX, y: currentY };
    isDraggingFabRef.current = false;

    // Cache boundary values for the duration of the drag to eliminate layout recalculations
    const maxX = Math.max(16, containerRect.width - 56 - 16);
    const maxY = Math.max(16, containerRect.height - 56 - 16);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - dragStartFabRef.current.startX;
      const dy = moveEvent.clientY - dragStartFabRef.current.startY;

      if (!dragStartFabRef.current.hasMoved) {
        if (Math.hypot(dx, dy) > 3) {
          dragStartFabRef.current.hasMoved = true;
          isDraggingFabRef.current = true;
          setIsDraggingFab(true);
          setIsHtmlFabOpen(false); // Close speed dial during dragging
        } else {
          return;
        }
      }

      let nextX = dragStartFabRef.current.fabStartX + dx;
      let nextY = dragStartFabRef.current.fabStartY + dy;

      nextX = Math.max(16, Math.min(maxX, nextX));
      nextY = Math.max(16, Math.min(maxY, nextY));

      nextFabPosRef.current = { x: nextX, y: nextY };

      // Direct GPU transform update on RAF without triggering React component re-renders
      if (rafFabIdRef.current === null) {
        rafFabIdRef.current = requestAnimationFrame(() => {
          if (fabContainerRef.current) {
            fabContainerRef.current.style.left = `${nextFabPosRef.current.x}px`;
            fabContainerRef.current.style.top = `${nextFabPosRef.current.y}px`;
            fabContainerRef.current.style.right = "auto";
            fabContainerRef.current.style.bottom = "auto";
          }
          rafFabIdRef.current = null;
        });
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      if (rafFabIdRef.current !== null) {
        cancelAnimationFrame(rafFabIdRef.current);
        rafFabIdRef.current = null;
      }

      try {
        if (e.currentTarget.hasPointerCapture(upEvent.pointerId)) {
          e.currentTarget.releasePointerCapture(upEvent.pointerId);
        }
      } catch {
        // ignore
      }

      if (isDraggingFabRef.current) {
        const finalX = nextFabPosRef.current.x;
        const finalY = nextFabPosRef.current.y;
        setFabPos({ x: finalX, y: finalY });
        try {
          localStorage.setItem("edgeHtmlFabPosition", JSON.stringify({ x: finalX, y: finalY }));
        } catch {
          // ignore
        }

        setTimeout(() => {
          isDraggingFabRef.current = false;
          setIsDraggingFab(false);
          dragStartFabRef.current.hasMoved = false;
        }, 80);
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const handleFabClick = () => {
    if (dragStartFabRef.current.hasMoved || isDraggingFabRef.current) return;
    if (navigator.vibrate) navigator.vibrate(20);
    setIsHtmlFabOpen((prev) => !prev);
  };

  const getLayoutOrientation = () => {
    const container = containerRef.current;
    if (!container) {
      return { expandDirection: "up" as const, badgeSide: "left" as const };
    }
    const containerRect = container.getBoundingClientRect();

    const curX = fabPos ? fabPos.x : containerRect.width - 56 - 24;
    const curY = fabPos ? fabPos.y : containerRect.height - 56 - 24;

    const expandDirection = curY < 210 || curY < containerRect.height * 0.35 ? ("down" as const) : ("up" as const);
    const badgeSide = curX < 190 || curX < containerRect.width * 0.35 ? ("right" as const) : ("left" as const);

    return { expandDirection, badgeSide };
  };

  useEffect(() => {
    setIsHtmlFabOpen(false);
  }, [activeFileName]);

  useEffect(() => {
    const activeCurrentFile = edgeFiles.find((f) => f.name === activeFileName);
    if (activeCurrentFile) {
      setRealtimeCode(activeCurrentFile.code);
    } else {
      setRealtimeCode("");
    }
  }, [activeFileName, edgeFiles]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'OPEN_FILE' && typeof e.data.file === 'string') {
        let targetFile = e.data.file.trim();
        // Clean up relative path markers
        if (targetFile.startsWith('/')) targetFile = targetFile.slice(1);
        if (targetFile.startsWith('./')) targetFile = targetFile.slice(2);
        
        // Strip query params and hashes if any
        targetFile = targetFile.split('?')[0].split('#')[0];
        
        if (!targetFile || targetFile === '#' || targetFile.startsWith('javascript:')) return;
        if (targetFile === activeFileName) return;

        if (edgeFiles.some((f) => f.name === targetFile)) {
          setActiveFileName(targetFile);
          setActiveTab("files");
        } else if (edgeFiles.some((f) => f.name === targetFile + ".html")) {
          setActiveFileName(targetFile + ".html");
          setActiveTab("files");
        } else {
          console.warn("File from link not found in editor:", targetFile);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [edgeFiles, activeFileName, setActiveFileName]);

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'html':
      case 'htm':
        return <Globe size={14} className="text-orange-500" />;
      case 'css':
        return <Palette size={14} className="text-blue-400" />;
      case 'js':
      case 'mjs':
      case 'cjs':
        return <Code size={14} className="text-yellow-500" />;
      case 'ts':
        return <FileCode size={14} className="text-sky-400" />;
      case 'tsx':
        return <FileCode size={14} className="text-teal-400" />;
      case 'py':
        return <Terminal size={14} className="text-emerald-500" />;
      case 'json':
        return <Braces size={14} className="text-purple-400" />;
      case 'md':
        return <FileText size={14} className="text-indigo-400" />;
      default:
        return <FileCode size={14} className="text-slate-400" />;
    }
  };

  const [isTabsDropdownOpen, setIsTabsDropdownOpen] = useState(false);
  const [tabsDropdownRect, setTabsDropdownRect] = useState<{ left: number; right: number; top: number; bottom: number; width: number; height: number } | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState("");

  const [sidebarWidth, setSidebarWidth] = useLocalStorage("edgeSidebarWidth", 0);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const resizerHandleRef = React.useRef<HTMLDivElement>(null);
  const isResizingRef = React.useRef(false);
  const rafResizeIdRef = React.useRef<number | null>(null);
  const nextSidebarWidthRef = React.useRef<number>(0);

  useEffect(() => {
    // If not set yet, set to 40% on initial mount or when layout is ready
    const handleInitialLayout = () => {
      if (sidebarWidth === 0 && containerRef.current && containerRef.current.clientWidth > 0) {
        setSidebarWidth(containerRef.current.clientWidth * 0.4);
      }
    };
    
    // Check immediately
    handleInitialLayout();
    
    // Check after a brief delay for any layout shifts
    const timer = setTimeout(handleInitialLayout, 100);
    return () => clearTimeout(timer);
  }, [sidebarWidth, setSidebarWidth]);

  useEffect(() => {
    return () => {
      if (rafResizeIdRef.current !== null) cancelAnimationFrame(rafResizeIdRef.current);
    };
  }, []);

  // Butter-smooth Hardware-Accelerated RAF Drag to resize sidebar (No mouse lock, no hover triggers)
  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    e.stopPropagation();

    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const minWidth = 140;
    const maxWidth = Math.max(minWidth, containerRect.width - 160);

    isResizingRef.current = true;
    setIsResizing(true);
    const initialWidth = sidebarWidth || containerRect.width * 0.4;
    nextSidebarWidthRef.current = initialWidth;

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

  // Context menu handling
  const [menuFileId, setMenuFileId] = useState<string | null>(null);
  const [menuButtonRect, setMenuButtonRect] = useState<{ left: number; right: number; top: number; bottom: number; width: number; height: number } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(
    null,
  );

  const startLongPress = (id: string) => {
    const timer = setTimeout(() => {
      setMenuFileId(id);
    }, 500);
    setLongPressTimer(timer);
  };

  const cancelLongPress = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
  };

  const activeFile = edgeFiles.find((f) => f.name === activeFileName);

  useEffect(() => {
    // Fallback if the active string refers to a deleted file
    if (!activeFile && activeFileName && edgeFiles.length > 0) {
      setActiveFileName(edgeFiles[0].name);
    }
  }, [activeFile, activeFileName, edgeFiles, setActiveFileName]);

  const handleAddFile = () => {
    const newId = crypto.randomUUID();
    const newName = `file_${edgeFiles.length + 1}.ts`;
    const newFile: EdgeFile = {
      id: newId,
      name: newName,
      code: "",
    };
    onUpdate({ edgeFiles: [...edgeFiles, newFile] });
    setActiveFileName(newName);
    setEditingFileId(newId);
    setEditingFileName(newName);
  };

  const handleUpdateFileCode = (code: string) => {
    if (!activeFileName) return;
    const newFiles = edgeFiles.map((f) =>
      f.name === activeFileName ? { ...f, code } : f,
    );
    onUpdate({ edgeFiles: newFiles });
  };

  const handleDeleteFile = (idOrName: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFiles = edgeFiles.filter((f) => (f.id || f.name) !== idOrName && f.name !== name);
    onUpdate({ edgeFiles: newFiles });
    if (activeFileName === name) {
      setActiveFileName(newFiles[0]?.name || null);
    }
  };

  const handleStartRenameFile = (file: EdgeFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFileId(file.id || file.name);
    setEditingFileName(file.name);
  };

  const handleSaveRenameFile = () => {
    if (editingFileId && editingFileName.trim()) {
      const newFiles = edgeFiles.map((f) =>
        (f.id || f.name) === editingFileId ? { ...f, name: editingFileName.trim() } : f,
      );
      onUpdate({ edgeFiles: newFiles });
    }
    setEditingFileId(null);
  };

  const handleAddSecret = () => {
    const newSecret: EdgeSecret = {
      id: crypto.randomUUID(),
      key: "",
      value: "",
    };
    onUpdate({ edgeSecrets: [...edgeSecrets, newSecret] });
  };

  const handleUpdateSecret = (id: string, updates: Partial<EdgeSecret>) => {
    const newSecrets = edgeSecrets.map((s) =>
      s.id === id ? { ...s, ...updates } : s,
    );
    onUpdate({ edgeSecrets: newSecrets });
  };

  const handleDeleteSecret = (id: string) => {
    onUpdate({ edgeSecrets: edgeSecrets.filter((s) => s.id !== id) });
  };

  const handleCopyCode = async () => {
    if (activeFile) {
      try {
        await navigator.clipboard.writeText(activeFile.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy", err);
      }
    }
  };

  return (
    <div
      className="flex h-full w-full bg-white dark:bg-black relative flex-row transition-colors overflow-hidden"
      ref={containerRef}
    >
      {/* Sidebar for Files and Secrets */}
      <div
        ref={sidebarRef}
        className="border-r border-slate-200 dark:border-[#0a0a0a] flex flex-col bg-slate-50 dark:bg-[#0a0a0a] relative shrink-0 z-10 transition-colors"
        style={{ width: sidebarWidth ? `${sidebarWidth}px` : "40%" }}
      >
        <div className="flex border-b border-slate-200 dark:border-[#0a0a0a] transition-colors relative">
          {(() => {
            const isCompactTabs = sidebarWidth > 0 && sidebarWidth <= 160;
            const tabs = [
              { id: "files", label: "Files", hasChanges: changedFiles.length > 0 },
              { id: "secrets", label: "Secrets", hasChanges: hasSecretsChanged }
            ];
            
            if (isCompactTabs) {
              const activeTabData = tabs.find(t => t.id === activeTab);
              return (
                <div className="flex w-full">
                  <div className="flex-1 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 py-2 text-xs font-medium text-center relative px-2 flex justify-center items-center min-w-0">
                    <span className="truncate">{activeTabData?.label}</span>
                    {activeTabData?.hasChanges && (
                      <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      setTabsDropdownRect({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
                      setIsTabsDropdownOpen(true);
                    }}
                    className="px-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center justify-center relative shrink-0"
                  >
                    <ChevronsRight size={14} />
                    {tabs.some(t => t.id !== activeTab && t.hasChanges) && (
                      <span className="absolute top-2 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                    )}
                  </button>
                </div>
              );
            }

            return (
              <>
                <button
                  onClick={() => setActiveTab("files")}
                  className={cn(
                    "flex-1 py-2 text-xs font-medium text-center border-b-2 transition-colors relative min-w-0 truncate px-1",
                    activeTab === "files"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
                  )}
                >
                  Files
                  {changedFiles.length > 0 && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("secrets")}
                  className={cn(
                    "flex-1 py-2 text-xs font-medium text-center border-b-2 transition-colors relative min-w-0 truncate px-1",
                    activeTab === "secrets"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
                  )}
                >
                  Secrets
                  {hasSecretsChanged && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                </button>
              </>
            );
          })()}
        </div>

        {activeTab === "files" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-[#2a2a2a]/50 transition-colors">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate mr-2 min-w-0">
                Explorer
              </span>
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  onClick={handleAddFile}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 ml-1 transition-colors"
                  title="New File"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-1 relative">
              {edgeFiles.map((file, idx) => (
                <div
                  key={file.id ? `${file.id}-${idx}` : `file_${idx}`}
                  onClick={() => {
                    setActiveFileName(file.name);
                    setMenuFileId(null);
                  }}
                  onPointerDown={() => startLongPress(file.id || file.name)}
                  onPointerUp={cancelLongPress}
                  onPointerLeave={cancelLongPress}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuButtonRect({ left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY, width: 0, height: 0 });
                    setMenuFileId(file.id || file.name);
                  }}
                  className={cn(
                    "flex items-center gap-2 py-1.5 px-3 text-sm cursor-pointer group relative transition-colors min-w-0 w-full",
                    activeFileName === file.name
                      ? "bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-300",
                  )}
                >
                  <span className="shrink-0 flex items-center justify-center w-4 h-4">
                    {getFileIcon(file.name)}
                  </span>

                  {editingFileId === (file.id || file.name) ? (
                    <input
                      type="text"
                      className="flex-1 w-12 min-w-0 bg-white dark:bg-[#0a0a0a] border border-blue-400 dark:border-slate-600 rounded px-1 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors cursor-text"
                      value={editingFileName}
                      onChange={(e) => setEditingFileName(e.target.value)}
                      onBlur={() => {
                        handleSaveRenameFile();
                        setMenuFileId(null);
                      }}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSaveRenameFile()
                      }
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <span className="flex-1 min-w-0 flex items-center justify-between">
                      <span className="truncate pr-2 select-none" title={file.name}>{file.name}</span>
                      {changedFiles.includes(file.name) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mr-1" />
                      )}
                    </span>
                  )}

                  {!editingFileId && (
                    <div className="items-center gap-1 shrink-0 flex transition-opacity">
                      <button
                        className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          const r = e.currentTarget.getBoundingClientRect();
                          setMenuButtonRect({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
                          setMenuFileId(
                            menuFileId === (file.id || file.name) ? null : (file.id || file.name),
                          );
                        }}
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {edgeFiles.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-4">
                  No files
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "secrets" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-[#2a2a2a]/50 transition-colors">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate mr-2 min-w-0">
                Environment Vars
              </span>
              <button
                onClick={handleAddSecret}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors shrink-0"
                title="Add Secret"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {edgeSecrets.map((secret, idx) => (
                <div
                  key={secret.id ? `${secret.id}-${idx}` : `secret_${idx}`}
                  className="bg-white dark:bg-[#121212] rounded p-2 border border-slate-200 dark:border-[#2a2a2a] relative group transition-colors shadow-none"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Key size={12} className="text-emerald-500 dark:text-amber-400" />
                    <button
                      onClick={() => handleDeleteSecret(secret.id)}
                      className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <DebouncedTitleInput
                    placeholder="KEY_NAME"
                    value={secret.key}
                    onChange={(newVal) =>
                      handleUpdateSecret(secret.id, { key: newVal })
                    }
                    className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#2a2a2a] rounded px-2 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-blue-500 mb-2 font-mono uppercase transition-colors"
                  />
                  <DebouncedTitleInput
                    placeholder="Value (e.g. sk_live_...)"
                    value={secret.value}
                    onChange={(newVal) =>
                      handleUpdateSecret(secret.id, { value: newVal })
                    }
                    className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#2a2a2a] rounded px-2 py-1 text-xs text-slate-900 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-blue-500 font-mono transition-colors"
                  />
                </div>
              ))}
              {edgeSecrets.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-4">
                  No secrets defined
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resizing Shield Overlay (Active during dragging to prevent losing pointer over iframes or Monaco editor) */}
      {isResizing && (
        <div
          className="fixed inset-0 z-[100] select-none pointer-events-auto"
          style={{ cursor: CUSTOM_COL_RESIZE_CURSOR }}
        />
      )}

      {/* Modern Custom-Cursor Resize Handle (No blue highlight, butter-smooth drag) */}
      <div
        ref={resizerHandleRef}
        className="group w-3.5 absolute top-0 bottom-0 z-20 flex items-center justify-center -ml-[7px] select-none touch-none"
        style={{
          left: sidebarWidth ? `${sidebarWidth}px` : "40%",
          cursor: CUSTOM_COL_RESIZE_CURSOR,
        }}
        onPointerDown={handleResizePointerDown}
      >
        {/* Sleek Neutral Divider Line (No blue highlight) */}
        <div className="absolute inset-y-0 w-[1px] bg-slate-200 dark:bg-zinc-800 group-hover:bg-slate-400 dark:group-hover:bg-zinc-600 group-active:bg-slate-500 dark:group-active:bg-zinc-500 transition-colors" />

        {/* Custom Visual Grab Handle Indicator (Sleek pill with dual vertical grip bars) */}
        <div className="relative z-10 w-3.5 h-7 rounded-full bg-white dark:bg-zinc-900 border border-slate-300/90 dark:border-zinc-700/90 shadow-sm flex items-center justify-center gap-[2px] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-150 pointer-events-none">
          <div className="w-[1.5px] h-3 bg-slate-400 dark:bg-zinc-500 rounded-full" />
          <div className="w-[1.5px] h-3 bg-slate-400 dark:bg-zinc-500 rounded-full" />
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-black transition-colors relative">
        {activeFile ? (
          <>
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-[#0a0a0a] border-b border-slate-200 dark:border-[#0a0a0a] transition-colors w-full min-w-0">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm font-mono leading-none min-w-0 mr-2 flex-1">
                <div className="shrink-0 flex items-center justify-center">
                  {getFileIcon(activeFile.name)}
                </div>
                <span className="truncate" title={activeFile.name}>{activeFile.name}</span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors px-2 py-1 text-xs rounded bg-slate-200 dark:bg-slate-800 border border-transparent hover:bg-slate-300 dark:hover:bg-slate-700 shadow-none shrink-0"
                >
                  {copied ? (
                    <Check size={14} className="text-emerald-500 dark:text-emerald-400" />
                  ) : (
                    <Copy size={14} />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            
            {(activeFile.name.endsWith(".html") || activeFile.name.endsWith(".htm")) && htmlViewMode === "preview" ? (
              <div className="flex-1 bg-white dark:bg-black relative">
                <HtmlLivePreview
                  code={realtimeCode || activeFile.code}
                  reloadKey={htmlReloadKey}
                  isReloading={isReloading}
                />
              </div>
            ) : (activeFile.name.endsWith(".html") || activeFile.name.endsWith(".htm")) && htmlViewMode === "split" ? (
              <div className="flex-1 flex overflow-hidden flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
                <div className="flex-1 overflow-auto relative min-w-0 bg-white dark:bg-black text-slate-800 dark:text-slate-300">
                  <DebouncedCodeEditor
                    value={activeFile.code}
                    onChange={handleUpdateFileCode}
                    onRealtimeChange={setRealtimeCode}
                    taskType="edge_function"
                    fileName={activeFile.name}
                  />
                </div>
                <div className="flex-1 overflow-hidden relative bg-white dark:bg-black">
                  <HtmlLivePreview
                    code={realtimeCode || activeFile.code}
                    reloadKey={htmlReloadKey}
                    isReloading={isReloading}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto relative min-w-0 bg-white dark:bg-black text-slate-800 dark:text-slate-300">
                <DebouncedCodeEditor
                  value={activeFile.code}
                  onChange={handleUpdateFileCode}
                  onRealtimeChange={setRealtimeCode}
                  taskType="edge_function"
                  fileName={activeFile.name}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-500">
            <FileCode size={48} className="opacity-20 mb-4" />
            <p className="text-sm">No file selected.</p>
            <button
              onClick={handleAddFile}
              className="mt-4 text-xs font-medium text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 underline"
            >
              Create one
            </button>
          </div>
        )}
      </div>

      {/* HTML View FAB Speed Dial (Floating Action Button) */}
      {activeFile && (activeFile.name.endsWith(".html") || activeFile.name.endsWith(".htm")) && (() => {
        const { expandDirection, badgeSide } = getLayoutOrientation();
        const isExpandUp = expandDirection === "up";
        const badgeClass = cn(
          "absolute px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900/90 dark:bg-zinc-900/95 text-white border border-slate-700/50 dark:border-zinc-800 shadow-md backdrop-blur-sm pointer-events-none select-none whitespace-nowrap flex items-center gap-1.5",
          badgeSide === "left" ? "right-full mr-3" : "left-full ml-3"
        );

        return (
          <>
            {/* Drag shield to capture pointer events over iframes without interruption */}
            {isDraggingFab && (
              <div
                className="fixed inset-0 z-[60] cursor-grabbing select-none bg-transparent"
                style={{ touchAction: "none" }}
              />
            )}

            {/* Backdrop for FAB Speed Dial */}
            <AnimatePresence>
              {isHtmlFabOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="fixed inset-0 z-40 bg-black/25 dark:bg-black/55 backdrop-blur-[1px]"
                  onClick={() => setIsHtmlFabOpen(false)}
                />
              )}
            </AnimatePresence>

            {/* FAB Speed Dial Stack with dynamic adaptive orientation & drag */}
            <div
              ref={fabContainerRef}
              style={
                fabPos
                  ? { left: `${fabPos.x}px`, top: `${fabPos.y}px` }
                  : { right: "1.5rem", bottom: "1.5rem" }
              }
              className={cn(
                "absolute z-50 pointer-events-none w-14 h-14",
                isDraggingFab ? "transition-none select-none" : "transition-all duration-75"
              )}
            >
              {/* Main Primary HTML View FAB Button */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-20">
                <button
                  onPointerDown={handlePointerDown}
                  onClick={handleFabClick}
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-all focus:outline-none shadow-lg active:scale-95 touch-none select-none",
                    isDraggingFab ? "cursor-grabbing scale-105 shadow-2xl ring-2 ring-teal-500/50" : "cursor-grab",
                    isHtmlFabOpen
                      ? "bg-slate-900 dark:bg-zinc-800 text-teal-400 border border-teal-500/40 ring-2 ring-teal-500/30"
                      : htmlViewMode === "preview"
                        ? "bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white"
                        : htmlViewMode === "split"
                          ? "bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white"
                          : "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white"
                  )}
                  title={
                    isHtmlFabOpen
                      ? "Close View Modes"
                      : "Drag to move • Click for HTML View modes"
                  }
                >
                  <div className="relative w-6 h-6 flex items-center justify-center pointer-events-none">
                    <div
                      className={cn(
                        "transition-all duration-300 ease-out flex items-center justify-center",
                        isHtmlFabOpen
                          ? "rotate-180 opacity-0 scale-50 pointer-events-none absolute"
                          : "rotate-0 opacity-100 scale-100"
                      )}
                    >
                      {htmlViewMode === "preview" ? (
                        <Eye size={24} />
                      ) : htmlViewMode === "split" ? (
                        <Columns size={24} />
                      ) : (
                        <Code2 size={24} />
                      )}
                    </div>
                    <X
                      size={24}
                      className={cn(
                        "transition-all duration-300 ease-out",
                        isHtmlFabOpen
                          ? "rotate-0 opacity-100 scale-100 text-teal-400"
                          : "-rotate-180 opacity-0 scale-50 pointer-events-none absolute"
                      )}
                    />
                  </div>
                </button>
              </div>

              {/* Quick Reload Companion FAB Button */}
              <AnimatePresence>
                {!isHtmlFabOpen && (htmlViewMode === "split" || htmlViewMode === "preview") && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "absolute left-[4px] w-12 h-12 flex items-center justify-center pointer-events-auto z-10",
                      isExpandUp ? "bottom-[66px]" : "top-[66px]"
                    )}
                  >
                    <button
                      onClick={handleReload}
                      disabled={isReloading}
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer border focus:outline-none shadow-md bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 dark:hover:bg-zinc-700 text-teal-400 border-teal-500/30 dark:border-teal-500/40 disabled:opacity-80"
                      title={isReloading ? "Reloading..." : "Reload Live Preview"}
                    >
                      {isReloading ? (
                        <Loader size={19} className="animate-spin text-teal-400" />
                      ) : (
                        <RotateCw size={19} className="active:rotate-180 transition-transform duration-300 text-teal-400" />
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* HTML View Modes Speed Dial Animated Options */}
              <AnimatePresence>
                {isHtmlFabOpen && (
                  <>
                    {/* 1. Code View Button */}
                    <motion.div
                      initial={{ opacity: 0, y: isExpandUp ? 15 : -15, scale: 0.6 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: isExpandUp ? 10 : -10, scale: 0.6 }}
                      transition={{ type: "spring", stiffness: 450, damping: 25, delay: 0.03 }}
                      className={cn(
                        "absolute left-0 w-14 h-11 flex items-center justify-center pointer-events-auto z-10",
                        isExpandUp ? "bottom-[68px]" : "top-[68px]"
                      )}
                    >
                      <span className={badgeClass}>
                        <span>Code Editor</span>
                        {htmlViewMode === "edit" && (
                          <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">(Active)</span>
                        )}
                      </span>
                      <button
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate(20);
                          setHtmlViewMode("edit");
                          setIsHtmlFabOpen(false);
                        }}
                        className={cn(
                          "w-11 h-11 rounded-full text-white flex items-center justify-center transition-all cursor-pointer focus:outline-none shadow-md active:scale-95",
                          htmlViewMode === "edit"
                            ? "bg-blue-600 ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900"
                            : "bg-blue-600 hover:bg-blue-500"
                        )}
                        title="Code View"
                      >
                        <Code2 size={19} />
                      </button>
                    </motion.div>

                    {/* 2. Split View Button */}
                    <motion.div
                      initial={{ opacity: 0, y: isExpandUp ? 15 : -15, scale: 0.6 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: isExpandUp ? 10 : -10, scale: 0.6 }}
                      transition={{ type: "spring", stiffness: 450, damping: 25, delay: 0.06 }}
                      className={cn(
                        "absolute left-0 w-14 h-11 flex items-center justify-center pointer-events-auto z-10",
                        isExpandUp ? "bottom-[124px]" : "top-[124px]"
                      )}
                    >
                      <span className={badgeClass}>
                        <span>Split View</span>
                        {htmlViewMode === "split" && (
                          <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider">(Active)</span>
                        )}
                      </span>
                      <button
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate(20);
                          setHtmlViewMode("split");
                          setIsHtmlFabOpen(false);
                        }}
                        className={cn(
                          "w-11 h-11 rounded-full text-white flex items-center justify-center transition-all cursor-pointer focus:outline-none shadow-md active:scale-95",
                          htmlViewMode === "split"
                            ? "bg-indigo-600 ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900"
                            : "bg-indigo-600 hover:bg-indigo-500"
                        )}
                        title="Split View"
                      >
                        <Columns size={19} />
                      </button>
                    </motion.div>

                    {/* 3. Live Preview Button */}
                    <motion.div
                      initial={{ opacity: 0, y: isExpandUp ? 15 : -15, scale: 0.6 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: isExpandUp ? 10 : -10, scale: 0.6 }}
                      transition={{ type: "spring", stiffness: 450, damping: 25, delay: 0.09 }}
                      className={cn(
                        "absolute left-0 w-14 h-11 flex items-center justify-center pointer-events-auto z-10",
                        isExpandUp ? "bottom-[180px]" : "top-[180px]"
                      )}
                    >
                      <span className={badgeClass}>
                        <span>Live Preview</span>
                        {htmlViewMode === "preview" && (
                          <span className="text-teal-400 text-[10px] font-bold uppercase tracking-wider">(Active)</span>
                        )}
                      </span>
                      <button
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate(20);
                          setHtmlViewMode("preview");
                          setIsHtmlFabOpen(false);
                        }}
                        className={cn(
                          "w-11 h-11 rounded-full text-white flex items-center justify-center transition-all cursor-pointer focus:outline-none shadow-md active:scale-95",
                          htmlViewMode === "preview"
                            ? "bg-teal-600 ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-900"
                            : "bg-teal-600 hover:bg-teal-500"
                        )}
                        title="Live Preview"
                      >
                        <Eye size={19} />
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </>
        );
      })()}

      {isTabsDropdownOpen && tabsDropdownRect && (() => {
        const tabs = [
          { id: "files", label: "Files", hasChanges: changedFiles.length > 0 },
          { id: "secrets", label: "Secrets", hasChanges: hasSecretsChanged }
        ];

        const popoverWidth = 128; // w-32
        let left = tabsDropdownRect.left + tabsDropdownRect.width - popoverWidth;
        if (left < 8) left = 8;
        
        let top = tabsDropdownRect.bottom + 2;

        return (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsTabsDropdownOpen(false)} 
          >
            <div
              className="fixed z-[100] w-32 bg-white dark:bg-[#121212] border border-slate-200 dark:border-slate-600 rounded-md shadow-none py-1 text-slate-700 dark:text-slate-200 transition-colors"
              style={{ top, left }}
              onClick={(e) => e.stopPropagation()}
            >
              {tabs.filter(t => t.id !== activeTab).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setIsTabsDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between relative z-10"
                >
                  {tab.label}
                  {tab.hasChanges && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 ml-2" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {menuFileId && menuButtonRect && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuFileId(null)} onContextMenu={(e) => { e.preventDefault(); setMenuFileId(null); }}>
          {(() => {
            const file = edgeFiles.find((f) => (f.id || f.name) === menuFileId);
            if (!file) return null;
            
            const popoverWidth = 128; // w-32
            let left = menuButtonRect.left;
            if (left + popoverWidth > window.innerWidth) {
              left = window.innerWidth - popoverWidth - 8;
            }
            if (left < 8) left = 8;
            
            let arrowLeft = menuButtonRect.left + (menuButtonRect.width / 2) - left - 5;
            if (arrowLeft < 8) arrowLeft = 8;
            if (arrowLeft > popoverWidth - 16) arrowLeft = popoverWidth - 16;

            let top = menuButtonRect.bottom + 6;
            let isFlipped = false;
            // Flip to top if tooltip doesn't fit on bottom and there is space above
            if (top + 80 > window.innerHeight && menuButtonRect.top - 80 > 0) {
              top = menuButtonRect.top - 80;
              isFlipped = true;
            }

            return (
              <div
                className="fixed z-[100] w-32 bg-white dark:bg-[#121212] border border-slate-200 dark:border-slate-600 rounded-md shadow-none py-1 text-slate-700 dark:text-slate-200 transition-colors"
                style={{ top, left }}
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className={cn(
                    "absolute w-2.5 h-2.5 bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-600",
                    isFlipped ? "border-b border-r bottom-[-6px]" : "border-t border-l top-[-6px]"
                  )}
                  style={{ left: arrowLeft, transform: 'rotate(45deg)', borderRadius: '1px' }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartRenameFile(file, e);
                    setMenuFileId(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors relative z-10"
                >
                  <Pencil size={12} /> Rename
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(file.id || file.name, file.name, e);
                    setMenuFileId(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 dark:hover:bg-slate-700 text-red-600 dark:text-red-400 flex items-center gap-2 transition-colors relative z-10"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
