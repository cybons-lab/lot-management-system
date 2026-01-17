/**
 * WarehouseDeliveryRouteForm - 輸送経路登録/編集フォーム
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { WarehouseDeliveryRoute } from "../api";
import { form as formStyles } from "../pages/styles";

import { Button, Input, Label, Textarea } from "@/components/ui";
import { Checkbox } from "@/components/ui/form/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";

const routeFormSchema = z.object({
  warehouse_id: z.coerce.number().min(1, "倉庫は必須です"),
  delivery_place_id: z.coerce.number().min(1, "納入先は必須です"),
  product_id: z.coerce.number().optional().nullable(),
  transport_lead_time_days: z.coerce.number().min(0, "0以上の値を入力してください"),
  is_active: z.boolean(),
  notes: z.string().max(1000).optional().nullable(),
});

type RouteFormData = z.infer<typeof routeFormSchema>;

interface Warehouse {
  id: number;
  warehouse_code: string;
  warehouse_name: string;
  warehouse_type: string;
}

interface DeliveryPlace {
  id: number;
  delivery_place_code: string;
  delivery_place_name: string;
}

interface Product {
  id: number;
  maker_part_code: string;
  product_name: string;
}

export interface WarehouseDeliveryRouteFormProps {
  route?: WarehouseDeliveryRoute;
  warehouses: Warehouse[];
  deliveryPlaces: DeliveryPlace[];
  products: Product[];
  onSubmit: (data: RouteFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/* eslint-disable max-lines-per-function, complexity */
export function WarehouseDeliveryRouteForm({
  route,
  warehouses,
  deliveryPlaces,
  products,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: WarehouseDeliveryRouteFormProps) {
  const isEditMode = !!route;
  const availableWarehouses = warehouses.filter((w) => w.warehouse_type !== "supplier");

  const { register, handleSubmit, formState, setValue, watch } = useForm<RouteFormData>({
    resolver: zodResolver(routeFormSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: {
      warehouse_id: route?.warehouse_id ?? 0,
      delivery_place_id: route?.delivery_place_id ?? 0,
      product_id: route?.product_id ?? null,
      transport_lead_time_days: route?.transport_lead_time_days ?? 1,
      is_active: route?.is_active ?? true,
      notes: route?.notes ?? "",
    },
  });

  const warehouseId = watch("warehouse_id");
  const deliveryPlaceId = watch("delivery_place_id");
  const productId = watch("product_id");
  const isActive = watch("is_active");
  const { errors } = formState;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={formStyles.grid}>
      <div className={formStyles.field}>
        <Label className={formStyles.label}>
          倉庫 <span className="text-red-500">*</span>
        </Label>
        <Select
          value={warehouseId ? String(warehouseId) : ""}
          onValueChange={(v) => setValue("warehouse_id", Number(v))}
          disabled={isEditMode}
        >
          <SelectTrigger className={formStyles.input}>
            <SelectValue placeholder="倉庫を選択" />
          </SelectTrigger>
          <SelectContent>
            {availableWarehouses.map((w) => (
              <SelectItem key={w.id} value={String(w.id)}>
                {w.warehouse_code} - {w.warehouse_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.warehouse_id && <p className={formStyles.error}>{errors.warehouse_id.message}</p>}
      </div>

      <div className={formStyles.field}>
        <Label className={formStyles.label}>
          納入先 <span className="text-red-500">*</span>
        </Label>
        <Select
          value={deliveryPlaceId ? String(deliveryPlaceId) : ""}
          onValueChange={(v) => setValue("delivery_place_id", Number(v))}
          disabled={isEditMode}
        >
          <SelectTrigger className={formStyles.input}>
            <SelectValue placeholder="納入先を選択" />
          </SelectTrigger>
          <SelectContent>
            {deliveryPlaces.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.delivery_place_code} - {d.delivery_place_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.delivery_place_id && (
          <p className={formStyles.error}>{errors.delivery_place_id.message}</p>
        )}
      </div>

      <div className={formStyles.field}>
        <Label className={formStyles.label}>品番（任意）</Label>
        <Select
          value={productId ? String(productId) : "none"}
          onValueChange={(v) => setValue("product_id", v === "none" ? null : Number(v))}
          disabled={isEditMode}
        >
          <SelectTrigger className={formStyles.input}>
            <SelectValue placeholder="経路デフォルト（品番指定なし）" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">経路デフォルト（品番指定なし）</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.maker_part_code} - {p.product_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          品番を指定すると、その品番専用のリードタイムになります
        </p>
      </div>

      <div className={formStyles.field}>
        <Label htmlFor="transport_lead_time_days" className={formStyles.label}>
          輸送リードタイム（日） <span className="text-red-500">*</span>
        </Label>
        <Input
          id="transport_lead_time_days"
          type="number"
          min={0}
          {...register("transport_lead_time_days")}
          className={formStyles.input}
        />
        {errors.transport_lead_time_days && (
          <p className={formStyles.error}>{errors.transport_lead_time_days.message}</p>
        )}
      </div>

      <div className={formStyles.field}>
        <Label htmlFor="notes" className={formStyles.label}>
          備考
        </Label>
        <Textarea
          id="notes"
          {...register("notes")}
          placeholder="メモや補足情報"
          className={formStyles.input}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_active"
          checked={isActive}
          onCheckedChange={(checked) => setValue("is_active", checked as boolean)}
        />
        <Label htmlFor="is_active" className="cursor-pointer text-sm">
          有効
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : isEditMode ? "更新" : "登録"}
        </Button>
      </div>
    </form>
  );
}
/* eslint-enable max-lines-per-function, complexity */
