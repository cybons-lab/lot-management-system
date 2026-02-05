/**
 * WarehouseDetailDialog
 * 倉庫詳細・編集ダイアログ
 */
import { Edit, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import type { WarehouseUpdate } from "../api";
import { useWarehouses } from "../hooks";

import { WarehouseForm } from "./WarehouseForm";

import { DeleteDialog, type DeleteType } from "@/components/common/DeleteDialog";
import { Button } from "@/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";

interface WarehouseDetailDialogProps {
  warehouseCode: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const warehouseTypeLabels: Record<string, string> = {
  internal: "社内",
  external: "外部",
  supplier: "仕入先",
};

// eslint-disable-next-line max-lines-per-function, complexity
export function WarehouseDetailDialog({
  warehouseCode,
  open,
  onOpenChange,
}: WarehouseDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<DeleteType>("soft");

  const { useGet, useUpdate, useSoftDelete, usePermanentDelete } = useWarehouses();
  const { data: warehouse, isLoading } = useGet(warehouseCode || "");
  const { mutate: updateWarehouse, isPending: isUpdating } = useUpdate();
  const { mutate: softDelete, isPending: isSoftDeleting } = useSoftDelete();
  const { mutate: permanentDelete, isPending: isPermanentDeleting } = usePermanentDelete();
  const isDeleting = isSoftDeleting || isPermanentDeleting;

  const handleClose = useCallback(() => {
    setIsEditing(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleUpdate = useCallback(
    (data: { warehouse_code: string; warehouse_name: string; warehouse_type: string }) => {
      if (!warehouseCode || !warehouse) return;

      const updateData: WarehouseUpdate = {
        warehouse_code: data.warehouse_code,
        warehouse_name: data.warehouse_name,
        warehouse_type: data.warehouse_type,
        version: warehouse.version,
      };
      updateWarehouse(
        { id: warehouseCode, data: updateData },
        {
          onSuccess: () => {
            setIsEditing(false);
          },
        },
      );
    },
    [warehouseCode, updateWarehouse],
  );

  const handleConfirmDelete = useCallback(
    (endDate?: string | null) => {
      if (!warehouseCode || !warehouse) return;

      const onSuccess = () => {
        setIsDeleteDialogOpen(false);
        handleClose();
      };

      if (deleteType === "soft") {
        softDelete(
          { id: warehouseCode, version: warehouse.version, endDate: endDate || undefined },
          { onSuccess },
        );
      } else {
        permanentDelete({ id: warehouseCode, version: warehouse.version }, { onSuccess });
      }
    },
    [warehouse, warehouseCode, deleteType, softDelete, permanentDelete, handleClose],
  );

  if (!warehouseCode && !open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "倉庫編集" : "倉庫詳細"}
              {warehouse && (
                <span className="ml-4 text-sm font-normal text-muted-foreground">
                  {warehouse.warehouse_code}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {isLoading || !warehouse ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
            </div>
          ) : isEditing ? (
            <WarehouseForm
              warehouse={warehouse}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)}
              isSubmitting={isUpdating}
            />
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">倉庫コード</span>
                    <p className="font-mono text-lg font-medium">{warehouse.warehouse_code}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">倉庫名</span>
                    <p className="text-lg font-medium">{warehouse.warehouse_name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">短縮名</span>
                    <p className="text-lg">{warehouse.short_name || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">タイプ</span>
                    <p className="text-lg">
                      {warehouseTypeLabels[warehouse.warehouse_type] ?? warehouse.warehouse_type}
                    </p>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">デフォルト輸送リードタイム</span>
                  <p className="text-lg">
                    {warehouse.default_transport_lead_time_days
                      ? `${warehouse.default_transport_lead_time_days} 日`
                      : "-"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">作成日時</span>
                    <p className="text-sm text-gray-600">
                      {new Date(warehouse.created_at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">更新日時</span>
                    <p className="text-sm text-gray-600">
                      {new Date(warehouse.updated_at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  編集
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  削除
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {warehouse && (
        <DeleteDialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open);
            if (!open) setDeleteType("soft");
          }}
          type={deleteType}
          title={deleteType === "soft" ? "倉庫を無効化しますか？" : "倉庫を完全に削除しますか？"}
          itemName="倉庫"
          onConfirm={handleConfirmDelete}
          isPending={isDeleting}
          onSwitchToPermanent={() => setDeleteType("permanent")}
          confirmationPhrase={warehouse.warehouse_code}
        />
      )}
    </>
  );
}
