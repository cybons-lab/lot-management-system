/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Box, Building2, ChevronRight, Search, Truck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button, Input } from "@/components/ui";
import {
  SupplierAssignmentWarning,
  SupplierFilterCheckbox,
} from "@/features/assignments/components";
import { useSupplierFilter } from "@/features/assignments/hooks";
import { getCustomerItems, type CustomerItem } from "@/features/customer-items/api";
import { useInventoryItems } from "@/features/inventory/hooks";
import { useSuppliersQuery, useWarehousesQuery } from "@/hooks/api/useMastersQuery";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

type Step = "supplier" | "customer-item" | "warehouse";

interface SelectedContext {
  supplierId: number | null;
  supplierName: string;
  customerItemId: number | null;
  customerItem: CustomerItem | null;
}

export function ExcelPortalPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("supplier");
  const [selected, setSelected] = useState<SelectedContext>({
    supplierId: null,
    supplierName: "",
    customerItemId: null,
    customerItem: null,
  });
  const [searchTerm, setSearchTerm] = useState("");

  // 担当仕入先フィルターロジック（共通フック）
  const { filterEnabled, toggleFilter, filterSuppliers } = useSupplierFilter();

  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useSuppliersQuery();
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useWarehousesQuery();

  // Fetch all customer items (will filter by supplier on frontend)
  const { data: allCustomerItems = [], isLoading: isLoadingCustomerItems } = useQuery({
    queryKey: ["customer-items", "all"],
    queryFn: () => getCustomerItems({ limit: 1000 }),
    staleTime: 1000 * 60 * 5,
  });

  // Fetch inventory items to know which warehouses have stock for the product
  const { data: inventoryData, isLoading: isLoadingInventory } = useInventoryItems(
    selected.customerItem
      ? {
          supplier_item_id: selected.customerItem.supplier_item_id,
          limit: 100,
        }
      : undefined,
  );

  // Filter customer items by selected supplier
  const customerItemsForSupplier = useMemo(() => {
    if (!selected.supplierId) return [];
    return allCustomerItems.filter((item) => item.supplier_id === selected.supplierId);
  }, [allCustomerItems, selected.supplierId]);

  // Group customer items by product for display
  const productGroups = useMemo(() => {
    const groups = new Map<
      number,
      { product: { id: number; code: string; name: string }; items: CustomerItem[] }
    >();

    customerItemsForSupplier.forEach((item) => {
      // Phase1: supplier_item_idがnullの場合はスキップ（Phase2で対応）
      if (item.supplier_item_id === null) return;

      if (!groups.has(item.supplier_item_id)) {
        groups.set(item.supplier_item_id, {
          product: {
            id: item.supplier_item_id,
            code: item.product_code || "",
            name: item.product_name || "",
          },
          items: [],
        });
      }
      groups.get(item.supplier_item_id)!.items.push(item);
    });

    return Array.from(groups.values());
  }, [customerItemsForSupplier]);

  // Filter warehouses that have stock for the selected product
  const warehousesWithStock = useMemo(() => {
    if (!inventoryData?.items) return [];
    const warehouseIds = new Set(inventoryData.items.map((item) => item.warehouse_id));
    return warehouses.filter((w) => warehouseIds.has(w.id));
  }, [inventoryData, warehouses]);

  const handleSupplierSelect = (supplierId: number, supplierName: string) => {
    setSelected((prev) => ({ ...prev, supplierId, supplierName }));
    setStep("customer-item");
    setSearchTerm("");
  };

  const handleCustomerItemSelect = (customerItem: CustomerItem) => {
    setSelected((prev) => ({
      ...prev,
      customerItemId: customerItem.id,
      customerItem,
    }));
    setStep("warehouse");
    setSearchTerm("");
  };

  const handleWarehouseSelect = (warehouseId: number) => {
    if (!selected.customerItem) return;
    navigate(
      `/inventory/excel-view/${selected.customerItem.supplier_item_id}/${warehouseId}/${selected.customerItemId}`,
    );
  };

  const handleBack = () => {
    if (step === "warehouse") {
      setStep("customer-item");
      setSelected((prev) => ({ ...prev, customerItemId: null, customerItem: null }));
    } else if (step === "customer-item") {
      setStep("supplier");
      setSelected({
        supplierId: null,
        supplierName: "",
        customerItemId: null,
        customerItem: null,
      });
    } else {
      navigate(-1);
    }
    setSearchTerm("");
  };

  // 仕入先フィルタ: 検索 + 担当仕入先フィルタ
  const filteredSuppliers = useMemo(() => {
    // 1. 検索フィルタを適用
    let result = suppliers.filter(
      (s) =>
        s.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.supplier_code.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    // 2. 担当仕入先フィルタを適用（共通ロジック使用）
    result = filterSuppliers(result, (supplier) => supplier.id);

    return result;
  }, [suppliers, searchTerm, filterSuppliers]);

  const filteredProductGroups = productGroups.filter(
    (group) =>
      group.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.items.some(
        (item) =>
          item.customer_part_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.customer_name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  const filteredWarehouses = warehousesWithStock.filter(
    (w) =>
      w.warehouse_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.warehouse_code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStepNumber = () => {
    switch (step) {
      case "supplier":
        return 1;
      case "customer-item":
        return 2;
      case "warehouse":
        return 3;
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="ロット管理（Excelビュー）"
        subtitle="仕入先・得意先品番・倉庫を選択してください"
        actions={
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        }
      />

      <div className="mx-auto max-w-5xl space-y-6 py-6">
        {/* 担当仕入先未設定警告 */}
        <SupplierAssignmentWarning />

        {/* Progress Stepper */}
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500 mb-8">
          <div className={`flex items-center gap-2 ${step === "supplier" ? "text-blue-600" : ""}`}>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                getStepNumber() >= 1
                  ? "border-blue-600 bg-blue-50 text-blue-600"
                  : "border-slate-300"
              }`}
            >
              1
            </div>
            <span>仕入先</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <div
            className={`flex items-center gap-2 ${step === "customer-item" ? "text-blue-600" : ""}`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                getStepNumber() >= 2
                  ? "border-blue-600 bg-blue-50 text-blue-600"
                  : "border-slate-300"
              }`}
            >
              2
            </div>
            <span>製品・得意先品番</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <div className={`flex items-center gap-2 ${step === "warehouse" ? "text-blue-600" : ""}`}>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                getStepNumber() >= 3
                  ? "border-blue-600 bg-blue-50 text-blue-600"
                  : "border-slate-300"
              }`}
            >
              3
            </div>
            <span>倉庫</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={
                step === "supplier"
                  ? "仕入先を検索..."
                  : step === "customer-item"
                    ? "製品・得意先品番を検索..."
                    : "倉庫を検索..."
              }
              className="pl-10 h-12 text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* 担当仕入先フィルタ（ステップ1のみ表示） */}
          {step === "supplier" && (
            <div className="flex justify-end">
              <SupplierFilterCheckbox enabled={filterEnabled} onToggle={toggleFilter} />
            </div>
          )}
        </div>

        {/* Selection Context */}
        {(selected.supplierId || selected.customerItem) && (
          <div className="flex items-center gap-4 p-3 bg-slate-100 rounded-lg text-sm text-slate-600">
            {selected.supplierId && (
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                <span className="font-bold">仕入先:</span>
                <span>{selected.supplierName}</span>
              </div>
            )}
            {selected.customerItem && (
              <>
                <ChevronRight className="h-4 w-4 text-slate-400" />
                <div className="flex items-center gap-2">
                  <Box className="h-4 w-4" />
                  <span className="font-bold">製品:</span>
                  <span>{selected.customerItem.product_name}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="font-bold">得意先:</span>
                  <span>{selected.customerItem.customer_name}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Content Area */}
        <div className="min-h-[400px]">
          {/* Step 1: Supplier Selection */}
          {step === "supplier" &&
            (isLoadingSuppliers ? (
              <div className="flex justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="text-center py-12 text-slate-500">仕入先が見つかりません</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSuppliers.map((supplier) => (
                  <button
                    key={supplier.id}
                    onClick={() => handleSupplierSelect(supplier.id, supplier.supplier_name)}
                    className="flex items-start gap-4 p-6 rounded-xl border border-slate-200 bg-white text-left transition-all hover:border-blue-400 hover:shadow-md hover:bg-blue-50/30 group"
                  >
                    <div className="rounded-lg bg-blue-100 p-3 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Truck className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 line-clamp-1">
                        {supplier.supplier_name}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">{supplier.supplier_code}</p>
                    </div>
                  </button>
                ))}
              </div>
            ))}

          {/* Step 2: Product × Customer Item Selection */}
          {step === "customer-item" &&
            (isLoadingCustomerItems ? (
              <div className="flex justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              </div>
            ) : filteredProductGroups.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                該当する得意先品番が見つかりません
              </div>
            ) : (
              <div className="space-y-6">
                {filteredProductGroups.map((group) => (
                  <div
                    key={group.product.id}
                    className="border border-slate-200 rounded-xl bg-white overflow-hidden"
                  >
                    {/* Product Header */}
                    <div className="flex items-center gap-3 p-4 bg-slate-50 border-b border-slate-200">
                      <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
                        <Box className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{group.product.name}</h3>
                        <p className="text-xs text-slate-500 font-mono">{group.product.code}</p>
                      </div>
                    </div>
                    {/* Customer Items */}
                    <div className="divide-y divide-slate-100">
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleCustomerItemSelect(item)}
                          className="w-full flex items-center gap-4 p-4 text-left hover:bg-indigo-50/50 transition-colors group"
                        >
                          <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <Users className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">
                                {item.customer_name}
                              </span>
                              <span className="text-xs text-slate-400">({item.customer_code})</span>
                            </div>
                            <p className="text-sm text-slate-500 font-mono mt-0.5">
                              得意先品番: {item.customer_part_no}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {/* Step 3: Warehouse Selection */}
          {step === "warehouse" &&
            (isLoadingInventory || isLoadingWarehouses ? (
              <div className="flex justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              </div>
            ) : filteredWarehouses.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                この製品の在庫がある倉庫が見つかりません
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWarehouses.map((warehouse) => {
                  const inventoryItem = inventoryData?.items.find(
                    (item) => item.warehouse_id === warehouse.id,
                  );
                  return (
                    <button
                      key={warehouse.id}
                      onClick={() => handleWarehouseSelect(warehouse.id)}
                      className="flex items-start gap-4 p-6 rounded-xl border border-slate-200 bg-white text-left transition-all hover:border-emerald-400 hover:shadow-md hover:bg-emerald-50/30 group"
                    >
                      <div className="rounded-lg bg-emerald-100 p-3 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 line-clamp-1">
                          {warehouse.warehouse_name}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">{warehouse.warehouse_code}</p>
                        {inventoryItem && (
                          <p className="text-xs text-emerald-600 mt-2 font-medium">
                            在庫: {inventoryItem.total_quantity}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
        </div>
      </div>
    </PageContainer>
  );
}
