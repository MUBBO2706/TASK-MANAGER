import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { 
  Terminal, 
  Search, 
  Trash2, 
  Download, 
  RefreshCw, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  AlertCircle, 
  CheckCircle2, 
  Radio, 
  Filter,
  Layers,
  ArrowUpDown,
  History,
  Loader
} from "lucide-react";
import { ApiLog } from "../../types";
import { ApiLogDetail } from "./ApiLogDetail";
import { ApiLogsSkeleton, ApiLogsDetailSkeleton } from "./ApiLogsSkeleton";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";
import { useLocalStorage } from "../../hooks/useLocalStorage";

const CUSTOM_COL_RESIZE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M8 9L5 12L8 15V9Z' fill='%230f172a'/%3E%3Cpath d='M16 9L19 12L16 15V9Z' fill='%230f172a'/%3E%3Cline x1='12' y1='6' x2='12' y2='18' stroke='%230f172a' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 12 12, col-resize`;

interface ApiLogsPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiLogsPage({ isOpen, onClose }: ApiLogsPageProps) {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Log & Lazy Loading Details Cache
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [loadedDetails, setLoadedDetails] = useState<Record<string, ApiLog>>({});
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showDetailMobile, setShowDetailMobile] = useState(false);

  // Confirmation Modals
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Search & Filter controls
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useLocalStorage<string>("api-logs-filter-method", "ALL");
  const [statusFilter, setStatusFilter] = useLocalStorage<string>("api-logs-filter-status", "ALL");

  // Sidebar Drag-to-Resize State
  const [sidebarWidth, setSidebarWidth] = useLocalStorage<number>("api-logs-sidebar-width", 380);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const nextSidebarWidthRef = useRef<number>(sidebarWidth);
  const rafResizeIdRef = useRef<number | null>(null);

  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch initial batch of lightweight logs
  const fetchLogs = useCallback(async (reset = true) => {
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const currentOffset = reset ? 0 : logs.length;
      const limit = 30;

      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(currentOffset),
        method: methodFilter,
        status: statusFilter.toLowerCase(),
      });
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      // Mark request with in-app header so this query itself is never logged
      const res = await fetch(`/api/logs?${params.toString()}`, {
        headers: { "x-in-app": "true" }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.logs) {
          const mapped: ApiLog[] = data.logs.map((d: any) => ({
            id: d.id,
            createdAt: Number(d.created_at || d.createdAt) || Date.now(),
            endpoint: d.endpoint,
            method: d.method,
            statusCode: Number(d.status_code || d.statusCode) || 200,
            durationMs: Number(d.duration_ms || d.durationMs) || 0,
            projectId: d.project_id || d.projectId,
            actionType: d.action_type || d.actionType,
            ipAddress: d.ip_address || d.ipAddress,
            userAgent: d.user_agent || d.userAgent,
            errorMessage: d.error_message || d.errorMessage,
            changesSummary: typeof d.changes_summary === "string" ? JSON.parse(d.changes_summary) : (d.changes_summary || d.changesSummary)
          }));

          setLogs((prev) => (reset ? mapped : [...prev, ...mapped]));
          setHasMore(Boolean(data.hasMore));
          setTotalCount(data.total || (reset ? mapped.length : logs.length + mapped.length));
        }
      }
    } catch (e) {
      console.warn("Failed to fetch API logs:", e);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [logs.length, methodFilter, statusFilter, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs(true);
    }
  }, [isOpen, methodFilter, statusFilter]);

  // Load complete single log details on-demand (lazy payload loading)
  const loadLogDetail = async (logId: string) => {
    if (loadedDetails[logId]) {
      return loadedDetails[logId];
    }

    setIsDetailLoading(true);
    try {
      const res = await fetch(`/api/logs/${logId}`, {
        headers: { "x-in-app": "true" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.log) {
          const d = data.log;
          const fullLog: ApiLog = {
            id: d.id,
            createdAt: Number(d.created_at || d.createdAt) || Date.now(),
            endpoint: d.endpoint,
            method: d.method,
            statusCode: Number(d.status_code || d.statusCode) || 200,
            durationMs: Number(d.duration_ms || d.durationMs) || 0,
            projectId: d.project_id || d.projectId,
            actionType: d.action_type || d.actionType,
            ipAddress: d.ip_address || d.ipAddress,
            userAgent: d.user_agent || d.userAgent,
            requestQuery: typeof d.request_query === "string" ? JSON.parse(d.request_query) : (d.request_query || d.requestQuery),
            requestBody: typeof d.request_body === "string" ? JSON.parse(d.request_body) : (d.request_body || d.requestBody),
            responseBody: typeof d.response_body === "string" ? JSON.parse(d.response_body) : (d.response_body || d.responseBody),
            errorMessage: d.error_message || d.errorMessage,
            changesSummary: typeof d.changes_summary === "string" ? JSON.parse(d.changes_summary) : (d.changes_summary || d.changesSummary)
          };

          setLoadedDetails((prev) => ({ ...prev, [logId]: fullLog }));
          return fullLog;
        }
      }
    } catch (e) {
      console.warn("Failed to lazy load log detail:", e);
    } finally {
      setIsDetailLoading(false);
    }
    return null;
  };

  const handleSelectLog = async (log: ApiLog) => {
    setSelectedLogId(log.id);
    if (!isDesktop) {
      setShowDetailMobile(true);
    }
    if (!loadedDetails[log.id] && !log.requestBody) {
      await loadLogDetail(log.id);
    }
  };

  // Realtime Supabase Subscription for new external API calls
  useEffect(() => {
    if (!isOpen || !supabase) return;

    let channel: any = null;
    try {
      channel = supabase
        .channel("api-logs-realtime-feed")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "api_logs" },
          (payload: any) => {
            if (payload.eventType === "INSERT") {
              const d = payload.new as any;
              const newLog: ApiLog = {
                id: d.id,
                createdAt: Number(d.created_at) || Date.now(),
                endpoint: d.endpoint,
                method: d.method,
                statusCode: Number(d.status_code) || 200,
                durationMs: Number(d.duration_ms) || 0,
                projectId: d.project_id,
                actionType: d.action_type,
                ipAddress: d.ip_address,
                userAgent: d.user_agent,
                errorMessage: d.error_message,
                changesSummary: typeof d.changes_summary === "string" ? JSON.parse(d.changes_summary) : d.changes_summary
              };
              setLogs((prev) => [newLog, ...prev.filter((l) => l.id !== newLog.id)].slice(0, 300));
              setTotalCount((prev) => prev + 1);
            } else if (payload.eventType === "DELETE") {
              setLogs((prev) => prev.filter((l) => l.id !== payload.old?.id));
              setTotalCount((prev) => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe();
    } catch (_) {}

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [isOpen]);

  // Keyboard shortcut: Escape to close or back
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showClearConfirmModal) {
          setShowClearConfirmModal(false);
        } else if (showDetailMobile) {
          setShowDetailMobile(false);
          setSelectedLogId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showClearConfirmModal, showDetailMobile, onClose]);

  // Clear all logs
  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      await fetch("/api/logs", {
        method: "DELETE",
        headers: { "x-in-app": "true" }
      });
      if (supabase) {
        await supabase.from("api_logs").delete().neq("id", "placeholder_impossible");
      }
      setLogs([]);
      setLoadedDetails({});
      setSelectedLogId(null);
      setTotalCount(0);
      setShowClearConfirmModal(false);
    } catch (e) {
      console.error("Failed to clear logs:", e);
    } finally {
      setIsClearing(false);
    }
  };

  // Export logs as JSON file
  const handleExportLogs = async () => {
    const jsonBlob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(jsonBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `external-api-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Smooth Resizer pointer events
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
    } catch (_) {}

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, moveEvent.clientX - containerRect.left));
      nextSidebarWidthRef.current = newWidth;

      if (rafResizeIdRef.current === null) {
        rafResizeIdRef.current = requestAnimationFrame(() => {
          if (sidebarRef.current) {
            sidebarRef.current.style.width = `${nextSidebarWidthRef.current}px`;
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
      } catch (_) {}

      isResizingRef.current = false;
      setIsResizing(false);
      const finalWidth = nextSidebarWidthRef.current;
      setSidebarWidth(finalWidth);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  // Metrics computation
  const metrics = useMemo(() => {
    if (logs.length === 0) return { total: 0, successRate: "100%", errors: 0, avgLatency: 0 };
    const total = logs.length;
    const errors = logs.filter((l) => l.statusCode >= 400).length;
    const successes = total - errors;
    const successRate = `${Math.round((successes / total) * 100)}%`;
    const totalLatency = logs.reduce((acc, curr) => acc + (curr.durationMs || 0), 0);
    const avgLatency = Math.round(totalLatency / total);
    return { total, successRate, errors, avgLatency };
  }, [logs]);

  const selectedLog = useMemo(() => {
    if (!selectedLogId) return null;
    return loadedDetails[selectedLogId] || logs.find((l) => l.id === selectedLogId) || null;
  }, [logs, selectedLogId, loadedDetails]);

  if (!isOpen) return null;

  // Show exact skeleton loader on initial loading
  if (isLoading && logs.length === 0) {
    return (
      <ApiLogsSkeleton
        sidebarWidth={sidebarWidth}
        onClose={onClose}
        isMobileDetail={!isDesktop && showDetailMobile}
      />
    );
  }

  const getMethodBadgeColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "POST":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      case "GET":
        return "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30";
      case "DELETE":
        return "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
      case "PUT":
      case "PATCH":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30";
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Math.max(0, Date.now() - timestamp);
    const secs = Math.floor(diff / 1000);
    if (secs < 5) return "Just now";
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[1000] flex flex-col bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 font-sans overflow-hidden select-none"
    >
      {/* Resizing Overlay */}
      {isResizing && (
        <div
          className="fixed inset-0 z-[100] select-none pointer-events-auto"
          style={{ cursor: CUSTOM_COL_RESIZE_CURSOR }}
        />
      )}

      {/* Top Header Navigation Bar */}
      <header className="flex-shrink-0 h-12 px-3 sm:px-4 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between gap-2 z-20">
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white bg-transparent border border-slate-200 dark:border-zinc-800 rounded-md hover:bg-slate-100/70 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <ChevronLeft size={14} className="shrink-0" />
            <span className="hidden sm:inline">Back to Workspace</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Terminal size={15} className="stroke-[2.2]" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
                External API Logs
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Stream
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Metrics Pills (Desktop) */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100/70 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 text-[11px]">
            <span className="text-slate-500 dark:text-zinc-400">Total:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{totalCount}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100/70 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 text-[11px]">
            <span className="text-slate-500 dark:text-zinc-400">Success:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{metrics.successRate}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100/70 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 text-[11px]">
            <span className="text-slate-500 dark:text-zinc-400">Errors:</span>
            <span className={cn("font-mono font-bold", metrics.errors > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white")}>
              {metrics.errors}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100/70 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 text-[11px]">
            <Zap size={11} className="text-amber-500" />
            <span className="text-slate-500 dark:text-zinc-400">Avg:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{metrics.avgLatency}ms</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => fetchLogs(true)}
            disabled={isLoading}
            className="p-1.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-md border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Refresh Logs"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </button>

          <button
            type="button"
            onClick={handleExportLogs}
            disabled={logs.length === 0}
            className="p-1.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-md border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors disabled:opacity-40 cursor-pointer hidden sm:inline-flex"
            title="Export JSON"
          >
            <Download size={13} />
          </button>

          <button
            type="button"
            onClick={() => setShowClearConfirmModal(true)}
            disabled={logs.length === 0}
            className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 rounded-md border border-slate-200 dark:border-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-40 cursor-pointer"
            title="Clear Logs"
          >
            <Trash2 size={13} />
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* Main Two-Pane Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar Pane: Request Stream & Filters */}
        <div
          ref={sidebarRef}
          style={{ width: isDesktop ? `${sidebarWidth}px` : "100%" }}
          className={cn(
            "flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 flex-shrink-0 z-10 overflow-hidden",
            !isDesktop && showDetailMobile ? "hidden" : "flex"
          )}
        >
          {/* Search bar & filter controls */}
          <div className="p-2.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/80 space-y-2">
            {/* Search Input */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Filter by path, action, error..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchLogs(true);
                }}
                className="w-full pl-8 pr-7 py-1 text-xs rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Filter Pills: Method & Status */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5 text-[10.5px]">
              {/* Method Selectors */}
              <div className="flex items-center gap-1">
                {["ALL", "POST", "GET", "DELETE"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethodFilter(m)}
                    className={cn(
                      "px-1.5 py-0.5 rounded font-mono font-medium transition-colors cursor-pointer",
                      methodFilter === m
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold"
                        : "bg-slate-200/60 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Status Selectors */}
              <div className="flex items-center gap-1">
                {[
                  { id: "ALL", label: "All" },
                  { id: "SUCCESS", label: "2xx" },
                  { id: "ERROR", label: "4xx/5xx" }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatusFilter(s.id)}
                    className={cn(
                      "px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer",
                      statusFilter === s.id
                        ? "bg-emerald-600 text-white font-bold"
                        : "bg-slate-200/60 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Log Stream List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-900/80">
            {logs.length === 0 ? (
              <div className="p-8 text-center">
                <Terminal size={32} className="text-slate-300 dark:text-zinc-700 mx-auto mb-2 opacity-50 stroke-[1.5]" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300">No External API Logs Found</h4>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  Only incoming requests from external servers, cURL scripts, AI Agents, or Postman are recorded here.
                </p>
              </div>
            ) : (
              <>
                {logs.map((log) => {
                  const isSelected = selectedLogId === log.id;
                  const isSuccess = log.statusCode >= 200 && log.statusCode < 300;

                  return (
                    <div
                      key={log.id}
                      onClick={() => handleSelectLog(log)}
                      className={cn(
                        "p-2.5 sm:p-3 cursor-pointer transition-all text-left flex flex-col gap-1",
                        isSelected
                          ? "bg-emerald-500/10 dark:bg-emerald-500/15 border-l-3 border-emerald-500"
                          : "hover:bg-slate-50 dark:hover:bg-zinc-900/60 border-l-3 border-transparent"
                      )}
                    >
                      {/* Top row: Method pill, status, latency, time */}
                      <div className="flex items-center justify-between gap-1.5 text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={cn(
                              "px-1.5 py-0.2 text-[9.5px] font-mono font-bold uppercase rounded border",
                              getMethodBadgeColor(log.method)
                            )}
                          >
                            {log.method}
                          </span>

                          <span
                            className={cn(
                              "px-1.5 py-0.2 text-[9.5px] font-mono font-semibold rounded border",
                              isSuccess
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                            )}
                          >
                            {log.statusCode}
                          </span>

                          <span className="text-slate-400 dark:text-zinc-500 font-mono text-[10px]">
                            {log.durationMs}ms
                          </span>
                        </div>

                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                          {formatRelativeTime(log.createdAt)}
                        </span>
                      </div>

                      {/* Middle row: Endpoint URL */}
                      <div className="font-mono text-xs text-slate-800 dark:text-zinc-200 font-medium truncate">
                        {log.endpoint}
                      </div>

                      {/* Bottom row: Action type & summary if available */}
                      <div className="flex items-center justify-between text-[10.5px] text-slate-500 dark:text-zinc-400">
                        <span className="truncate max-w-[200px]">
                          {log.actionType ? (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 font-mono text-[10px]">
                              {log.actionType}
                            </span>
                          ) : log.projectId ? (
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                              {log.projectId.slice(0, 10)}...
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 italic">
                              External Call
                            </span>
                          )}
                        </span>

                        {log.errorMessage && (
                          <span className="text-[10px] text-rose-500 font-medium truncate max-w-[120px]">
                            Error
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Load More Button for On-Demand Lazy Batching */}
                {hasMore && (
                  <div className="p-3 text-center bg-slate-50/50 dark:bg-zinc-950">
                    <button
                      type="button"
                      onClick={() => fetchLogs(false)}
                      disabled={isLoadingMore}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white border border-slate-200 dark:border-zinc-800 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader size={12} className="animate-spin" />
                          <span>Loading More Logs...</span>
                        </>
                      ) : (
                        <span>Load More Logs</span>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Resizer Divider Bar (Desktop) */}
        {isDesktop && (
          <div
            onPointerDown={handleResizePointerDown}
            className="w-1.5 hover:w-2 bg-slate-200/80 dark:bg-zinc-800/80 hover:bg-emerald-500 dark:hover:bg-emerald-500 cursor-col-resize flex-shrink-0 transition-all z-20 flex items-center justify-center touch-none select-none"
          >
            <div className="w-0.5 h-6 bg-slate-400 dark:bg-zinc-600 rounded-full" />
          </div>
        )}

        {/* Right Detail Pane */}
        <div
          className={cn(
            "flex-1 flex flex-col h-full bg-slate-50 dark:bg-black min-w-0 overflow-hidden",
            !isDesktop && !showDetailMobile ? "hidden" : "flex"
          )}
        >
          {isDetailLoading && !selectedLog?.requestBody ? (
            <ApiLogsDetailSkeleton
              isMobile={!isDesktop}
              onBack={() => {
                setShowDetailMobile(false);
                setSelectedLogId(null);
              }}
            />
          ) : selectedLog ? (
            <ApiLogDetail
              log={selectedLog}
              onBack={() => {
                setShowDetailMobile(false);
                setSelectedLogId(null);
              }}
              isMobile={!isDesktop}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
              <Terminal size={40} className="text-slate-400 dark:text-zinc-600 mb-3 opacity-40 stroke-[1.5]" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-tight">
                No External API Request Selected
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mt-1.5 leading-relaxed">
                Select any API call from the real-time stream to inspect its full request payload, response output, client metadata, and state modifications.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Clear Logs Confirmation Modal */}
      {showClearConfirmModal && (
        <div
          className="fixed inset-0 bg-black/60 dark:bg-black/75 z-[10010] flex items-center justify-center p-3 backdrop-blur-xs"
          onClick={() => setShowClearConfirmModal(false)}
        >
          <div
            className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Clear All External API Activity Logs?
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  This will permanently delete all recorded external API call records and payloads.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-900">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-transparent border border-slate-200 dark:border-zinc-800 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearLogs}
                disabled={isClearing}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {isClearing ? "Clearing..." : "Yes, Clear All Logs"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
