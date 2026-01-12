import { Crown } from "lucide-react";
import { useMemo, useState, useEffect } from "react";

import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { Badge } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import type { Supplier } from "@/features/suppliers/validators/supplier-schema";
import { useTable } from "@/hooks/ui";
import { useSuppliersQuery } from "@/hooks/api/useMastersQuery";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";
import { SimpleFilterContainer } from "@/shared/components/data/FilterContainer";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { formatDate } from "@/shared/utils/date";

// ============================================
// 型定義
// ============================================

export interface InboundPlan {
  id: number;
  plan_number: string;
  supplier_id: number;
  supplier_name?: string | null;
  supplier_code?: string | null;
  planned_arrival_date: string;
  status: "planned" | "partially_received" | "received" | "cancelled";
  created_at: string;
  is_primary_supplier?: boolean;
  sap_po_number?: string | null; // SAP購買発注番号
}

export interface InboundPlansFilters {
  supplier_id: string;
  product_id?: string;
  status: "" | "planned" | "partially_received" | "received" | "cancelled";
  date_from: string;
  date_to: string;
}

interface InboundPlansListProps {
  plans?: InboundPlan[];
  isLoading: boolean;
  isError: boolean;
  filters: InboundPlansFilters;
  onFilterChange: (filters: InboundPlansFilters) => void;
  onDelete: (id: number) => void;
  onViewDetail: (id: number) => void;
  isDeleting?: boolean;
}

// ============================================
// メインコンポーネント
// ============================================

export function InboundPlansList({
  plans,
  isLoading,
  isError,
  filters,
  onFilterChange,
  onDelete,
  onViewDetail,
  isDeleting,
}: InboundPlansListProps) {
  // Master data for filter options
  const { data: suppliers = [] } = useSuppliersQuery();
  const [searchQuery, setSearchQuery] = useState("");
  const table = useTable({ initialPageSize: 25 });

  const supplierOptions = useMemo(
    () =>
      suppliers.map((s: Supplier) => ({
        value: String(s.id),
        label: `${s.supplier_code} - ${s.supplier_name}`,
      })),
    [suppliers],
  );

  // フィルターのリセット処理
  const handleResetFilters = () => {
    onFilterChange({
      supplier_id: "",
      product_id: "",
      status: "",
      date_from: "",
      date_to: "",
    });
  };

  // フィルターUIコンポーネント
  const renderFilters = () => (
    <SimpleFilterContainer hideSearch onReset={handleResetFilters}>
      <div className="grid gap-4 md:grid-cols-5">
        <div>
          <Label className="mb-2 block text-sm font-medium">仕入先</Label>
          <SearchableSelect
            options={supplierOptions}
            value={filters.supplier_id}
            onChange={(value) => onFilterChange({ ...filters, supplier_id: value })}
            placeholder="仕入先を検索..."
          />
        </div>
        <div>
          <Label className="mb-2 block text-sm font-medium">ステータス</Label>
          <select
            value={filters.status}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                status: e.target.value as
                  | ""
                  | "planned"
                  | "partially_received"
                  | "received"
                  | "cancelled",
              })
            }
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">すべて</option>
            <option value="planned">Planned（予定）</option>
            <option value="partially_received">Partially Received（一部入荷）</option>
            <option value="received">Received（入荷済）</option>
            <option value="cancelled">Cancelled（キャンセル）</option>
          </select>
        </div>
        <div>
          <Label className="mb-2 block text-sm font-medium">入荷予定日（開始）</Label>
          <Input
            type="date"
            value={filters.date_from}
            onChange={(e) => onFilterChange({ ...filters, date_from: e.target.value })}
          />
        </div>
        <div>
          <Label className="mb-2 block text-sm font-medium">入荷予定日（終了）</Label>
          <Input
            type="date"
            value={filters.date_to}
            onChange={(e) => onFilterChange({ ...filters, date_to: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <Label className="mb-2 block text-sm font-medium">キーワード検索</Label>
          <Input
            type="search"
            placeholder="入荷予定番号・SAP発注番号・仕入先で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
    </SimpleFilterContainer>
  );

  const plansList = Array.isArray(plans) ? plans : [];
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
  const paginatedPlans = table.paginateData(filteredPlans);

  useEffect(() => {
    table.setPage(1);
  }, [filters, searchQuery, table]);

  // 列定義
  const columns = useMemo<Column<InboundPlan>[]>(
    () => [
      {
        id: "plan_number",
        header: "入荷予定番号",
        accessor: (row) => row.plan_number,
        width: 150,
        sortable: true,
      },
      {
        id: "sap_po_number",
        header: "SAP発注番号",
        accessor: (row) => row.sap_po_number || "",
        cell: (row) =>
          row.sap_po_number ? (
            <span className="font-medium text-blue-600">{row.sap_po_number}</span>
          ) : (
            <span className="text-slate-400">–</span>
          ),
        width: 150,
        sortable: true,
      },
      {
        id: "supplier",
        header: "仕入先",
        accessor: (row) =>
          row.supplier_name
            ? `${row.supplier_name} (${row.supplier_code || ""})`
            : `ID: ${row.supplier_id}`,
        cell: (row) => (
          <div>
            <span
              className="block max-w-[250px] truncate font-medium"
              title={
                row.supplier_name
                  ? `${row.supplier_name} (${row.supplier_code || ""})`
                  : `ID: ${row.supplier_id}`
              }
            >
              {row.supplier_name ? (
                <>
                  {row.supplier_name}
                  <span className="ml-1 text-xs text-slate-500">
                    ({row.supplier_code || "No Code"})
                  </span>
                </>
              ) : (
                `ID: ${row.supplier_id}`
              )}
            </span>
            {row.is_primary_supplier && (
              <Badge
                variant="outline"
                className="mt-1 gap-1 border-amber-300 bg-amber-50 text-amber-600"
              >
                <Crown className="h-3 w-3" />
                主担当
              </Badge>
            )}
          </div>
        ),
        width: 220,
        sortable: true,
      },
      {
        id: "planned_arrival_date",
        header: "入荷予定日",
        accessor: (row) => row.planned_arrival_date,
        cell: (row) => formatDate(row.planned_arrival_date),
        width: 120,
        sortable: true,
      },
      {
        id: "status",
        header: "ステータス",
        accessor: (row) => row.status,
        cell: (row) => (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
              row.status === "planned"
                ? "bg-yellow-100 text-yellow-800"
                : row.status === "partially_received"
                  ? "bg-blue-100 text-blue-800"
                  : row.status === "received"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
            }`}
          >
            {row.status}
          </span>
        ),
        width: 150,
        sortable: true,
      },
      {
        id: "created_at",
        header: "作成日",
        accessor: (row) => row.created_at,
        cell: (row) => <span className="text-gray-600">{formatDate(row.created_at)}</span>,
        width: 120,
        sortable: true,
      },
    ],
    [],
  );

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

  // エラー時の表示
  if (isError) {
    return (
      <div className="space-y-6">
        {renderFilters()}
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          データの取得に失敗しました
        </div>
      </div>
    );
  }

  // データ形式エラーチェック
  if (!Array.isArray(plans)) {
    return (
      <div className="space-y-6">
        {renderFilters()}
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
      {renderFilters()}

      {/* Data display area */}
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          {searchQuery.trim()
            ? `検索結果 ${filteredPlans.length} 件`
            : `${plansList.length} 件の入荷予定が見つかりました`}
        </div>

        <DataTable
          data={paginatedPlans}
          columns={columns}
          getRowId={(row) => row.id}
          rowActions={renderRowActions}
          isLoading={isLoading}
          emptyMessage={
            searchQuery.trim()
              ? "検索条件に一致する入荷予定がありません"
              : "入荷予定が登録されていません"
          }
        />
        {filteredPlans.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <TablePagination
              currentPage={table.calculatePagination(filteredPlans.length).page ?? 1}
              pageSize={table.calculatePagination(filteredPlans.length).pageSize ?? 25}
              totalCount={
                table.calculatePagination(filteredPlans.length).totalItems ?? filteredPlans.length
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
