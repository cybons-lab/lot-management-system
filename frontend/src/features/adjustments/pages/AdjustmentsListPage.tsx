/**
 * AdjustmentsListPage (v2.2 - Phase D-5)
 * Inventory adjustments list page
 * Refactored to use DataTable component.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { AdjustmentType } from "../api";
import { useAdjustments } from "../hooks";

import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";
import { PageContainer, PageHeader } from "@/shared/components/layout";

interface Adjustment {
  adjustment_id: number;
  lot_id: number;
  lot_number?: string;
  product_code?: string;
  product_name?: string;
  adjustment_type: AdjustmentType;
  adjusted_quantity: number;
  reason: string;
  adjusted_at: string;
}

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

  // 列定義
  const columns = useMemo<Column<Adjustment>[]>(
    () => [
      {
        id: "adjustment_id",
        header: "調整ID",
        accessor: (row) => row.adjustment_id,
        width: 100,
        sortable: true,
      },
      {
        id: "lot_number",
        header: "ロット番号",
        accessor: (row) => row.lot_number,
        cell: (row) => <span>{row.lot_number || `ID: ${row.lot_id}`}</span>,
        width: 150,
        sortable: true,
      },
      {
        id: "product",
        header: "製品",
        accessor: (row) => row.product_name || row.product_code,
        cell: (row) => <span>{row.product_name || row.product_code || "-"}</span>,
        width: 200,
        sortable: true,
      },
      {
        id: "adjustment_type",
        header: "調整タイプ",
        accessor: (row) => row.adjustment_type,
        cell: (row) => (
          <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
            {getAdjustmentTypeLabel(row.adjustment_type)}
          </span>
        ),
        width: 120,
        sortable: true,
      },
      {
        id: "adjusted_quantity",
        header: "調整数量",
        accessor: (row) => row.adjusted_quantity,
        cell: (row) => (
          <span
            className={`font-medium ${
              row.adjusted_quantity >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {row.adjusted_quantity >= 0 ? "+" : ""}
            {row.adjusted_quantity}
          </span>
        ),
        width: 120,
        align: "right",
        sortable: true,
      },
      {
        id: "reason",
        header: "理由",
        accessor: (row) => row.reason,
        width: 200,
        sortable: true,
      },
      {
        id: "adjusted_at",
        header: "調整日時",
        accessor: (row) => row.adjusted_at,
        cell: (row) => (
          <span className="text-gray-600">{new Date(row.adjusted_at).toLocaleString("ja-JP")}</span>
        ),
        width: 180,
        sortable: true,
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="在庫調整履歴"
        subtitle="在庫調整の登録と履歴確認"
        actions={<Button onClick={handleCreateNew}>在庫調整を登録</Button>}
        className="pb-0"
      />

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
          <DataTable
            data={adjustments}
            columns={columns}
            getRowId={(row) => row.adjustment_id}
            emptyMessage="調整履歴がありません"
          />
        </div>
      )}
    </PageContainer>
  );
}
