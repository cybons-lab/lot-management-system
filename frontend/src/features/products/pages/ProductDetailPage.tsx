/**
 * ProductDetailPage - 商品詳細/編集
 */
import { ArrowLeft, Trash2, Edit } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { ProductUpdate } from "../api/products-api";
import { ProductForm } from "../components/ProductForm";
import { useUpdateProduct, useDeleteProduct } from "../hooks/useProductMutations";
import { useProductQuery } from "../hooks/useProductQuery";

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

export function ProductDetailPage() {
  const navigate = useNavigate();
  const { makerPartCode } = useParams<{ makerPartCode: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: product, isLoading, error } = useProductQuery(makerPartCode);
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct();
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct();

  const handleBack = useCallback(() => navigate("/products"), [navigate]);

  const handleUpdate = useCallback(
    (data: {
      maker_part_code: string;
      product_name: string;
      base_unit: string;
      consumption_limit_days?: number | null;
    }) => {
      if (!makerPartCode) return;
      const updateData: ProductUpdate = {
        product_name: data.product_name,
        base_unit: data.base_unit,
        consumption_limit_days: data.consumption_limit_days,
      };
      updateProduct({ makerPartCode, data: updateData }, { onSuccess: () => setIsEditing(false) });
    },
    [makerPartCode, updateProduct],
  );

  const handleDelete = useCallback(() => {
    if (!makerPartCode) return;
    deleteProduct(makerPartCode, { onSuccess: () => navigate("/products") });
  }, [makerPartCode, deleteProduct, navigate]);

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );

  if (error || !product) {
    return (
      <div className={styles.root}>
        <div className={styles.emptyState.container}>
          <p className={styles.emptyState.title}>商品が見つかりません</p>
          <p className={styles.emptyState.description}>
            指定されたメーカー品番「{makerPartCode}」は存在しないか、削除されています。
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
        title={isEditing ? "商品編集" : "商品詳細"}
        subtitle={product.maker_part_code}
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
          <ProductForm
            product={product}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
            isSubmitting={isUpdating}
          />
        ) : (
          <div className="space-y-4">
            <div className={styles.form.field}>
              <div className={styles.form.label}>メーカー品番</div>
              <p className="font-mono text-lg font-medium">{product.maker_part_code}</p>
            </div>
            <div className={styles.form.field}>
              <div className={styles.form.label}>商品名</div>
              <p className="text-lg">{product.product_name}</p>
            </div>
            <div className={styles.form.field}>
              <div className={styles.form.label}>単位</div>
              <p>{product.base_unit}</p>
            </div>
            <div className={styles.form.field}>
              <div className={styles.form.label}>消費期限日数</div>
              <p>{product.consumption_limit_days ?? "-"}</p>
            </div>
            <div className={styles.form.field}>
              <div className={styles.form.label}>作成日時</div>
              <p className="text-gray-600">
                {new Date(product.created_at).toLocaleString("ja-JP")}
              </p>
            </div>
            <div className={styles.form.field}>
              <div className={styles.form.label}>更新日時</div>
              <p className="text-gray-600">
                {new Date(product.updated_at).toLocaleString("ja-JP")}
              </p>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>商品を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              商品「{product.product_name}」（{product.maker_part_code}
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
