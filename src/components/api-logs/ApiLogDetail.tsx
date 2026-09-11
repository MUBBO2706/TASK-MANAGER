import React, { useState, useMemo } from "react";
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
  Layers, 
  FileCode2, 
  Bot,
  Shield, 
  X, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight,
  Share2, 
  ExternalLink 
} from "lucide-react";
import { ApiLog } from "../../types";
import { JsonViewer } from "./JsonViewer";
import { cn } from "../../lib/utils";

interface ApiLogDetailProps {
  log: ApiLog;
  onBack?: () => void;
  onClose?: () => void;
  isMobile?: boolean;
}

export function ApiLogDetail({ log, onBack, onClose, isMobile = false }: ApiLogDetailProps) {
  const [activeTab, setActiveTab] = useState<"payload" | "response" | "details" | "changes">("payload");
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedRequestBody, setCopiedRequestBody] = useState(false);
  const [copiedResponseBody, setCopiedResponseBody] = useState(false);
  const [copiedUserAgent, setCopiedUserAgent] = useState(false);
  const [copiedHeaderKey, setCopiedHeaderKey] = useState<string | null>(null);
  const [headerSearchQuery, setHeaderSearchQuery] = useState("");
  const [showFullUserAgent, setShowFullUserAgent] = useState(false);
  const [isCopyDropdownOpen, setIsCopyDropdownOpen] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isAgentContextExpanded, setIsAgentContextExpanded] = useState(false);
  const [copiedAgentNotes, setCopiedAgentNotes] = useState(false);
  const [isClientInfoExpanded, setIsClientInfoExpanded] = useState(false);
  const [isHeadersExpanded, setIsHeadersExpanded] = useState(false);
  const [isQueryParamsExpanded, setIsQueryParamsExpanded] = useState(false);
  const [isChangesExpanded, setIsChangesExpanded] = useState(false);
  const [copiedChangesAgentNotes, setCopiedChangesAgentNotes] = useState(false);

  const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
  const isClientError = log.statusCode >= 400 && log.statusCode < 500;
  const isServerError = log.statusCode >= 500;

  const getStatusText = (status: number) => {
    switch (status) {
      case 200: return "OK";
      case 201: return "Created";
      case 202: return "Accepted";
      case 204: return "No Content";
      case 301: return "Moved Permanently";
      case 302: return "Found";
      case 304: return "Not Modified";
      case 400: return "Bad Request";
      case 401: return "Unauthorized";
      case 403: return "Forbidden";
      case 404: return "Not Found";
      case 405: return "Method Not Allowed";
      case 409: return "Conflict";
      case 422: return "Unprocessable Entity";
      case 429: return "Too Many Requests";
      case 500: return "Internal Server Error";
      case 502: return "Bad Gateway";
      case 503: return "Service Unavailable";
      case 504: return "Gateway Timeout";
      default:
        if (status >= 200 && status < 300) return "Success";
        if (status >= 400 && status < 500) return "Client Error";
        return "Server Error";
    }
  };

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

  const getRelativeTime = (timestamp: number) => {
    const diff = Math.max(0, Date.now() - timestamp);
    const secs = Math.floor(diff / 1000);
    if (secs < 5) return "Just now";
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(log.endpoint);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 1500);
  };

  const handleCopyRequestBody = () => {
    if (!log.requestBody) return;
    navigator.clipboard.writeText(JSON.stringify(log.requestBody, null, 2));
    setCopiedRequestBody(true);
    setTimeout(() => setCopiedRequestBody(false), 1500);
  };

  const handleCopyResponseBody = () => {
    if (!log.responseBody) return;
    navigator.clipboard.writeText(JSON.stringify(log.responseBody, null, 2));
    setCopiedResponseBody(true);
    setTimeout(() => setCopiedResponseBody(false), 1500);
  };

  const handleCopyHeader = (key: string, value: any) => {
    const strVal = typeof value === "object" ? JSON.stringify(value) : String(value);
    navigator.clipboard.writeText(strVal);
    setCopiedHeaderKey(key);
    setTimeout(() => setCopiedHeaderKey(null), 1500);
  };

  const handleCopyUserAgent = () => {
    if (!log.userAgent) return;
    navigator.clipboard.writeText(log.userAgent);
    setCopiedUserAgent(true);
    setTimeout(() => setCopiedUserAgent(false), 1500);
  };

  const formattedDate = new Date(log.createdAt).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formatShortTime = (timestamp: number | string) => {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const timeStr = date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) {
      return `Today ${timeStr}`;
    }
    if (isYesterday) {
      return `Yesterday ${timeStr}`;
    }

    const day = date.getDate();
    const month = date.toLocaleDateString([], { month: "short" });
    if (date.getFullYear() === now.getFullYear()) {
      return `${day} ${month} ${timeStr}`;
    }
    return `${day} ${month} ${date.getFullYear()} ${timeStr}`;
  };

  const headersList = useMemo(() => {
    if (!log.requestHeaders) return [];
    return Object.entries(log.requestHeaders).filter(([key, val]) => {
      if (!headerSearchQuery.trim()) return true;
      const q = headerSearchQuery.toLowerCase();
      const valStr = typeof val === "object" ? JSON.stringify(val) : String(val);
      return key.toLowerCase().includes(q) || valStr.toLowerCase().includes(q);
    });
  }, [log.requestHeaders, headerSearchQuery]);

  const hasRequestBody = Boolean(log.requestBody && Object.keys(log.requestBody).length > 0);
  const hasResponseBody = Boolean(
    log.responseBody &&
    (typeof log.responseBody === "object"
      ? Object.keys(log.responseBody).length > 0
      : Boolean(log.responseBody))
  );
  const headersCount = log.requestHeaders ? Object.keys(log.requestHeaders).length : 0;
  const isStagingProject = Boolean(log.projectId?.includes("staging") || log.changesSummary?.stagingProjectId);

  const copyOptions = useMemo(() => [
    {
      id: "curl",
      label: "cURL Command",
      icon: Terminal,
      action: handleCopyCurl,
    },
    {
      id: "url",
      label: "Full URL",
      icon: ExternalLink,
      action: handleCopyUrl,
    },
    {
      id: "endpoint",
      label: "Endpoint Path",
      icon: Globe,
      action: handleCopyEndpoint,
    },
    ...(hasRequestBody ? [{
      id: "payload",
      label: "Request Payload",
      icon: FileCode2,
      action: handleCopyRequestBody,
    }] : []),
    ...(hasResponseBody ? [{
      id: "response",
      label: "Response Body",
      icon: Server,
      action: handleCopyResponseBody,
    }] : []),
  ], [hasRequestBody, hasResponseBody, handleCopyCurl, handleCopyUrl, handleCopyEndpoint, handleCopyRequestBody, handleCopyResponseBody]);

  const handleSelectCopyOption = (option: { id: string; label: string; action: () => void }) => {
    option.action();
    setCopiedType(option.id);
    setIsCopyDropdownOpen(false);
    setTimeout(() => setCopiedType(null), 1800);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-black overflow-hidden select-text">
      {/* Top Header */}
      {isMobile ? (
        /* Mobile Sticky App Bar */
        <div className="flex-shrink-0 h-12 px-3 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between gap-2 z-20">
          <div className="flex items-center gap-1.5 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center p-1.5 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer rounded-md shrink-0"
                aria-label="Back to logs"
              >
                <ChevronLeft size={18} className="shrink-0" />
              </button>
            )}

            <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
              Log Details
            </h1>
          </div>

          <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 shrink-0 select-none">
            {formatShortTime(log.createdAt)}
          </div>
        </div>
      ) : (
        /* Desktop Top Header */
        <div className="flex-shrink-0 p-3 sm:p-4 border-b border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
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
                <span>{log.statusCode}</span>
                <span className="font-sans font-normal opacity-80 text-[10px]">
                  {getStatusText(log.statusCode)}
                </span>
              </span>

              {/* Latency */}
              <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-1.5 py-0.5 rounded">
                <Zap size={10} className="text-amber-500" />
                {log.durationMs}ms
              </span>

              {/* Timestamp */}
              <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-400 dark:text-zinc-500">
                <Clock size={10} />
                {formattedDate} ({getRelativeTime(log.createdAt)})
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={handleCopyCurl}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-transparent border border-slate-200 dark:border-zinc-800 rounded-md hover:bg-slate-100/70 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
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
                    <span>Copy cURL</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-transparent border border-slate-200 dark:border-zinc-800 rounded-md hover:bg-slate-100/70 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                title="Copy endpoint full URL"
              >
                {copiedUrl ? (
                  <>
                    <Check size={12} className="text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Endpoint path display */}
          <div className="flex items-center justify-between gap-2 bg-slate-100/70 dark:bg-zinc-900/80 px-2.5 py-1.5 rounded-md border border-slate-200/80 dark:border-zinc-800/80 font-mono text-[11.5px] text-slate-800 dark:text-zinc-200">
            <div className="flex items-center gap-2 min-w-0 truncate select-all">
              <Globe size={13} className="text-slate-400 dark:text-zinc-500 shrink-0" />
              <span className="truncate">{log.endpoint}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyEndpoint}
              className="text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors shrink-0 p-0.5 cursor-pointer"
              title="Copy path only"
            >
              {copiedEndpoint ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            </button>
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
                  <span className={cn(
                    "px-1.5 py-0.2 rounded font-mono",
                    isStagingProject 
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-200/60 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                  )}>
                    {log.projectId}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mobile-Only Compact Container-less Stats & Endpoint Overview */}
      {isMobile && (
        <div className="flex-shrink-0 px-3 py-2.5 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 space-y-2 z-10">
          {/* Row 1: Operation Method, Status, Duration & Single Copy Dropdown */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              {/* Method Pill */}
              <span
                className={cn(
                  "px-2 py-0.5 text-[10.5px] font-bold font-mono uppercase tracking-wider rounded border shrink-0",
                  getMethodBadgeClass(log.method)
                )}
              >
                {log.method}
              </span>

              {/* Status Pill */}
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-semibold rounded border font-mono shrink-0",
                  getStatusBadgeClass()
                )}
              >
                {isSuccess ? (
                  <CheckCircle2 size={11} className="stroke-[2.5]" />
                ) : (
                  <AlertCircle size={11} className="stroke-[2.5]" />
                )}
                <span>{log.statusCode}</span>
                <span className="font-sans font-normal opacity-85 text-[10px] hidden xs:inline">
                  {getStatusText(log.statusCode)}
                </span>
              </span>

              {/* Duration Pill */}
              <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-slate-200/70 dark:border-zinc-800/70 shrink-0">
                <Zap size={10} className="text-amber-500" />
                <span>{log.durationMs}ms</span>
              </span>
            </div>

            {/* Single Copy Button with Dropdown */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsCopyDropdownOpen(!isCopyDropdownOpen)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Copy options"
              >
                {copiedType ? (
                  <>
                    <Check size={12} className="text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} className="text-slate-500 dark:text-zinc-400" />
                    <span className="text-[11px]">Copy</span>
                    <ChevronDown size={11} className={cn("text-slate-400 dark:text-zinc-500 transition-transform duration-150", isCopyDropdownOpen && "rotate-180")} />
                  </>
                )}
              </button>

              {isCopyDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsCopyDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                    <div className="px-2.5 py-1 text-[9.5px] uppercase font-bold text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800/80 mb-0.5 select-none tracking-wider">
                      Copy
                    </div>
                    {copyOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isCopied = copiedType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectCopyOption(opt)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 text-left text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Icon size={12} className="text-slate-500 dark:text-zinc-400" />
                            <span>{opt.label}</span>
                          </span>
                          {isCopied && <Check size={11} className="text-emerald-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Row 2: Endpoint Path in its own separate full-width row */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono min-w-0">
            <Globe size={12} className="text-slate-400 dark:text-zinc-500 shrink-0" />
            <span className="truncate select-all text-slate-800 dark:text-zinc-200 font-medium">
              {log.endpoint}
            </span>
          </div>

          {/* Row 3: Action & Project in its own separate row */}
          {(log.actionType || log.projectId) && (
            <div className="flex items-center gap-1.5 text-[10.5px] font-mono min-w-0 flex-wrap">
              {log.actionType && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 text-[10px] text-slate-600 dark:text-zinc-400">
                  <span className="text-slate-400 dark:text-zinc-500 font-sans">Action:</span>
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">{log.actionType}</span>
                </span>
              )}
              {log.projectId && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono",
                    isStagingProject
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold"
                      : "bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-800"
                  )}
                >
                  <span className="text-slate-400 dark:text-zinc-500 font-sans">Project:</span>
                  <span>{log.projectId}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex-shrink-0 flex items-center gap-1 px-2.5 sm:px-4 py-1.5 bg-slate-100/80 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 overflow-x-auto no-scrollbar touch-pan-x">
        <button
          type="button"
          onClick={() => setActiveTab("payload")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap min-h-[34px] sm:min-h-0",
            activeTab === "payload"
              ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200/80 dark:border-zinc-700"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-900"
          )}
        >
          <FileCode2 size={13} className="shrink-0" />
          <span>Request Body</span>
          {hasRequestBody && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("response")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap min-h-[34px] sm:min-h-0",
            activeTab === "response"
              ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200/80 dark:border-zinc-700"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-900"
          )}
        >
          <Server size={13} className="shrink-0" />
          <span>Response Body</span>
          {isSuccess ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("details")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap min-h-[34px] sm:min-h-0",
            activeTab === "details"
              ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200/80 dark:border-zinc-700"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-900"
          )}
        >
          <Shield size={13} className="text-violet-500 shrink-0" />
          <span>Headers & Client</span>
          {headersCount > 0 && (
            <span className="text-[10px] font-mono px-1 py-0.2 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300 font-bold shrink-0">
              {headersCount}
            </span>
          )}
        </button>

        {log.changesSummary && (
          <button
            type="button"
            onClick={() => setActiveTab("changes")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap min-h-[34px] sm:min-h-0",
              activeTab === "changes"
                ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200/80 dark:border-zinc-700"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-900"
            )}
          >
            <Layers size={13} className="shrink-0" />
            <span>Changes</span>
            {isStagingProject && (
              <span className="text-[9.5px] uppercase tracking-wider font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                Staging
              </span>
            )}
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 space-y-3 sm:space-y-4 overscroll-contain">
        {/* Error message banner if present */}
        {log.errorMessage && (
          <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/90 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 text-xs shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle size={14} className="text-rose-500 shrink-0" />
                <span>Execution Error ({log.statusCode})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(log.errorMessage || "");
                }}
                className="text-[11px] font-medium text-rose-700 dark:text-rose-300 hover:underline cursor-pointer"
              >
                Copy Error
              </button>
            </div>
            <p className="font-mono text-[11px] leading-relaxed break-words bg-white/60 dark:bg-black/40 p-2 rounded border border-rose-200/60 dark:border-rose-900/40 select-all">
              {log.errorMessage}
            </p>
          </div>
        )}

        {/* Tab 1: Request Payload */}
        {activeTab === "payload" && (
          <div className="space-y-3">
            {/* Agent Context & Notes - Edge-to-Edge Compact Expandable Accordion */}
            {Boolean(log.changesSummary?.agentNotes || log.changesSummary?.agentHeader || log.requestBody?._meta) && (
              <div className="-mx-2.5 sm:mx-0 border-y sm:border sm:rounded-lg border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs">
                <div
                  onClick={() => setIsAgentContextExpanded(!isAgentContextExpanded)}
                  className={cn(
                    "flex items-center justify-between px-3 sm:px-3.5 transition-colors cursor-pointer select-none bg-slate-50/75 dark:bg-zinc-900/60 hover:bg-slate-100/70 dark:hover:bg-zinc-900 gap-2",
                    !isAgentContextExpanded ? "py-2" : "py-2 border-b border-slate-200/80 dark:border-zinc-800/80"
                  )}
                >
                  {/* Left: Heading (NO bot icon) + Metadata */}
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                      Agent Context & Notes
                    </span>
                    {log.changesSummary?.agentHeader?.testingBy && (
                      <>
                        <span className="text-slate-300 dark:text-zinc-700 text-[10px] shrink-0">•</span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 shrink-0">
                          By: {log.changesSummary.agentHeader.testingBy}
                        </span>
                      </>
                    )}
                    {log.changesSummary?.agentHeader?.testName && (
                      <>
                        <span className="text-slate-300 dark:text-zinc-700 text-[10px] shrink-0">•</span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 shrink-0">
                          Test: {log.changesSummary.agentHeader.testName}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Right: Chevron (ChevronRight when collapsed, ChevronUp when expanded) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="p-0.5 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors shrink-0"
                      title={isAgentContextExpanded ? "Collapse" : "Expand"}
                      aria-label={isAgentContextExpanded ? "Collapse" : "Expand"}
                    >
                      {!isAgentContextExpanded ? <ChevronRight size={14} /> : <ChevronUp size={14} />}
                    </span>
                  </div>
                </div>

                {/* Expanded Body - Container-less with Code Block inside */}
                {isAgentContextExpanded && (
                  <div className="bg-slate-50/30 dark:bg-zinc-950/60">
                    {/* Code block header: Language on left, Copy button on right */}
                    <div className="flex items-center justify-between px-3 sm:px-3.5 py-1.5 bg-slate-100/70 dark:bg-zinc-900/80 border-b border-slate-200/70 dark:border-zinc-800/70">
                      <span className="text-[10.5px] font-mono font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                        {typeof (log.changesSummary?.agentNotes ?? log.requestBody?._meta) === "object" ? "JSON" : "NOTES"}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rawData = log.changesSummary?.agentNotes ?? log.requestBody?._meta;
                          const notesStr = typeof rawData === "string" 
                            ? rawData 
                            : JSON.stringify(rawData, null, 2);
                          navigator.clipboard.writeText(notesStr);
                          setCopiedAgentNotes(true);
                          setTimeout(() => setCopiedAgentNotes(false), 1500);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white rounded border border-slate-200 dark:border-zinc-800 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Copy Agent Notes"
                      >
                        {copiedAgentNotes ? (
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

                    {/* Code block body */}
                    <div className="p-3 sm:p-3.5 overflow-x-auto max-h-[420px] sm:max-h-[480px] overflow-y-auto overscroll-contain">
                      <pre className="text-[11px] sm:text-xs font-mono text-slate-800 dark:text-zinc-200 leading-relaxed tab-size-2 select-text whitespace-pre-wrap break-all">
                        <code>
                          {(() => {
                            const rawData = log.changesSummary?.agentNotes ?? log.requestBody?._meta;
                            return typeof rawData === "string"
                              ? rawData
                              : JSON.stringify(rawData, null, 2);
                          })()}
                        </code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                Incoming Request Payload
              </h4>
              <span className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-mono">
                HTTP {log.method.toUpperCase()}
              </span>
            </div>

            <JsonViewer
              data={log.requestBody}
              title="Request Body JSON"
              emptyMessage="No request body payload sent for this request."
              defaultWrap={true}
            />
          </div>
        )}

        {/* Tab 2: Response Body */}
        {activeTab === "response" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                Server Response Output
              </h4>
              <span className="text-[10.5px] font-mono text-slate-500 dark:text-zinc-400">
                HTTP Status {log.statusCode} ({getStatusText(log.statusCode)})
              </span>
            </div>

            <JsonViewer
              data={log.responseBody}
              title="Response JSON"
              emptyMessage="No response body returned from server."
              defaultWrap={true}
            />
          </div>
        )}

        {/* Tab 3: Client & Parameters */}
        {activeTab === "details" && (
          <div className="space-y-3">
            {/* Client & Execution Info Accordion */}
            <div className="-mx-2.5 sm:mx-0 border-y sm:border sm:rounded-lg border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs">
              <div
                onClick={() => setIsClientInfoExpanded(!isClientInfoExpanded)}
                className={cn(
                  "flex items-center justify-between px-3 sm:px-3.5 transition-colors cursor-pointer select-none bg-slate-50/75 dark:bg-zinc-900/60 hover:bg-slate-100/70 dark:hover:bg-zinc-900 gap-2",
                  !isClientInfoExpanded ? "py-2" : "py-2 border-b border-slate-200/80 dark:border-zinc-800/80"
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Globe size={14} className="text-sky-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                    Client & Execution Info
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-medium shrink-0">
                    {log.ipAddress || "127.0.0.1"}
                  </span>
                  <span
                    className="p-0.5 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors shrink-0"
                    title={isClientInfoExpanded ? "Collapse" : "Expand"}
                    aria-label={isClientInfoExpanded ? "Collapse" : "Expand"}
                  >
                    {!isClientInfoExpanded ? <ChevronRight size={14} /> : <ChevronUp size={14} />}
                  </span>
                </div>
              </div>

              {/* Expanded Body - Container-less & Compact */}
              {isClientInfoExpanded && (
                <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60 bg-transparent">
                  {/* Row 1: Client IP */}
                  <div className="flex items-center justify-between px-3 sm:px-3.5 py-2 text-xs hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                      Client IP
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                        {log.ipAddress || "127.0.0.1"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(log.ipAddress || "127.0.0.1");
                          setCopiedHeaderKey("client-ip");
                          setTimeout(() => setCopiedHeaderKey(null), 1500);
                        }}
                        className="text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors p-0.5 cursor-pointer"
                        title="Copy IP"
                      >
                        {copiedHeaderKey === "client-ip" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Duration */}
                  <div className="flex items-center justify-between px-3 sm:px-3.5 py-2 text-xs hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                      Execution Latency
                    </span>
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-800 dark:text-zinc-200 font-mono">
                      <Zap size={12} className="text-amber-500" />
                      <span>{log.durationMs} ms</span>
                    </div>
                  </div>

                  {/* Row 3: User Agent */}
                  <div className="flex items-center justify-between gap-3 px-3 sm:px-3.5 py-2 text-xs hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 shrink-0">
                      User Agent
                    </span>
                    <span
                      className="font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate select-text text-right"
                      title={log.userAgent || "Unknown Client"}
                    >
                      {log.userAgent || "Unknown Client"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* HTTP Request Headers Accordion */}
            <div className="-mx-2.5 sm:mx-0 border-y sm:border sm:rounded-lg border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs">
              <div
                onClick={() => setIsHeadersExpanded(!isHeadersExpanded)}
                className={cn(
                  "flex items-center justify-between px-3 sm:px-3.5 transition-colors cursor-pointer select-none bg-slate-50/75 dark:bg-zinc-900/60 hover:bg-slate-100/70 dark:hover:bg-zinc-900 gap-2",
                  !isHeadersExpanded ? "py-2" : "py-2 border-b border-slate-200/80 dark:border-zinc-800/80"
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Shield size={14} className="text-violet-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                    HTTP Request Headers
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-medium shrink-0">
                    {headersCount}
                  </span>
                  <span
                    className="p-0.5 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors shrink-0"
                    title={isHeadersExpanded ? "Collapse" : "Expand"}
                    aria-label={isHeadersExpanded ? "Collapse" : "Expand"}
                  >
                    {!isHeadersExpanded ? <ChevronRight size={14} /> : <ChevronUp size={14} />}
                  </span>
                </div>
              </div>

              {/* Expanded Body - Container-less & Compact */}
              {isHeadersExpanded && (
                <div className="bg-transparent">
                  {/* Filter Search Input (if > 4 headers) */}
                  {headersCount > 4 && (
                    <div className="px-3 sm:px-3.5 py-1.5 border-b border-slate-200/70 dark:border-zinc-800/70 bg-slate-50/50 dark:bg-zinc-900/40">
                      <div className="relative w-full">
                        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Filter headers..."
                          value={headerSearchQuery}
                          onChange={(e) => setHeaderSearchQuery(e.target.value)}
                          className="w-full pl-7 pr-3 py-1 text-[11px] rounded bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 placeholder-slate-400 font-mono focus:outline-hidden focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                    </div>
                  )}

                  {headersList.length > 0 ? (
                    <div className="divide-y divide-slate-200/50 dark:divide-zinc-800/50 max-h-80 overflow-y-auto overscroll-contain">
                      {headersList.map(([k, v]) => {
                        const isCustomHeader = k.startsWith('x-') || k.startsWith('sec-');
                        const isCopied = copiedHeaderKey === k;

                        return (
                          <div
                            key={k}
                            className="px-3 sm:px-3.5 py-1.5 flex flex-col gap-0.5 hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn(
                                "font-mono font-semibold text-[11px] truncate",
                                isCustomHeader ? "text-violet-600 dark:text-violet-400" : "text-slate-600 dark:text-zinc-400"
                              )}>
                                {k}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyHeader(k, v)}
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors p-0.5 cursor-pointer shrink-0"
                                title="Copy header value"
                              >
                                {isCopied ? (
                                  <>
                                    <Check size={10} className="text-emerald-500" />
                                    <span className="text-emerald-600 dark:text-emerald-400 text-[9.5px]">Copied</span>
                                  </>
                                ) : (
                                  <Copy size={10} />
                                )}
                              </button>
                            </div>
                            <div className="text-[11px] font-mono text-slate-800 dark:text-zinc-200 break-all select-all leading-tight">
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3.5 text-center">
                      <p className="text-xs text-slate-400 dark:text-zinc-500 italic">
                        {headerSearchQuery ? "No matching headers found." : "No custom headers captured for this request."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* URL Query Parameters Accordion */}
            {log.requestQuery && Object.keys(log.requestQuery).length > 0 && (
              <div className="-mx-2.5 sm:mx-0 border-y sm:border sm:rounded-lg border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs">
                <div
                  onClick={() => setIsQueryParamsExpanded(!isQueryParamsExpanded)}
                  className={cn(
                    "flex items-center justify-between px-3 sm:px-3.5 transition-colors cursor-pointer select-none bg-slate-50/75 dark:bg-zinc-900/60 hover:bg-slate-100/70 dark:hover:bg-zinc-900 gap-2",
                    !isQueryParamsExpanded ? "py-2" : "py-2 border-b border-slate-200/80 dark:border-zinc-800/80"
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Terminal size={14} className="text-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                      URL Query Parameters
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-medium shrink-0">
                      {Object.keys(log.requestQuery).length}
                    </span>
                    <span
                      className="p-0.5 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors shrink-0"
                      title={isQueryParamsExpanded ? "Collapse" : "Expand"}
                      aria-label={isQueryParamsExpanded ? "Collapse" : "Expand"}
                    >
                      {!isQueryParamsExpanded ? <ChevronRight size={14} /> : <ChevronUp size={14} />}
                    </span>
                  </div>
                </div>

                {/* Expanded Body - Container-less & Compact */}
                {isQueryParamsExpanded && (
                  <div className="divide-y divide-slate-200/50 dark:divide-zinc-800/50 bg-transparent">
                    {Object.entries(log.requestQuery).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between px-3 sm:px-3.5 py-1.5 text-xs font-mono hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors"
                      >
                        <span className="font-semibold text-[11px] text-slate-600 dark:text-zinc-400 mr-2">{k}</span>
                        <span className="text-[11px] text-slate-900 dark:text-zinc-100 select-all font-medium break-all">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Changes Summary */}
        {activeTab === "changes" && log.changesSummary && (() => {
          const hasModifications = Boolean(
            log.changesSummary.stagingProjectId ||
            log.changesSummary.tasksCount !== undefined ||
            log.changesSummary.title ||
            log.changesSummary.action
          );
          const hasNotes = Boolean(log.changesSummary.agentNotes);
          const sectionTitle = hasModifications && hasNotes
            ? "Database / State Modifications & Agent Context"
            : hasModifications
            ? "Database / State Modifications"
            : "Agent Context & Notes";

          return (
            <div className="space-y-3">
              {/* Database / State Modifications & Agent Context Accordion */}
              {(hasModifications || hasNotes) && (
                <div className="-mx-2.5 sm:mx-0 border-y sm:border sm:rounded-lg border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs">
                  <div
                    onClick={() => setIsChangesExpanded(!isChangesExpanded)}
                    className={cn(
                      "flex items-center justify-between px-3 sm:px-3.5 transition-colors cursor-pointer select-none bg-slate-50/75 dark:bg-zinc-900/60 hover:bg-slate-100/70 dark:hover:bg-zinc-900 gap-2",
                      !isChangesExpanded ? "py-2" : "py-2 border-b border-slate-200/80 dark:border-zinc-800/80"
                    )}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Layers size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                        {sectionTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {log.changesSummary.stagingProjectId && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">
                          Staging
                        </span>
                      )}
                      {log.changesSummary.tasksCount !== undefined && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-medium shrink-0">
                          {log.changesSummary.tasksCount} {log.changesSummary.tasksCount === 1 ? "Task" : "Tasks"}
                        </span>
                      )}
                      <span
                        className="p-0.5 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors shrink-0"
                        title={isChangesExpanded ? "Collapse" : "Expand"}
                        aria-label={isChangesExpanded ? "Collapse" : "Expand"}
                      >
                        {!isChangesExpanded ? <ChevronRight size={14} /> : <ChevronUp size={14} />}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Body - Container-less & Compact */}
                  {isChangesExpanded && (
                    <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60 bg-transparent">
                      {/* Row 1: Target Staging Environment */}
                      {log.changesSummary.stagingProjectId && (
                        <div className="flex items-center justify-between px-3 sm:px-3.5 py-2 text-xs hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                            Target Environment
                          </span>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              {log.changesSummary.stagingProjectId}
                            </span>
                            {log.changesSummary.stagingProjectName && (
                              <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                                ({log.changesSummary.stagingProjectName})
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Row 2: Action */}
                      {(log.changesSummary.action || log.actionType) && (
                        <div className="flex items-center justify-between px-3 sm:px-3.5 py-2 text-xs hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                            Action
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200">
                            {log.changesSummary.action || log.actionType}
                          </span>
                        </div>
                      )}

                      {/* Row 3: Tasks Affected */}
                      {log.changesSummary.tasksCount !== undefined && (
                        <div className="flex items-center justify-between px-3 sm:px-3.5 py-2 text-xs hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                            Tasks Affected
                          </span>
                          <div className="flex items-center gap-1 font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200">
                            <FolderKanban size={12} className="text-sky-500" />
                            <span>{log.changesSummary.tasksCount}</span>
                          </div>
                        </div>
                      )}

                      {/* Row 4: Task Title */}
                      {log.changesSummary.title && (
                        <div className="flex items-center justify-between gap-3 px-3 sm:px-3.5 py-2 text-xs hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 shrink-0">
                            Task Title
                          </span>
                          <span
                            className="font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate select-text text-right"
                            title={log.changesSummary.title}
                          >
                            {log.changesSummary.title}
                          </span>
                        </div>
                      )}

                      {/* Row 5: Agent Notes / Instructions */}
                      {log.changesSummary.agentNotes && (
                        <div className="bg-slate-50/30 dark:bg-zinc-950/60">
                          {/* Code block header bar */}
                          <div className="flex items-center justify-between px-3 sm:px-3.5 py-1.5 bg-slate-100/70 dark:bg-zinc-900/80 border-b border-slate-200/70 dark:border-zinc-800/70">
                            <div className="flex items-center gap-1.5">
                              <Bot size={12} className="text-emerald-500 shrink-0" />
                              <span className="text-[10.5px] font-mono font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                                {typeof log.changesSummary.agentNotes === "object" ? "JSON NOTES" : "AGENT NOTES"}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const notesStr = typeof log.changesSummary?.agentNotes === "string"
                                  ? log.changesSummary.agentNotes
                                  : JSON.stringify(log.changesSummary?.agentNotes, null, 2);
                                navigator.clipboard.writeText(notesStr);
                                setCopiedChangesAgentNotes(true);
                                setTimeout(() => setCopiedChangesAgentNotes(false), 1500);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white rounded border border-slate-200 dark:border-zinc-800 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Copy Agent Notes"
                            >
                              {copiedChangesAgentNotes ? (
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

                          {/* Code block body */}
                          <div className="p-3 sm:p-3.5 overflow-x-auto max-h-[420px] sm:max-h-[480px] overflow-y-auto overscroll-contain">
                            <pre className="text-[11px] sm:text-xs font-mono text-slate-800 dark:text-zinc-200 leading-relaxed tab-size-2 select-text whitespace-pre-wrap break-all">
                              <code>
                                {typeof log.changesSummary.agentNotes === "string"
                                  ? log.changesSummary.agentNotes
                                  : JSON.stringify(log.changesSummary.agentNotes, null, 2)}
                              </code>
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Full Changes Summary JSON Accordion */}
              <JsonViewer
                data={log.changesSummary}
                title="Full Changes Summary JSON"
                defaultWrap={true}
              />
            </div>
          );
        })()}
      </div>
    </div>
  );
}
