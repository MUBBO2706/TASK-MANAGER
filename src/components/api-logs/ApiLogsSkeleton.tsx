import React from "react";
import { Terminal, ChevronLeft, Zap, Download, Trash2, RefreshCw, X, History, Server, FileCode2, Cpu } from "lucide-react";
import { cn } from "../../lib/utils";

export interface ApiLogsSkeletonProps {
  sidebarWidth?: number;
  onClose?: () => void;
  isMobileDetail?: boolean;
}

export const ApiLogsTimelineSkeleton = () => {
  return (
    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-900/80 p-0">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
        <div key={item} className="p-3 select-none flex flex-col gap-1.5 animate-pulse">
          {/* Top row: Method pill + Status code + Latency + Relative Time */}
          <div className="flex items-center justify-between gap-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="h-4 w-11 bg-slate-200 dark:bg-zinc-800 rounded shrink-0" />
              <div className="h-4 w-8 bg-slate-100 dark:bg-zinc-800/70 rounded shrink-0" />
              <div className="h-3 w-10 bg-slate-100 dark:bg-zinc-800/50 rounded shrink-0" />
            </div>
            <div className="h-3 w-12 bg-slate-100 dark:bg-zinc-800/60 rounded shrink-0" />
          </div>

          {/* Endpoint line */}
          <div className="mt-0.5">
            <div
              className="h-3.5 bg-slate-200 dark:bg-zinc-800 rounded"
              style={{ width: `${60 + (item % 4) * 10}%` }}
            />
          </div>

          {/* Bottom row: Action badge or Project ID */}
          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <div className="h-3 w-20 bg-slate-100 dark:bg-zinc-800/60 rounded" />
            {item % 3 === 0 && <div className="h-3 w-8 bg-rose-200/50 dark:bg-rose-900/40 rounded" />}
          </div>
        </div>
      ))}
    </div>
  );
};

export const ApiLogsDetailSkeleton = ({
  isMobile = false,
  onBack,
}: {
  isMobile?: boolean;
  onBack?: () => void;
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-black overflow-hidden select-none animate-pulse">
      {/* Detail Header Skeleton */}
      <div className="flex-shrink-0 p-3.5 sm:p-4 border-b border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
            {isMobile && onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-zinc-300 rounded-md border border-slate-200 dark:border-zinc-800 mr-1"
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>
            )}
            <div className="h-5 w-12 bg-slate-200 dark:bg-zinc-800 rounded" />
            <div className="h-5 w-10 bg-slate-100 dark:bg-zinc-800/70 rounded" />
            <div className="h-5 w-14 bg-slate-100 dark:bg-zinc-800/60 rounded" />
            <div className="h-3.5 w-24 bg-slate-100 dark:bg-zinc-800/50 rounded hidden sm:block" />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="h-7 w-20 bg-slate-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-7 w-8 bg-slate-200 dark:bg-zinc-800 rounded-md" />
          </div>
        </div>

        {/* Endpoint path box skeleton */}
        <div className="h-7 w-full bg-slate-100 dark:bg-zinc-900 rounded-md border border-slate-200/80 dark:border-zinc-800/80" />

        {/* Action badge line skeleton */}
        <div className="mt-2 flex items-center gap-2">
          <div className="h-3.5 w-14 bg-slate-200 dark:bg-zinc-800 rounded" />
          <div className="h-3.5 w-24 bg-slate-100 dark:bg-zinc-800/70 rounded" />
        </div>
      </div>

      {/* Navigation Tabs Skeleton */}
      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-slate-100/60 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800">
        <div className="h-6 w-24 bg-white dark:bg-zinc-800 rounded-md" />
        <div className="h-6 w-26 bg-slate-200/70 dark:bg-zinc-800/60 rounded-md" />
        <div className="h-6 w-28 bg-slate-200/70 dark:bg-zinc-800/60 rounded-md" />
      </div>

      {/* Main Content Area Skeleton */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="h-4 w-40 bg-slate-200 dark:bg-zinc-800 rounded" />
        <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-2.5">
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
  onClose,
  isMobileDetail = false,
}: ApiLogsSkeletonProps) {
  const isDesktop = typeof window !== "undefined" ? window.innerWidth >= 768 : true;

  if (!isDesktop && isMobileDetail) {
    return (
      <div className="fixed inset-0 z-[1000] flex flex-col bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 font-sans select-none overflow-hidden">
        <ApiLogsDetailSkeleton isMobile onBack={onClose} />
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
            className="inline-flex items-center justify-center p-1.5 text-slate-500 bg-transparent rounded-md"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">API Access Logs</h1>
            <div className="h-4 w-18 bg-emerald-500/10 rounded-full hidden sm:block animate-pulse" />
          </div>
        </div>

        {/* Center: Metric Pills Skeleton (Desktop) */}
        <div className="hidden lg:flex items-center gap-2 animate-pulse">
          <div className="h-6 w-16 bg-slate-100 dark:bg-zinc-900 rounded-md border border-slate-200/70 dark:border-zinc-800" />
          <div className="h-6 w-20 bg-slate-100 dark:bg-zinc-900 rounded-md border border-slate-200/70 dark:border-zinc-800" />
          <div className="h-6 w-18 bg-slate-100 dark:bg-zinc-900 rounded-md border border-slate-200/70 dark:border-zinc-800" />
          <div className="h-6 w-24 bg-slate-100 dark:bg-zinc-900 rounded-md border border-slate-200/70 dark:border-zinc-800" />
        </div>

        {/* Right: Actions Skeleton */}
        <div className="flex items-center gap-1.5">
          <div className="h-7 w-7 bg-slate-100 dark:bg-zinc-900 rounded-md animate-pulse" />
          <div className="h-7 w-7 bg-slate-100 dark:bg-zinc-900 rounded-md animate-pulse hidden sm:block" />
          <div className="h-7 w-7 bg-slate-100 dark:bg-zinc-900 rounded-md animate-pulse" />
        </div>
      </header>

      {/* Main Two-Pane Skeleton */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Stream Skeleton */}
        <div
          style={{ width: isDesktop ? `${sidebarWidth}px` : "100%" }}
          className="flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 flex-shrink-0 z-10 overflow-hidden"
        >
          {/* Subheader Search & Filters Skeleton */}
          <div className="p-2.5 sm:p-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/80 space-y-2">
            <div className="h-7.5 w-full bg-slate-200 dark:bg-zinc-900 rounded-md animate-pulse" />
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                <div className="h-5 w-10 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                <div className="h-5 w-11 bg-slate-100 dark:bg-zinc-800/60 rounded animate-pulse" />
                <div className="h-5 w-10 bg-slate-100 dark:bg-zinc-800/60 rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-1">
                <div className="h-5 w-9 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                <div className="h-5 w-10 bg-slate-100 dark:bg-zinc-800/60 rounded animate-pulse" />
              </div>
            </div>
          </div>

          <ApiLogsTimelineSkeleton />
        </div>

        {/* Right Detail Pane Placeholder (Desktop) */}
        {isDesktop && (
          <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-black min-w-0 overflow-hidden">
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none opacity-50">
              <Terminal size={36} className="text-slate-400 dark:text-zinc-600 mb-3 stroke-[1.5] animate-pulse" />
              <div className="h-4 w-44 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-3 w-64 bg-slate-100 dark:bg-zinc-800/60 rounded animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
