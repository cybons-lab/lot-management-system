/**
 * OperationLogsPage (v2.4 - Phase H-2)
 * Operation logs list page (read-only)
 * Refactored to use split DateTimePicker for start and end dates.
 */

import { FileJson } from "lucide-react";
import { useMemo, useState } from "react";

import type { OperationLogsListParams } from "../api";
import { useOperationLogFilters, useOperationLogs } from "../hooks";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  Badge,
} from "@/components/ui";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";
import { PageContainer, PageHeader } from "@/shared/components/layout";

interface OperationLog {
  log_id: number;
  user_id: number | null;
  user_name: string | null;
  operation_type: string;
  target_table: string;
  target_id: number | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const TABLE_NAME_MAP: Record<string, string> = {
  customers: "得意先マスタ",
  products: "商品マスタ",
  warehouses: "倉庫マスタ",
  suppliers: "仕入先マスタ",
  users: "ユーザー",
  orders: "受注データ",
  order_lines: "受注明細",
  allocations: "引当データ",
  roles: "ロール",
};

/**
 * Get readable target name from changes
 */
const getTargetName = (row: OperationLog) => {
  if (!row.changes) return row.target_id ? `ID: ${row.target_id}` : "-";

  const c = row.changes;
  if (typeof c.customer_name === "string") return c.customer_name;
  if (typeof c.product_name === "string") return c.product_name;
  if (typeof c.warehouse_name === "string") return c.warehouse_name;
  if (typeof c.supplier_name === "string") return c.supplier_name;
  if (typeof c.username === "string") return c.username;
  if (typeof c.order_code === "string") return c.order_code;

  // Fallback to code
  if (typeof c.customer_code === "string") return c.customer_code;
  if (typeof c.maker_part_code === "string") return c.maker_part_code;
  if (typeof c.warehouse_code === "string") return c.warehouse_code;

  return row.target_id ? `ID: ${row.target_id}` : "-";
};

export function OperationLogsPage() {
  const [filters, setFilters] = useState<{
    user_id: string;
    operation_type: string;
    target_table: string;
    startDate: Date | undefined;
    endDate: Date | undefined;
  }>({
    user_id: "",
    operation_type: "",
    target_table: "",
    startDate: undefined,
    endDate: undefined,
  });

  // Build query params
  const queryParams = useMemo(() => {
    const params: OperationLogsListParams = {
      user_id: filters.user_id ? Number(filters.user_id) : undefined,
      operation_type: filters.operation_type || undefined,
      target_table: filters.target_table || undefined,
    };

    if (filters.startDate) {
      params.start_date = filters.startDate.toISOString();
    }
    if (filters.endDate) {
      params.end_date = filters.endDate.toISOString();
    }

    return params;
  }, [filters]);

  // Fetch operation logs
  const { data: response, isLoading, isError } = useOperationLogs(queryParams);
  const { data: filterOptions } = useOperationLogFilters();

  // 列定義
  const columns = useMemo<Column<OperationLog>[]>(
    () => [
      {
        id: "log_id",
        header: "ID",
        accessor: (row) => row.log_id,
        width: 80,
        sortable: true,
      },
      {
        id: "user_name",
        header: "実行ユーザー",
        accessor: (row) => row.user_name || String(row.user_id),
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.user_name || "不明なユーザー"}</span>
            <span className="text-muted-foreground text-xs">ID: {row.user_id}</span>
          </div>
        ),
        width: 150,
      },
      {
        id: "operation_type",
        header: "操作",
        accessor: (row) => row.operation_type,
        cell: (row) => {
          const colors: Record<string, string> = {
            create: "bg-green-100 text-green-800 hover:bg-green-200",
            update: "bg-blue-100 text-blue-800 hover:bg-blue-200",
            delete: "bg-red-100 text-red-800 hover:bg-red-200",
            restore: "bg-purple-100 text-purple-800 hover:bg-purple-200",
            hard_delete: "bg-gray-100 text-gray-800 hover:bg-gray-200",
            login: "bg-teal-100 text-teal-800",
            logout: "bg-gray-100 text-gray-600",
          };
          return (
            <Badge
              variant="secondary"
              className={`capitalize ${colors[row.operation_type] || "bg-gray-100"}`}
            >
              {row.operation_type}
            </Badge>
          );
        },
        width: 100,
        sortable: true,
      },
      {
        id: "target_info",
        header: "対象データ",
        accessor: (row) => row.target_table,
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-medium">{getTargetName(row)}</span>
            <span className="text-muted-foreground text-xs">
              {TABLE_NAME_MAP[row.target_table] || row.target_table}
            </span>
          </div>
        ),
        width: 200,
      },
      {
        id: "created_at",
        header: "日時",
        accessor: (row) => row.created_at,
        cell: (row) => (
          <span className="text-gray-600">{new Date(row.created_at).toLocaleString("ja-JP")}</span>
        ),
        width: 180,
        sortable: true,
      },
      {
        id: "actions",
        header: "",
        accessor: (row) => row.log_id,
        cell: (row) => (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <FileJson className="h-4 w-4 text-gray-500" />
                <span className="sr-only">詳細を表示</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>操作ログ詳細 (ID: {row.log_id})</DialogTitle>
                <DialogDescription>
                  {row.operation_type} on {row.target_table}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-semibold text-gray-500">実行ユーザー:</span>
                    <div className="mt-1">{row.user_name || `ID: ${row.user_id}`}</div>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500">IPアドレス:</span>
                    <div className="mt-1">{row.ip_address || "-"}</div>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500">対象テーブル:</span>
                    <div className="mt-1">{row.target_table}</div>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500">対象ID:</span>
                    <div className="mt-1">{row.target_id || "-"}</div>
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-gray-500">変更内容 (JSON):</span>
                  <div className="bg-muted mt-2 overflow-auto rounded-md p-2">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(row.changes, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ),
        width: 50,
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader title="操作ログ" subtitle="システムの操作履歴を確認" className="pb-0" />

      {/* Filters */}
      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-4">
          {/* Row 1: Basic Filters */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="mb-2 block text-sm font-medium">ユーザー</Label>
              <SearchableSelect
                options={filterOptions?.users || []}
                value={filters.user_id}
                onChange={(val) => setFilters({ ...filters, user_id: val })}
                placeholder="ユーザーを選択..."
                className="bg-white"
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-medium">操作種別</Label>
              <SearchableSelect
                options={filterOptions?.operation_types || []}
                value={filters.operation_type}
                onChange={(val) => setFilters({ ...filters, operation_type: val })}
                placeholder="操作種別を選択..."
                className="bg-white"
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-medium">対象テーブル</Label>
              <SearchableSelect
                options={filterOptions?.target_tables || []}
                value={filters.target_table}
                onChange={(val) => setFilters({ ...filters, target_table: val })}
                placeholder="テーブルを選択..."
                className="bg-white"
              />
            </div>
          </div>

          {/* Row 2: Date Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">開始日時</Label>
              <DateTimePicker
                date={filters.startDate}
                setDate={(date) => setFilters({ ...filters, startDate: date })}
                className="w-[240px]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">終了日時</Label>
              <DateTimePicker
                date={filters.endDate}
                setDate={(date) => setFilters({ ...filters, endDate: date })}
                className="w-[240px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data display area */}
      {isLoading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          読み込み中...
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          データの取得に失敗しました
        </div>
      ) : !response || response.logs.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          操作ログが登録されていません
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            {response.total} 件のログ (ページ {response.page}/
            {Math.ceil(response.total / response.page_size)})
          </div>

          {/* Table */}
          <DataTable
            data={response.logs}
            columns={columns}
            getRowId={(row) => row.log_id}
            emptyMessage="操作ログがありません"
          />
        </div>
      )}
    </PageContainer>
  );
}
