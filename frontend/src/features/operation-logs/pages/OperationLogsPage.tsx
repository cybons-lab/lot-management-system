/**
 * OperationLogsPage (v2.2 - Phase H-1)
 * Operation logs list page (read-only)
 */

import { useState } from "react";
import { useOperationLogs } from "../hooks";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";

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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">操作ログ</h2>
        <p className="mt-1 text-gray-600">システムの操作履歴を確認</p>
      </div>

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
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ログID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    ユーザーID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    操作種別
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    対象テーブル
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">対象ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    IPアドレス
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    作成日時
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {response.logs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{log.log_id}</td>
                    <td className="px-4 py-3 text-sm">{log.user_id ?? "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                        {log.operation_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{log.target_table}</td>
                    <td className="px-4 py-3 text-sm">{log.target_id ?? "-"}</td>
                    <td className="px-4 py-3 text-sm">{log.ip_address ?? "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(log.created_at).toLocaleString("ja-JP")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
