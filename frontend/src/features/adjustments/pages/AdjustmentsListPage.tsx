/**
 * AdjustmentsListPage (v2.2 - Phase D-5)
 * Inventory adjustments list page
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdjustments } from "../hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/routes";
import type { AdjustmentType } from "../api";

export function AdjustmentsListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    lot_id: "",
    adjustment_type: "" as "" | AdjustmentType,
  });

  // Build query params
  const queryParams = {
    lot_id: filters.lot_id ? Number(filters.lot_id) : undefined,
    adjustment_type: filters.adjustment_type || undefined,
  };

  // Fetch adjustments
  const { data: adjustments, isLoading, isError } = useAdjustments(queryParams);

  const handleCreateNew = () => {
    navigate(ROUTES.INVENTORY.ADJUSTMENTS.NEW);
  };

  const getAdjustmentTypeLabel = (type: AdjustmentType): string => {
    const labels: Record<AdjustmentType, string> = {
      physical_count: "実地棚卸",
      damage: "破損",
      loss: "紛失",
      found: "発見",
      other: "その他",
    };
    return labels[type];
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">在庫調整履歴</h2>
          <p className="mt-1 text-gray-600">在庫調整の登録と履歴確認</p>
        </div>
        <Button onClick={handleCreateNew}>在庫調整を登録</Button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="mb-2 block text-sm font-medium">ロットID</Label>
            <Input
              type="number"
              value={filters.lot_id}
              onChange={(e) => setFilters({ ...filters, lot_id: e.target.value })}
              placeholder="ロットIDで絞り込み"
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">調整タイプ</Label>
            <select
              value={filters.adjustment_type}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  adjustment_type: e.target.value as "" | AdjustmentType,
                })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">すべて</option>
              <option value="physical_count">実地棚卸</option>
              <option value="damage">破損</option>
              <option value="loss">紛失</option>
              <option value="found">発見</option>
              <option value="other">その他</option>
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
      ) : !adjustments || adjustments.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          調整履歴が登録されていません
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">{adjustments.length} 件の調整履歴</div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">調整ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    ロット番号
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">製品</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    調整タイプ
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    調整数量
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">理由</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    調整日時
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {adjustments.map((adjustment) => (
                  <tr key={adjustment.adjustment_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{adjustment.adjustment_id}</td>
                    <td className="px-4 py-3 text-sm">
                      {adjustment.lot_number || `ID: ${adjustment.lot_id}`}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {adjustment.product_name || adjustment.product_code || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                        {getAdjustmentTypeLabel(adjustment.adjustment_type)}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right text-sm font-medium ${
                        adjustment.adjusted_quantity >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {adjustment.adjusted_quantity >= 0 ? "+" : ""}
                      {adjustment.adjusted_quantity}
                    </td>
                    <td className="px-4 py-3 text-sm">{adjustment.reason}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(adjustment.adjusted_at).toLocaleString("ja-JP")}
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
