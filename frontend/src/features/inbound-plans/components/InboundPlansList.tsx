import { useMemo, useState, useEffect } from "react";

import type { InboundPlansFilters, InboundPlan } from "../types";

import { inboundPlanColumns } from "./columns";
import { InboundPlansFilter } from "./InboundPlansFilter";

import { Button } from "@/components/ui";
import { useTable } from "@/hooks/ui";
import { DataTable, type SortConfig } from "@/shared/components/data/DataTable";
import { TablePagination } from "@/shared/components/data/TablePagination";

interface InboundPlansListProps {
  plans?: InboundPlan[];
  isLoading: boolean;
  isError: boolean;
  filters: InboundPlansFilters;
  onFilterChange: (filters: InboundPlansFilters) => void;
  onDelete: (id: number) => void;
  onViewDetail: (id: number) => void;
  isDeleting?: boolean;
  filterEnabled: boolean;
  onToggleFilter: (enabled: boolean) => void;
}

export function InboundPlansList({
  plans,
  isLoading,
  isError,
  filters,
  onFilterChange,
  onDelete,
  onViewDetail,
  isDeleting,
  filterEnabled,
  onToggleFilter,
}: InboundPlansListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({
    column: "planned_arrival_date",
    direction: "desc",
  });
  const table = useTable({ initialPageSize: 25 });

  const plansList = useMemo(() => (Array.isArray(plans) ? plans : []), [plans]);
  const hasInvalidData = plans !== undefined && !Array.isArray(plans);

  const filteredPlans = useMemo(() => {
    if (!searchQuery.trim()) return plansList;
    const query = searchQuery.toLowerCase();
    return plansList.filter((plan) =>
      [
        plan.plan_number,
        plan.sap_po_number,
        plan.supplier_name,
        plan.supplier_code,
        plan.status,
        plan.planned_arrival_date,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [plansList, searchQuery]);

  // ソート処理
  const sortedPlans = useMemo(() => {
    const sorted = [...filteredPlans];
    sorted.sort((a, b) => {
      const colId = sort.column as keyof InboundPlan;
      const aVal = a[colId];
      const bVal = b[colId];

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      // 数値ソート
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sort.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      // 文字列ソート（ロケール考慮）
      const cmp = String(aVal).localeCompare(String(bVal), "ja");
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredPlans, sort]);

  const paginatedPlans = table.paginateData(sortedPlans);
  const { setPage } = table;

  useEffect(() => {
    setPage(1);
  }, [filters, searchQuery, setPage]);

  // アクションボタン
  const renderRowActions = (plan: InboundPlan) => {
    return (
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => onViewDetail(plan.id)}>
          詳細
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDelete(plan.id)} disabled={isDeleting}>
          削除
        </Button>
      </div>
    );
  };

  if (isError) {
    return (
      <div className="space-y-6">
        <InboundPlansFilter
          filters={filters}
          onFilterChange={onFilterChange}
          filterEnabled={filterEnabled}
          onToggleFilter={onToggleFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          データの取得に失敗しました
        </div>
      </div>
    );
  }

  // データ形式エラーチェック
  if (!Array.isArray(plans) && plans !== undefined) {
    return (
      <div className="space-y-6">
        <InboundPlansFilter
          filters={filters}
          onFilterChange={onFilterChange}
          filterEnabled={filterEnabled}
          onToggleFilter={onToggleFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          入荷予定が登録されていません
          {hasInvalidData && (
            <div className="mt-2 text-xs text-red-500">
              データ形式エラー: 配列ではありません (Received: {typeof plans})
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InboundPlansFilter
        filters={filters}
        onFilterChange={onFilterChange}
        filterEnabled={filterEnabled}
        onToggleFilter={onToggleFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          {searchQuery.trim()
            ? `検索結果 ${sortedPlans.length} 件`
            : `${plansList.length} 件の入荷予定が見つかりました`}
        </div>

        <DataTable
          data={paginatedPlans}
          columns={inboundPlanColumns}
          getRowId={(row) => String(row.id || row.plan_number)}
          rowActions={renderRowActions}
          isLoading={isLoading}
          sort={sort}
          onSortChange={setSort}
          emptyMessage={
            searchQuery.trim()
              ? "検索条件に一致する入荷予定がありません"
              : "入荷予定が登録されていません"
          }
        />
        {sortedPlans.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <TablePagination
              currentPage={table.calculatePagination(sortedPlans.length).page ?? 1}
              pageSize={table.calculatePagination(sortedPlans.length).pageSize ?? 25}
              totalCount={
                table.calculatePagination(sortedPlans.length).totalItems ?? sortedPlans.length
              }
              onPageChange={table.setPage}
              onPageSizeChange={table.setPageSize}
            />
          </div>
        )}
      </div>
    </div>
  );
}
