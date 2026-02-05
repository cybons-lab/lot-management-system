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
  const levelClass =
    LOG_LEVEL_COLORS[log.level as keyof typeof LOG_LEVEL_COLORS] || "bg-gray-600 text-white";
  const date = new Date(log.timestamp);
  const timeStr = `${date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.${date.getMilliseconds().toString().padStart(3, "0")}`;

  return (
    <div className="hover:bg-gray-800 p-1 rounded">
      <div className="flex items-start gap-2 text-xs">
        <span className="text-gray-500 whitespace-nowrap">{timeStr}</span>
        <span className={`px-1 py-0 rounded ${levelClass}`}>{log.level}</span>
        <span className="text-gray-400">{log.logger.split(".").slice(-2).join(".")}</span>
        <span className="flex-1 break-words text-gray-100">{log.message}</span>
      </div>
      {log.extra && Object.keys(log.extra).length > 0 && (
        <div className="ml-24 text-[10px] text-gray-400 mt-1">
          {Object.entries(log.extra).map(([k, v]) => (
            <span key={k} className="mr-4">
              {k}: {JSON.stringify(v)}
            </span>
          ))}
        </div>
      )}
      {log.exception && (
        <pre className="ml-24 text-[10px] text-red-400 mt-1 whitespace-pre-wrap">
          {log.exception}
        </pre>
      )}
    </div>
  );
}

function useLogWebSocket(isPaused: boolean) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pausedLogsRef = useRef<LogEntry[]>([]);
  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const cleanupPing = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  };

  useEffect(() => {
    http
      .get<LogEntry[]>("system/logs/backend/recent?limit=200")
      .then((d) => {
        setLogs(Array.isArray(d) ? d : []);
      })
      .catch((e) => {
        if (e.response?.status !== 401) console.error("Recent logs fetch error", e);
        setLogs([]);
      });

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const token = getAuthToken();
    const wsUrl = `${protocol}//${window.location.host}/api/logs/stream${token ? `?token=${token}` : ""}`;

    const connectTimeout = window.setTimeout(() => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => {
        cleanupPing();
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("ping");
        }, 30000);
      };
      ws.onmessage = (e) => {
        if (e.data === "pong") return;
        try {
          const entry: LogEntry = JSON.parse(e.data);
          if (isPausedRef.current) pausedLogsRef.current.push(entry);
          else
            setLogs((p) => {
              const u = [...(Array.isArray(p) ? p : []), entry];
              return u.length > 1000 ? u.slice(-1000) : u;
            });
        } catch (err) {
          console.error("Log parse error", err);
        }
      };
      ws.onclose = cleanupPing;
    }, 10);
    return () => {
      window.clearTimeout(connectTimeout);
      cleanupPing();
      wsRef.current?.close();
    };
  }, []);

  return { logs, setLogs, pausedLogsRef };
}

interface ToolbarProps {
  filterText: string;
  onFilterTextChange: (v: string) => void;
  filterLevel: string;
  onFilterLevelChange: (v: string) => void;
  isPaused: boolean;
  onPauseToggle: () => void;
  onClear: () => void;
  onExport: () => void;
  autoScroll: boolean;
  onAutoScrollChange: (v: boolean) => void;
  filteredCount: number;
  totalCount: number;
  pausedCountCount: number;
}

function LogToolbar({
  filterText,
  onFilterTextChange,
  filterLevel,
  onFilterLevelChange,
  isPaused,
  onPauseToggle,
  onClear,
  onExport,
  autoScroll,
  onAutoScrollChange,
  filteredCount,
  totalCount,
  pausedCountCount,
}: ToolbarProps) {
  return (
    <div className="flex gap-2 flex-wrap items-center">
      <input
        type="text"
        placeholder="検索..."
        value={filterText}
        onChange={(e) => onFilterTextChange(e.target.value)}
        className="px-3 py-2 border rounded-md max-w-xs text-sm"
      />
      <select
        value={filterLevel}
        onChange={(e) => onFilterLevelChange(e.target.value)}
        className="px-3 py-2 border rounded-md text-sm"
      >
        <option value="ALL">ALL LEVELS</option>
        {Object.keys(LOG_LEVEL_COLORS).map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <button
        onClick={onPauseToggle}
        className="px-4 py-2 border rounded-md hover:bg-gray-50 text-sm"
      >
        {isPaused ? "▶ 再開" : "⏸ 一時停止"}
      </button>
      <button onClick={onClear} className="px-4 py-2 border rounded-md hover:bg-gray-50 text-sm">
        🗑 クリア
      </button>
      <button onClick={onExport} className="px-4 py-2 border rounded-md hover:bg-gray-50 text-sm">
        ⬇ エクスポート
      </button>
      <label className="flex items-center gap-2 ml-auto text-sm">
        <input
          type="checkbox"
          checked={autoScroll}
          onChange={(e) => onAutoScrollChange(e.target.checked)}
          className="rounded"
        />
        自動スクロール
      </label>
      <span className="text-sm text-gray-600 border px-2 py-1 rounded">
        {filteredCount} / {totalCount} ログ
      </span>
      {isPaused && pausedCountCount > 0 && (
        <span className="text-sm text-orange-600 border border-orange-300 bg-orange-50 px-2 py-1 rounded">
          待機中 ({pausedCountCount})
        </span>
      )}
    </div>
  );
}

interface LogViewerLogicProps {
  logs: LogEntry[];
  setLogs: (l: LogEntry[] | ((p: LogEntry[]) => LogEntry[])) => void;
  pausedLogsRef: React.MutableRefObject<LogEntry[]>;
  isPaused: boolean;
  setIsPaused: (v: boolean) => void;
}

function useLogViewerLogic({
  logs,
  setLogs,
  pausedLogsRef,
  isPaused,
  setIsPaused,
}: LogViewerLogicProps) {
  const [filterText, setFilterText] = useState("");
  const [filterLevel, setFilterLevel] = useState("ALL");

  const filteredLogs = logs.filter((l) => {
    if (filterLevel !== "ALL" && l.level !== filterLevel) return false;
    if (!filterText) return true;
    const s = filterText.toLowerCase();
    return (
      l.message?.toLowerCase().includes(s) ||
      l.logger?.toLowerCase().includes(s) ||
      l.module?.toLowerCase().includes(s)
    );
  });

  const handlePauseToggle = () => {
    if (isPaused && pausedLogsRef.current.length > 0) {
      setLogs((prev) => {
        const u = [...(Array.isArray(prev) ? prev : []), ...pausedLogsRef.current];
        pausedLogsRef.current = [];
        return u.length > 1000 ? u.slice(-1000) : u;
      });
    }
    setIsPaused(!isPaused);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    filterText,
    setFilterText,
    filterLevel,
    setFilterLevel,
    filteredLogs,
    handlePauseToggle,
    handleExport,
  };
}

export function LogViewer() {
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const { logs, setLogs, pausedLogsRef } = useLogWebSocket(isPaused);

  const {
    filterText,
    setFilterText,
    filterLevel,
    setFilterLevel,
    filteredLogs,
    handlePauseToggle,
    handleExport,
  } = useLogViewerLogic({
    logs,
    setLogs,
    pausedLogsRef,
    isPaused,
    setIsPaused,
  });

  useEffect(() => {
    if (autoScroll && logContainerRef.current)
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [logs, autoScroll]);

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">リアルタイムログビューア</h1>
          <p className="text-sm text-gray-600 mt-1">
            バックエンドのログをリアルタイムで表示します。
          </p>
        </div>
        <LogToolbar
          filterText={filterText}
          onFilterTextChange={setFilterText}
          filterLevel={filterLevel}
          onFilterLevelChange={setFilterLevel}
          isPaused={isPaused}
          onPauseToggle={handlePauseToggle}
          onClear={() => {
            setLogs([]);
            pausedLogsRef.current = [];
          }}
          onExport={handleExport}
          autoScroll={autoScroll}
          onAutoScrollChange={setAutoScroll}
          filteredCount={filteredLogs.length}
          totalCount={logs.length}
          pausedCountCount={pausedLogsRef.current.length}
        />
        <div
          ref={logContainerRef}
          className="border rounded-md bg-gray-900 p-4 h-[600px] overflow-y-auto font-mono"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-gray-400 text-center py-8">ログがありません</div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map((l, i) => (
                <LogEntryComponent key={i} log={l} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
