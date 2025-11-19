/**
 * ForecastListPage (v2.2 - Phase B-3)
 * Forecast headers list page with header/lines separation
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ForecastListCard } from "../components";
import { useForecastHeaders, useDeleteForecastHeader } from "../hooks";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/routes";

export function ForecastListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    customer_id: "",
    delivery_place_id: "",
    status: "" as "" | "active" | "completed" | "cancelled",
  });

  // Build query params
  const queryParams = {
    customer_id: filters.customer_id ? Number(filters.customer_id) : undefined,
    delivery_place_id: filters.delivery_place_id ? Number(filters.delivery_place_id) : undefined,
    status: filters.status || undefined,
  };

  // Fetch forecast headers
  const { data: headers, isLoading, isError, refetch } = useForecastHeaders(queryParams);

  // Delete mutation
  const deleteMutation = useDeleteForecastHeader();

  const handleDelete = async (id: number) => {
    if (!confirm("このフォーキャストヘッダを削除しますか？")) return;

    try {
      await deleteMutation.mutateAsync(id);
      refetch();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("削除に失敗しました");
    }
  };

  // Keep for potential future use
  void navigate;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">フォーキャスト一覧</h2>
          <p className="mt-1 text-gray-600">ヘッダ・明細分離構造（v2.2）</p>
        </div>
        <Button onClick={() => navigate(ROUTES.FORECASTS.IMPORT)}>一括インポート</Button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label className="mb-2 block text-sm font-medium">得意先ID</Label>
            <Input
              type="number"
              value={filters.customer_id}
              onChange={(e) => setFilters({ ...filters, customer_id: e.target.value })}
              placeholder="得意先IDで絞り込み"
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">納入場所ID</Label>
            <Input
              type="number"
              value={filters.delivery_place_id}
              onChange={(e) => setFilters({ ...filters, delivery_place_id: e.target.value })}
              placeholder="納入場所IDで絞り込み"
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">ステータス</Label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value as "" | "active" | "completed" | "cancelled",
                })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">すべて</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
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
      ) : !headers || headers.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          フォーキャストヘッダが登録されていません
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">{headers.length} 件のヘッダが見つかりました</div>

          {/* Collapsible Cards */}
          <div className="space-y-3">
            {headers.map((header) => (
              <ForecastListCard
                key={header.forecast_id}
                header={header}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
