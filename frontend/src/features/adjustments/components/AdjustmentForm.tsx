/**
 * AdjustmentForm (v2.2 - Phase D-5)
 * Form component for creating inventory adjustments
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateAdjustmentRequest, AdjustmentType } from "../api";

interface AdjustmentFormProps {
  onSubmit: (data: CreateAdjustmentRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function AdjustmentForm({ onSubmit, onCancel, isSubmitting = false }: AdjustmentFormProps) {
  const [formData, setFormData] = useState<CreateAdjustmentRequest>({
    lot_id: 0,
    adjustment_type: "physical_count",
    adjusted_quantity: 0,
    reason: "",
    adjusted_by: 1, // TODO: Get from auth context
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.lot_id || formData.lot_id <= 0) {
      newErrors.lot_id = "ロットIDを入力してください";
    }

    if (!formData.adjusted_quantity || formData.adjusted_quantity === 0) {
      newErrors.adjusted_quantity = "調整数量を入力してください";
    }

    if (!formData.reason || formData.reason.trim() === "") {
      newErrors.reason = "理由を入力してください";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Lot ID */}
      <div>
        <Label htmlFor="lot_id" className="mb-2 block text-sm font-medium">
          ロットID <span className="text-red-500">*</span>
        </Label>
        <Input
          id="lot_id"
          type="number"
          value={formData.lot_id || ""}
          onChange={(e) =>
            setFormData({ ...formData, lot_id: e.target.value ? Number(e.target.value) : 0 })
          }
          placeholder="ロットIDを入力"
          disabled={isSubmitting}
        />
        {errors.lot_id && <p className="mt-1 text-sm text-red-600">{errors.lot_id}</p>}
      </div>

      {/* Adjustment Type */}
      <div>
        <Label htmlFor="adjustment_type" className="mb-2 block text-sm font-medium">
          調整タイプ <span className="text-red-500">*</span>
        </Label>
        <select
          id="adjustment_type"
          value={formData.adjustment_type}
          onChange={(e) =>
            setFormData({ ...formData, adjustment_type: e.target.value as AdjustmentType })
          }
          className="w-full rounded-md border px-3 py-2 text-sm"
          disabled={isSubmitting}
        >
          <option value="physical_count">実地棚卸</option>
          <option value="damage">破損</option>
          <option value="loss">紛失</option>
          <option value="found">発見</option>
          <option value="other">その他</option>
        </select>
      </div>

      {/* Adjusted Quantity */}
      <div>
        <Label htmlFor="adjusted_quantity" className="mb-2 block text-sm font-medium">
          調整数量 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="adjusted_quantity"
          type="number"
          step="0.01"
          value={formData.adjusted_quantity}
          onChange={(e) =>
            setFormData({
              ...formData,
              adjusted_quantity: e.target.value ? Number(e.target.value) : 0,
            })
          }
          placeholder="調整数量を入力（正の値=増加、負の値=減少）"
          disabled={isSubmitting}
        />
        {errors.adjusted_quantity && (
          <p className="mt-1 text-sm text-red-600">{errors.adjusted_quantity}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">正の値は在庫増加、負の値は在庫減少を意味します</p>
      </div>

      {/* Reason */}
      <div>
        <Label htmlFor="reason" className="mb-2 block text-sm font-medium">
          理由 <span className="text-red-500">*</span>
        </Label>
        <textarea
          id="reason"
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder="調整の理由を入力してください"
          rows={3}
          className="w-full rounded-md border px-3 py-2 text-sm"
          disabled={isSubmitting}
        />
        {errors.reason && <p className="mt-1 text-sm text-red-600">{errors.reason}</p>}
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
