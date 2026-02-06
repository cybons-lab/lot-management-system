/* eslint-disable max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため */
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { fetchMonthlyByDestination } from "../api";

import { Button, Label } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import { useSupplierProductsQuery, useWarehousesQuery } from "@/hooks/api/useMastersQuery";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { fmt } from "@/shared/utils/number";

const now = new Date();
const DEFAULT_YEAR = now.getFullYear();
const DEFAULT_MONTH = now.getMonth() + 1;
const YEAR_OPTIONS = [DEFAULT_YEAR - 1, DEFAULT_YEAR, DEFAULT_YEAR + 1];
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, idx) => idx + 1);

const buildCsv = (rows: string[][]) => rows.map((row) => row.join(",")).join("\n");

const downloadCsv = (filename: string, csv: string) => {
  const bom = "\ufeff";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

function ReportContent({
  isLoading,
  isError,
  error,
  reportRows,
  queryEnabled,
  totalQuantity,
  totalLotCount,
}: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  reportRows: Array<{
    delivery_place_id: number;
    destination_name: string;
    customer_name: string;
    total_quantity: number | string;
    lot_count: number;
  }>;
  queryEnabled: boolean;
  totalQuantity: number;
  totalLotCount: number;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-slate-500">
        集計データを読み込み中...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-red-600">
        集計データの取得に失敗しました: {error instanceof Error ? error.message : "不明"}
      </div>
    );
  }

  if (queryEnabled && reportRows.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-slate-500">
        該当するデータがありません
      </div>
    );
  }

  if (reportRows.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="border-b px-4 py-3 text-left font-medium">納入先</th>
            <th className="border-b px-4 py-3 text-left font-medium">得意先</th>
            <th className="border-b px-4 py-3 text-right font-medium">合計数量</th>
            <th className="border-b px-4 py-3 text-right font-medium">ロット数</th>
          </tr>
        </thead>
        <tbody>
          {reportRows.map((row) => (
            <tr key={row.delivery_place_id} className="hover:bg-slate-50">
              <td className="border-b px-4 py-3">{row.destination_name}</td>
              <td className="border-b px-4 py-3">{row.customer_name}</td>
              <td className="border-b px-4 py-3 text-right">{fmt(row.total_quantity)}</td>
              <td className="border-b px-4 py-3 text-right">{row.lot_count}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50">
          <tr>
            <td className="border-t px-4 py-3 text-sm font-semibold">合計</td>
            <td className="border-t px-4 py-3" />
            <td className="border-t px-4 py-3 text-right font-semibold">{fmt(totalQuantity)}</td>
            <td className="border-t px-4 py-3 text-right font-semibold">{totalLotCount}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function MonthlyReportPage() {
  const [year, setYear] = useState(() => DEFAULT_YEAR);
  const [month, setMonth] = useState(() => DEFAULT_MONTH);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");

  const { data: products = [], isLoading: isProductsLoading } = useSupplierProductsQuery();
  const { data: warehouses = [], isLoading: isWarehousesLoading } = useWarehousesQuery();

  const productOptions = useMemo(
    () =>
      [...products]
        .sort((a, b) => a.maker_part_no.localeCompare(b.maker_part_no))
        .map((product) => ({
          value: String(product.id),
          label: `${product.maker_part_no} - ${product.display_name}`,
        })),
    [products],
  );

  const warehouseOptions = useMemo(
    () =>
      [...warehouses]
        .sort((a, b) => a.warehouse_code.localeCompare(b.warehouse_code))
        .map((warehouse) => ({
          value: String(warehouse.id),
          label: `${warehouse.warehouse_code} - ${warehouse.warehouse_name}`,
        })),
    [warehouses],
  );

  useEffect(() => {
    if (!selectedProductId && productOptions.length > 0) {
      setSelectedProductId(productOptions[0].value);
    }
  }, [selectedProductId, productOptions]);

  useEffect(() => {
    if (!selectedWarehouseId && warehouseOptions.length > 0) {
      setSelectedWarehouseId(warehouseOptions[0].value);
    }
  }, [selectedWarehouseId, warehouseOptions]);

  const queryEnabled = Boolean(selectedProductId && selectedWarehouseId);
  const {
    data: reportRows = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [
      "reports",
      "monthly-by-destination",
      {
        productId: selectedProductId,
        warehouseId: selectedWarehouseId,
        year,
        month,
      },
    ],
    queryFn: () =>
      fetchMonthlyByDestination({
        product_id: Number(selectedProductId),
        warehouse_id: Number(selectedWarehouseId),
        year,
        month,
      }),
    enabled: queryEnabled,
  });

  const totalQuantity = useMemo(
    () => reportRows.reduce((sum, row) => sum + Number(row.total_quantity || 0), 0),
    [reportRows],
  );
  const totalLotCount = useMemo(
    () => reportRows.reduce((sum, row) => sum + Number(row.lot_count || 0), 0),
    [reportRows],
  );

  const handleExport = () => {
    if (!reportRows.length) return;
    const header = ["納入先", "得意先", "合計数量", "ロット数"];
    const rows = reportRows.map((row) => [
      row.destination_name,
      row.customer_name,
      String(row.total_quantity),
      String(row.lot_count),
    ]);
    const csv = buildCsv([header, ...rows]);
    downloadCsv(`monthly-report-${year}-${String(month).padStart(2, "0")}.csv`, csv);
  };

  return (
    <PageContainer>
      <PageHeader
        title="月次レポート"
        subtitle="納入先別月次集計"
        actions={
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExport}
            disabled={!reportRows.length}
          >
            <Download className="h-4 w-4" />
            CSV出力
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <Label className="mb-2 block text-sm font-medium text-slate-700">対象年</Label>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 text-sm focus:border-blue-500 focus:outline-none"
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
              >
                {YEAR_OPTIONS.map((optionYear) => (
                  <option key={optionYear} value={optionYear}>
                    {optionYear}年
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-2 block text-sm font-medium text-slate-700">対象月</Label>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 text-sm focus:border-blue-500 focus:outline-none"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
              >
                {MONTH_OPTIONS.map((optionMonth) => (
                  <option key={optionMonth} value={optionMonth}>
                    {optionMonth}月
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-2 block text-sm font-medium text-slate-700">製品</Label>
              <SearchableSelect
                options={productOptions}
                value={selectedProductId}
                onChange={setSelectedProductId}
                placeholder={isProductsLoading ? "読込中..." : "製品を検索..."}
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-medium text-slate-700">倉庫</Label>
              <SearchableSelect
                options={warehouseOptions}
                value={selectedWarehouseId}
                onChange={setSelectedWarehouseId}
                placeholder={isWarehousesLoading ? "読込中..." : "倉庫を検索..."}
              />
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-white shadow-sm">
          <div className="border-b bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
            {year}年{month}月の集計
          </div>
          <ReportContent
            isLoading={isLoading}
            isError={isError}
            error={error}
            reportRows={reportRows}
            queryEnabled={queryEnabled}
            totalQuantity={totalQuantity}
            totalLotCount={totalLotCount}
          />
        </div>
      </div>
    </PageContainer>
  );
}
