/**
 * OCR結果一覧ページ
 */

/* eslint-disable max-lines-per-function */
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";

import { ocrResultsApi } from "../api";

import { Button, Card, CardContent } from "@/components/ui";
import { DataTable, type Column } from "@/shared/components/data/DataTable";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { type components } from "@/types/api";

type OrderRegisterRow = components["schemas"]["OrderRegisterRowResponse"];

const columns: Column<OrderRegisterRow>[] = [
  {
    id: "id",
    header: "ID",
    accessor: (row) => row.id,
    minWidth: 80,
  },
  {
    id: "task_date",
    header: "タスク日付",
    accessor: (row) => row.task_date,
    minWidth: 120,
  },
  {
    id: "customer_code",
    header: "得意先コード",
    accessor: (row) => row.customer_code,
    minWidth: 120,
  },
  {
    id: "customer_name",
    header: "得意先名",
    accessor: (row) => row.customer_name || "-",
    minWidth: 150,
  },
  {
    id: "material_code",
    header: "材質コード",
    accessor: (row) => row.material_code,
    minWidth: 120,
  },
  {
    id: "jiku_code",
    header: "次区",
    accessor: (row) => row.jiku_code,
    minWidth: 100,
  },
  {
    id: "delivery_date",
    header: "納期",
    accessor: (row) => row.delivery_date || "-",
    minWidth: 120,
  },
  {
    id: "delivery_quantity",
    header: "納入量",
    accessor: (row) => row.delivery_quantity?.toString() || "-",
    minWidth: 100,
  },
  {
    id: "supplier_code",
    header: "仕入先コード",
    accessor: (row) => row.supplier_code || "-",
    minWidth: 120,
  },
  {
    id: "supplier_name",
    header: "仕入先名",
    accessor: (row) => row.supplier_name || "-",
    minWidth: 150,
  },
  {
    id: "delivery_place_code",
    header: "納入先コード",
    accessor: (row) => row.delivery_place_code || "-",
    minWidth: 120,
  },
  {
    id: "lot_no_1",
    header: "ロット1",
    accessor: (row) => row.lot_no_1 || "-",
    minWidth: 120,
  },
  {
    id: "quantity_1",
    header: "数量1",
    accessor: (row) => (row.quantity_1 ? row.quantity_1.toString() : "-"),
    minWidth: 100,
  },
  {
    id: "lot_no_2",
    header: "ロット2",
    accessor: (row) => row.lot_no_2 || "-",
    minWidth: 120,
  },
  {
    id: "quantity_2",
    header: "数量2",
    accessor: (row) => (row.quantity_2 ? row.quantity_2.toString() : "-"),
    minWidth: 100,
  },
  {
    id: "status",
    header: "ステータス",
    accessor: (row) => row.status || "pending",
    minWidth: 100,
  },
];

export function OcrResultsListPage() {
  const [taskDate, setTaskDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ocr-results", { taskDate, statusFilter }],
    queryFn: () =>
      ocrResultsApi.list({
        task_date: taskDate || undefined,
        status: statusFilter || undefined,
      }),
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await ocrResultsApi.exportExcel({
        task_date: taskDate || undefined,
        status: statusFilter || undefined,
      });
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="OCR結果" subtitle="OCR受注登録で生成されたデータ一覧" />

      {/* フィルター */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="task-date" className="block text-sm font-medium text-gray-700 mb-1">
                タスク日付
              </label>
              <input
                id="task-date"
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                ステータス
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">全て</option>
                <option value="pending">保留中</option>
                <option value="completed">完了</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* アクション */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">{data && `${data.total}件のデータ`}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "エクスポート中..." : "Excelエクスポート"}
          </Button>
        </div>
      </div>

      {/* テーブル */}
      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="p-8 text-center text-destructive">
              エラーが発生しました: {error.message}
            </div>
          ) : (
            <DataTable
              data={data?.items || []}
              columns={columns}
              isLoading={isLoading}
              emptyMessage="OCR結果データがありません"
              enableVirtualization
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
