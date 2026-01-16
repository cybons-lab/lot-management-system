/**
 * IntakeHistoryTab
 *
 * 入庫履歴タブのコンテンツ（StockHistoryPageから分離）
 */
import { Calendar, Table } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui";
import { Label } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import { IntakeHistoryCalendar, IntakeHistoryList } from "@/features/intake-history";
import { useFilterOptions } from "@/features/inventory/hooks/useFilterOptions";
import { Section } from "@/shared/components/layout";

type IntakeViewMode = "list" | "calendar";

interface FilterOption {
  value: string;
  label: string;
}

interface IntakeFiltersProps {
  supplierId: string;
  warehouseId: string;
  productId: string;
  supplierOptions: FilterOption[];
  warehouseOptions: FilterOption[];
  productOptions: FilterOption[];
  onSupplierChange: (v: string) => void;
  onWarehouseChange: (v: string) => void;
  onProductChange: (v: string) => void;
  onReset: () => void;
}

function IntakeFilters({
  supplierId,
  warehouseId,
  productId,
  supplierOptions,
  warehouseOptions,
  productOptions,
  onSupplierChange,
  onWarehouseChange,
  onProductChange,
  onReset,
}: IntakeFiltersProps) {
  return (
    <Section>
      <div className="grid grid-cols-4 items-end gap-4">
        <div>
          <Label className="mb-2 block text-sm font-medium">仕入先</Label>
          <SearchableSelect
            options={supplierOptions}
            value={supplierId}
            onChange={onSupplierChange}
            placeholder="仕入先を検索..."
          />
        </div>
        <div>
          <Label className="mb-2 block text-sm font-medium">倉庫</Label>
          <SearchableSelect
            options={warehouseOptions}
            value={warehouseId}
            onChange={onWarehouseChange}
            placeholder="倉庫を検索..."
          />
        </div>
        <div>
          <Label className="mb-2 block text-sm font-medium">製品</Label>
          <SearchableSelect
            options={productOptions}
            value={productId}
            onChange={onProductChange}
            placeholder="製品を検索..."
          />
        </div>
        <div>
          <Button variant="outline" onClick={onReset} className="w-full">
            フィルタをリセット
          </Button>
        </div>
      </div>
    </Section>
  );
}

export function IntakeHistoryTab() {
  const [intakeViewMode, setIntakeViewMode] = useState<IntakeViewMode>("list");
  const [supplierId, setSupplierId] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [productId, setProductId] = useState<string>("");

  const { productOptions, supplierOptions, warehouseOptions } = useFilterOptions({
    product_id: productId || undefined,
    supplier_id: supplierId || undefined,
    warehouse_id: warehouseId || undefined,
  });

  const handleResetFilters = () => {
    setSupplierId("");
    setWarehouseId("");
    setProductId("");
  };

  const numSupplierId = supplierId ? Number(supplierId) : undefined;
  const numWarehouseId = warehouseId ? Number(warehouseId) : undefined;
  const numProductId = productId ? Number(productId) : undefined;

  return (
    <div className="space-y-4">
      {/* View Mode Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={intakeViewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setIntakeViewMode("list")}
          >
            <Table className="mr-2 h-4 w-4" />
            一覧表示
          </Button>
          <Button
            variant={intakeViewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setIntakeViewMode("calendar")}
          >
            <Calendar className="mr-2 h-4 w-4" />
            カレンダー表示
          </Button>
        </div>
      </div>

      {/* Filters */}
      <IntakeFilters
        supplierId={supplierId}
        warehouseId={warehouseId}
        productId={productId}
        supplierOptions={supplierOptions}
        warehouseOptions={warehouseOptions}
        productOptions={productOptions}
        onSupplierChange={setSupplierId}
        onWarehouseChange={setWarehouseId}
        onProductChange={setProductId}
        onReset={handleResetFilters}
      />

      {/* Content */}
      <div className="rounded-md border bg-white shadow-sm">
        {intakeViewMode === "list" ? (
          <IntakeHistoryList
            supplierId={numSupplierId}
            warehouseId={numWarehouseId}
            productId={numProductId}
          />
        ) : (
          <IntakeHistoryCalendar
            supplierId={numSupplierId}
            warehouseId={numWarehouseId}
            productId={numProductId}
          />
        )}
      </div>
    </div>
  );
}
