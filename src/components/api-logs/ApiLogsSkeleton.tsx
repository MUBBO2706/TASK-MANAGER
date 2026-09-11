import React from "react";
import { 
  Terminal, 
  ChevronLeft, 
  Zap, 
  Download, 
  Trash2, 
  RotateCw, 
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Globe,
  FileCode2,
  Server,
  Cpu
} from "lucide-react";
import { cn } from "../../lib/utils";

export interface ApiLogsSkeletonProps {
  sidebarWidth?: number;
  onSidebarWidthChange?: (width: number) => void;
  onClose?: () => void;
  selectedLogId?: string | null;
  isMobileDetail?: boolean;
  activeTab?: "payload" | "response" | "details" | "changes";
}

export const ApiLogsTimelineSkeleton = () => {
  return (
    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-900/80 p-0">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
        <div key={item} className="p-2.5 sm:p-3 select-none flex flex-col gap-1 animate-pulse text-left">
          {/* Top row: Method pill + Status code + Latency + Relative Time */}
          <div className="flex items-center justify-between gap-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="h-4 w-10 bg-slate-200 dark:bg-zinc-800 rounded border border-slate-300/40 dark:border-zinc-700/40 shrink-0" />
              <div className="h-4 w-8 bg-emerald-500/10 dark:bg-emerald-500/15 rounded border border-emerald-500/20 shrink-0" />
              <div className="h-3 w-8 bg-slate-100 dark:bg-zinc-800/60 rounded shrink-0" />
            </div>
            <div className="h-3 w-10 bg-slate-100 dark:bg-zinc-800/60 rounded shrink-0" />
          </div>

          {/* Endpoint line */}
          <div className="mt-0.5">
            <div
              className="h-3.5 bg-slate-200 dark:bg-zinc-800 rounded"
              style={{ width: `${60 + (item % 4) * 10}%` }}
            />
          </div>

          {/* Bottom row: Action badge or Project ID */}
          <div className="flex items-center justify-between text-[10.5px] pt-0.5">
            <div className="h-3 w-20 bg-slate-100 dark:bg-zinc-800/60 rounded" />
            {item % 3 === 0 && <div className="h-3 w-10 bg-rose-200/50 dark:bg-rose-900/40 rounded" />}
          </div>
        </div>
      ))}
    </div>
  );
};

export const ApiLogsDetailSkeleton = ({
  isMobile = false,
  onBack,
  onClose,
  activeTab = "payload",
}: {
  isMobile?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  activeTab?: "payload" | "response" | "details" | "changes";
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-black overflow-hidden select-none animate-pulse">
      {/* Detail Header Skeleton */}
      {isMobile ? (
        <div className="flex-shrink-0 h-12 px-3 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between gap-2 z-20">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <div className="h-5 w-5 bg-slate-200 dark:bg-zinc-800 rounded shrink-0" />
            )}
            <div className="h-4 w-24 bg-slate-200 dark:bg-zinc-800 rounded shrink-0" />
          </div>
          <div className="h-3.5 w-24 bg-slate-100 dark:bg-zinc-800/60 rounded shrink-0" />
        </div>
      ) : (
        <div className="flex-shrink-0 p-3 sm:p-4 border-b border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
              {onBack && (
                <div className="h-5 w-5 bg-slate-200 dark:bg-zinc-800 rounded shrink-0 mr-1" />
              )}
              <div className="h-5 w-12 bg-slate-200 dark:bg-zinc-800 rounded border border-slate-300/40 dark:border-zinc-700/40" />
              <div className="h-5 w-10 bg-emerald-500/10 dark:bg-emerald-500/15 rounded border border-emerald-500/20" />
              <div className="h-5 w-14 bg-slate-100 dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800" />
              <div className="h-3.5 w-24 bg-slate-100 dark:bg-zinc-800/50 rounded hidden sm:block" />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="h-6 w-20 bg-slate-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-6 w-7 bg-slate-200 dark:bg-zinc-800 rounded-md" />
            </div>
          </div>

          {/* Endpoint path and Action side-by-side skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-7 flex-1 bg-slate-100/70 dark:bg-zinc-900/80 rounded-md border border-slate-200/80 dark:border-zinc-800/80" />
            <div className="h-7 w-32 bg-slate-100/70 dark:bg-zinc-900/80 rounded-md border border-slate-200/80 dark:border-zinc-800/80 shrink-0" />
          </div>
        </div>
      )}

      {/* Mobile-Only Compact Overview Skeleton */}
      {isMobile && (
        <div className="flex-shrink-0 px-3 py-2 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 space-y-1.5">
          {/* Row 1: Method, Status, Duration & Copy */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="h-5 w-12 bg-slate-200 dark:bg-zinc-800 rounded border border-slate-300/40 dark:border-zinc-700/40 shrink-0" />
              <div className="h-5 w-16 bg-emerald-500/10 dark:bg-emerald-500/15 rounded border border-emerald-500/20 shrink-0" />
              <div className="h-5 w-12 bg-slate-100 dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800 shrink-0" />
            </div>
            <div className="h-6 w-16 bg-slate-200 dark:bg-zinc-800 rounded-md shrink-0" />
          </div>
          {/* Row 2: Endpoint Path */}
          <div className="h-3.5 w-4/5 bg-slate-100 dark:bg-zinc-900 rounded" />
          {/* Row 3: Action & Project */}
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-20 bg-slate-100 dark:bg-zinc-900 rounded border border-slate-200/50 dark:border-zinc-800/50" />
            <div className="h-4 w-24 bg-slate-100 dark:bg-zinc-900 rounded border border-slate-200/50 dark:border-zinc-800/50" />
          </div>
        </div>
      )}

      {/* Navigation Tabs Skeleton */}
      <div className="flex-shrink-0 flex items-center gap-1 px-2.5 sm:px-4 py-1.5 bg-slate-100/80 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800">
        <div
          className={cn(
            "h-7 px-3 rounded-lg flex items-center justify-center transition-all",
            activeTab === "payload"
              ? "w-26 bg-white dark:bg-zinc-800 shadow-2xs border border-slate-200/80 dark:border-zinc-700"
              : "w-24 bg-slate-200/50 dark:bg-zinc-900"
          )}
        >
          <div className="h-3 w-16 bg-slate-200 dark:bg-zinc-700 rounded" />
        </div>
        <div
          className={cn(
            "h-7 px-3 rounded-lg flex items-center justify-center transition-all",
            activeTab === "response"
              ? "w-28 bg-white dark:bg-zinc-800 shadow-2xs border border-slate-200/80 dark:border-zinc-700"
              : "w-26 bg-slate-200/50 dark:bg-zinc-900"
          )}
        >
          <div className="h-3 w-18 bg-slate-200 dark:bg-zinc-700 rounded" />
        </div>
        <div
          className={cn(
            "h-7 px-3 rounded-lg flex items-center justify-center transition-all",
            activeTab === "details"
              ? "w-32 bg-white dark:bg-zinc-800 shadow-2xs border border-slate-200/80 dark:border-zinc-700"
              : "w-28 bg-slate-200/50 dark:bg-zinc-900"
          )}
        >
          <div className="h-3 w-22 bg-slate-200 dark:bg-zinc-700 rounded" />
        </div>
        <div
          className={cn(
            "h-7 px-3 rounded-lg flex items-center justify-center transition-all",
            activeTab === "changes"
              ? "w-24 bg-white dark:bg-zinc-800 shadow-2xs border border-slate-200/80 dark:border-zinc-700"
              : "w-20 bg-slate-200/50 dark:bg-zinc-900"
          )}
        >
          <div className="h-3 w-14 bg-slate-200 dark:bg-zinc-700 rounded" />
        </div>
      </div>

      {/* Main Content Area Skeleton */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 space-y-3 sm:space-y-4">
        <div className="h-4 w-44 bg-slate-200 dark:bg-zinc-800 rounded" />
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-2.5">
          <div className="h-3.5 w-3/4 bg-slate-100 dark:bg-zinc-800/70 rounded" />
          <div className="h-3.5 w-1/2 bg-slate-100 dark:bg-zinc-800/70 rounded" />
          <div className="h-3.5 w-5/6 bg-slate-100 dark:bg-zinc-800/70 rounded" />
          <div className="h-3.5 w-2/3 bg-slate-100 dark:bg-zinc-800/70 rounded" />
          <div className="h-3.5 w-1/3 bg-slate-100 dark:bg-zinc-800/70 rounded" />
        </div>
      </div>
    </div>
  );
};

export function ApiLogsSkeleton({
  sidebarWidth = 380,
  onSidebarWidthChange,
  onClose,
  selectedLogId,
  isMobileDetail = false,
  activeTab = "payload",
}: ApiLogsSkeletonProps) {
  const isDesktop = typeof window !== "undefined" ? window.innerWidth >= 768 : true;

  if (!isDesktop && (isMobileDetail || Boolean(selectedLogId))) {
    return (
      <div className="fixed inset-0 z-[1000] flex flex-col bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 font-sans select-none overflow-hidden">
        <ApiLogsDetailSkeleton isMobile onBack={onClose} activeTab={activeTab} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 font-sans overflow-hidden select-none">
      {/* Top Header Skeleton */}
      <header className="flex-shrink-0 h-12 px-3 sm:px-4 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between gap-2 z-20">
        {/* Left: Back button & Title Skeleton */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center p-1.5 text-slate-500 bg-transparent rounded-md cursor-pointer"
          >
            <ChevronLeft size={18} className="shrink-0" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
              External API Logs
            </h1>
          </div>
        </div>

        {/* Center: Live Metrics Pills (Desktop) */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100/70 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 text-[11px]">
            <span className="text-slate-500 dark:text-zinc-400">Total:</span>
            <div className="w-6 h-3.5 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100/70 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 text-[11px]">
            <span className="text-slate-500 dark:text-zinc-400">Success:</span>
            <div className="w-8 h-3.5 bg-emerald-500/20 dark:bg-emerald-500/30 rounded animate-pulse" />
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100/70 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 text-[11px]">
            <span className="text-slate-500 dark:text-zinc-400">Errors:</span>
            <div className="w-4 h-3.5 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100/70 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 text-[11px]">
            <Zap size={11} className="text-amber-500" />
            <span className="text-slate-500 dark:text-zinc-400">Avg:</span>
            <div className="w-8 h-3.5 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>

        {/* Right: Actions Skeleton */}
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 text-slate-400 dark:text-zinc-500">
            <RotateCw size={15} />
          </div>

          <div className="p-1.5 text-slate-400 dark:text-zinc-500 hidden sm:inline-flex">
            <Download size={15} />
          </div>

          <div className="p-1.5 text-red-500 dark:text-red-400">
            <Trash2 size={15} />
          </div>
        </div>
      </header>

      {/* Main Two-Pane Skeleton */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Stream Skeleton */}
        <div
          style={{ width: isDesktop ? `${sidebarWidth}px` : "100%" }}
          className="flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 flex-shrink-0 z-10 overflow-hidden"
        >
          {/* Search bar & filter controls Skeleton */}
          <div className="p-2.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/80 space-y-2">
            {/* Search Input Skeleton */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <div className="w-full pl-8 pr-7 py-1 h-6 text-xs rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
            </div>

            {/* Filter Pills: Method & Status Skeleton */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5 text-[10.5px]">
              {/* Method Selectors Skeleton */}
              <div className="flex items-center gap-1">
                <div className="w-8 h-4.5 rounded bg-slate-200/80 dark:bg-zinc-800/80 animate-pulse" />
                <div className="w-10 h-4.5 rounded bg-slate-200/80 dark:bg-zinc-800/80 animate-pulse" />
                <div className="w-8 h-4.5 rounded bg-slate-200/80 dark:bg-zinc-800/80 animate-pulse" />
                <div className="w-12 h-4.5 rounded bg-slate-200/80 dark:bg-zinc-800/80 animate-pulse" />
              </div>

              {/* Status Selectors Skeleton */}
              <div className="flex items-center gap-1">
                <div className="w-7 h-4.5 rounded bg-slate-200/80 dark:bg-zinc-800/80 animate-pulse" />
                <div className="w-8 h-4.5 rounded bg-slate-200/80 dark:bg-zinc-800/80 animate-pulse" />
                <div className="w-12 h-4.5 rounded bg-slate-200/80 dark:bg-zinc-800/80 animate-pulse" />
              </div>
            </div>
          </div>

          <ApiLogsTimelineSkeleton />
        </div>

        {/* Right Detail Pane Placeholder (Desktop) */}
        {isDesktop && (
          selectedLogId ? (
            <ApiLogsDetailSkeleton isMobile={false} onClose={onClose} activeTab={activeTab} />
          ) : (
            <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-black min-w-0 overflow-hidden">
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none opacity-50">
                <Terminal size={40} className="text-slate-400 dark:text-zinc-600 mb-3 opacity-40 stroke-[1.5]" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-tight">
                  No External API Request Selected
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mt-1.5 leading-relaxed">
                  Select any API call from the real-time stream to inspect its full request payload, response output, client metadata, and state modifications.
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
