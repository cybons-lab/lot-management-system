/* eslint-disable max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため */
/* eslint-disable complexity -- 業務分岐を明示的に維持するため */
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Box, ChevronRight, Search, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button, Input } from "@/components/ui";
import {
  SupplierAssignmentWarning,
  SupplierFilterCheckbox,
} from "@/features/assignments/components";
import { useSupplierFilter } from "@/features/assignments/hooks";
import { getCustomerItems, type CustomerItem } from "@/features/customer-items/api";
import { useSuppliersQuery } from "@/hooks/api/useMastersQuery";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

type Step = "supplier" | "product";

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

  // Fetch all customer items (will filter by supplier on frontend)
  const { data: allCustomerItems = [], isLoading: isLoadingCustomerItems } = useQuery({
    queryKey: ["customer-items", "all"],
    queryFn: () => getCustomerItems({ limit: 1000 }),
    staleTime: 1000 * 60 * 5,
  });

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

    // 重複チェック用（item.id ベース）
    const processedItemIds = new Set<number>();

    customerItemsForSupplier.forEach((item) => {
      // Phase1 Migration: supplier_item_id を優先、なければ supplier_item_id (互換性)
      const groupId = item.supplier_item_id || item.supplier_item_id;
      if (groupId === null || groupId === undefined) return;

      // アイテムIDの重複チェック
      if (processedItemIds.has(item.id)) return;
      processedItemIds.add(item.id);

      if (!groups.has(groupId)) {
        groups.set(groupId, {
          product: {
            id: groupId,
            code: item.maker_part_no || item.product_code || "",
            name: item.product_name || item.display_name || "",
          },
          items: [],
        });
      }
      groups.get(groupId)!.items.push(item);
    });

    return Array.from(groups.values());
  }, [customerItemsForSupplier]);

  const handleSupplierSelect = (supplierId: number, supplierName: string) => {
    setSelected((prev) => ({ ...prev, supplierId, supplierName }));
    setStep("product");
    setSearchTerm("");
  };

  const handleProductSelect = (productId: number, customerItemId: number) => {
    // Navigate directly to Excel view without warehouse selection
    navigate(`/inventory/excel-view/${productId}/${customerItemId}`);
  };

  const handleBack = () => {
    if (step === "product") {
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

  const getStepNumber = () => {
    switch (step) {
      case "supplier":
        return 1;
      case "product":
        return 2;
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="ロット管理（Excelビュー）"
        subtitle="仕入先・製品を選択してください"
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
          <div className={`flex items-center gap-2 ${step === "product" ? "text-blue-600" : ""}`}>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                getStepNumber() >= 2
                  ? "border-blue-600 bg-blue-50 text-blue-600"
                  : "border-slate-300"
              }`}
            >
              2
            </div>
            <span>製品</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={step === "supplier" ? "仕入先を検索..." : "製品を検索..."}
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
        {selected.supplierId && (
          <div className="flex items-center gap-4 p-3 bg-slate-100 rounded-lg text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span className="font-bold">仕入先:</span>
              <span>{selected.supplierName}</span>
            </div>
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

          {/* Step 2: Product Selection */}
          {step === "product" &&
            (isLoadingCustomerItems ? (
              <div className="flex justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              </div>
            ) : filteredProductGroups.length === 0 ? (
              <div className="text-center py-12 text-slate-500">該当する製品が見つかりません</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProductGroups.map((group) => (
                  <button
                    key={group.product.id}
                    onClick={() =>
                      group.items[0] && handleProductSelect(group.product.id, group.items[0].id)
                    }
                    className="flex items-start gap-4 p-6 rounded-xl border border-slate-200 bg-white text-left transition-all hover:border-indigo-400 hover:shadow-md hover:bg-indigo-50/30 group"
                  >
                    <div className="rounded-lg bg-indigo-100 p-3 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Box className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 line-clamp-2">
                        {group.product.name}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1 font-mono">{group.product.code}</p>
                      {group.items.length > 0 && group.items[0]?.customer_part_no && (
                        <p className="text-xs text-slate-400 mt-2">
                          先方品番: {group.items[0]?.customer_part_no}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))}
        </div>
      </div>
    </PageContainer>
  );
}
