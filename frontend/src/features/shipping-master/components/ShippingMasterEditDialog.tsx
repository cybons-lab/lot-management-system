/**
 * 出荷用マスタ 編集・新規作成ダイアログ
 */

/* eslint-disable max-lines-per-function, complexity, max-lines -- 関連する画面ロジックを1箇所で管理するため */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { shippingMasterApi } from "../api";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/components/ui";
import { Checkbox } from "@/components/ui/form/checkbox";
import { Textarea } from "@/components/ui/form/textarea";
import { type components } from "@/types/api";

type ShippingMasterCurated = components["schemas"]["ShippingMasterCuratedResponse"];
type ShippingMasterCreate = components["schemas"]["ShippingMasterCuratedCreate"];
type ShippingMasterUpdate = components["schemas"]["ShippingMasterCuratedUpdate"];

interface ShippingMasterEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ShippingMasterCurated | null;
}

type FormData = {
  customer_code: string;
  material_code: string;
  jiku_code: string;
  jiku_match_pattern: string;
  warehouse_code: string;
  customer_name: string;
  delivery_note_product_name: string;
  customer_part_no: string;
  maker_part_no: string;
  maker_code: string;
  maker_name: string;
  supplier_code: string;
  supplier_name: string;
  delivery_place_code: string;
  delivery_place_name: string;
  shipping_warehouse: string;
  shipping_slip_text: string;
  transport_lt_days: string;
  has_order: boolean;
  remarks: string;
};

// フィールドラベルマップ
const FIELD_LABELS: Record<string, string> = {
  jiku_match_pattern: "次区マッチングルール",
  warehouse_code: "倉庫コード",
  customer_name: "得意先名",
  delivery_note_product_name: "素材納品書記載製品名",
  customer_part_no: "先方品番",
  maker_part_no: "メーカー品番",
  maker_code: "メーカーコード",
  maker_name: "メーカー名",
  supplier_code: "仕入先コード",
  supplier_name: "仕入先名称",
  delivery_place_code: "納入先コード",
  delivery_place_name: "納入先名称",
  shipping_warehouse: "出荷倉庫",
  shipping_slip_text: "出荷票テキスト",
  transport_lt_days: "輸送LT",
  has_order: "発注の有無",
  remarks: "備考",
};

export function ShippingMasterEditDialog({
  open,
  onOpenChange,
  item,
}: ShippingMasterEditDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!item;
  const [originalValues, setOriginalValues] = useState<FormData | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<FormData>({
    defaultValues: {
      customer_code: "",
      material_code: "",
      jiku_code: "",
      jiku_match_pattern: "",
      warehouse_code: "",
      customer_name: "",
      delivery_note_product_name: "",
      customer_part_no: "",
      maker_part_no: "",
      maker_code: "",
      maker_name: "",
      supplier_code: "",
      supplier_name: "",
      delivery_place_code: "",
      delivery_place_name: "",
      shipping_warehouse: "",
      shipping_slip_text: "",
      transport_lt_days: "",
      has_order: false,
      remarks: "",
    },
  });

  useEffect(() => {
    if (item) {
      const formData = {
        customer_code: item.customer_code || "",
        material_code: item.material_code || "",
        jiku_code: item.jiku_code || "",
        jiku_match_pattern:
          (item as { jiku_match_pattern?: string | null }).jiku_match_pattern || "",
        warehouse_code: item.warehouse_code || "",
        customer_name: item.customer_name || "",
        delivery_note_product_name: item.delivery_note_product_name || "",
        customer_part_no: item.customer_part_no || "",
        maker_part_no: item.maker_part_no || "",
        maker_code: item.maker_code || "",
        maker_name: item.maker_name || "",
        supplier_code: item.supplier_code || "",
        supplier_name: item.supplier_name || "",
        delivery_place_code: item.delivery_place_code || "",
        delivery_place_name: item.delivery_place_name || "",
        shipping_warehouse: item.shipping_warehouse || "",
        shipping_slip_text: item.shipping_slip_text || "",
        transport_lt_days: item.transport_lt_days?.toString() || "",
        has_order: item.has_order || false,
        remarks: item.remarks || "",
      };
      reset(formData);
      setOriginalValues(formData);
    } else {
      reset();
      setOriginalValues(null);
    }
  }, [item, reset]);

  // 変更されたフィールドのリストを計算
  const changedFields = useMemo(() => {
    if (!isEdit || !originalValues) return [];

    const changes: string[] = [];

    Object.keys(dirtyFields).forEach((key) => {
      if (key in FIELD_LABELS) {
        changes.push(FIELD_LABELS[key]);
      }
    });

    return changes;
  }, [isEdit, originalValues, dirtyFields]);

  const createMutation = useMutation({
    mutationFn: (data: ShippingMasterCreate) => shippingMasterApi.create(data),
    onSuccess: () => {
      toast.success("出荷用マスタを作成しました");
      queryClient.invalidateQueries({ queryKey: ["shipping-masters"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`作成エラー: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ShippingMasterUpdate }) =>
      shippingMasterApi.update(id, data),
    onSuccess: () => {
      const changeMessage =
        changedFields.length > 0
          ? `${changedFields.slice(0, 3).join("、")}${changedFields.length > 3 ? ` 他${changedFields.length - 3}件` : ""}を変更しました`
          : "出荷用マスタを更新しました";
      toast.success(changeMessage);
      queryClient.invalidateQueries({ queryKey: ["shipping-masters"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      const isConflict = error instanceof HTTPError && error.response?.status === 409;
      // 409 Conflict エラー（同時編集競合）を特別に処理
      if (isConflict || error?.message?.includes("他のユーザーによって更新")) {
        toast.error(
          "他のユーザーがこのデータを更新しました。ページを再読み込みして最新のデータを取得してください。",
          {
            duration: 5000,
          },
        );
        // データを再取得
        queryClient.invalidateQueries({ queryKey: ["shipping-masters"] });
        onOpenChange(false);
      } else {
        toast.error(`更新エラー: ${error.message || "不明なエラー"}`);
      }
    },
  });

  const onSubmit = (data: FormData) => {
    if (isEdit && item) {
      // 編集モード: 変更されたフィールドのみ送信 + 楽観的ロック用のupdated_at
      const updateData: ShippingMasterUpdate = {
        jiku_match_pattern: data.jiku_match_pattern || null,
        warehouse_code: data.warehouse_code || null,
        customer_name: data.customer_name || null,
        delivery_note_product_name: data.delivery_note_product_name || null,
        customer_part_no: data.customer_part_no || null,
        maker_part_no: data.maker_part_no || null,
        maker_code: data.maker_code || null,
        maker_name: data.maker_name || null,
        supplier_code: data.supplier_code || null,
        supplier_name: data.supplier_name || null,
        delivery_place_code: data.delivery_place_code || null,
        delivery_place_name: data.delivery_place_name || null,
        shipping_warehouse: data.shipping_warehouse || null,
        shipping_slip_text: data.shipping_slip_text || null,
        transport_lt_days: data.transport_lt_days ? parseInt(data.transport_lt_days, 10) : null,
        has_order: data.has_order,
        remarks: data.remarks || null,
        version: item.version,
      };
      updateMutation.mutate({ id: item.id, data: updateData });
    } else {
      // 新規作成モード
      const createData: ShippingMasterCreate = {
        customer_code: data.customer_code,
        material_code: data.material_code,
        jiku_code: data.jiku_code,
        jiku_match_pattern: data.jiku_match_pattern || null,
        warehouse_code: data.warehouse_code || null,
        customer_name: data.customer_name || null,
        delivery_note_product_name: data.delivery_note_product_name || null,
        customer_part_no: data.customer_part_no || null,
        maker_part_no: data.maker_part_no || null,
        maker_code: data.maker_code || null,
        maker_name: data.maker_name || null,
        supplier_code: data.supplier_code || null,
        supplier_name: data.supplier_name || null,
        delivery_place_code: data.delivery_place_code || null,
        delivery_place_name: data.delivery_place_name || null,
        shipping_warehouse: data.shipping_warehouse || null,
        shipping_slip_text: data.shipping_slip_text || null,
        transport_lt_days: data.transport_lt_days ? parseInt(data.transport_lt_days, 10) : null,
        has_order: data.has_order,
        remarks: data.remarks || null,
      };
      createMutation.mutate(createData);
    }
  };

  const hasOrderValue = watch("has_order");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "出荷用マスタ編集" : "出荷用マスタ新規作成"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "出荷用マスタデータを編集します。必須項目は編集できません。"
              : "新しい出荷用マスタデータを作成します。"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* キー項目（新規作成時のみ編集可能） */}
          <div className="space-y-4 rounded-md border p-4 bg-gray-50">
            <h3 className="font-semibold text-sm">キー項目（必須）</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_code">得意先コード *</Label>
                <Input
                  id="customer_code"
                  {...register("customer_code", { required: !isEdit })}
                  disabled={isEdit}
                  className={errors.customer_code ? "border-red-500" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="material_code">材質コード *</Label>
                <Input
                  id="material_code"
                  {...register("material_code", { required: !isEdit })}
                  disabled={isEdit}
                  className={errors.material_code ? "border-red-500" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jiku_code">次区 *</Label>
                <Input
                  id="jiku_code"
                  {...register("jiku_code", { required: !isEdit })}
                  disabled={isEdit}
                  className={errors.jiku_code ? "border-red-500" : ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jiku_match_pattern">次区マッチングルール（任意）</Label>
              <Input
                id="jiku_match_pattern"
                {...register("jiku_match_pattern")}
                placeholder="例: 2***"
              />
            </div>
          </div>

          {/* 基本情報 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">基本情報</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name">得意先名</Label>
                <Input id="customer_name" {...register("customer_name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouse_code">倉庫コード</Label>
                <Input id="warehouse_code" {...register("warehouse_code")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_part_no">先方品番</Label>
                <Input id="customer_part_no" {...register("customer_part_no")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maker_part_no">メーカー品番</Label>
                <Input id="maker_part_no" {...register("maker_part_no")} />
              </div>
            </div>
          </div>

          {/* 仕入先・メーカー情報 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">仕入先・メーカー情報</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier_code">仕入先コード</Label>
                <Input id="supplier_code" {...register("supplier_code")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier_name">仕入先名称</Label>
                <Input id="supplier_name" {...register("supplier_name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maker_code">メーカーコード</Label>
                <Input id="maker_code" {...register("maker_code")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maker_name">メーカー名</Label>
                <Input id="maker_name" {...register("maker_name")} />
              </div>
            </div>
          </div>

          {/* 納入・出荷情報 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">納入・出荷情報</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_place_code">納入先コード</Label>
                <Input id="delivery_place_code" {...register("delivery_place_code")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_place_name">納入先名称</Label>
                <Input id="delivery_place_name" {...register("delivery_place_name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping_warehouse">出荷倉庫</Label>
                <Input id="shipping_warehouse" {...register("shipping_warehouse")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transport_lt_days">輸送LT（営業日）</Label>
                <Input
                  id="transport_lt_days"
                  type="number"
                  min="0"
                  {...register("transport_lt_days")}
                />
              </div>
            </div>
          </div>

          {/* テキスト情報 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">テキスト情報</h3>
            <div className="space-y-2">
              <Label htmlFor="delivery_note_product_name">素材納品書記載製品名</Label>
              <Input id="delivery_note_product_name" {...register("delivery_note_product_name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping_slip_text">出荷票テキスト</Label>
              <Textarea
                id="shipping_slip_text"
                {...register("shipping_slip_text")}
                rows={3}
                placeholder="出荷票に記載するテキスト（改行可）"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">備考</Label>
              <Textarea id="remarks" {...register("remarks")} rows={2} />
            </div>
          </div>

          {/* フラグ */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="has_order"
              checked={hasOrderValue}
              onCheckedChange={(checked) =>
                setValue("has_order", checked as boolean, { shouldDirty: true })
              }
            />
            <Label htmlFor="has_order" className="cursor-pointer">
              発注の有無
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending || updateMutation.isPending || (!isDirty && isEdit)
              }
            >
              {createMutation.isPending || updateMutation.isPending
                ? "保存中..."
                : isEdit
                  ? "更新"
                  : "作成"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
