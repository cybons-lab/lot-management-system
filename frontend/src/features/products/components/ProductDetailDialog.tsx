/**
 * ProductDetailDialog
 * 商品詳細・編集ダイアログ
 */
import { Edit, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import type { ProductUpdate } from "../api";
import { useProducts } from "../hooks/useProducts";

import { ProductForm, type ProductFormOutput } from "./ProductForm";
import { ProductSupplierSection } from "./ProductSupplierSection";

import { DeleteDialog, type DeleteType } from "@/components/common/DeleteDialog";
import { Button } from "@/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs";

interface ProductDetailDialogProps {
  productCode: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// eslint-disable-next-line max-lines-per-function, complexity
export function ProductDetailDialog({ productCode, open, onOpenChange }: ProductDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<DeleteType>("soft");

  const { useGet, useUpdate, useSoftDelete, usePermanentDelete } = useProducts();
  const { data: product, isLoading } = useGet(productCode || "");
  const { mutate: updateProduct, isPending: isUpdating } = useUpdate();
  const { mutate: softDelete, isPending: isSoftDeleting } = useSoftDelete();
  const { mutate: permanentDelete, isPending: isPermanentDeleting } = usePermanentDelete();
  const isDeleting = isSoftDeleting || isPermanentDeleting;

  const handleClose = useCallback(() => {
    setIsEditing(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleUpdate = useCallback(
    (data: ProductFormOutput) => {
      if (!productCode) return;
      const updateData: ProductUpdate = {
        ...data,
        customer_part_no: data.customer_part_no ?? undefined,
        maker_item_code: data.maker_item_code ?? undefined,
      };
      updateProduct(
        { id: productCode, data: updateData },
        {
          onSuccess: () => {
            setIsEditing(false);
          },
        },
      );
    },
    [productCode, updateProduct],
  );

  const handleConfirmDelete = useCallback(
    (endDate?: string | null) => {
      if (!productCode) return;

      const onSuccess = () => {
        setIsDeleteDialogOpen(false);
        handleClose();
      };

      if (deleteType === "soft") {
        softDelete({ id: productCode, endDate: endDate || undefined }, { onSuccess });
      } else {
        permanentDelete(productCode, { onSuccess });
      }
    },
    [productCode, deleteType, softDelete, permanentDelete, handleClose],
  );

  if (!productCode && !open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "商品編集" : "商品詳細"}
              {product && (
                <span className="ml-4 text-sm font-normal text-muted-foreground">
                  {product.product_code}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {isLoading || !product ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
            </div>
          ) : isEditing ? (
            <ProductForm
              product={product}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)}
              isSubmitting={isUpdating}
            />
          ) : (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">基本情報</TabsTrigger>
                <TabsTrigger value="suppliers">仕入先</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-6 pt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">商品コード</span>
                      <span className="font-mono text-base font-bold text-gray-900">
                        {product.product_code}
                      </span>{" "}
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">商品名</span>
                      <p className="text-lg font-medium">{product.product_name}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">社内単位</span>
                      <p>{product.internal_unit}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">外部単位</span>
                      <p>{product.external_unit}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">内部単位あたりの数量</span>
                      <p>{product.qty_per_internal_unit}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">ステータス</span>
                      <p className="text-sm font-medium">{product.is_active ? "有効" : "無効"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">メーカー品番</span>
                      <p>{product.maker_item_code ?? "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">作成日時</span>
                      <p className="text-sm text-gray-600">
                        {new Date(product.created_at).toLocaleString("ja-JP")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    編集
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    削除
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="suppliers" className="pt-4">
                <ProductSupplierSection productCode={product.product_code} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {product && (
        <DeleteDialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open);
            if (!open) setDeleteType("soft");
          }}
          type={deleteType}
          title={deleteType === "soft" ? "商品を無効化しますか？" : "商品を完全に削除しますか？"}
          itemName="商品"
          onConfirm={handleConfirmDelete}
          isPending={isDeleting}
          onSwitchToPermanent={() => setDeleteType("permanent")}
          confirmationPhrase={product.product_code}
        />
      )}
    </>
  );
}
