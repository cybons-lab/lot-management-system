import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { SmartReadLongData } from "../api";
import { resetSmartReadData } from "../api";
import { exportCache } from "../db/export-cache";
import { SMARTREAD_QUERY_KEYS, useSmartReadLongData } from "../hooks";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { cn } from "@/lib/utils";
import { DataTable, type Column } from "@/shared/components/data/DataTable";

interface SmartReadSavedDataListProps {
  configId: number | null;
}

function useLongDataColumns(longDataList: SmartReadLongData[] | undefined) {
  return useMemo<Column<SmartReadLongData>[]>(() => {
    if (!longDataList || longDataList.length === 0) {
      return [];
    }

    // Fixed columns: ID, Task info
    const fixedColumns: Column<SmartReadLongData>[] = [
      {
        id: "task_date",
        header: "タスク日付",
        accessor: (row) => row.task_date,
        width: 100,
        sortable: true,
      },
      {
        id: "task_id",
        header: "タスクID",
        accessor: (row) => (
          <span className="font-mono text-xs" title={row.task_id}>
            {row.task_id.substring(0, 8)}...
          </span>
        ),
        width: 100,
      },
      {
        id: "created_at",
        header: "作成日時",
        accessor: (row) => format(new Date(row.created_at), "yyyy/MM/dd HH:mm"),
        width: 140,
        sortable: true,
      },
      {
        id: "row_index",
        header: "行",
        accessor: (row) => row.row_index,
        width: 60,
        align: "right",
      },
      {
        id: "detail_no",
        header: "#",
        accessor: (row) => String(row.content["明細番号"] || "-"),
        width: 60,
        align: "right",
      },
    ];

    // Dynamic columns from content
    // Collect all unique keys from a sample of rows to properly determining columns
    // (Sampling first 50 rows to avoid performance hit on large datasets)
    const contentKeys = new Set<string>();
    const sampleSize = Math.min(longDataList.length, 50);

    for (let i = 0; i < sampleSize; i++) {
      Object.keys(longDataList[i].content).forEach((key) => {
        if (key !== "明細番号" && !key.startsWith("エラー_")) {
          contentKeys.add(key);
        }
      });
    }

    // Sort keys: Common fields first, then others
    const sortedKeys = Array.from(contentKeys).sort();

    const contentColumns: Column<SmartReadLongData>[] = sortedKeys.map((key) => ({
      id: `content_${key}`,
      header: key,
      accessor: (row) => {
        const val = row.content[key];
        if (val === undefined || val === null) {
          return "";
        }
        if (typeof val === "object") {
          return JSON.stringify(val);
        }
        return String(val);
      },
      width: 150,
      sortable: true,
    }));

    return [...fixedColumns, ...contentColumns];
  }, [longDataList]);
}

// eslint-disable-next-line max-lines-per-function -- 論理的な画面単位を維持
export function SmartReadSavedDataList({ configId }: SmartReadSavedDataListProps) {
  const queryClient = useQueryClient();
  const { data: longDataList, isLoading, refetch, isRefetching } = useSmartReadLongData(configId);
  const columns = useLongDataColumns(longDataList);
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (!configId || isResetting) return;
    const confirmed = window.confirm(
      "SmartReadの保存済みデータをすべて削除します。よろしいですか？",
    );
    if (!confirmed) return;

    try {
      setIsResetting(true);
      const result = await resetSmartReadData(configId);
      await exportCache.clearByConfig(configId);
      await queryClient.invalidateQueries({
        queryKey: SMARTREAD_QUERY_KEYS.longData(configId),
      });
      await queryClient.invalidateQueries({
        queryKey: SMARTREAD_QUERY_KEYS.managedTasks(configId),
      });
      toast.success(result.message);
    } catch (error) {
      console.error("Failed to reset SmartRead data:", error);
      toast.error("SmartReadデータのリセットに失敗しました");
    } finally {
      setIsResetting(false);
    }
  };

  if (!configId) {
    return (
      <Card className="h-full border-none shadow-none">
        <CardHeader>
          <CardTitle>保存済みデータ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">設定を選択してください</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col border-none shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 px-0 pt-0">
        <div className="space-y-1">
          <CardTitle className="text-base">保存済みデータ (縦持ちのみ)</CardTitle>
          <p className="text-xs text-muted-foreground">
            過去に変換・保存された縦持ちデータを表示しています (最新1000件)
          </p>
          <p className="text-xs text-muted-foreground">件数: {longDataList?.length ?? 0} 件</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching || isResetting}
          >
            <RefreshCw
              className={cn(
                "mr-2 h-4 w-4",
                (isLoading || isRefetching || isResetting) && "animate-spin",
              )}
            />
            更新
          </Button>
          <Button variant="destructive" size="sm" onClick={handleReset} disabled={isResetting}>
            DBリセット
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0 min-h-0">
        <DataTable
          data={longDataList || []}
          columns={columns}
          isLoading={isLoading}
          enableVirtualization
          className="h-full"
          emptyMessage="データがありません"
        />
      </CardContent>
    </Card>
  );
}
