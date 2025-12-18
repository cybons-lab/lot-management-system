/**
 * AdjustmentForm (v2.3 - react-hook-form + Zod)
 * Form component for creating inventory adjustments
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";

import type { CreateAdjustmentRequest } from "../api";

import {
  adjustmentFormSchema,
  type AdjustmentFormData,
  ADJUSTMENT_FORM_DEFAULTS,
  ADJUSTMENT_TYPES,
} from "./adjustmentFormSchema";

import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";

interface AdjustmentFormProps {
  onSubmit: (data: CreateAdjustmentRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function AdjustmentForm({ onSubmit, onCancel, isSubmitting = false }: AdjustmentFormProps) {
  const { user } = useAuth();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: {
      ...ADJUSTMENT_FORM_DEFAULTS,
      adjusted_by: user?.id ?? 1,
    },
  });

  // ユーザーが変わったらadjusted_byを更新
  useEffect(() => {
    if (user?.id) {
      setValue("adjusted_by", user.id);
    }
  }, [user?.id, setValue]);

  const handleFormSubmit = (data: AdjustmentFormData) => {
    onSubmit(data as CreateAdjustmentRequest);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Lot ID */}
      <div>
        <Label htmlFor="lot_id" className="mb-2 block text-sm font-medium">
          ロットID <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="lot_id"
          control={control}
          render={({ field }) => (
            <Input
              id="lot_id"
              type="number"
              value={field.value || ""}
              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
              placeholder="ロットIDを入力"
              disabled={isSubmitting}
            />
          )}
        />
        {errors.lot_id && <p className="mt-1 text-sm text-red-600">{errors.lot_id.message}</p>}
      </div>

      {/* Adjustment Type */}
      <div>
        <Label htmlFor="adjustment_type" className="mb-2 block text-sm font-medium">
          調整タイプ <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="adjustment_type"
          control={control}
          render={({ field }) => (
            <select
              id="adjustment_type"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              disabled={isSubmitting}
            >
              {ADJUSTMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          )}
        />
      </div>

      {/* Adjusted Quantity */}
      <div>
        <Label htmlFor="adjusted_quantity" className="mb-2 block text-sm font-medium">
          調整数量 <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="adjusted_quantity"
          control={control}
          render={({ field }) => (
            <Input
              id="adjusted_quantity"
              type="number"
              step="0.01"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
              placeholder="調整数量を入力（正の値=増加、負の値=減少）"
              disabled={isSubmitting}
            />
          )}
        />
        {errors.adjusted_quantity && (
          <p className="mt-1 text-sm text-red-600">{errors.adjusted_quantity.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">正の値は在庫増加、負の値は在庫減少を意味します</p>
      </div>

      {/* Reason */}
      <div>
        <Label htmlFor="reason" className="mb-2 block text-sm font-medium">
          理由 <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="reason"
          control={control}
          render={({ field }) => (
            <textarea
              {...field}
              id="reason"
              placeholder="調整の理由を入力してください"
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm"
              disabled={isSubmitting}
            />
          )}
        />
        {errors.reason && <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>}
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "登録中..." : "登録"}
        </Button>
      </div>
    </form>
  );
}
