/**
 * CustomerItemFormOcrSapSection
 * OCR→SAP変換設定セクション（フォーム用）
 */

import { type Control, Controller } from "react-hook-form";

import type { CustomerItemFormData } from "./customerItemFormSchema";

import { Input, Checkbox } from "@/components/ui";
import { Label } from "@/components/ui";

interface CustomerItemFormOcrSapSectionProps {
  control: Control<CustomerItemFormData>;
  isSubmitting: boolean;
}

// eslint-disable-next-line max-lines-per-function -- フォームセクションのため許容
export function CustomerItemFormOcrSapSection({
  control,
  isSubmitting,
}: CustomerItemFormOcrSapSectionProps) {
  return (
    <fieldset className="rounded-lg border p-4">
      <legend className="px-2 text-sm font-semibold text-slate-700">OCR→SAP変換設定</legend>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="maker_part_no" className="mb-2 block text-sm font-medium">
              メーカー品番
            </Label>
            <Controller
              name="maker_part_no"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  id="maker_part_no"
                  type="text"
                  placeholder="メーカー品番"
                  disabled={isSubmitting}
                  maxLength={100}
                />
              )}
            />
          </div>
          <div>
            <Label htmlFor="order_category" className="mb-2 block text-sm font-medium">
              発注区分
            </Label>
            <Controller
              name="order_category"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  id="order_category"
                  type="text"
                  placeholder="例: 指示, かんばん"
                  disabled={isSubmitting}
                  maxLength={50}
                />
              )}
            />
          </div>
        </div>

        {/* 発注の有無 */}
        <div className="flex items-center space-x-2">
          <Controller
            name="is_procurement_required"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="is_procurement_required"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                disabled={isSubmitting}
              />
            )}
          />
          <Label htmlFor="is_procurement_required" className="text-sm font-medium">
            発注が必要（調達対象）
          </Label>
        </div>

        {/* 出荷票テキスト */}
        <div>
          <Label htmlFor="shipping_slip_text" className="mb-2 block text-sm font-medium">
            出荷票テキスト
          </Label>
          <Controller
            name="shipping_slip_text"
            control={control}
            render={({ field }) => (
              <textarea
                id="shipping_slip_text"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                placeholder="出荷票に印刷するテキスト"
                rows={2}
                className="w-full rounded-md border px-3 py-2 text-sm"
                disabled={isSubmitting}
              />
            )}
          />
        </div>

        {/* OCR変換用備考 */}
        <div>
          <Label htmlFor="ocr_conversion_notes" className="mb-2 block text-sm font-medium">
            OCR変換用備考
          </Label>
          <Controller
            name="ocr_conversion_notes"
            control={control}
            render={({ field }) => (
              <textarea
                id="ocr_conversion_notes"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                placeholder="OCR変換時の注意事項など"
                rows={2}
                className="w-full rounded-md border px-3 py-2 text-sm"
                disabled={isSubmitting}
              />
            )}
          />
        </div>
      </div>
    </fieldset>
  );
}
