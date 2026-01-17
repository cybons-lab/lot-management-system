/**
 * WarehouseForm - 倉庫新規登録/編集フォーム
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Warehouse } from "../api";
import { form as formStyles } from "../pages/styles";

import { Button, Input, Label } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";

const warehouseFormSchema = z.object({
  warehouse_code: z.string().min(1, "倉庫コードは必須です").max(50),
  warehouse_name: z.string().min(1, "倉庫名は必須です").max(200),
  warehouse_type: z.enum(["internal", "external", "supplier"]),
  default_transport_lead_time_days: z.coerce.number().min(0).optional(),
});

type WarehouseFormData = z.infer<typeof warehouseFormSchema>;

export interface WarehouseFormProps {
  warehouse?: Warehouse;
  onSubmit: (data: WarehouseFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function WarehouseForm({
  warehouse,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: WarehouseFormProps) {
  const isEditMode = !!warehouse;
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseFormSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: {
      warehouse_code: warehouse?.warehouse_code ?? "",
      warehouse_name: warehouse?.warehouse_name ?? "",
      warehouse_type:
        (warehouse?.warehouse_type as "internal" | "external" | "supplier") ?? "internal",
      default_transport_lead_time_days: warehouse?.default_transport_lead_time_days ?? undefined,
    },
  });

  const warehouseType = watch("warehouse_type");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={formStyles.grid}>
      <div className={formStyles.field}>
        <Label htmlFor="warehouse_code" className={formStyles.label}>
          倉庫コード <span className="text-red-500">*</span>
        </Label>
        <Input
          id="warehouse_code"
          {...register("warehouse_code")}
          placeholder="例: WH-001"
          className={formStyles.input}
        />
        {errors.warehouse_code && (
          <p className={formStyles.error}>{errors.warehouse_code.message}</p>
        )}
      </div>

      <div className={formStyles.field}>
        <Label htmlFor="warehouse_name" className={formStyles.label}>
          倉庫名 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="warehouse_name"
          {...register("warehouse_name")}
          placeholder="例: 東京第一倉庫"
          className={formStyles.input}
        />
        {errors.warehouse_name && (
          <p className={formStyles.error}>{errors.warehouse_name.message}</p>
        )}
      </div>

      <div className={formStyles.field}>
        <Label className={formStyles.label}>
          倉庫タイプ <span className="text-red-500">*</span>
        </Label>
        <Select
          value={warehouseType}
          onValueChange={(v) =>
            setValue("warehouse_type", v as "internal" | "external" | "supplier")
          }
        >
          <SelectTrigger className={formStyles.input}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="internal">社内</SelectItem>
            <SelectItem value="external">外部</SelectItem>
            <SelectItem value="supplier">仕入先</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={formStyles.field}>
        <Label htmlFor="default_transport_lead_time_days" className={formStyles.label}>
          デフォルト輸送リードタイム（日）
        </Label>
        <Input
          id="default_transport_lead_time_days"
          type="number"
          min="0"
          {...register("default_transport_lead_time_days")}
          placeholder="例: 3"
          className={formStyles.input}
        />
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
