import React, { useState, useEffect, useRef } from "react";
import { FileCode, Database, ChevronLeft, Loader } from "lucide-react";
import { cn } from "../lib/utils";

const CUSTOM_COL_RESIZE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M8 9L5 12L8 15V9Z' fill='%230f172a'/%3E%3Cpath d='M16 9L19 12L16 15V9Z' fill='%230f172a'/%3E%3Cline x1='12' y1='6' x2='12' y2='18' stroke='%230f172a' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 12 12, col-resize`;

interface DiffViewerSkeletonProps {
  sidebarWidth?: number;
  selectedItemId?: string | null;
  onClose?: () => void;
  onSidebarWidthChange?: (width: number) => void;
}

// Deterministic mock diff lines for split pane code representation
const DIFF_CODE_LINES = [
  { indent: 0, leftWidth: "40%", rightWidth: "40%", type: "same" },
  { indent: 1, leftWidth: "60%", rightWidth: "60%", type: "same" },
  { indent: 1, leftWidth: "45%", rightWidth: "55%", type: "modified" },
  { indent: 1, leftWidth: "70%", rightWidth: "0%", type: "deleted" },
  { indent: 1, leftWidth: "0%", rightWidth: "68%", type: "added" },
  { indent: 1, leftWidth: "52%", rightWidth: "52%", type: "same" },
  { indent: 0, leftWidth: "15%", rightWidth: "15%", type: "same" },
  { indent: 0, leftWidth: "0%", rightWidth: "0%", type: "empty" },
  { indent: 0, leftWidth: "48%", rightWidth: "48%", type: "same" },
  { indent: 1, leftWidth: "65%", rightWidth: "72%", type: "modified" },
  { indent: 1, leftWidth: "0%", rightWidth: "58%", type: "added" },
  { indent: 1, leftWidth: "42%", rightWidth: "42%", type: "same" },
  { indent: 0, leftWidth: "20%", rightWidth: "20%", type: "same" },
  { indent: 0, leftWidth: "0%", rightWidth: "0%", type: "empty" },
  { indent: 0, leftWidth: "56%", rightWidth: "56%", type: "same" },
  { indent: 1, leftWidth: "62%", rightWidth: "0%", type: "deleted" },
  { indent: 1, leftWidth: "0%", rightWidth: "64%", type: "added" },
];

export const DiffItemSkeleton: React.FC<{ index: number; isSelected?: boolean }> = ({
  index,
  isSelected = false,
}) => {
  const statusTypes = ["modified", "added", "deleted", "modified", "added", "modified", "deleted", "modified"];
  const status = statusTypes[index % statusTypes.length];

  const titleWidths = ["56%", "70%", "46%", "62%", "78%", "52%", "66%", "40%"];
  const titleWidth = titleWidths[index % titleWidths.length];

  return (
    <div
      className={cn(
        "w-full flex flex-col gap-1.5 px-3 sm:px-4 py-3 text-left border-b border-slate-100 dark:border-[#1a1a1a] bg-white dark:bg-[#0a0a0a] select-none",
        isSelected && "bg-blue-50/40 dark:bg-blue-900/10 border-b-blue-200/60 dark:border-blue-800/40",
        index === 14 && "border-b-0"
      )}
    >
      {/* Top Row: Checkbox, Icon, Title, and Action Status Indicator */}
      <div className="w-full flex items-center gap-2.5">
        {/* Checkbox placeholder */}
        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 shrink-0 animate-pulse" />

        {/* Task Type Icon (Database / FileCode) */}
        <div className="w-3.5 h-3.5 rounded bg-slate-200 dark:bg-zinc-800 shrink-0 animate-pulse" />

        {/* Task Title */}
        <div
          className="h-3.5 sm:h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse flex-1 min-w-0"
          style={{ width: titleWidth }}
        />

        {/* Status indicator pill */}
        <div
          className={cn(
            "w-3.5 h-3.5 rounded shrink-0 animate-pulse",
            status === "added"
              ? "bg-emerald-300 dark:bg-emerald-800/60"
              : status === "deleted"
              ? "bg-red-300 dark:bg-red-800/60"
              : "bg-blue-300 dark:bg-blue-800/60"
          )}
        />
      </div>

      {/* Bottom Row: Type label, additions/deletions, execution status badge, timestamp */}
      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 w-full min-w-0 pl-6">
        {/* Type label */}
        <div className="h-2.5 w-12 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse shrink-0" />

        {/* Additions / Deletions count */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="h-2.5 w-6 bg-emerald-200/80 dark:bg-emerald-900/50 rounded animate-pulse" />
          <div className="h-2.5 w-6 bg-red-200/80 dark:bg-red-900/50 rounded animate-pulse" />
        </div>

        <span className="text-slate-300 dark:text-zinc-800 shrink-0">•</span>

        {/* Staging Execution Status badge */}
        <div className="h-3 w-16 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse shrink-0" />

        <span className="text-slate-300 dark:text-zinc-800 shrink-0">•</span>

        {/* Timestamp */}
        <div className="h-2.5 w-16 bg-slate-200/70 dark:bg-zinc-800/70 rounded animate-pulse shrink-0" />
      </div>
    </div>
  );
};

export const NoChangesDiffSkeleton: React.FC<{ onClose?: () => void }> = () => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-50 dark:bg-black font-sans select-none">
      <Loader size={22} className="animate-spin text-slate-400 dark:text-zinc-500" />
    </div>
  );
};

export const EmptyDiffEditorSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-[#0a0a0a] select-none h-full w-full">
      <FileCode size={36} className="mb-3 text-slate-400 dark:text-zinc-500 opacity-40 animate-pulse" />
      <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-1">No Task Selected</h3>
      <p className="text-xs text-slate-500 dark:text-zinc-500 max-w-xs leading-relaxed">
        Select a task from the sidebar list to compare the code differences between Production and Staging.
      </p>
    </div>
  );
};

export const SelectedDiffEditorSkeleton: React.FC<{ hasMobileBack?: boolean }> = ({
  hasMobileBack = true,
}) => {
  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0a0a0a] min-w-0 h-full w-full overflow-hidden">
      {/* Detail View Header */}
      <div className="py-2 px-3 md:py-2.5 md:px-4 border-b border-blue-200/60 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {hasMobileBack && (
            <div className="p-1 -ml-1 text-slate-400 dark:text-slate-600 shrink-0">
              <ChevronLeft size={18} />
            </div>
          )}
          <div className="h-4 sm:h-5 w-44 sm:w-60 bg-blue-200/80 dark:bg-blue-800/40 rounded animate-pulse" />
        </div>
        <div className="h-6 w-20 bg-slate-200/80 dark:bg-zinc-800/80 rounded animate-pulse" />
      </div>

      {/* Diff Side-by-Side Monaco Preview */}
      <div className="flex-1 bg-white dark:bg-[#0a0a0a] min-h-0 relative flex flex-col overflow-hidden">
        {/* Split Titles: Production vs Staging */}
        <div className="flex w-full px-4 py-2 border-b border-slate-200 dark:border-[#1a1a1a] bg-slate-50 dark:bg-[#121212] shrink-0">
          <div className="flex-1 font-bold text-slate-700 dark:text-zinc-300 text-xs text-left flex items-center gap-2">
            <span>Production</span>
            <span className="text-[10px] text-slate-400 font-normal">(Original)</span>
          </div>
          <div className="flex-1 font-bold text-slate-700 dark:text-zinc-300 text-xs text-left pl-4 flex items-center gap-2 border-l border-slate-200 dark:border-[#1a1a1a]">
            <span>Staging</span>
            <span className="text-[10px] text-emerald-500 font-normal">(Incoming changes)</span>
          </div>
        </div>

        {/* Split Diff Lines Area */}
        <DiffCodeSkeleton />
      </div>
    </div>
  );
};

export const CodeBlockSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => {
  const lineWidths = ["75%", "50%", "85%", "60%", "80%", "45%", "70%", "85%"];
  return (
    <div className="p-3.5 font-mono rounded-lg bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800 space-y-2.5 overflow-hidden">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="flex items-center gap-3 h-4">
          <span className="w-5 text-[10px] text-slate-300 dark:text-zinc-700 text-center select-none shrink-0 font-mono">
            {idx + 1}
          </span>
          <div
            className="h-3 rounded bg-slate-200/80 dark:bg-zinc-800 animate-pulse"
            style={{ width: lineWidths[idx % lineWidths.length] }}
          />
        </div>
      ))}
    </div>
  );
};

export const DiffCodeSkeleton: React.FC = () => {
  return (
    <div className="flex-1 p-4 font-mono overflow-hidden flex flex-row h-full w-full bg-white dark:bg-[#0a0a0a]">
      {/* Left (Production) Pane */}
      <div className="flex-1 pr-3 border-r border-slate-200 dark:border-[#1a1a1a] space-y-3 overflow-hidden">
        {DIFF_CODE_LINES.map((line, idx) => (
          <div key={idx} className="flex items-center gap-2 h-4">
            <span className="w-5 text-[10px] text-slate-300 dark:text-zinc-700 text-center select-none">
              {line.type !== "empty" ? idx + 1 : ""}
            </span>
            {line.leftWidth !== "0%" && (
              <div
                className={cn(
                  "h-3 rounded animate-pulse",
                  line.type === "deleted"
                    ? "bg-red-200/80 dark:bg-red-900/40"
                    : "bg-slate-100 dark:bg-zinc-900"
                )}
                style={{
                  width: line.leftWidth,
                  marginLeft: `${line.indent * 16}px`,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Right (Staging) Pane */}
      <div className="flex-1 pl-3 space-y-3 overflow-hidden">
        {DIFF_CODE_LINES.map((line, idx) => (
          <div key={idx} className="flex items-center gap-2 h-4">
            <span className="w-5 text-[10px] text-slate-300 dark:text-zinc-700 text-center select-none">
              {line.type !== "empty" ? idx + 1 : ""}
            </span>
            {line.rightWidth !== "0%" && (
              <div
                className={cn(
                  "h-3 rounded animate-pulse",
                  line.type === "added"
                    ? "bg-emerald-200/80 dark:bg-emerald-900/40"
                    : line.type === "modified"
                    ? "bg-blue-200/80 dark:bg-blue-900/40"
                    : "bg-slate-100 dark:bg-zinc-900"
                )}
                style={{
                  width: line.rightWidth,
                  marginLeft: `${line.indent * 16}px`,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function DiffViewerSkeleton({
  sidebarWidth = 320,
  selectedItemId = null,
  onClose,
  onSidebarWidthChange,
}: DiffViewerSkeletonProps) {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  const diffContainerRef = useRef<HTMLDivElement>(null);
  const diffSidebarRef = useRef<HTMLDivElement>(null);
  const diffResizerHandleRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const rafResizeIdRef = useRef<number | null>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [currentSidebarWidth, setCurrentSidebarWidth] = useState<number>(() => {
    if (sidebarWidth && sidebarWidth > 0) return sidebarWidth;
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("diffSidebarWidth");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed > 0) return parsed;
        }
      } catch (_) {}
    }
    return 320;
  });

  const nextSidebarWidthRef = useRef<number>(currentSidebarWidth);

  useEffect(() => {
    if (sidebarWidth && sidebarWidth > 0 && !isResizingRef.current) {
      setCurrentSidebarWidth(sidebarWidth);
    }
  }, [sidebarWidth]);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (rafResizeIdRef.current !== null) cancelAnimationFrame(rafResizeIdRef.current);
    };
  }, []);

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    e.stopPropagation();

    const container = diffContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const minWidth = 240;
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
          if (diffSidebarRef.current) {
            diffSidebarRef.current.style.width = `${nextSidebarWidthRef.current}px`;
          }
          if (diffResizerHandleRef.current) {
            diffResizerHandleRef.current.style.left = `${nextSidebarWidthRef.current}px`;
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
        window.localStorage.setItem("diffSidebarWidth", JSON.stringify(finalWidth));
      } catch (_) {}
      onSidebarWidthChange?.(finalWidth);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const hasSelectedTask = Boolean(selectedItemId);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 dark:bg-black font-sans overflow-hidden select-none">
      {/* Resizing Shield Overlay */}
      {isResizing && (
        <div
          className="fixed inset-0 z-[100] select-none pointer-events-auto"
          style={{ cursor: CUSTOM_COL_RESIZE_CURSOR }}
        />
      )}

      {/* Main Body */}
      <div ref={diffContainerRef} className="flex-1 flex w-full h-full overflow-hidden min-h-0 relative">
        {/* Left Sidebar Skeleton */}
        <div
          ref={diffSidebarRef}
          className={cn(
            "border-r border-slate-200 dark:border-[#1a1a1a] bg-white dark:bg-[#0a0a0a] flex-col shrink-0 relative transition-colors h-full",
            hasSelectedTask ? "hidden md:flex" : "flex h-full"
          )}
          style={{ width: isDesktop ? `${currentSidebarWidth}px` : "100%" }}
        >
          {/* Sidebar Header */}
          <div className="py-2.5 px-3 md:py-3 md:px-4 border-b border-slate-200 dark:border-[#1a1a1a] bg-slate-50/50 dark:bg-[#121212]/50 sticky top-0 z-10 w-full flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* Back / Close button */}
              {onClose ? (
                <button
                  onClick={onClose}
                  className="p-1 -ml-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white shrink-0 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] rounded-md transition-colors cursor-pointer"
                  title="Back to Project"
                  aria-label="Back to Project"
                >
                  <ChevronLeft size={18} />
                </button>
              ) : (
                <div className="w-5 h-5 rounded bg-slate-200 dark:bg-zinc-800 animate-pulse shrink-0" />
              )}
              {/* Select all checkbox */}
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded bg-slate-200 dark:bg-zinc-800 animate-pulse shrink-0" />
              {/* Title: Changed Tasks */}
              <div className="h-4 w-28 sm:w-32 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>

            {/* Status Legend Pills (Added, Modified, Deleted) */}
            <div className="flex items-center gap-x-2 sm:gap-x-2.5 text-[10px] shrink-0">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <div className="h-2.5 w-8 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <div className="h-2.5 w-10 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <div className="h-2.5 w-9 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Diff Items List (overflow-hidden to prevent any vertical scroll during loading) */}
          <div className="flex-1 overflow-hidden w-full">
            {Array.from({ length: 14 }).map((_, idx) => (
              <DiffItemSkeleton
                key={idx}
                index={idx}
                isSelected={hasSelectedTask && idx === 0}
              />
            ))}
          </div>
        </div>

        {/* Desktop Column Resize Handle */}
        <div
          ref={diffResizerHandleRef}
          className="hidden md:flex group w-3.5 absolute top-0 bottom-0 z-30 items-center justify-center -ml-[7px] select-none touch-none cursor-pointer"
          style={{
            left: currentSidebarWidth,
            cursor: CUSTOM_COL_RESIZE_CURSOR,
          }}
          onPointerDown={handleResizePointerDown}
        >
          {/* Sleek Neutral Divider Line */}
          <div className="absolute inset-y-0 w-[1px] bg-slate-200 dark:bg-[#1a1a1a] group-hover:bg-slate-400 dark:group-hover:bg-zinc-600 group-active:bg-slate-500 dark:group-active:bg-zinc-500 transition-colors" />

          {/* Custom Visual Grab Handle Indicator (Sleek pill with dual vertical grip bars) */}
          <div className="relative z-10 w-3.5 h-7 rounded-full bg-white dark:bg-zinc-900 border border-slate-300/90 dark:border-zinc-700/90 shadow-sm flex items-center justify-center gap-[2px] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-150 pointer-events-none">
            <div className="w-[1.5px] h-3 bg-slate-400 dark:bg-zinc-500 rounded-full" />
            <div className="w-[1.5px] h-3 bg-slate-400 dark:bg-zinc-500 rounded-full" />
          </div>
        </div>

        {/* Right Details / Split Diff View Skeleton */}
        <div
          className={cn(
            "flex-1 flex-col bg-slate-50 dark:bg-[#0a0a0a] min-w-0 h-full w-full",
            !hasSelectedTask ? "hidden md:flex" : "flex"
          )}
        >
          {hasSelectedTask ? (
            <SelectedDiffEditorSkeleton hasMobileBack={true} />
          ) : isDesktop ? (
            <EmptyDiffEditorSkeleton />
          ) : null}
        </div>
      </div>

      {/* Bottom Footer Actions Bar */}
      <div className="flex flex-row items-center justify-between px-2 sm:px-4 py-2 sm:py-3 bg-white dark:bg-[#0a0a0a] border-t border-slate-200 dark:border-[#1a1a1a] z-10 shrink-0 gap-2 mt-auto w-full">
        {/* Left Side: Review Changes title (Desktop) & change stats indicators */}
        <div className="flex flex-row items-center gap-2 sm:gap-3 min-w-0">
          <div className="hidden lg:block w-28 h-5 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse shrink-0" />
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Total count */}
            <div className="w-10 sm:w-14 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
            {/* Added count with dot */}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400/60 dark:bg-emerald-600/50 animate-pulse shrink-0" />
              <div className="w-10 sm:w-12 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>
            {/* Modified count with dot */}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-400/60 dark:bg-blue-600/50 animate-pulse shrink-0" />
              <div className="w-12 sm:w-14 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>
            {/* Deleted count with dot */}
            <div className="hidden sm:flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400/60 dark:bg-red-600/50 animate-pulse shrink-0" />
              <div className="w-10 sm:w-12 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Right footer actions */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="w-20 sm:w-24 h-7 bg-red-200/70 dark:bg-red-900/40 rounded animate-pulse" />
          <div className="w-24 sm:w-28 h-7 bg-emerald-300/80 dark:bg-emerald-800/50 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

