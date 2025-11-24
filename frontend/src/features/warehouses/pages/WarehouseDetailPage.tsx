/**
 * WarehouseDetailPage - 倉庫詳細/編集
 */
import { ArrowLeft, Trash2, Edit } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { WarehouseUpdate } from "../api/warehouses-api";
import { WarehouseForm } from "../components/WarehouseForm";
import { useUpdateWarehouse, useDeleteWarehouse } from "../hooks/useWarehouseMutations";
import { useWarehouseQuery } from "../hooks/useWarehouseQuery";

import * as styles from "./styles";

import { Button } from "@/components/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/display/alert-dialog";
import { PageHeader } from "@/shared/components/layout/PageHeader";

const warehouseTypeLabels: Record<string, string> = {
  internal: "社内",
  external: "外部",
  supplier: "仕入先",
};

export function WarehouseDetailPage() {
  const navigate = useNavigate();
  const { warehouseCode } = useParams<{ warehouseCode: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: warehouse, isLoading, error } = useWarehouseQuery(warehouseCode);
  const { mutate: updateWarehouse, isPending: isUpdating } = useUpdateWarehouse();
  const { mutate: deleteWarehouse, isPending: isDeleting } = useDeleteWarehouse();

  const handleBack = useCallback(() => navigate("/warehouses"), [navigate]);

  const handleUpdate = useCallback(
    (data: { warehouse_code: string; warehouse_name: string; warehouse_type: string }) => {
      if (!warehouseCode) return;
      const updateData: WarehouseUpdate = {
        warehouse_name: data.warehouse_name,
        warehouse_type: data.warehouse_type,
      };
      updateWarehouse(
        { warehouseCode, data: updateData },
        { onSuccess: () => setIsEditing(false) },
      );
    },
    [warehouseCode, updateWarehouse],
  );

  const handleDelete = useCallback(() => {
    if (!warehouseCode) return;
    deleteWarehouse(warehouseCode, { onSuccess: () => navigate("/warehouses") });
  }, [warehouseCode, deleteWarehouse, navigate]);

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );

  if (error || !warehouse) {
    return (
      <div className={styles.root}>
        <div className={styles.emptyState.container}>
          <p className={styles.emptyState.title}>倉庫が見つかりません</p>
          <p className={styles.emptyState.description}>
            指定された倉庫コード「{warehouseCode}」は存在しないか、削除されています。
          </p>
          <Button className={styles.emptyState.action} onClick={handleBack}>
            一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <PageHeader
        title={isEditing ? "倉庫編集" : "倉庫詳細"}
        subtitle={warehouse.warehouse_code}
        actions={
          <div className={styles.actionBar}>
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              一覧に戻る
            </Button>
            {!isEditing && (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  編集
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  削除
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        {isEditing ? (
          <WarehouseForm
            warehouse={warehouse}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
            isSubmitting={isUpdating}
          />
        ) : (
          <div className="space-y-4">
            <div className={styles.form.field}>
              <label className={styles.form.label}>倉庫コード</label>
              <p className="font-mono text-lg font-medium">{warehouse.warehouse_code}</p>
            </div>
            <div className={styles.form.field}>
              <label className={styles.form.label}>倉庫名</label>
              <p className="text-lg">{warehouse.warehouse_name}</p>
            </div>
            <div className={styles.form.field}>
              <label className={styles.form.label}>タイプ</label>
              <p>{warehouseTypeLabels[warehouse.warehouse_type] ?? warehouse.warehouse_type}</p>
            </div>
            <div className={styles.form.field}>
              <label className={styles.form.label}>作成日時</label>
              <p className="text-gray-600">
                {new Date(warehouse.created_at).toLocaleString("ja-JP")}
              </p>
            </div>
            <div className={styles.form.field}>
              <label className={styles.form.label}>更新日時</label>
              <p className="text-gray-600">
                {new Date(warehouse.updated_at).toLocaleString("ja-JP")}
              </p>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>倉庫を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              倉庫「{warehouse.warehouse_name}」（{warehouse.warehouse_code}
              ）を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
