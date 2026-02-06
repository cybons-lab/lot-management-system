import { Controller, type Control, type FieldErrors } from "react-hook-form";

import { WITHDRAWAL_TYPES } from "../api";

import type { WithdrawalFormData } from "./withdrawalFormSchema";

import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import { DatePicker } from "@/components/ui/date-picker";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";

interface Customer {
  id: number;
  customer_code: string;
  customer_name: string;
}

interface DeliveryPlace {
  id: number;
  delivery_place_code: string;
  delivery_place_name: string;
}

interface WithdrawalBasicInfoProps {
  control: Control<WithdrawalFormData>;
  errors: FieldErrors<WithdrawalFormData>;
  customers: Customer[];
  isLoadingCustomers: boolean;
  deliveryPlaces: DeliveryPlace[];
  isLoadingDeliveryPlaces: boolean;
  isSubmitting: boolean;
  customerId?: number;
  availableQuantity: number;
  quantityError?: string;
}

// eslint-disable-next-line max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため
export function WithdrawalBasicInfo({
  control,
  errors,
  customers,
  isLoadingCustomers,
  deliveryPlaces,
  isLoadingDeliveryPlaces,
  isSubmitting,
  customerId,
  availableQuantity,
  quantityError,
}: WithdrawalBasicInfoProps) {
  return (
    <div className="space-y-6">
      {/* 出庫タイプ */}
      <div>
        <Label htmlFor="withdrawal_type" className="mb-2 block text-sm font-medium">
          出庫タイプ <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="withdrawal_type"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="出庫タイプを選択" />
              </SelectTrigger>
              <SelectContent>
                {WITHDRAWAL_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.withdrawal_type && (
          <p className="mt-1 text-sm text-red-600">{errors.withdrawal_type.message}</p>
        )}
      </div>

      {/* 得意先 */}
      <div>
        <Label htmlFor="customer_id" className="mb-2 block text-sm font-medium">
          得意先 <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="customer_id"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              options={customers.map((c) => ({
                value: String(c.id),
                label: `${c.customer_code} - ${c.customer_name}`,
              }))}
              value={field.value ? String(field.value) : ""}
              onChange={(v) => field.onChange(Number(v))}
              placeholder={isLoadingCustomers ? "読み込み中..." : "得意先を検索..."}
              disabled={isLoadingCustomers}
            />
          )}
        />
        {errors.customer_id && (
          <p className="mt-1 text-sm text-red-600">{errors.customer_id.message}</p>
        )}
      </div>

      {/* 納入場所 */}
      <div>
        <Label htmlFor="delivery_place_id" className="mb-2 block text-sm font-medium">
          納入場所 <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="delivery_place_id"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : ""}
              onValueChange={(v) => field.onChange(Number(v))}
              disabled={isLoadingDeliveryPlaces || !customerId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !customerId
                      ? "先に得意先を選択"
                      : isLoadingDeliveryPlaces
                        ? "読み込み中..."
                        : "納入場所を選択"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {deliveryPlaces.map((dp) => (
                  <SelectItem key={dp.id} value={String(dp.id)}>
                    {dp.delivery_place_code} - {dp.delivery_place_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.delivery_place_id && (
          <p className="mt-1 text-sm text-red-600">{errors.delivery_place_id.message}</p>
        )}
      </div>

      {/* 納期 */}
      <div>
        <Label htmlFor="due_date" className="mb-2 block text-sm font-medium">
          納期 <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="due_date"
          control={control}
          render={({ field }) => (
            <DatePicker
              value={field.value}
              onChange={(v) => field.onChange(v || "")}
              disabled={isSubmitting}
              placeholder="納期を選択"
            />
          )}
        />
        {errors.due_date && <p className="mt-1 text-sm text-red-600">{errors.due_date.message}</p>}
      </div>

      {/* 出荷日 */}
      <div>
        <Label htmlFor="ship_date" className="mb-2 block text-sm font-medium">
          出荷日
        </Label>
        <Controller
          name="ship_date"
          control={control}
          render={({ field }) => (
            <DatePicker
              value={field.value || ""}
              onChange={(v) => field.onChange(v || "")}
              disabled={isSubmitting}
              placeholder="出荷日を選択（任意）"
            />
          )}
        />
        {errors.ship_date && (
          <p className="mt-1 text-sm text-red-600">{errors.ship_date.message}</p>
        )}
      </div>

      {/* 出庫数量 */}
      <div>
        <Label htmlFor="quantity" className="mb-2 block text-sm font-medium">
          出庫数量 <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="quantity"
          control={control}
          render={({ field }) => (
            <Input
              id="quantity"
              type="number"
              step="0.001"
              min="0"
              max={availableQuantity}
              value={field.value || ""}
              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
              placeholder={`最大: ${availableQuantity}`}
              disabled={isSubmitting}
            />
          )}
        />
        {quantityError && <p className="mt-1 text-sm text-red-600">{quantityError}</p>}
      </div>

      {/* 参照番号（任意） */}
      <div>
        <Label htmlFor="reference_number" className="mb-2 block text-sm font-medium">
          参照番号（SAP受注番号など）
        </Label>
        <Controller
          name="reference_number"
          control={control}
          render={({ field }) => (
            <Input
              id="reference_number"
              type="text"
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder="例: 4500012345"
              disabled={isSubmitting}
            />
          )}
        />
      </div>

      {/* 備考（任意） */}
      <div>
        <Label htmlFor="reason" className="mb-2 block text-sm font-medium">
          備考
        </Label>
        <Controller
          name="reason"
          control={control}
          render={({ field }) => (
            <Textarea
              id="reason"
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder="出庫理由などを入力"
              rows={3}
              className="w-full text-sm"
              disabled={isSubmitting}
            />
          )}
        />
      </div>
    </div>
  );
}
