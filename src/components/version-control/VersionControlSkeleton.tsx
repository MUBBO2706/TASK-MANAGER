import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader, History } from "lucide-react";
import { cn } from "../../lib/utils";
import { VersionBackup } from "../../types";

const CUSTOM_COL_RESIZE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M8 9L5 12L8 15V9Z' fill='%230f172a'/%3E%3Cpath d='M16 9L19 12L16 15V9Z' fill='%230f172a'/%3E%3Cline x1='12' y1='6' x2='12' y2='18' stroke='%230f172a' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 12 12, col-resize`;

export interface VersionControlSkeletonProps {
  sidebarWidth?: number;
  onSidebarWidthChange?: (width: number) => void;
  onClose?: () => void;
  selectedVersionId?: string | null;
  isMobileDetail?: boolean;
  versionBackups?: VersionBackup[];
}

export const VersionTimelineSkeleton = () => {
  return (
    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60 p-0">
      {[1, 2, 3, 4, 5, 6, 7].map((item) => (
        <div
          key={item}
          className="px-4 py-3 select-none flex flex-col gap-1.5"
        >
          {/* Top row: badge + time + stats before chevron */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1 flex-nowrap overflow-hidden whitespace-nowrap">
              <div className="h-3.5 w-14 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse shrink-0" />
              <div className="h-3 w-16 bg-slate-100 dark:bg-zinc-800/60 rounded animate-pulse shrink-0" />
              <div className="h-3 w-20 sm:w-28 bg-slate-100 dark:bg-zinc-800/50 rounded animate-pulse shrink-0" />
            </div>
            <div className="h-3.5 w-3.5 rounded bg-slate-200 dark:bg-zinc-800 animate-pulse shrink-0 ml-0.5" />
          </div>

          {/* Description line */}
          <div className="mt-0.5">
            <div
              className="h-3 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse"
              style={{ width: `${65 + (item % 3) * 15}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export const VersionEmptyStateSkeleton = ({
  showButton = false,
}: {
  showButton?: boolean;
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full bg-slate-50/50 dark:bg-black/50 p-6 sm:p-8 text-center select-none">
      <History size={36} className="text-slate-300 dark:text-zinc-700 mb-3 stroke-[1.5] animate-pulse opacity-40" />
      <div className="h-4 w-48 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse mb-2" />
      <div className="h-3 w-72 max-w-full bg-slate-100 dark:bg-zinc-800/60 rounded animate-pulse" />
      <div className="h-3 w-56 max-w-full bg-slate-100 dark:bg-zinc-800/60 rounded animate-pulse mt-1.5" />
      {showButton && (
        <div className="mt-4 h-7 w-32 bg-slate-200/80 dark:bg-zinc-800/80 rounded-md animate-pulse" />
      )}
    </div>
  );
};

export const VersionDetailSkeleton = ({
  isMobile = false,
  onBack,
}: {
  isMobile?: boolean;
  onBack?: () => void;
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-black overflow-hidden relative">
      {/* Detail Header Skeleton - Single row matching VersionDetailView exactly */}
      <div className="border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-[#0c0c0e]/95 shrink-0 px-3 sm:px-5 py-2 sm:py-2.5">
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Left: Back button (mobile only) + Badges */}
          <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar py-0.5">
            {isMobile && onBack && (
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
              {/* Operation type badge skeleton */}
              <div className="h-5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-md animate-pulse shrink-0" />
              <span className="text-slate-300 dark:text-zinc-700 text-[10px] shrink-0">•</span>
              {/* Status badge skeleton (Active/Undone) */}
              <div className="h-4 w-12 bg-slate-100 dark:bg-zinc-800/60 rounded animate-pulse shrink-0" />
            </div>
          </div>

          {/* Right Actions: Timestamp & Desktop Undo/Redo Skeleton */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Timestamp skeleton (shown before Undo/Redo on desktop and on right for mobile) */}
            <div className="h-3 w-16 sm:w-22 bg-slate-100 dark:bg-zinc-800/60 rounded animate-pulse shrink-0" />

            {/* Desktop Undo & Redo Action Buttons Skeleton */}
            <div className="hidden md:flex items-center gap-1.5 shrink-0">
              <div className="h-7 w-16 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
              <div className="h-7 w-14 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Center Body: Rotating Loader Icon */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <Loader size={28} className="animate-spin text-slate-400 dark:text-zinc-500" />
      </div>

      {/* Mobile Bottom Footer Skeleton for Undo & Redo */}
      <div className="md:hidden sticky bottom-0 left-0 right-0 z-20 px-3 py-2 border-t border-slate-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md flex items-center justify-end gap-2 shrink-0">
        <div className="h-7.5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
        <div className="h-7.5 w-16 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
      </div>
    </div>
  );
};

export default function VersionControlSkeleton({
  sidebarWidth = 400,
  onSidebarWidthChange,
  onClose,
  selectedVersionId,
  isMobileDetail,
  versionBackups,
}: VersionControlSkeletonProps) {
  const [searchParams] = useSearchParams();
  const urlVersionId = searchParams.get("versionId");
  const effectiveVersionId =
    selectedVersionId !== undefined ? selectedVersionId : urlVersionId;
  const hasSelectedVersion = Boolean(
    effectiveVersionId &&
      (!versionBackups ||
        versionBackups.some((b) => b.id === effectiveVersionId))
  );

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

  const isMobileDetailMode =
    isMobileDetail !== undefined
      ? isMobileDetail
      : !isDesktop && hasSelectedVersion;

  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const resizerHandleRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const rafResizeIdRef = useRef<number | null>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [currentSidebarWidth, setCurrentSidebarWidth] = useState<number>(() => {
    if (sidebarWidth && sidebarWidth > 0) return sidebarWidth;
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

  const nextSidebarWidthRef = useRef<number>(currentSidebarWidth);

  useEffect(() => {
    if (sidebarWidth && sidebarWidth > 0 && !isResizingRef.current) {
      setCurrentSidebarWidth(sidebarWidth);
    }
  }, [sidebarWidth]);

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
    nextSidebarWidthRef.current = currentSidebarWidth;

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
      setCurrentSidebarWidth(finalWidth);
      try {
        window.localStorage.setItem("versionSidebarWidth", JSON.stringify(finalWidth));
      } catch (_) {}
      onSidebarWidthChange?.(finalWidth);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  // Scenario 2: Mobile Detailed Page Reload / Loading
  if (!isDesktop && isMobileDetailMode) {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 z-[1000] flex flex-col bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 font-sans select-none overflow-hidden"
      >
        <VersionDetailSkeleton isMobile onBack={onClose} />
      </div>
    );
  }

  // Scenarios 1, 3, 4: Common Top Navigation Bar
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[1000] flex flex-col bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 font-sans select-none overflow-hidden"
    >
      {/* Resizing Shield Overlay */}
      {isResizing && (
        <div
          className="fixed inset-0 z-[100] select-none pointer-events-auto"
          style={{ cursor: CUSTOM_COL_RESIZE_CURSOR }}
        />
      )}

      {/* Top Navigation Bar Skeleton - Matching VersionControlPage header */}
      <div className="h-12 px-3 sm:px-4 border-b border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c0e] flex items-center justify-between gap-3 shrink-0">
        {/* Left: Back chevron + Heading Skeleton */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer shrink-0 rounded-lg"
            title="Back to Workspace"
          >
            <ChevronLeft size={20} className="stroke-[2.25]" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-3.5 w-20 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse hidden md:block shrink-0" />
            <ChevronRight size={13} className="text-slate-300 dark:text-zinc-700 hidden md:block shrink-0" />
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
              <span>Version Control</span>
            </h1>
          </div>
        </div>

        {/* Right: Snapshots & Revisions count skeleton (matching actual header) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="h-3 w-16 sm:w-20 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
          <span className="text-slate-300 dark:text-zinc-700 font-normal text-xs">•</span>
          <div className="h-3 w-14 sm:w-16 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>

      {/* Main Body Skeleton */}
      <div className="flex-1 flex w-full h-full overflow-hidden min-h-0 relative">
        {/* Timeline Left Column Skeleton (Scenario 1: 100% width on mobile; Scenarios 3 & 4: split column on desktop) */}
        <div
          ref={sidebarRef}
          className="border-r border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c0e] flex flex-col shrink-0 relative transition-colors h-full"
          style={{ width: isDesktop ? `${currentSidebarWidth}px` : "100%" }}
        >
          {/* Subheader: Filter / Search line replica matching VersionControlPage */}
          <div className="p-2 sm:p-2.5 border-b border-slate-100 dark:border-zinc-800/60 bg-slate-50/50 dark:bg-zinc-900/30 flex items-center justify-between gap-2 w-full">
            {/* Filter pills skeleton */}
            <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-zinc-800/70 p-1 rounded-lg shrink-0">
              <div className="h-6 w-9 bg-slate-300/80 dark:bg-zinc-700/80 rounded-md animate-pulse" />
              <div className="h-6 w-12 bg-slate-200/80 dark:bg-zinc-800/80 rounded-md animate-pulse" />
              <div className="h-6 w-14 bg-slate-200/80 dark:bg-zinc-800/80 rounded-md animate-pulse" />
              <div className="h-6 w-14 bg-slate-200/80 dark:bg-zinc-800/80 rounded-md animate-pulse hidden sm:block" />
            </div>
            {/* Search and select icons skeleton */}
            <div className="flex items-center gap-1 shrink-0">
              <div className="h-7 w-7 bg-slate-200/60 dark:bg-zinc-800/60 rounded-lg animate-pulse" />
              <div className="h-7 w-7 bg-slate-200/60 dark:bg-zinc-800/60 rounded-lg animate-pulse" />
            </div>
          </div>

          {/* Timeline Cards Skeleton */}
          <VersionTimelineSkeleton />
        </div>

        {/* Desktop-only Right Side Columns */}
        {isDesktop && (
          <>
            {/* Column Resize Handle */}
            <div
              ref={resizerHandleRef}
              className="hidden md:flex group w-3.5 absolute top-0 bottom-0 z-30 items-center justify-center -ml-[7px] select-none touch-none cursor-pointer"
              style={{
                left: currentSidebarWidth,
                cursor: CUSTOM_COL_RESIZE_CURSOR,
              }}
              onPointerDown={handleResizePointerDown}
            >
              <div className="absolute inset-y-0 w-[1px] bg-slate-200 dark:bg-zinc-800 group-hover:bg-slate-400 dark:group-hover:bg-zinc-600 group-active:bg-slate-500 dark:group-active:bg-zinc-500 transition-colors" />
              <div className="relative z-10 w-3.5 h-7 rounded-full bg-white dark:bg-zinc-900 border border-slate-300/90 dark:border-zinc-700/90 shadow-sm flex items-center justify-center gap-[2px] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-150 pointer-events-none">
                <div className="w-[1.5px] h-3 bg-slate-400 dark:bg-zinc-500 rounded-full" />
                <div className="w-[1.5px] h-3 bg-slate-400 dark:bg-zinc-500 rounded-full" />
              </div>
            </div>

            {/* Right Pane:
                - Scenario 4: If version/task selected -> Detail header skeleton (metadata + undo/redo buttons) & Center Rotating Loader
                - Scenario 3: If no version selected -> Empty State Skeleton
            */}
            <div className="hidden md:flex flex-1 flex-col h-full bg-slate-50 dark:bg-black min-w-0 overflow-hidden">
              {hasSelectedVersion ? (
                <VersionDetailSkeleton isMobile={false} />
              ) : (
                <VersionEmptyStateSkeleton showButton={Boolean(effectiveVersionId)} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

