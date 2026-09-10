import React, { useState } from "react";
import { Copy, Check, ChevronRight, ChevronDown } from "lucide-react";

interface JsonViewerProps {
  data: any;
  title?: string;
  emptyMessage?: string;
}

export function JsonViewer({ data, title, emptyMessage = "Empty payload (null or empty body)" }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (data === null || data === undefined || (typeof data === "object" && Object.keys(data).length === 0)) {
    return (
      <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-100/40 dark:bg-zinc-950/40 p-4 text-center">
        <p className="text-xs text-slate-500 dark:text-zinc-400 italic">{emptyMessage}</p>
      </div>
    );
  }

  const jsonString = typeof data === "string" ? data : JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/90 overflow-hidden shadow-2xs">
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 dark:bg-zinc-900/70 border-b border-slate-200/70 dark:border-zinc-800/70">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
          {title && (
            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              {title}
            </span>
          )}
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
            {new Blob([jsonString]).size} bytes
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy JSON</span>
            </>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-3.5 overflow-x-auto max-h-[480px] overflow-y-auto">
          <pre className="text-xs font-mono text-slate-800 dark:text-zinc-200 leading-relaxed tab-size-2">
            <code>{jsonString}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
