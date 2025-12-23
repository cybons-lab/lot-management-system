/**
 * CustomerItemFormSapCacheSection
 * SAPキャッシュ設定セクション（フォーム用）
 */

import { type Control, Controller } from "react-hook-form";

import type { CustomerItemFormData } from "./customerItemFormSchema";

import { Input } from "@/components/ui";
import { Label } from "@/components/ui";

interface CustomerItemFormSapCacheSectionProps {
  control: Control<CustomerItemFormData>;
  isSubmitting: boolean;
}

// eslint-disable-next-line max-lines-per-function -- フォームセクションのため許容
export function CustomerItemFormSapCacheSection({
  control,
  isSubmitting,
}: CustomerItemFormSapCacheSectionProps) {
  return (
    <fieldset className="rounded-lg border p-4">
      <legend className="px-2 text-sm font-semibold text-slate-700">SAPキャッシュ設定</legend>
      <p className="mb-4 text-xs text-gray-500">
        SAPマスタから取得した情報をキャッシュとして保持します。変換処理で使用されます。
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sap_supplier_code" className="mb-2 block text-sm font-medium">
            SAP仕入先コード
          </Label>
          <Controller
            name="sap_supplier_code"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                id="sap_supplier_code"
                type="text"
                placeholder="SAP仕入先コード"
                disabled={isSubmitting}
                maxLength={50}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor="sap_warehouse_code" className="mb-2 block text-sm font-medium">
            SAP倉庫コード
          </Label>
          <Controller
            name="sap_warehouse_code"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                id="sap_warehouse_code"
                type="text"
                placeholder="SAP倉庫コード"
                disabled={isSubmitting}
                maxLength={50}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor="sap_shipping_warehouse" className="mb-2 block text-sm font-medium">
            SAP出荷倉庫
          </Label>
          <Controller
            name="sap_shipping_warehouse"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                id="sap_shipping_warehouse"
                type="text"
                placeholder="SAP出荷倉庫コード"
                disabled={isSubmitting}
                maxLength={50}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor="sap_uom" className="mb-2 block text-sm font-medium">
            SAP単位
          </Label>
          <Controller
            name="sap_uom"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                id="sap_uom"
                type="text"
                placeholder="SAP単位"
                disabled={isSubmitting}
                maxLength={20}
              />
            )}
          />
        </div>
      </div>
    </fieldset>
  );
}
