import React, { useState, useEffect, useRef } from "react";
import { Database, Terminal, Plus, GripVertical, CheckCircle2, Moon, Sun, MoreHorizontal } from "lucide-react";
import { cn } from "../lib/utils";

const CUSTOM_COL_RESIZE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M8 9L5 12L8 15V9Z' fill='%230f172a'/%3E%3Cpath d='M16 9L19 12L16 15V9Z' fill='%230f172a'/%3E%3Cline x1='12' y1='6' x2='12' y2='18' stroke='%230f172a' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 12 12, col-resize`;

interface SkeletonLoaderProps {
  urlTaskId?: string | null;
  urlProjectId?: string | null;
  activeTab?: "sql" | "edge_function";
  sidebarWidth?: number;
  edgeSidebarWidth?: number;
  onSidebarWidthChange?: (width: number) => void;
  onEdgeSidebarWidthChange?: (width: number) => void;
}

// Realistic SQL code lines with indents and widths
const SQL_SKELETON_LINES = [
  { indent: 0, width: "32%" }, // CREATE TABLE public.users (
  { indent: 1, width: "54%" }, // id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  { indent: 1, width: "42%" }, // email TEXT UNIQUE NOT NULL,
  { indent: 1, width: "38%" }, // full_name TEXT,
  { indent: 1, width: "65%" }, // created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  { indent: 1, width: "60%" }, // updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
  { indent: 0, width: "12%" }, // );
  { indent: 0, width: "0%" },  // empty line
  { indent: 0, width: "45%" }, // ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  { indent: 0, width: "0%" },  // empty line
  { indent: 0, width: "68%" }, // CREATE POLICY "Users can view their own profile"
  { indent: 1, width: "35%" }, // ON public.users
  { indent: 1, width: "24%" }, // FOR SELECT
  { indent: 1, width: "50%" }, // USING (auth.uid() = id);
  { indent: 0, width: "0%" },  // empty line
  { indent: 0, width: "58%" }, // CREATE INDEX idx_users_email ON public.users(email);
];

// Realistic TypeScript Edge Function lines with indents and widths
const EDGE_SKELETON_LINES = [
  { indent: 0, width: "48%" }, // import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
  { indent: 0, width: "52%" }, // import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
  { indent: 0, width: "0%" },  // empty line
  { indent: 0, width: "38%" }, // serve(async (req: Request) => {
  { indent: 1, width: "44%" }, // if (req.method === 'OPTIONS') {
  { indent: 2, width: "56%" }, // return new Response('ok', { headers: corsHeaders });
  { indent: 1, width: "15%" }, // }
  { indent: 1, width: "0%" },  // empty line
  { indent: 1, width: "32%" }, // try {
  { indent: 2, width: "62%" }, // const { name } = await req.json();
  { indent: 2, width: "48%" }, // const data = { message: `Hello ${name}!` };
  { indent: 2, width: "70%" }, // return new Response(JSON.stringify(data), {
  { indent: 3, width: "52%" }, // headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  { indent: 3, width: "22%" }, // status: 200,
  { indent: 2, width: "18%" }, // });
  { indent: 1, width: "30%" }, // } catch (error) {
  { indent: 2, width: "64%" }, // return new Response(JSON.stringify({ error: error.message }), {
  { indent: 3, width: "20%" }, // status: 400,
  { indent: 2, width: "18%" }, // });
  { indent: 1, width: "12%" }, // }
  { indent: 0, width: "10%" }, // });
];

export const TaskItemSkeleton: React.FC<{ index: number }> = ({ index }) => {
  // Deterministic varying widths to give realistic feel (chota bada)
  const titleWidths = ["45%", "72%", "38%", "64%", "82%", "50%", "68%", "40%", "76%", "54%", "62%", "48%"];
  const titleWidth = titleWidths[index % titleWidths.length];

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 p-3 select-none border-b border-slate-200 dark:border-[#0a0a0a] bg-white dark:bg-[#0a0a0a]",
        index === 14 && "border-b-0"
      )}
    >
      {/* Top Row: Status Icon Circle, Numbering, Title, Drag Handle */}
      <div className="w-full flex items-center gap-2.5">
        {/* Status CheckCircle Icon in dull color (matches real TaskItem CheckCircle2) */}
        <div className="shrink-0 text-slate-300 dark:text-zinc-700 select-none flex items-center justify-center">
          <CheckCircle2 size={18} />
        </div>

        {/* Numbering (matches real TaskItem {index + 1}.) */}
        <span className="text-xs font-mono text-slate-400 dark:text-slate-500 shrink-0 select-none">
          {index + 1}.
        </span>

        {/* Task Title (chota bada varying width) */}
        <div className="flex-1 min-w-0">
          <div
            className="h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse"
            style={{ width: titleWidth }}
          />
        </div>

        {/* Actual 6-dot Drag Handle icon in dull color */}
        <div className="shrink-0 w-7 h-7 flex items-center justify-center -mr-1 text-slate-200 dark:text-zinc-800 select-none">
          <GripVertical size={16} />
        </div>
      </div>

      {/* Bottom Row: Content / Description (full span to the end) */}
      <div className="w-full">
        <div className="h-3 w-full bg-slate-200/70 dark:bg-zinc-800/70 rounded animate-pulse" />
      </div>
    </div>
  );
};

export const SidebarHeaderSkeleton = () => {
  return (
    <div className="p-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] border-b border-slate-200 dark:border-[#0a0a0a] bg-white dark:bg-[#0a0a0a] sticky top-0 z-30 transition-colors">
      <div className="flex flex-col mb-3 w-full min-w-0 select-none gap-1">
        {/* Top Row: Project Selector Title (Left) + Filter & Search Buttons (Right) */}
        <div className="relative flex items-center justify-between w-full min-h-[30px] min-w-0">
          {/* Left: Project Selector Title */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1 py-0.5 px-0.5">
            <div className="h-4 w-28 sm:w-36 bg-blue-200/70 dark:bg-blue-900/40 rounded animate-pulse" />
            <div className="w-3 h-3 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse shrink-0 ml-0.5" />
          </div>

          {/* Right: Filter & Search Trigger Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Filter button pill */}
            <div className="h-5 w-12 bg-slate-100 dark:bg-zinc-900 rounded border border-slate-200/50 dark:border-zinc-800/60 animate-pulse" />
            {/* Search circular button */}
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-900 border border-slate-200/40 dark:border-zinc-800/50 animate-pulse" />
          </div>
        </div>

        {/* Bottom Row: Information row (NEVER HIDES!) */}
        <div className="flex items-center justify-between w-full min-w-0 text-[9.5px] font-semibold text-slate-450 dark:text-slate-500 select-none px-0.5 pt-0.5">
          {/* Left Info: SQL, funcs, progress */}
          <div className="flex items-center gap-1.5 min-w-0 whitespace-nowrap overflow-hidden">
            <div className="h-2.5 w-20 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
            <span className="text-slate-300 dark:text-zinc-800">•</span>
            <div className="h-2.5 w-6 bg-emerald-200/80 dark:bg-emerald-900/40 rounded animate-pulse" />
          </div>

          {/* Right Info: Pending & Ran counts */}
          <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap overflow-hidden">
            <div className="h-2.5 w-12 bg-amber-200/80 dark:bg-amber-900/40 rounded animate-pulse" />
            <span className="text-slate-300 dark:text-zinc-800">•</span>
            <div className="h-2.5 w-8 bg-emerald-200/80 dark:bg-emerald-900/40 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Micro Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-[#121212] rounded-full h-1.5 mb-2 overflow-hidden">
        <div className="bg-blue-600/40 dark:bg-blue-500/30 h-1.5 w-1/3 rounded-full animate-pulse" />
      </div>
    </div>
  );
};

export const SidebarBottomSkeleton = () => {
  return (
    <div className="relative p-3 bg-white dark:bg-[#0a0a0a] border-t border-slate-200 dark:border-[#0a0a0a] z-[60] pb-[max(env(safe-area-inset-bottom),12px)] shrink-0 transition-colors">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {/* Theme Toggle Button Skeleton */}
        <div className="p-1.5 sm:p-2 text-slate-300 dark:text-zinc-700 rounded-full flex-shrink-0 flex items-center justify-center select-none" title="Toggle Theme">
          <Moon size={20} className="block dark:hidden" />
          <Sun size={20} className="hidden dark:block" />
        </div>

        {/* Center Tab Switcher (SQL / Functions) */}
        <div className="bg-slate-100 dark:bg-black p-1 rounded-full flex items-center justify-between flex-1 max-w-[280px] mx-auto">
          <div className="flex-1 text-center py-1.5 px-2 sm:px-4 rounded-full h-7 sm:h-8 bg-white dark:bg-[#0a0a0a] animate-pulse flex items-center justify-center">
            <div className="h-3 w-8 bg-slate-200 dark:bg-zinc-800 rounded" />
          </div>
          <div className="flex-1 text-center py-1.5 px-2 sm:px-4 rounded-full h-7 sm:h-8 flex items-center justify-center opacity-60">
            <div className="h-3 w-14 bg-slate-200 dark:bg-zinc-800 rounded" />
          </div>
        </div>

        {/* More Options Button Skeleton */}
        <div className="p-1.5 sm:p-2 text-slate-300 dark:text-zinc-700 rounded-full flex-shrink-0 flex items-center justify-center select-none" title="More Options">
          <MoreHorizontal size={20} />
        </div>
      </div>
    </div>
  );
};

export const SqlEditorSkeleton = () => {
  return (
    <div className="flex-1 overflow-hidden flex flex-col relative bg-white dark:bg-black min-w-0 transition-colors">
      {/* SQL Editor Subheader */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-[#0a0a0a] border-b border-slate-200 dark:border-[#0a0a0a] transition-colors">
        <div className="h-3.5 w-20 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="flex items-center gap-2">
          {/* Undo */}
          <div className="w-7 h-7 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
          {/* Redo */}
          <div className="w-7 h-7 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
          {/* Copy Code button */}
          <div className="w-20 h-7 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse ml-2" />
        </div>
      </div>

      {/* Code Lines with realistic indents and syntax width */}
      <div className="flex-1 p-4 space-y-3.5 overflow-hidden font-mono">
        {SQL_SKELETON_LINES.map((item, idx) =>
          item.width === "0%" ? (
            <div key={idx} className="h-2" />
          ) : (
            <div
              key={idx}
              className="h-3.5 bg-slate-100 dark:bg-zinc-800/80 rounded animate-pulse"
              style={{
                width: item.width,
                marginLeft: `${item.indent * 18}px`,
              }}
            />
          )
        )}
      </div>
    </div>
  );
};

export const EdgeEditorSkeleton = ({
  edgeSidebarWidth = 0,
  onEdgeSidebarWidthChange,
}: {
  edgeSidebarWidth?: number;
  onEdgeSidebarWidthChange?: (width: number) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const resizerHandleRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const rafResizeIdRef = useRef<number | null>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [currentEdgeWidth, setCurrentEdgeWidth] = useState<number>(() => {
    if (edgeSidebarWidth && edgeSidebarWidth > 0) return edgeSidebarWidth;
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("edgeSidebarWidth");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed > 0) return parsed;
        }
      } catch (_) {}
    }
    return 0;
  });

  const nextSidebarWidthRef = useRef<number>(currentEdgeWidth);

  useEffect(() => {
    if (edgeSidebarWidth && edgeSidebarWidth > 0 && !isResizingRef.current) {
      setCurrentEdgeWidth(edgeSidebarWidth);
    }
  }, [edgeSidebarWidth]);

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
    const minWidth = 140;
    const maxWidth = Math.max(minWidth, containerRect.width - 160);

    isResizingRef.current = true;
    setIsResizing(true);
    const initialWidth = currentEdgeWidth || containerRect.width * 0.4;
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
      const finalWidth = nextSidebarWidthRef.current;
      setCurrentEdgeWidth(finalWidth);
      try {
        window.localStorage.setItem("edgeSidebarWidth", JSON.stringify(finalWidth));
      } catch (_) {}
      onEdgeSidebarWidthChange?.(finalWidth);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  return (
    <div ref={containerRef} className="flex-1 flex h-full w-full bg-white dark:bg-black relative flex-row transition-colors overflow-hidden">
      {/* Resizing Shield Overlay */}
      {isResizing && (
        <div
          className="fixed inset-0 z-[100] select-none pointer-events-auto"
          style={{ cursor: CUSTOM_COL_RESIZE_CURSOR }}
        />
      )}

      {/* Edge Left Sidebar */}
      <div
        ref={sidebarRef}
        className="border-r border-slate-200 dark:border-[#2a2a2a] flex flex-col bg-slate-50 dark:bg-[#0a0a0a] relative shrink-0 z-10 transition-colors"
        style={{ width: currentEdgeWidth ? `${currentEdgeWidth}px` : "40%" }}
      >
        {/* Tabs: Files / Secrets */}
        <div className="flex border-b border-slate-200 dark:border-[#2a2a2a]">
          <div className="flex-1 py-2 text-xs font-medium text-center border-b-2 border-blue-500 text-blue-600 dark:text-blue-400">
            Files
          </div>
          <div className="flex-1 py-2 text-xs font-medium text-center border-b-2 border-transparent text-slate-400">
            Secrets
          </div>
        </div>

        {/* Explorer Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-[#2a2a2a]/50">
          <div className="h-3 w-16 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="w-5 h-5 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
        </div>

        {/* File items list */}
        <div className="flex-1 overflow-hidden py-1 space-y-1">
          {["index.ts", "handler.ts", "types.ts"].map((name, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 py-1.5 px-3",
                i === 0 ? "bg-blue-50/60 dark:bg-blue-600/10" : ""
              )}
            >
              <div className="w-4 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse shrink-0" />
              <div
                className="h-3 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse"
                style={{ width: i === 0 ? "60px" : i === 1 ? "75px" : "55px" }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Modern Custom-Cursor Resize Handle */}
      <div
        ref={resizerHandleRef}
        className="group w-3.5 absolute top-0 bottom-0 z-20 flex items-center justify-center -ml-[7px] select-none touch-none cursor-pointer"
        style={{
          left: currentEdgeWidth ? `${currentEdgeWidth}px` : "40%",
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

      {/* Edge Main Content Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-black relative overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-[#0a0a0a] border-b border-slate-200 dark:border-[#0a0a0a] w-full min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="w-14 h-6 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
        </div>

        {/* TypeScript Code lines */}
        <div className="flex-1 p-4 space-y-3 overflow-hidden font-mono">
          {EDGE_SKELETON_LINES.map((item, idx) =>
            item.width === "0%" ? (
              <div key={idx} className="h-2" />
            ) : (
              <div
                key={idx}
                className="h-3.5 bg-slate-100 dark:bg-zinc-800/80 rounded animate-pulse"
                style={{
                  width: item.width,
                  marginLeft: `${item.indent * 18}px`,
                }}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export const EmptyEditorSkeleton: React.FC<{ activeTab?: "sql" | "edge_function" }> = ({
  activeTab = "sql",
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 p-8 select-none bg-slate-50 dark:bg-black transition-colors">
      <div className="mb-4 text-slate-400 dark:text-slate-600 animate-pulse flex items-center justify-center">
        {activeTab === "sql" ? (
          <Database size={48} className="stroke-1 opacity-30" />
        ) : (
          <Terminal size={48} className="stroke-1 opacity-30" />
        )}
      </div>
      <h2 className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-2">
        No {activeTab === "sql" ? "Query" : "Function"} Selected
      </h2>
      <p className="text-sm text-center max-w-sm text-slate-400 dark:text-slate-500">
        Select a {activeTab === "sql" ? "query" : "function"} from the sidebar or create a new one to start writing code.
      </p>
      <div className="mt-6 flex items-center gap-2 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#2a2a2a] text-slate-700 dark:text-slate-300 px-4 py-2 rounded-md font-medium text-sm animate-pulse">
        <Plus size={16} />
        <span>Create New</span>
      </div>
    </div>
  );
};

export const EditorSkeleton = ({
  urlTaskId,
  activeTab = "sql",
  edgeSidebarWidth = 0,
  onEdgeSidebarWidthChange,
}: {
  urlTaskId?: string | null;
  activeTab?: "sql" | "edge_function";
  edgeSidebarWidth?: number;
  onEdgeSidebarWidthChange?: (width: number) => void;
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-black relative min-w-0 transition-colors">
      {/* Editor Header */}
      <div className="flex flex-col pt-[env(safe-area-inset-top,0px)] border-b border-slate-200 dark:border-[#0a0a0a] bg-white dark:bg-[#0a0a0a] transition-colors">
        <div className="flex items-center justify-between px-3 py-2">
          {/* Left: Back button (on mobile) & Title Input */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {urlTaskId && (
              <div className="md:hidden p-1.5 -ml-1.5 w-7 h-7 rounded-md bg-slate-200 dark:bg-zinc-800 animate-pulse shrink-0" />
            )}
            <div className="h-6 w-36 sm:w-56 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>

          {/* Right: Edge buttons (if edge) & Status Button */}
          <div className="flex items-center gap-2 ml-3 shrink-0">
            {activeTab === "edge_function" && (
              <>
                <div className="w-7 h-7 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                <div className="w-7 h-7 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
              </>
            )}
            <div className="w-24 sm:w-28 h-7 bg-slate-200 dark:bg-zinc-800 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Description Section Placeholder */}
        <div className="px-3 pb-2 mt-1">
          <div className="h-4 w-2/3 bg-slate-100 dark:bg-zinc-800/80 rounded animate-pulse py-0.5" />
        </div>
      </div>

      {/* Editor Body */}
      {activeTab === "edge_function" ? (
        <EdgeEditorSkeleton
          edgeSidebarWidth={edgeSidebarWidth}
          onEdgeSidebarWidthChange={onEdgeSidebarWidthChange}
        />
      ) : (
        <SqlEditorSkeleton />
      )}
    </div>
  );
};

export default function SkeletonLoader({
  urlTaskId,
  urlProjectId,
  activeTab = "sql",
  sidebarWidth = 384,
  edgeSidebarWidth = 0,
  onSidebarWidthChange,
  onEdgeSidebarWidthChange,
}: SkeletonLoaderProps) {
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

  const mainContainerRef = useRef<HTMLDivElement>(null);
  const mainSidebarRef = useRef<HTMLDivElement>(null);
  const mainResizerHandleRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const rafResizeIdRef = useRef<number | null>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [currentSidebarWidth, setCurrentSidebarWidth] = useState<number>(() => {
    if (sidebarWidth && sidebarWidth > 0) return sidebarWidth;
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("mainSidebarWidth");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed > 0) return parsed;
        }
      } catch (_) {}
    }
    return 384;
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

    const container = mainContainerRef.current;
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
          if (mainSidebarRef.current) {
            mainSidebarRef.current.style.width = `${nextSidebarWidthRef.current}px`;
          }
          if (mainResizerHandleRef.current) {
            mainResizerHandleRef.current.style.left = `${nextSidebarWidthRef.current}px`;
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
        window.localStorage.setItem("mainSidebarWidth", JSON.stringify(finalWidth));
      } catch (_) {}
      onSidebarWidthChange?.(finalWidth);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  return (
    <div
      ref={mainContainerRef}
      className="flex w-full h-dvh bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-50 font-sans overflow-hidden select-none relative"
    >
      {/* Resizing Shield Overlay */}
      {isResizing && (
        <div
          className="fixed inset-0 z-[100] select-none pointer-events-auto"
          style={{ cursor: CUSTOM_COL_RESIZE_CURSOR }}
        />
      )}

      {/* Sidebar (List View) Skeleton */}
      <div
        ref={mainSidebarRef}
        className={cn(
          "flex flex-col border-r border-slate-200 dark:border-[#0a0a0a] bg-white dark:bg-[#0a0a0a] h-full shrink-0 relative transition-colors",
          urlTaskId ? "hidden md:flex" : "flex"
        )}
        style={{ width: isDesktop ? `${currentSidebarWidth}px` : "100%" }}
      >
        {/* Header with Project Selector & Metrics */}
        <SidebarHeaderSkeleton />

        {/* Task List Items (overflow-hidden to prevent any scrollbar/scrolling during loading) */}
        <div className="flex-1 overflow-hidden py-0 select-none">
          {Array.from({ length: 15 }).map((_, idx) => (
            <TaskItemSkeleton key={idx} index={idx} />
          ))}
        </div>

        {/* Tab Selection at the Bottom */}
        <SidebarBottomSkeleton />
      </div>

      {/* Desktop Column Resize Handle */}
      <div
        ref={mainResizerHandleRef}
        className="hidden md:flex group w-3.5 absolute top-0 bottom-0 z-30 items-center justify-center -ml-[7px] select-none touch-none cursor-pointer"
        style={{
          left: currentSidebarWidth,
          cursor: CUSTOM_COL_RESIZE_CURSOR,
        }}
        onPointerDown={handleResizePointerDown}
      >
        {/* Sleek Neutral Divider Line */}
        <div className="absolute inset-y-0 w-[1px] bg-slate-200 dark:bg-[#0a0a0a] group-hover:bg-slate-400 dark:group-hover:bg-zinc-600 group-active:bg-slate-500 dark:group-active:bg-zinc-500 transition-colors" />

        {/* Custom Visual Grab Handle Indicator (Sleek pill with dual vertical grip bars) */}
        <div className="relative z-10 w-3.5 h-7 rounded-full bg-white dark:bg-zinc-900 border border-slate-300/90 dark:border-zinc-700/90 shadow-sm flex items-center justify-center gap-[2px] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-150 pointer-events-none">
          <div className="w-[1.5px] h-3 bg-slate-400 dark:bg-zinc-500 rounded-full" />
          <div className="w-[1.5px] h-3 bg-slate-400 dark:bg-zinc-500 rounded-full" />
        </div>
      </div>

      {/* Main Content / Editor View Skeleton */}
      <div
        className={cn(
          "flex-1 flex flex-col h-full bg-slate-50 dark:bg-black relative min-w-0 transition-colors",
          !urlTaskId ? "hidden md:flex" : "flex"
        )}
      >
        {urlTaskId ? (
          <EditorSkeleton
            urlTaskId={urlTaskId}
            activeTab={activeTab}
            edgeSidebarWidth={edgeSidebarWidth}
            onEdgeSidebarWidthChange={onEdgeSidebarWidthChange}
          />
        ) : isDesktop ? (
          <EmptyEditorSkeleton activeTab={activeTab} />
        ) : null}
      </div>
    </div>
  );
};
