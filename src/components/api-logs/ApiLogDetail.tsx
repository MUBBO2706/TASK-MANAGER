import React, { useState } from "react";
import { 
  Copy, 
  Check, 
  Terminal, 
  Clock, 
  Globe, 
  Server, 
  FolderKanban, 
  AlertCircle, 
  CheckCircle2, 
  ChevronLeft,
  Zap,
  Cpu,
  Layers,
  FileCode2
} from "lucide-react";
import { ApiLog } from "../../types";
import { JsonViewer } from "./JsonViewer";
import { cn } from "../../lib/utils";

interface ApiLogDetailProps {
  log: ApiLog;
  onBack?: () => void;
  isMobile?: boolean;
}

export function ApiLogDetail({ log, onBack, isMobile = false }: ApiLogDetailProps) {
  const [activeTab, setActiveTab] = useState<"payload" | "response" | "details" | "changes">("payload");
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
  const isClientError = log.statusCode >= 400 && log.statusCode < 500;
  const isServerError = log.statusCode >= 500;

  const getMethodBadgeClass = (method: string) => {
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

  const getStatusBadgeClass = () => {
    if (isSuccess) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    if (isClientError) return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    if (isServerError) return "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
    return "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30";
  };

  const handleCopyCurl = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    let curl = `curl -X ${log.method.toUpperCase()} "${origin}${log.endpoint}" \\\n`;
    curl += `  -H "Content-Type: application/json" \\\n`;
    curl += `  -H "x-api-key: YOUR_API_KEY"`;
    if (log.requestBody && Object.keys(log.requestBody).length > 0) {
      curl += ` \\\n  -d '${JSON.stringify(log.requestBody, null, 2)}'`;
    }
    navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 1500);
  };

  const handleCopyUrl = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    navigator.clipboard.writeText(`${origin}${log.endpoint}`);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 1500);
  };

  const formattedDate = new Date(log.createdAt).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-black overflow-hidden select-text">
      {/* Top Header */}
      <div className="flex-shrink-0 p-3 sm:p-4 border-b border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
            {isMobile && onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white bg-transparent border border-slate-200 dark:border-zinc-800 rounded-md hover:bg-slate-100/70 dark:hover:bg-zinc-900 transition-colors mr-0.5 cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Logs</span>
              </button>
            )}

            {/* Method Pill */}
            <span
              className={cn(
                "px-2 py-0.5 text-[11px] font-bold font-mono uppercase tracking-wider rounded border",
                getMethodBadgeClass(log.method)
              )}
            >
              {log.method}
            </span>

            {/* Status Pill */}
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded border font-mono",
                getStatusBadgeClass()
              )}
            >
              {isSuccess ? (
                <CheckCircle2 size={11} className="stroke-[2.5]" />
              ) : (
                <AlertCircle size={11} className="stroke-[2.5]" />
              )}
              {log.statusCode}
            </span>

            {/* Latency */}
            <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-1.5 py-0.5 rounded">
              <Zap size={10} className="text-amber-500" />
              {log.durationMs}ms
            </span>

            {/* Timestamp */}
            <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-400 dark:text-zinc-500 hidden sm:inline-flex">
              <Clock size={10} />
              {formattedDate}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleCopyCurl}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-transparent border border-slate-200 dark:border-zinc-800 rounded-md hover:bg-slate-100/70 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              title="Copy cURL command"
            >
              {copiedCurl ? (
                <>
                  <Check size={12} className="text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Terminal size={12} />
                  <span className="hidden sm:inline">Copy cURL</span>
                  <span className="sm:hidden">cURL</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyUrl}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-transparent border border-slate-200 dark:border-zinc-800 rounded-md hover:bg-slate-100/70 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              title="Copy endpoint path"
            >
              {copiedUrl ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        {/* Endpoint path display */}
        <div className="flex items-center gap-2 bg-slate-100/70 dark:bg-zinc-900/80 px-2.5 py-1.2 rounded-md border border-slate-200/80 dark:border-zinc-800/80 font-mono text-[11.5px] text-slate-800 dark:text-zinc-200 break-all select-all">
          <Globe size={12} className="text-slate-400 dark:text-zinc-500 shrink-0" />
          <span>{log.endpoint}</span>
        </div>

        {/* Action tag if present */}
        {log.actionType && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-slate-600 dark:text-zinc-400 flex-wrap">
            <span className="font-semibold text-slate-500 dark:text-zinc-400">Action:</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-zinc-800 font-mono text-slate-700 dark:text-zinc-300">
              {log.actionType}
            </span>
            {log.projectId && (
              <>
                <span className="text-slate-300 dark:text-zinc-700">•</span>
                <span className="font-semibold text-slate-500 dark:text-zinc-400">Project:</span>
                <span className="px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-zinc-800 font-mono text-slate-700 dark:text-zinc-300">
                  {log.projectId}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex-shrink-0 flex items-center gap-1 px-3 sm:px-4 py-1.5 bg-slate-100/60 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("payload")}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap",
            activeTab === "payload"
              ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200/80 dark:border-zinc-700"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-900"
          )}
        >
          <FileCode2 size={12} />
          <span>Request Body</span>
          {log.requestBody && Object.keys(log.requestBody).length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("response")}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap",
            activeTab === "response"
              ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200/80 dark:border-zinc-700"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-900"
          )}
        >
          <Server size={12} />
          <span>Response Body</span>
          {isSuccess ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("details")}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap",
            activeTab === "details"
              ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200/80 dark:border-zinc-700"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-900"
          )}
        >
          <Cpu size={12} />
          <span>Client & Parameters</span>
        </button>

        {log.changesSummary && (
          <button
            type="button"
            onClick={() => setActiveTab("changes")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap",
              activeTab === "changes"
                ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200/80 dark:border-zinc-700"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-900"
            )}
          >
            <Layers size={12} />
            <span>Changes Summary</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Error message banner if present */}
        {log.errorMessage && (
          <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 text-xs">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <AlertCircle size={13} className="text-rose-500" />
              <span>Execution Error</span>
            </div>
            <p className="font-mono text-[11px] leading-relaxed break-words">{log.errorMessage}</p>
          </div>
        )}

        {/* Tab 1: Request Payload */}
        {activeTab === "payload" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                Incoming Request Payload (JSON)
              </h4>
              <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                HTTP {log.method.toUpperCase()}
              </span>
            </div>
            <JsonViewer
              data={log.requestBody}
              title="Request Body"
              emptyMessage="No request body payload sent for this request."
            />
          </div>
        )}

        {/* Tab 2: Response Body */}
        {activeTab === "response" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                Server Response Output
              </h4>
              <span className="text-[10.5px] font-mono text-slate-500 dark:text-zinc-400">
                HTTP Status {log.statusCode}
              </span>
            </div>
            <JsonViewer
              data={log.responseBody}
              title="Response JSON"
              emptyMessage="No response body returned from server."
            />
          </div>
        )}

        {/* Tab 3: Client & Parameters */}
        {activeTab === "details" && (
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 p-3.5 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 mb-2.5 flex items-center gap-1.5">
                <Globe size={13} className="text-sky-500" />
                <span>Client Metadata</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-2 rounded bg-slate-50 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800/70">
                  <div className="text-[9.5px] uppercase font-bold text-slate-400 dark:text-zinc-500 mb-0.5">
                    Client IP Address
                  </div>
                  <div className="font-mono text-xs text-slate-800 dark:text-zinc-200">
                    {log.ipAddress || "127.0.0.1"}
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-50 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800/70">
                  <div className="text-[9.5px] uppercase font-bold text-slate-400 dark:text-zinc-500 mb-0.5">
                    Execution Latency
                  </div>
                  <div className="font-mono text-xs text-slate-800 dark:text-zinc-200 flex items-center gap-1">
                    <Zap size={11} className="text-amber-500" />
                    <span>{log.durationMs} milliseconds</span>
                  </div>
                </div>

                <div className="sm:col-span-2 p-2 rounded bg-slate-50 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800/70">
                  <div className="text-[9.5px] uppercase font-bold text-slate-400 dark:text-zinc-500 mb-0.5">
                    User Agent
                  </div>
                  <div className="font-mono text-[10.5px] text-slate-700 dark:text-zinc-300 break-all">
                    {log.userAgent || "Unknown"}
                  </div>
                </div>
              </div>
            </div>

            {/* Query Parameters */}
            <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 p-3.5 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 mb-2.5 flex items-center gap-1.5">
                <Terminal size={13} className="text-emerald-500" />
                <span>URL Query Parameters</span>
              </h4>
              {log.requestQuery && Object.keys(log.requestQuery).length > 0 ? (
                <div className="space-y-1.5">
                  {Object.entries(log.requestQuery).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/60 text-xs font-mono"
                    >
                      <span className="font-semibold text-slate-600 dark:text-zinc-400">{k}</span>
                      <span className="text-slate-900 dark:text-zinc-100">{String(v)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-zinc-500 italic">
                  No URL query parameters present.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Changes Summary */}
        {activeTab === "changes" && log.changesSummary && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
              Database / State Modifications
            </h4>
            <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 p-3.5 shadow-2xs space-y-2.5">
              {log.changesSummary.tasksCount !== undefined && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300">
                  <FolderKanban size={13} className="text-sky-500" />
                  <span>Tasks Affected:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {log.changesSummary.tasksCount}
                  </span>
                </div>
              )}
              {log.changesSummary.title && (
                <div className="text-xs text-slate-700 dark:text-zinc-300">
                  <span className="font-semibold text-slate-500 dark:text-zinc-400">Task Title:</span>{" "}
                  <span className="font-mono">{log.changesSummary.title}</span>
                </div>
              )}
              {log.changesSummary.stagingProjectId && (
                <div className="text-xs text-slate-700 dark:text-zinc-300">
                  <span className="font-semibold text-slate-500 dark:text-zinc-400">Created Staging Project:</span>{" "}
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {log.changesSummary.stagingProjectId} ({log.changesSummary.stagingProjectName || "Staging"})
                  </span>
                </div>
              )}
              <JsonViewer data={log.changesSummary} title="Detailed Summary Payload" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
