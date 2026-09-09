import React, { useState, useEffect, useRef } from "react";
import Editor from "react-simple-code-editor";
import Prism from "../lib/prism-components";

export const DebouncedTitleInput = ({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastReportedValue = useRef(value);

  useEffect(() => {
    if (value !== lastReportedValue.current) {
      setLocalValue(value);
      lastReportedValue.current = value;
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      lastReportedValue.current = newVal;
      onChange(newVal);
      timeoutRef.current = null;
    }, 500);
  };

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
    />
  );
};

export function getLanguageNameFromExtension(filename: string): string {
  if (!filename) return "javascript";
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'html':
    case 'htm':
    case 'xml':
    case 'svg':
      return "markup";
    case 'css':
      return "css";
    case 'js':
    case 'mjs':
    case 'cjs':
      return "javascript";
    case 'ts':
      return "typescript";
    case 'jsx':
      return "jsx";
    case 'tsx':
      return "tsx";
    case 'py':
      return "python";
    case 'json':
      return "json";
    case 'sql':
      return "sql";
    case 'md':
      return "markdown";
    default:
      return "javascript";
  }
}

export const DebouncedTextArea = ({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastReportedValue = useRef(value);

  useEffect(() => {
    if (value !== lastReportedValue.current) {
      setLocalValue(value);
      lastReportedValue.current = value;
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      lastReportedValue.current = newVal;
      onChange(newVal);
      timeoutRef.current = null;
    }, 500);
  };

  return (
    <textarea
      value={localValue}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
    />
  );
};

export const DebouncedCodeEditor = ({
  value,
  onChange,
  onRealtimeChange,
  taskType,
  fileName
}: {
  value: string;
  onChange: (val: string) => void;
  onRealtimeChange?: (val: string) => void;
  taskType: "sql" | "edge_function";
  fileName?: string;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastReportedValue = useRef(value);

  useEffect(() => {
    if (value !== lastReportedValue.current) {
      setLocalValue(value);
      lastReportedValue.current = value;
      if (onRealtimeChange) onRealtimeChange(value);
    }
  }, [value]);

  const handleChange = (newVal: string) => {
    setLocalValue(newVal);
    if (onRealtimeChange) onRealtimeChange(newVal);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      lastReportedValue.current = newVal;
      onChange(newVal);
      timeoutRef.current = null;
    }, 500);
  };

  return (
    <Editor
      value={localValue || ""}
      onValueChange={handleChange}
      highlight={(code) => {
        try {
          if (taskType === "sql") {
            return Prism.highlight(
              code || "",
              Prism.languages.sql || Prism.languages.javascript,
              "sql"
            );
          }
          const langName = getLanguageNameFromExtension(fileName || "");
          const prismLang = Prism.languages[langName] || Prism.languages.javascript;
          return Prism.highlight(
            code || "",
            prismLang,
            langName
          );
        } catch (e) {
          return code || "";
        }
      }}
      padding={16}
      className="font-mono text-sm min-h-full"
      style={{
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        minWidth: "100%",
        color: "inherit",
      }}
      textareaClassName="focus:outline-none text-slate-900 dark:text-slate-100"
    />
  );
};
