/* eslint-disable max-lines-per-function */
import { useEffect, useRef, useState } from "react";

import { http } from "@/shared/api/http-client";
import { getAuthToken } from "@/shared/auth/token";

interface LogEntry {
  timestamp: string;
  level: string;
  logger: string;
  message: string;
  module: string;
  function: string;
  line: number;
  extra?: Record<string, unknown> | null;
  exception?: string | null;
}

const LOG_LEVEL_COLORS = {
  DEBUG: "bg-gray-600 text-white",
  INFO: "bg-blue-600 text-white",
  WARNING: "bg-yellow-600 text-white",
  ERROR: "bg-red-600 text-white",
  CRITICAL: "bg-purple-600 text-white",
} as const;

function LogEntryComponent({ log }: { log: LogEntry }) {
  return (
    <div className="hover:bg-gray-800 p-1 rounded">
      <div className="flex items-start gap-2">
        <span className="text-gray-500 text-xs whitespace-nowrap">
          {new Date(log.timestamp).toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
          .{new Date(log.timestamp).getMilliseconds().toString().padStart(3, "0")}
        </span>

        <span
          className={`text-xs px-1 py-0 rounded ${
            LOG_LEVEL_COLORS[log.level as keyof typeof LOG_LEVEL_COLORS] || "bg-gray-600 text-white"
          }`}
        >
          {log.level}
        </span>

        <span className="text-gray-400 text-xs">{log.logger.split(".").slice(-2).join(".")}</span>

        <span className="flex-1 break-words">{log.message}</span>
      </div>

      {log.extra && Object.keys(log.extra).length > 0 && (
        <div className="ml-24 text-xs text-gray-400 mt-1">
          {Object.entries(log.extra).map(([key, value]) => (
            <span key={key} className="mr-4">
              {key}: {JSON.stringify(value)}
            </span>
          ))}
        </div>
      )}

      {log.exception && (
        <pre className="ml-24 text-xs text-red-400 mt-1 whitespace-pre-wrap">{log.exception}</pre>
      )}
    </div>
  );
}

function useLogWebSocket(isPaused: boolean) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const pausedLogsRef = useRef<LogEntry[]>([]);
  const isPausedRef = useRef(isPaused);

  // Keep isPausedRef in sync with isPaused prop
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    // Fetch recent logs on mount
    http
      .get<LogEntry[]>("system/logs/backend/recent?limit=200")
      .then((recentLogs) => {
        // Ensure recentLogs is an array
        if (Array.isArray(recentLogs)) {
          setLogs(recentLogs);
        } else {
          console.warn("Received non-array logs:", recentLogs);
          setLogs([]);
        }
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          console.warn("Not authenticated to fetch recent logs");
        } else {
          console.error("Failed to fetch recent logs:", err);
        }
        setLogs([]); // Set empty array on error
      });

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const token = getAuthToken();
    const wsUrl = `${protocol}//${window.location.host}/api/logs/stream${token ? `?token=${token}` : ""}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Avoid log noise if already closed or closing
      if (ws.readyState === WebSocket.OPEN) {
        console.log("Connected to log stream");
      }

      // Start ping/pong to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send("ping");
        }
      }, 30000);
      // Store interval ID for cleanup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ws as any)._pingInterval = pingInterval;
    };

    ws.onmessage = (event) => {
      // Ignore ping/pong messages
      if (event.data === "pong") {
        return;
      }

      try {
        const logEntry: LogEntry = JSON.parse(event.data);
        // Use ref instead of prop to avoid triggering useEffect
        if (isPausedRef.current) {
          pausedLogsRef.current.push(logEntry);
        } else {
          setLogs((prev) => {
            // Ensure prev is always an array
            const prevArray = Array.isArray(prev) ? prev : [];
            const updated = [...prevArray, logEntry];
            return updated.length > 1000 ? updated.slice(-1000) : updated;
          });
        }
      } catch (error) {
        console.error("Failed to parse log entry:", error);
      }
    };

    ws.onerror = (error) => {
      // Don't log error if we are closing (common in Strict Mode)
      if (ws.readyState !== WebSocket.CLOSING && ws.readyState !== WebSocket.CLOSED) {
        console.error("WebSocket error:", error);
      }
    };

    ws.onclose = () => {
      // Only log if it was intentional or a real drop, not Strict Mode cleanup
      if (wsRef.current === ws) {
        console.log("Disconnected from log stream");
      }

      // Clean up ping interval if it exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((ws as any)._pingInterval) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clearInterval((ws as any)._pingInterval);
      }
    };

    return () => {
      // Clean up ping interval
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((ws as any)._pingInterval) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clearInterval((ws as any)._pingInterval);
      }

      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }

      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
  }, []); // Remove isPaused dependency to prevent reconnections

  return { logs, setLogs, pausedLogsRef };
}

export function LogViewer() {
  const [filterText, setFilterText] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const { logs, setLogs, pausedLogsRef } = useLogWebSocket(isPaused);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== "ALL" && log.level !== filterLevel) return false;
    if (filterText) {
      const searchText = filterText.toLowerCase();
      return (
        log.message?.toLowerCase().includes(searchText) ||
        log.logger?.toLowerCase().includes(searchText) ||
        log.module?.toLowerCase().includes(searchText)
      );
    }
    return true;
  });

  const handleClear = () => {
    setLogs([]);
    pausedLogsRef.current = [];
  };

  const handlePauseToggle = () => {
    if (isPaused && pausedLogsRef.current.length > 0) {
      setLogs((prev) => {
        // Ensure prev is always an array
        const prevArray = Array.isArray(prev) ? prev : [];
        const updated = [...prevArray, ...pausedLogsRef.current];
        pausedLogsRef.current = [];
        return updated.length > 1000 ? updated.slice(-1000) : updated;
      });
    }
    setIsPaused(!isPaused);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logs-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">リアルタイムログビューア</h1>
          <p className="text-sm text-gray-600 mt-1">
            バックエンドのログをリアルタイムで表示します。フィルタリングと検索が可能です。
          </p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="text"
            placeholder="検索..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="px-3 py-2 border rounded-md max-w-xs"
          />

          <select
            value={filterLevel}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterLevel(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="ALL">すべてのレベル</option>
            <option value="DEBUG">DEBUG</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>

          <button
            onClick={handlePauseToggle}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            {isPaused ? "▶ 再開" : "⏸ 一時停止"}
          </button>

          <button onClick={handleClear} className="px-4 py-2 border rounded-md hover:bg-gray-50">
            🗑 クリア
          </button>

          <button onClick={handleExport} className="px-4 py-2 border rounded-md hover:bg-gray-50">
            ⬇ エクスポート
          </button>

          <label className="flex items-center gap-2 ml-auto">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">自動スクロール</span>
          </label>

          <span className="text-sm text-gray-600 border px-2 py-1 rounded">
            {filteredLogs.length} / {logs.length} ログ
          </span>

          {isPaused && pausedLogsRef.current.length > 0 && (
            <span className="text-sm text-orange-600 border border-orange-300 bg-orange-50 px-2 py-1 rounded">
              一時停止中 ({pausedLogsRef.current.length})
            </span>
          )}
        </div>

        <div
          ref={logContainerRef}
          className="border rounded-md bg-gray-900 text-gray-100 p-4 h-[600px] overflow-y-auto font-mono text-sm"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-gray-400 text-center py-8">ログがありません</div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map((log, index) => (
                <LogEntryComponent key={index} log={log} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
