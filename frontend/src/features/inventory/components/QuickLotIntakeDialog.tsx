/**
 * QuickLotIntakeDialog
 *
 * 既存ロットへの追加入庫 or 新規ロット作成を1つのダイアログで行う簡易登録フォーム。
 */
/* eslint-disable max-lines-per-function */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { createLot } from "../api";

import { ExistingLotIntakeForm } from "./forms/ExistingLotIntakeForm";
import { NewLotIntakeForm } from "./forms/NewLotIntakeForm";

import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
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
            <ExistingLotIntakeForm
              existingLotId={existingLotId}
              setExistingLotId={setExistingLotId}
              existingQuantity={existingQuantity}
              setExistingQuantity={setExistingQuantity}
              existingDate={existingDate}
              setExistingDate={setExistingDate}
              lotOptions={lotOptions}
              selectedLot={selectedLot}
              isLoadingLots={isLoadingLots}
              isSubmitting={isSubmitting}
            />
          )}

          {mode === "new" && (
            <NewLotIntakeForm
              lotNumber={lotNumber}
              setLotNumber={setLotNumber}
              productId={productId}
              setProductId={setProductId}
              warehouseId={warehouseId}
              setWarehouseId={setWarehouseId}
              supplierId={supplierId}
              setSupplierId={setSupplierId}
              newQuantity={newQuantity}
              setNewQuantity={setNewQuantity}
              unit={unit}
              setUnit={setUnit}
              receivedDate={receivedDate}
              setReceivedDate={setReceivedDate}
              expiryDate={expiryDate}
              setExpiryDate={setExpiryDate}
              productOptions={productOptions}
              warehouseOptions={warehouseOptions}
              supplierOptions={supplierOptions}
              isLoadingProducts={isLoadingProducts}
              isLoadingWarehouses={isLoadingWarehouses}
              isLoadingSuppliers={isLoadingSuppliers}
              isSubmitting={isSubmitting}
            />
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
