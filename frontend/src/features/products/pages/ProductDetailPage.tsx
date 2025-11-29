/**
 * ProductDetailPage - 商品詳細/編集
 */
import { ArrowLeft, Trash2, Edit } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { ProductUpdate } from "../api";
import { ProductForm, type ProductFormOutput } from "../components/ProductForm";
import { useProducts } from "../hooks/useProducts";

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
  const { makerPartCode: productCode } = useParams<{ makerPartCode: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { useGet, useUpdate, useDelete } = useProducts();
  const { data: product, isLoading, error } = useGet(productCode!);
  const { mutate: updateProduct, isPending: isUpdating } = useUpdate();
  const { mutate: deleteProduct, isPending: isDeleting } = useDelete();

  const handleBack = useCallback(() => navigate("/products"), [navigate]);

  const handleUpdate = useCallback(
    (data: ProductFormOutput) => {
      if (!productCode) return;
      updateProduct({ id: productCode, data: data as ProductUpdate }, { onSuccess: () => setIsEditing(false) });
    },
    [productCode, updateProduct],
  );

  const handleDelete = useCallback(() => {
    if (!productCode) return;
    deleteProduct(productCode, { onSuccess: () => navigate("/products") });
  }, [productCode, deleteProduct, navigate]);

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
            指定された製品コード「{productCode}」は存在しないか、削除されています。
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
        subtitle={product.product_code}
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
              <span className={styles.form.label}>製品コード</span>
              <p className="font-mono text-lg font-medium">{product.product_code}</p>
            </div>
            <div className={styles.form.field}>
              <span className={styles.form.label}>商品名</span>
              <p className="text-lg">{product.product_name}</p>
            </div>
            <div className={styles.form.field}>
              <span className={styles.form.label}>社内単位</span>
              <p>{product.internal_unit}</p>
            </div>
            <div className={styles.form.field}>
              <span className={styles.form.label}>外部単位</span>
              <p>{product.external_unit}</p>
            </div>
            <div className={styles.form.field}>
              <span className={styles.form.label}>内部単位あたりの数量</span>
              <p>{product.qty_per_internal_unit}</p>
            </div>
            <div className={styles.form.field}>
              <span className={styles.form.label}>得意先品番</span>
              <p>{product.customer_part_no ?? "-"}</p>
            </div>
            <div className={styles.form.field}>
              <span className={styles.form.label}>メーカー品番</span>
              <p>{product.maker_item_code ?? "-"}</p>
            </div>
            <div className={styles.form.field}>
              <span className={styles.form.label}>ステータス</span>
              <p className="text-sm font-medium">{product.is_active ? "有効" : "無効"}</p>
            </div>
            <div className={styles.form.field}>
              <span className={styles.form.label}>作成日時</span>
              <p className="text-gray-600">
                {new Date(product.created_at).toLocaleString("ja-JP")}
              </p>
            </div>
            <div className={styles.form.field}>
              <span className={styles.form.label}>更新日時</span>
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
              商品「{product.product_name}」（{product.product_code}
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
