/**
 * OperationLogsPage (v2.2 - Phase H-1)
 * Operation logs list page (read-only)
 * Refactored to use DataTable component.
 */

import { useMemo, useState } from "react";

import { useOperationLogs } from "../hooks";

import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { PageContainer, PageHeader } from "@/shared/components/layout";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";

interface OperationLog {
  log_id: number;
  user_id: number | null;
  operation_type: string;
  target_table: string;
  target_id: number | null;
  ip_address: string | null;
  created_at: string;
}

export function OperationLogsPage() {
  const [filters, setFilters] = useState({
    user_id: "",
    operation_type: "",
    target_table: "",
  });

  // Build query params
  const queryParams = {
    user_id: filters.user_id ? Number(filters.user_id) : undefined,
    operation_type: filters.operation_type || undefined,
    target_table: filters.target_table || undefined,
  };

  // Fetch operation logs
  const { data: response, isLoading, isError } = useOperationLogs(queryParams);

  // 列定義
  const columns = useMemo<Column<OperationLog>[]>(
    () => [
      {
        id: "log_id",
        header: "ログID",
        accessor: (row) => row.log_id,
        width: 100,
        sortable: true,
      },
      {
        id: "user_id",
        header: "ユーザーID",
        accessor: (row) => row.user_id,
        cell: (row) => <span>{row.user_id ?? "-"}</span>,
        width: 120,
        sortable: true,
      },
      {
        id: "operation_type",
        header: "操作種別",
        accessor: (row) => row.operation_type,
        cell: (row) => (
          <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
            {row.operation_type}
          </span>
        ),
        width: 120,
        sortable: true,
      },
      {
        id: "target_table",
        header: "対象テーブル",
        accessor: (row) => row.target_table,
        width: 150,
        sortable: true,
      },
      {
        id: "target_id",
        header: "対象ID",
        accessor: (row) => row.target_id,
        cell: (row) => <span>{row.target_id ?? "-"}</span>,
        width: 100,
        sortable: true,
      },
      {
        id: "ip_address",
        header: "IPアドレス",
        accessor: (row) => row.ip_address,
        cell: (row) => <span>{row.ip_address ?? "-"}</span>,
        width: 140,
        sortable: true,
      },
      {
        id: "created_at",
        header: "作成日時",
        accessor: (row) => row.created_at,
        cell: (row) => (
          <span className="text-gray-600">
            {new Date(row.created_at).toLocaleString("ja-JP")}
          </span>
        ),
        width: 180,
        sortable: true,
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader title="操作ログ" subtitle="システムの操作履歴を確認" className="pb-0" />

      {/* Filters */}
      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label className="mb-2 block text-sm font-medium">ユーザーID</Label>
            <Input
              type="number"
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              placeholder="ユーザーIDで絞り込み"
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">操作種別</Label>
            <Input
              value={filters.operation_type}
              onChange={(e) => setFilters({ ...filters, operation_type: e.target.value })}
              placeholder="操作種別で絞り込み"
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">対象テーブル</Label>
            <Input
              value={filters.target_table}
              onChange={(e) => setFilters({ ...filters, target_table: e.target.value })}
              placeholder="対象テーブルで絞り込み"
            />
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
