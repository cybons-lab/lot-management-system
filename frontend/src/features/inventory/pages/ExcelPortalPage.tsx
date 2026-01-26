/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
import { ArrowLeft, Box, Building2, ChevronRight, Search, Truck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button, Input } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { useInventoryItems } from "@/features/inventory/hooks";
import { useSuppliersQuery } from "@/hooks/api/useMastersQuery";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

type Step = "supplier" | "product";

export function ExcelPortalPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("supplier");
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useSuppliersQuery();

  // Fetch inventory items for the selected supplier
  const { data: inventoryData, isLoading: isLoadingInventory } = useInventoryItems({
    supplier_id: selectedSupplierId ?? undefined,
    limit: 100, // Reasonable limit for selection
  });

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  const handleSupplierSelect = (supplierId: number) => {
    setSelectedSupplierId(supplierId);
    setStep("product");
    setSearchTerm(""); // Reset search when changing steps
  };

  const handleBack = () => {
    if (step === "product") {
      setStep("supplier");
      setSelectedSupplierId(null);
      setSearchTerm("");
    } else {
      navigate(-1);
    }
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredProducts = (inventoryData?.items ?? []).filter(
    (item) =>
      (item.product_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.product_code ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <PageContainer>
      <PageHeader
        title="Excel View Portal"
        subtitle="Excel形式で表示・編集する対象を選択してください"
        actions={
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        }
      />

      <div className="mx-auto max-w-5xl space-y-6 py-6">
        {/* Progress Stepper */}
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500 mb-8">
          <div className={`flex items-center gap-2 ${step === "supplier" ? "text-blue-600" : ""}`}>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border ${step === "supplier" ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-300"}`}
            >
              1
            </div>
            <span>仕入先を選択</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <div className={`flex items-center gap-2 ${step === "product" ? "text-blue-600" : ""}`}>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border ${step === "product" ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-300"}`}
            >
              2
            </div>
            <span>製品を選択</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={step === "supplier" ? "仕入先を検索..." : "製品を検索..."}
            className="pl-10 h-12 text-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          {step === "supplier" ? (
            isLoadingSuppliers ? (
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
                    onClick={() => handleSupplierSelect(supplier.id)}
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
            )
          ) : isLoadingInventory ? (
            <div className="flex justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              該当する製品（在庫アイテム）が見つかりません
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg text-sm text-slate-600 mb-4">
                <Truck className="h-4 w-4" />
                <span className="font-bold">選択中:</span>
                <span>{selectedSupplier?.supplier_name}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.map((item) => (
                  <button
                    key={`${item.product_id}-${item.warehouse_id}`}
                    onClick={() =>
                      navigate(ROUTES.INVENTORY.EXCEL_VIEW(item.product_id, item.warehouse_id))
                    }
                    className="flex items-center gap-4 p-5 rounded-xl border border-slate-200 bg-white text-left transition-all hover:border-indigo-400 hover:shadow-md hover:bg-indigo-50/30 group relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-indigo-500 transition-colors" />
                    <div className="rounded-lg bg-indigo-100 p-3 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Box className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{item.product_name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        <span className="text-slate-500 font-mono bg-slate-100 px-1.5 rounded">
                          {item.product_code}
                        </span>
                        <div className="flex items-center gap-1 text-slate-600">
                          <Building2 className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[150px]">{item.warehouse_name}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
