import React, { useState, useEffect, useMemo, memo } from "react";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { Columns, AlignLeft, Copy, Check } from "lucide-react";
import * as Diff from "diff";
import { cn } from "../../lib/utils";
import { useLocalStorage } from "../../hooks/useLocalStorage";

interface SideBySideDiffProps {
  oldValue: string;
  newValue: string;
  oldTitle?: string;
  newTitle?: string;
  isDark?: boolean;
  className?: string;
  maxHeight?: string;
  borderless?: boolean;
}

export const SideBySideDiff = memo(function SideBySideDiff({
  oldValue = "",
  newValue = "",
  oldTitle = "Old (Baseline)",
  newTitle = "New (Snapshot)",
  isDark,
  className,
  maxHeight = "340px",
  borderless = true,
}: SideBySideDiffProps) {
  // Persisted view preference across diffs
  const [splitView, setSplitView] = useLocalStorage<boolean>(
    "version-diff-split-view",
    typeof window !== "undefined" ? window.innerWidth >= 640 : true
  );

  const [copiedOld, setCopiedOld] = useState(false);
  const [copiedNew, setCopiedNew] = useState(false);

  // Fast theme detection without spamming MutationObservers
  const [darkActive, setDarkActive] = useState<boolean>(() => {
    if (typeof isDark === "boolean") return isDark;
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return true;
  });

  useEffect(() => {
    if (typeof isDark === "boolean") {
      setDarkActive(isDark);
      return;
    }
    const isDarkMode = document.documentElement.classList.contains("dark");
    setDarkActive(isDarkMode);
  }, [isDark]);

  // Compute addition & deletion counts efficiently (memoized)
  const { additions, deletions } = useMemo(() => {
    if (!oldValue && !newValue) return { additions: 0, deletions: 0 };
    if (!oldValue) return { additions: newValue.split("\n").length, deletions: 0 };
    if (!newValue) return { additions: 0, deletions: oldValue.split("\n").length };
    
    try {
      const diffResult = Diff.diffLines(oldValue, newValue);
      let adds = 0;
      let dels = 0;
      for (let i = 0; i < diffResult.length; i++) {
        const part = diffResult[i];
        if (part.added) adds += part.count || 0;
        else if (part.removed) dels += part.count || 0;
      }
      return { additions: adds, deletions: dels };
    } catch {
      return { additions: 0, deletions: 0 };
    }
  }, [oldValue, newValue]);

  const handleCopyOld = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(oldValue || "");
    setCopiedOld(true);
    setTimeout(() => setCopiedOld(false), 2000);
  };

  const handleCopyNew = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(newValue || "");
    setCopiedNew(true);
    setTimeout(() => setCopiedNew(false), 2000);
  };

  const customStyles = useMemo(
    () => ({
      variables: {
        light: {
          diffViewerBackground: "#ffffff",
          diffViewerColor: "#1e293b",
          addedBackground: "#f0fdf4",
          addedColor: "#15803d",
          removedBackground: "#fff1f2",
          removedColor: "#be123c",
          wordAddedBackground: "#bbf7d0",
          wordRemovedBackground: "#fecdd3",
          addedGutterBackground: "#dcfce7",
          removedGutterBackground: "#ffe4e6",
          gutterBackground: "#f8fafc",
          gutterBackgroundDark: "#f1f5f9",
          highlightBackground: "#f8fafc",
          highlightGutterBackground: "#e2e8f0",
          gutterColor: "#94a3b8",
          addedGutterColor: "#16a34a",
          removedGutterColor: "#e11d48",
        },
        dark: {
          diffViewerBackground: "#09090b",
          diffViewerColor: "#e4e4e7",
          addedBackground: "rgba(16, 185, 129, 0.12)",
          addedColor: "#6ee7b7",
          removedBackground: "rgba(244, 63, 94, 0.12)",
          removedColor: "#fda4af",
          wordAddedBackground: "rgba(16, 185, 129, 0.35)",
          wordRemovedBackground: "rgba(244, 63, 94, 0.35)",
          addedGutterBackground: "rgba(16, 185, 129, 0.2)",
          removedGutterBackground: "rgba(244, 63, 94, 0.2)",
          gutterBackground: "#111114",
          gutterBackgroundDark: "#0c0c0e",
          highlightBackground: "#18181b",
          highlightGutterBackground: "#27272a",
          gutterColor: "#52525b",
          addedGutterColor: "#34d399",
          removedGutterColor: "#fb7185",
        },
      },
      diffContainer: {
        width: "100%",
        minWidth: "unset",
        fontSize: "10.5px",
        lineHeight: "1.35",
      },
      line: {
        fontSize: "10.5px",
        lineHeight: "1.35",
        fontFamily:
          "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        padding: "0",
      },
      gutter: {
        fontSize: "9px",
        padding: "0 4px",
        width: "min-content",
        minWidth: "unset",
        maxWidth: "unset",
        textAlign: "right",
        whiteSpace: "nowrap",
      },
      marker: {
        width: "min-content",
        minWidth: "unset",
        maxWidth: "unset",
        padding: "0 2px",
        textAlign: "center",
        fontSize: "9.5px",
        whiteSpace: "nowrap",
      },
      codeFoldGutter: {
        width: "min-content",
        minWidth: "unset",
        maxWidth: "unset",
        padding: "0 2px",
        textAlign: "center",
      },
      content: {
        width: "auto",
        padding: "1px 4px",
      },
      contentText: {
        fontSize: "10.5px",
        lineHeight: "1.35",
        fontFamily:
          "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      },
      wordDiff: {
        padding: "0 1px",
        borderRadius: "2px",
      },
      wordAdded: {
        padding: "0 2px",
        borderRadius: "2px",
      },
      wordRemoved: {
        padding: "0 2px",
        borderRadius: "2px",
      },
    }),
    []
  );

  return (
    <div
      className={cn(
        "overflow-hidden flex flex-col select-text diff-viewer-compact w-full",
        splitView ? "is-split-view" : "is-inline-view",
        borderless
          ? "bg-white dark:bg-[#09090b]"
          : "rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#09090b]",
        className
      )}
    >
      {/* Diff Controls Header - Responsive */}
      <div className="px-2.5 sm:px-3 py-1.5 bg-slate-50/90 dark:bg-zinc-900/90 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-2 flex-wrap text-xs">
        {/* Left: Titles & Stats */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Diff:
          </span>
          <div className="flex items-center gap-1 font-mono text-[10px]">
            {additions > 0 && (
              <span className="px-1.5 py-0.2 rounded font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15">
                +{additions}
              </span>
            )}
            {deletions > 0 && (
              <span className="px-1.5 py-0.2 rounded font-bold text-rose-700 dark:text-rose-300 bg-rose-500/15">
                -{deletions}
              </span>
            )}
            {additions === 0 && deletions === 0 && (
              <span className="text-slate-400 dark:text-zinc-500">Identical</span>
            )}
          </div>
        </div>

        {/* Right: View Toggle (Split / Inline) */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="flex items-center bg-slate-200/70 dark:bg-zinc-800 rounded p-0.5 text-[11px] sm:text-xs select-none">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSplitView(true);
              }}
              className={cn(
                "px-2 sm:px-3 py-1 rounded flex items-center gap-1.5 transition-all cursor-pointer",
                splitView
                  ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 font-bold shadow-2xs"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 font-medium"
              )}
              title="Side-by-Side Split View"
            >
              <Columns size={12} className="shrink-0" />
              <span>Split</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSplitView(false);
              }}
              className={cn(
                "px-2 sm:px-3 py-1 rounded flex items-center gap-1.5 transition-all cursor-pointer",
                !splitView
                  ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 font-bold shadow-2xs"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 font-medium"
              )}
              title="Unified Inline View"
            >
              <AlignLeft size={12} className="shrink-0" />
              <span>Inline</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pane Titles Header */}
      {splitView ? (
        <div className="flex border-b border-slate-200/80 dark:border-zinc-800 bg-slate-100/60 dark:bg-zinc-900/40 text-[10px] sm:text-[10.5px] font-semibold text-slate-600 dark:text-zinc-300">
          <div className="flex-1 px-2.5 sm:px-3 py-1 border-r border-slate-200/80 dark:border-zinc-800 flex items-center justify-between min-w-0">
            <span className="text-rose-700 dark:text-rose-400 font-mono truncate">{oldTitle}</span>
            <span className="text-[9px] text-slate-400 font-normal shrink-0 ml-1">Before</span>
          </div>
          <div className="flex-1 px-2.5 sm:px-3 py-1 flex items-center justify-between min-w-0">
            <span className="text-emerald-700 dark:text-emerald-400 font-mono truncate">{newTitle}</span>
            <span className="text-[9px] text-slate-400 font-normal shrink-0 ml-1">After</span>
          </div>
        </div>
      ) : (
        <div className="px-2.5 sm:px-3 py-1 border-b border-slate-200/80 dark:border-zinc-800 bg-slate-100/60 dark:bg-zinc-900/40 text-[10px] sm:text-[10.5px] font-semibold text-slate-600 dark:text-zinc-300 flex items-center justify-between">
          <span className="truncate">Inline: {oldTitle} ➔ {newTitle}</span>
          <span className="text-[9px] text-slate-400 font-normal shrink-0 ml-1">Changes</span>
        </div>
      )}

      {/* Diff Content Container with smooth scroll */}
      <div
        className="overflow-x-auto overflow-y-auto font-mono text-[11px] leading-relaxed overscroll-contain contain-paint"
        style={{ maxHeight }}
      >
        <ReactDiffViewer
          oldValue={oldValue || ""}
          newValue={newValue || ""}
          splitView={splitView}
          useDarkTheme={darkActive}
          compareMethod={DiffMethod.CHARS}
          styles={customStyles}
          hideLineNumbers={false}
          showDiffOnly={false}
        />
      </div>
    </div>
  );
});

