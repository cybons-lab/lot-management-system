/**
 * QuickLotIntakeDialog
 *
 * 既存ロットへの追加入庫 or 新規ロット作成を1つのダイアログで行う簡易登録フォーム。
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { createLot } from "../api";

import { Button, Input, Label } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import { useProducts } from "@/features/products/hooks";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import { useWarehouses } from "@/features/warehouses/hooks";
import { useLotsQuery } from "@/hooks/api";
import { createStockMovement } from "@/services/api/lot-service";

type IntakeMode = "existing" | "new";

interface QuickLotIntakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const DEFAULT_UNIT = "EA";

export function QuickLotIntakeDialog({ open, onOpenChange, onSuccess }: QuickLotIntakeDialogProps) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [mode, setMode] = useState<IntakeMode>("existing");

  const [existingLotId, setExistingLotId] = useState<string>("");
  const [existingQuantity, setExistingQuantity] = useState<string>("");
  const [existingDate, setExistingDate] = useState<string>(today);

  const [lotNumber, setLotNumber] = useState<string>("");
  const [productId, setProductId] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [newQuantity, setNewQuantity] = useState<string>("");
  const [unit, setUnit] = useState<string>(DEFAULT_UNIT);
  const [receivedDate, setReceivedDate] = useState<string>(today);
  const [expiryDate, setExpiryDate] = useState<string>("");

  const { data: lots = [], isLoading: isLoadingLots } = useLotsQuery({ limit: 200 });
  const { useList: useProductList } = useProducts();
  const { useList: useWarehouseList } = useWarehouses();
  const { useList: useSupplierList } = useSuppliers();

  const { data: products = [], isLoading: isLoadingProducts } = useProductList();
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useWarehouseList();
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useSupplierList();

  useEffect(() => {
    if (open) {
      setMode("existing");
      setExistingLotId("");
      setExistingQuantity("");
      setExistingDate(today);
      setLotNumber("");
      setProductId("");
      setWarehouseId("");
      setSupplierId("");
      setNewQuantity("");
      setUnit(DEFAULT_UNIT);
      setReceivedDate(today);
      setExpiryDate("");
    }
  }, [open, today]);

  const lotOptions = useMemo(
    () =>
      lots.map((lot) => ({
        value: String(lot.id),
        label: `${lot.lot_number} / ${lot.product_code ?? "-"} ${
          lot.product_name ?? ""
        } / ${lot.warehouse_name ?? lot.warehouse_code ?? "-"}`,
      })),
    [lots],
  );

  const selectedLot = useMemo(
    () => lots.find((lot) => String(lot.id) === existingLotId),
    [lots, existingLotId],
  );

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: String(p.id ?? 0),
        label: `${p.product_code ?? ""} - ${p.product_name ?? ""}`,
      })),
    [products],
  );

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((w) => ({
        value: String(w.id ?? 0),
        label: `${w.warehouse_code ?? ""} - ${w.warehouse_name ?? ""}`,
      })),
    [warehouses],
  );

  const supplierOptions = useMemo(
    () =>
      suppliers.map((s) => ({
        value: String(s.id ?? 0),
        label: `${s.supplier_code ?? ""} - ${s.supplier_name ?? ""}`,
      })),
    [suppliers],
  );

  const createMovementMutation = useMutation({
    mutationFn: createStockMovement,
    onSuccess: () => {
      toast.success("既存ロットに追加入庫しました");
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "追加入庫に失敗しました");
    },
  });

  const createLotMutation = useMutation({
    mutationFn: createLot,
    onSuccess: () => {
      toast.success("新規ロットを登録しました");
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "ロット作成に失敗しました");
    },
  });

  const handleExistingSubmit = async () => {
    if (!existingLotId) {
      toast.error("ロットを選択してください");
      return;
    }
    if (!existingQuantity || Number(existingQuantity) <= 0) {
      toast.error("追加入庫数量を入力してください");
      return;
    }

    const currentQty = Number(selectedLot?.current_quantity ?? 0);
    const changeQty = Number(existingQuantity);
    const nextQty = currentQty + changeQty;

    await createMovementMutation.mutateAsync({
      lot_id: Number(existingLotId),
      transaction_type: "inbound",
      quantity_change: changeQty,
      quantity_after: nextQty,
      reference_type: "quick_intake",
      reference_id: Number(existingLotId),
      transaction_date: existingDate ? `${existingDate}T00:00:00` : null,
    });
  };

  const handleNewSubmit = async () => {
    if (!productId || !warehouseId) {
      toast.error("製品と倉庫を選択してください");
      return;
    }
    if (!newQuantity || Number(newQuantity) <= 0) {
      toast.error("入庫数量を入力してください");
      return;
    }
    if (!receivedDate) {
      toast.error("入庫日を入力してください");
      return;
    }

    await createLotMutation.mutateAsync({
      lot_number: lotNumber,
      product_id: Number(productId),
      warehouse_id: Number(warehouseId),
      supplier_id: supplierId ? Number(supplierId) : undefined,
      received_date: receivedDate,
      expiry_date: expiryDate || undefined,
      current_quantity: Number(newQuantity),
      allocated_quantity: 0,
      locked_quantity: 0,
      unit,
      origin_type: "adhoc",
      status: "active",
      inspection_status: "not_required",
    });
  };

  const isSubmitting = createLotMutation.isPending || createMovementMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>ロット簡易登録</DialogTitle>
          <DialogDescription>
            既存ロットへの追加入庫、または新規ロット作成を選択してください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "existing" ? "default" : "outline"}
              onClick={() => setMode("existing")}
              disabled={isSubmitting}
            >
              既存ロットに追加入庫
            </Button>
            <Button
              type="button"
              variant={mode === "new" ? "default" : "outline"}
              onClick={() => setMode("new")}
              disabled={isSubmitting}
            >
              新規ロット作成
            </Button>
          </div>

          {mode === "existing" && (
            <div className="space-y-4 rounded-md border p-4">
              <div>
                <Label className="mb-2 block">ロット</Label>
                <SearchableSelect
                  options={lotOptions}
                  value={existingLotId}
                  onChange={setExistingLotId}
                  placeholder={isLoadingLots ? "読み込み中..." : "ロットを選択"}
                  disabled={isLoadingLots || isSubmitting}
                />
                {selectedLot && (
                  <div className="mt-2 text-xs text-slate-500">
                    現在在庫: {selectedLot.current_quantity} {selectedLot.unit}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="existing_quantity">追加入庫数量 *</Label>
                  <Input
                    id="existing_quantity"
                    type="number"
                    min="0"
                    step="0.001"
                    value={existingQuantity}
                    onChange={(e) => setExistingQuantity(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="existing_date">入庫日 *</Label>
                  <Input
                    id="existing_date"
                    type="date"
                    value={existingDate}
                    onChange={(e) => setExistingDate(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}

          {mode === "new" && (
            <div className="space-y-4 rounded-md border p-4">
              <div className="text-xs text-slate-500">
                ロット番号は未入力の場合に自動採番されます。
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="lot_number">ロット番号</Label>
                  <Input
                    id="lot_number"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    placeholder="未入力で自動採番"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">製品 *</Label>
                  <SearchableSelect
                    options={productOptions}
                    value={productId}
                    onChange={setProductId}
                    placeholder={isLoadingProducts ? "読み込み中..." : "製品を選択"}
                    disabled={isLoadingProducts || isSubmitting}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">倉庫 *</Label>
                  <SearchableSelect
                    options={warehouseOptions}
                    value={warehouseId}
                    onChange={setWarehouseId}
                    placeholder={isLoadingWarehouses ? "読み込み中..." : "倉庫を選択"}
                    disabled={isLoadingWarehouses || isSubmitting}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">仕入先</Label>
                  <SearchableSelect
                    options={supplierOptions}
                    value={supplierId}
                    onChange={setSupplierId}
                    placeholder={isLoadingSuppliers ? "読み込み中..." : "仕入先を選択"}
                    disabled={isLoadingSuppliers || isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="new_quantity">入庫数量 *</Label>
                  <Input
                    id="new_quantity"
                    type="number"
                    min="0"
                    step="0.001"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="unit">単位 *</Label>
                  <Input
                    id="unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="received_date">入庫日 *</Label>
                  <Input
                    id="received_date"
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="expiry_date">有効期限</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            キャンセル
          </Button>
          {mode === "existing" ? (
            <Button onClick={handleExistingSubmit} disabled={isSubmitting}>
              追加入庫
            </Button>
          ) : (
            <Button onClick={handleNewSubmit} disabled={isSubmitting}>
              登録
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
