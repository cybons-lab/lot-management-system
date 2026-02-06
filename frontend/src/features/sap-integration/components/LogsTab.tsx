import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { listConnections, listFetchLogs, type SapFetchLog } from "../api";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function ConnectionFilter({
  selectedConnectionId,
  onConnectionChange,
  connections,
}: {
  selectedConnectionId: number | null;
  onConnectionChange: (id: number | null) => void;
  connections: Array<{ id: number; name: string }>;
}) {
  return (
    <div className="space-y-2">
      <Label>接続フィルタ</Label>
      <Select
        value={selectedConnectionId?.toString() ?? "all"}
        onValueChange={(value) => onConnectionChange(value === "all" ? null : parseInt(value, 10))}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="全て" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全て</SelectItem>
          {connections.map((connection) => (
            <SelectItem key={connection.id} value={connection.id.toString()}>
              {connection.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function getLogStatusVariant(status: SapFetchLog["status"]) {
  if (status === "success") return "default" as const;
  if (status === "error") return "destructive" as const;
  return "secondary" as const;
}

function LogsTable({
  logs,
  selectedLog,
  onSelect,
}: {
  logs: SapFetchLog[];
  selectedLog: SapFetchLog | null;
  onSelect: (log: SapFetchLog) => void;
}) {
  return (
    <div className="max-h-96 flex-1 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>日時</TableHead>
            <TableHead>RFC</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>件数</TableHead>
            <TableHead>時間</TableHead>
            <TableHead>バッチID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                ログがありません
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow
                key={log.id}
                className={`cursor-pointer hover:bg-muted/50 ${selectedLog?.id === log.id ? "bg-muted" : ""}`}
                onClick={() => onSelect(log)}
              >
                <TableCell className="text-sm">
                  {new Date(log.created_at).toLocaleString("ja-JP")}
                </TableCell>
                <TableCell className="font-mono text-sm">{log.rfc_name}</TableCell>
                <TableCell>
                  <Badge variant={getLogStatusVariant(log.status)}>{log.status}</Badge>
                </TableCell>
                <TableCell>{log.record_count ?? "-"}</TableCell>
                <TableCell>{log.duration_ms ? `${log.duration_ms}ms` : "-"}</TableCell>
                <TableCell className="font-mono text-xs">
                  {log.fetch_batch_id.slice(0, 8)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function LogDetailPanel({ selectedLog }: { selectedLog: SapFetchLog | null }) {
  if (!selectedLog) return null;

  return (
    <div className="w-96 space-y-4 overflow-auto rounded-lg border bg-muted/20 p-4">
      <div>
        <h3 className="mb-1 font-semibold">パラメータ</h3>
        <pre className="max-h-40 overflow-auto rounded bg-background p-2 text-xs">
          {JSON.stringify(selectedLog.params, null, 2)}
        </pre>
      </div>

      {selectedLog.error_message && (
        <div>
          <h3 className="mb-1 font-semibold text-destructive">エラーメッセージ</h3>
          <p className="text-sm text-destructive">{selectedLog.error_message}</p>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        <p>接続ID: {selectedLog.connection_id}</p>
        <p>バッチID: {selectedLog.fetch_batch_id}</p>
      </div>
    </div>
  );
}

export function LogsTab() {
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
  const [selectedLog, setSelectedLog] = useState<SapFetchLog | null>(null);

  const { data: connections = [] } = useQuery({
    queryKey: ["sap-connections"],
    queryFn: () => listConnections(false),
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["sap-logs", selectedConnectionId],
    queryFn: () =>
      listFetchLogs({
        connection_id: selectedConnectionId,
        limit: 100,
      }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>取得ログ</CardTitle>
        <CardDescription>SAP RFC呼び出しの履歴</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <ConnectionFilter
            selectedConnectionId={selectedConnectionId}
            onConnectionChange={setSelectedConnectionId}
            connections={connections}
          />
        </div>

        {isLoading ? (
          <div className="py-4 text-center">読み込み中...</div>
        ) : (
          <div className="flex gap-4">
            <LogsTable logs={logs} selectedLog={selectedLog} onSelect={setSelectedLog} />
            <LogDetailPanel selectedLog={selectedLog} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
