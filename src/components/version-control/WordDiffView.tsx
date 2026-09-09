import React, { useMemo } from "react";
import * as Diff from "diff";
import { ArrowRight } from "lucide-react";
import { cn } from "../../lib/utils";

interface WordDiffViewProps {
  label: string;
  oldText: string;
  newText: string;
  isLongText?: boolean;
  className?: string;
}

export const WordDiffView: React.FC<WordDiffViewProps> = ({
  label,
  oldText = "",
  newText = "",
  isLongText = false,
  className,
}) => {
  const diffParts = useMemo(() => {
    try {
      return Diff.diffWordsWithSpace(oldText || "", newText || "");
    } catch {
      return [
        { value: oldText || "", removed: true },
        { value: newText || "", added: true },
      ];
    }
  }, [oldText, newText]);

  const oldTokens = useMemo(() => {
    return diffParts
      .filter((part) => !part.added)
      .map((part, i) => {
        if (part.removed) {
          return (
            <span
              key={i}
              className="bg-rose-500/20 text-rose-700 dark:text-rose-300 line-through rounded-xs px-0.5 font-medium"
            >
              {part.value}
            </span>
          );
        }
        return (
          <span key={i} className="text-slate-600 dark:text-zinc-400">
            {part.value}
          </span>
        );
      });
  }, [diffParts]);

  const newTokens = useMemo(() => {
    return diffParts
      .filter((part) => !part.removed)
      .map((part, i) => {
        if (part.added) {
          return (
            <span
              key={i}
              className="bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-semibold rounded-xs px-0.5"
            >
              {part.value}
            </span>
          );
        }
        return (
          <span key={i} className="text-slate-800 dark:text-zinc-200">
            {part.value}
          </span>
        );
      });
  }, [diffParts]);

  const isTrulyLong = isLongText || (oldText && oldText.length > 70) || (newText && newText.length > 70) || oldText.includes("\n") || newText.includes("\n");

  // Compact inline format for very short text (e.g., short Title)
  if (!isTrulyLong) {
    return (
      <div className={cn("flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 text-xs", className)}>
        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider sm:w-20 shrink-0 sm:pt-0.5">
          {label}:
        </span>
        <div className="flex items-start gap-1.5 flex-wrap min-w-0 flex-1 leading-relaxed">
          <div className="inline-block break-words">
            {oldText.trim() ? oldTokens : <span className="text-slate-400 dark:text-zinc-500 italic">(Empty)</span>}
          </div>
          <ArrowRight size={10} className="text-slate-400 shrink-0 mt-1" />
          <div className="inline-block break-words">
            {newText.trim() ? newTokens : <span className="text-slate-400 dark:text-zinc-500 italic">(Empty)</span>}
          </div>
        </div>
      </div>
    );
  }

  // Containerless Side-by-Side Old vs New Word-level comparison for descriptions & long text
  return (
    <div className={cn("space-y-1 text-xs py-1", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">
          {label} (Old vs New):
        </span>
        <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono">
          Word differences highlighted
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-y border-slate-100 dark:border-zinc-800/60 py-2">
        {/* Old (Before) side */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 pb-0.5 border-b border-slate-100 dark:border-zinc-800/40">
            <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">Old (Before)</span>
            <span className="text-[8.5px] text-rose-600/80">Deleted words</span>
          </div>
          <div className="text-xs leading-relaxed break-words whitespace-pre-wrap max-h-72 overflow-y-auto pr-1">
            {oldText.trim() ? (
              oldTokens
            ) : (
              <span className="text-slate-400 dark:text-zinc-500 italic text-[11px]">(Empty description)</span>
            )}
          </div>
        </div>

        {/* New (After) side */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 pb-0.5 border-b border-slate-100 dark:border-zinc-800/40">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">New (After)</span>
            <span className="text-[8.5px] text-emerald-600/80">Added words</span>
          </div>
          <div className="text-xs leading-relaxed break-words whitespace-pre-wrap max-h-72 overflow-y-auto pr-1">
            {newText.trim() ? (
              newTokens
            ) : (
              <span className="text-slate-400 dark:text-zinc-500 italic text-[11px]">(Empty description)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
