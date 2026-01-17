import { type FieldErrors, type UseFormRegister } from "react-hook-form";

import type { AdhocLotFormData } from "./adhocLotCreateSchema";

import { Input, Label } from "@/components/ui";

interface AdhocLotFormFinancialsProps {
  register: UseFormRegister<AdhocLotFormData>;
  errors: FieldErrors<AdhocLotFormData>;
}

export function AdhocLotFormFinancials({ register, errors }: AdhocLotFormFinancialsProps) {
  return (
    <details className="rounded-lg border bg-white p-4">
      <summary className="cursor-pointer text-base font-semibold text-slate-900">
        任意項目（価格・備考）
      </summary>
      <div className="mt-4 space-y-4">
        <div>
          <Label className="mb-2 block text-base font-semibold">価格・税率情報</Label>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="cost_price">仕入単価</Label>
                <span className="text-xs text-slate-400">任意</span>
              </div>
              <Input
                id="cost_price"
                type="number"
                inputMode="decimal"
                step="0.01"
                {...register("cost_price")}
                placeholder="0.00"
              />
              {errors.cost_price && (
                <p className="mt-1 text-sm text-red-600">{errors.cost_price.message}</p>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="sales_price">販売単価</Label>
                <span className="text-xs text-slate-400">任意</span>
              </div>
              <Input
                id="sales_price"
                type="number"
                inputMode="decimal"
                step="0.01"
                {...register("sales_price")}
                placeholder="0.00"
              />
              {errors.sales_price && (
                <p className="mt-1 text-sm text-red-600">{errors.sales_price.message}</p>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="tax_rate">税率</Label>
                <span className="text-xs text-slate-400">任意</span>
              </div>
              <Input
                id="tax_rate"
                type="number"
                inputMode="decimal"
                step="0.01"
                {...register("tax_rate")}
                placeholder="0.10"
              />
              {errors.tax_rate && (
                <p className="mt-1 text-sm text-red-600">{errors.tax_rate.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Row 6: Reference */}
        {/* 備考（origin_reference） */}
        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor="origin_reference">備考（参照情報）</Label>
            <span className="text-xs text-slate-400">任意</span>
          </div>
          <Input
            id="origin_reference"
            {...register("origin_reference")}
            placeholder="例: キャンペーン用サンプル、チケット#123"
          />
        </div>
      </div>
    </details>
  );
}
