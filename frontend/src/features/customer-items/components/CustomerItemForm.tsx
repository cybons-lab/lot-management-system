/**
 * CustomerItemForm (v2.2 - Phase G-1)
 * Form component for creating customer item mappings
 */

import { useState } from "react";

import type { CreateCustomerItemRequest } from "../api";

import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";

interface CustomerItemFormProps {
  onSubmit: (data: CreateCustomerItemRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CustomerItemForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CustomerItemFormProps) {
  const [formData, setFormData] = useState<CreateCustomerItemRequest>({
    customer_id: 0,
    external_product_code: "",
    product_id: 0,
    supplier_id: null,
    base_unit: "EA",
    pack_unit: null,
    pack_quantity: null,
    special_instructions: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer_id || formData.customer_id <= 0) {
      newErrors.customer_id = "得意先IDを入力してください";
    }

    if (!formData.external_product_code || formData.external_product_code.trim() === "") {
      newErrors.external_product_code = "得意先品番を入力してください";
    }

    if (!formData.product_id || formData.product_id <= 0) {
      newErrors.product_id = "製品IDを入力してください";
    }

    if (!formData.base_unit || formData.base_unit.trim() === "") {
      newErrors.base_unit = "基本単位を入力してください";
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
      {/* Customer ID */}
      <div>
        <Label htmlFor="customer_id" className="mb-2 block text-sm font-medium">
          得意先ID <span className="text-red-500">*</span>
        </Label>
        <Input
          id="customer_id"
          type="number"
          value={formData.customer_id || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              customer_id: e.target.value ? Number(e.target.value) : 0,
            })
          }
          placeholder="得意先IDを入力"
          disabled={isSubmitting}
        />
        {errors.customer_id && <p className="mt-1 text-sm text-red-600">{errors.customer_id}</p>}
      </div>

      {/* External Product Code */}
      <div>
        <Label htmlFor="external_product_code" className="mb-2 block text-sm font-medium">
          得意先品番 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="external_product_code"
          type="text"
          value={formData.external_product_code}
          onChange={(e) => setFormData({ ...formData, external_product_code: e.target.value })}
          placeholder="得意先品番を入力"
          disabled={isSubmitting}
          maxLength={100}
        />
        {errors.external_product_code && (
          <p className="mt-1 text-sm text-red-600">{errors.external_product_code}</p>
        )}
      </div>

      {/* Product ID */}
      <div>
        <Label htmlFor="product_id" className="mb-2 block text-sm font-medium">
          製品ID <span className="text-red-500">*</span>
        </Label>
        <Input
          id="product_id"
          type="number"
          value={formData.product_id || ""}
          onChange={(e) =>
            setFormData({ ...formData, product_id: e.target.value ? Number(e.target.value) : 0 })
          }
          placeholder="製品IDを入力"
          disabled={isSubmitting}
        />
        {errors.product_id && <p className="mt-1 text-sm text-red-600">{errors.product_id}</p>}
      </div>

      {/* Supplier ID */}
      <div>
        <Label htmlFor="supplier_id" className="mb-2 block text-sm font-medium">
          仕入先ID
        </Label>
        <Input
          id="supplier_id"
          type="number"
          value={formData.supplier_id ?? ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              supplier_id: e.target.value ? Number(e.target.value) : null,
            })
          }
          placeholder="仕入先IDを入力（オプション）"
          disabled={isSubmitting}
        />
      </div>

      {/* Base Unit */}
      <div>
        <Label htmlFor="base_unit" className="mb-2 block text-sm font-medium">
          基本単位 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="base_unit"
          type="text"
          value={formData.base_unit}
          onChange={(e) => setFormData({ ...formData, base_unit: e.target.value })}
          placeholder="基本単位を入力（例: EA, KG, CS）"
          disabled={isSubmitting}
          maxLength={20}
        />
        {errors.base_unit && <p className="mt-1 text-sm text-red-600">{errors.base_unit}</p>}
        <p className="mt-1 text-xs text-gray-500">例: EA（個）, KG（キログラム）, CS（ケース）</p>
      </div>

      {/* Pack Unit */}
      <div>
        <Label htmlFor="pack_unit" className="mb-2 block text-sm font-medium">
          梱包単位
        </Label>
        <Input
          id="pack_unit"
          type="text"
          value={formData.pack_unit ?? ""}
          onChange={(e) => setFormData({ ...formData, pack_unit: e.target.value || null })}
          placeholder="梱包単位を入力（オプション）"
          disabled={isSubmitting}
          maxLength={20}
        />
      </div>

      {/* Pack Quantity */}
      <div>
        <Label htmlFor="pack_quantity" className="mb-2 block text-sm font-medium">
          梱包数量
        </Label>
        <Input
          id="pack_quantity"
          type="number"
          value={formData.pack_quantity ?? ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              pack_quantity: e.target.value ? Number(e.target.value) : null,
            })
          }
          placeholder="梱包数量を入力（オプション）"
          disabled={isSubmitting}
        />
      </div>

      {/* Special Instructions */}
      <div>
        <Label htmlFor="special_instructions" className="mb-2 block text-sm font-medium">
          特記事項
        </Label>
        <textarea
          id="special_instructions"
          value={formData.special_instructions ?? ""}
          onChange={(e) =>
            setFormData({ ...formData, special_instructions: e.target.value || null })
          }
          placeholder="特記事項を入力（オプション）"
          rows={3}
          className="w-full rounded-md border px-3 py-2 text-sm"
          disabled={isSubmitting}
        />
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
