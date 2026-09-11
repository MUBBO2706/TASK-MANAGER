import React, { useState } from "react";
import { Copy, Check, ChevronRight, ChevronUp } from "lucide-react";
import { cn } from "../../lib/utils";

interface JsonViewerProps {
  data: any;
  title?: string;
  emptyMessage?: string;
  defaultWrap?: boolean;
  defaultCollapsed?: boolean;
  language?: string;
}

export function JsonViewer({
  data,
  title,
  emptyMessage = "Empty payload (null or empty body)",
  defaultCollapsed = true,
  language = "JSON",
}: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  if (data === null || data === undefined || (typeof data === "object" && Object.keys(data).length === 0)) {
    return (
      <div className="-mx-2.5 sm:mx-0 border-y sm:border sm:rounded-lg border-slate-200/80 dark:border-zinc-800/80 bg-slate-100/40 dark:bg-zinc-950/40 p-3 text-center">
        <p className="text-xs text-slate-500 dark:text-zinc-400 italic">{emptyMessage}</p>
      </div>
    );
  }

  const jsonString = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const byteSize = new Blob([jsonString]).size;
  const formattedSize = byteSize > 1024 ? `${(byteSize / 1024).toFixed(1)} KB` : `${byteSize} B`;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="-mx-2.5 sm:mx-0 border-y sm:border sm:rounded-lg border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs">
      {/* Accordion Row Header: Title, Size on right, and Chevron (No Copy Button here!) */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "flex items-center justify-between px-3 sm:px-3.5 transition-colors cursor-pointer select-none bg-slate-50/75 dark:bg-zinc-900/60 hover:bg-slate-100/70 dark:hover:bg-zinc-900 gap-2",
          isCollapsed ? "py-2" : "py-2 border-b border-slate-200/80 dark:border-zinc-800/80"
        )}
      >
        {/* Left: Title */}
        <div className="flex items-center gap-1.5 min-w-0">
          {title && (
            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
              {title}
            </span>
          )}
        </div>

        {/* Right: Size badge in list, followed by Chevron (Right if collapsed, Up if expanded) */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-medium shrink-0">
            {formattedSize}
          </span>

          <span
            className="p-0.5 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors shrink-0"
            title={isCollapsed ? "Expand" : "Collapse"}
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronUp size={14} />}
          </span>
        </div>
      </div>

      {/* Expanded Content: Container-less with Code Block inside */}
      {!isCollapsed && (
        <div className="bg-slate-50/30 dark:bg-zinc-950/60">
          {/* Code block header: Language on left, Copy button on right */}
          <div className="flex items-center justify-between px-3 sm:px-3.5 py-1.5 bg-slate-100/70 dark:bg-zinc-900/80 border-b border-slate-200/70 dark:border-zinc-800/70">
            <span className="text-[10.5px] font-mono font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              {language}
            </span>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white rounded border border-slate-200 dark:border-zinc-800 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Copy payload"
            >
              {copied ? (
                <>
                  <Check size={11} className="text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[10.5px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={11} />
                  <span className="text-[10.5px]">Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Code block body with auto-wrapping on by default */}
          <div className="p-3 sm:p-3.5 overflow-x-auto max-h-[420px] sm:max-h-[480px] overflow-y-auto overscroll-contain">
            <pre className="text-[11px] sm:text-xs font-mono text-slate-800 dark:text-zinc-200 leading-relaxed tab-size-2 select-text whitespace-pre-wrap break-all">
              <code>{jsonString}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
