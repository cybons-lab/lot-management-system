/**
 * SupplierDetailPage - 仕入先詳細/編集
 */
import { ArrowLeft, Trash2, Edit } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { SupplierUpdate } from "../api";
import { SupplierForm } from "../components/SupplierForm";
import { useSuppliers } from "../hooks";

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

export function SupplierDetailPage() {
  const navigate = useNavigate();
  const { supplierCode } = useParams<{ supplierCode: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { useGet, useUpdate, useDelete } = useSuppliers();
  const { data: supplier, isLoading, error } = useGet(supplierCode!);
  const { mutate: updateSupplier, isPending: isUpdating } = useUpdate();
  const { mutate: deleteSupplier, isPending: isDeleting } = useDelete();

  const handleBack = useCallback(() => navigate("/suppliers"), [navigate]);

  const handleUpdate = useCallback(
    (data: { supplier_code: string; supplier_name: string }) => {
      if (!supplierCode) return;
      const updateData: SupplierUpdate = {
        supplier_code: data.supplier_code,
        supplier_name: data.supplier_name,
      };
      updateSupplier(
        { id: supplierCode, data: updateData },
        {
          onSuccess: () => {
            setIsEditing(false);
            // コードが変更された場合は新しいURLにリダイレクト
            if (data.supplier_code !== supplierCode) {
              navigate(`/suppliers/${data.supplier_code}`);
            }
          },
        },
      );
    },
    [supplierCode, updateSupplier, navigate],
  );

  const handleDelete = useCallback(() => {
    if (!supplierCode) return;
    deleteSupplier(supplierCode, { onSuccess: () => navigate("/suppliers") });
  }, [supplierCode, deleteSupplier, navigate]);

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );

  if (error || !supplier) {
    return (
      <div className={styles.root}>
        <div className={styles.emptyState.container}>
          <p className={styles.emptyState.title}>仕入先が見つかりません</p>
          <p className={styles.emptyState.description}>
            指定された仕入先コード「{supplierCode}」は存在しないか、削除されています。
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
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          仕入先一覧
        </Button>
        <PageHeader
          title={isEditing ? "仕入先編集" : "仕入先詳細"}
          subtitle={supplier.supplier_code}
          actions={
            !isEditing && (
              <div className={styles.actionBar}>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  編集
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  削除
                </Button>
              </div>
            )
          }
        />
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        {isEditing ? (
          <SupplierForm
            supplier={supplier}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
            isSubmitting={isUpdating}
          />
        ) : (
          <div className="space-y-4">
            <div className={styles.form.field}>
              <span className={styles.form.label}>仕入先コード</span>
              <p className="font-mono text-lg font-medium">{supplier.supplier_code}</p>
            </div>
            <div className={styles.form.field}>
              <span className={styles.form.label}>仕入先名</span>
              <p className="text-lg">{supplier.supplier_name}</p>
            </div>
            <div className={styles.form.field}>
              <span className={styles.form.label}>短縮名</span>
              <p className="text-lg">{supplier.short_name || "-"}</p>
            </div>
            <div className={styles.form.field}>
              <span className={styles.form.label}>作成日時</span>
              <p className="text-gray-600">
                {new Date(supplier.created_at).toLocaleString("ja-JP")}
              </p>
            </div>
            <div className={styles.form.field}>
              <span className={styles.form.label}>更新日時</span>
              <p className="text-gray-600">
                {new Date(supplier.updated_at).toLocaleString("ja-JP")}
              </p>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>仕入先を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              仕入先「{supplier.supplier_name}」（{supplier.supplier_code}
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
