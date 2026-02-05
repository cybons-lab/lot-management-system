/**
 * WithdrawalInfoSection - Withdrawal information section for withdrawal form
 *
 * Contains:
 * - Withdrawal type selection
 * - Customer/delivery place selection (conditional on withdrawal type)
 * - Ship date, quantity, reference number, and notes
 */

import type { WithdrawalType } from "../api";
import { WITHDRAWAL_TYPES } from "../api";
import type { DeliveryPlace, WithdrawalFormData } from "../hooks/useWithdrawalFormState";

import { Input, Label } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import type { Customer } from "@/features/customers/validators/customer-schema";

interface WithdrawalInfoSectionProps {
  formData: WithdrawalFormData;
  errors: Record<string, string>;
  customers: Customer[];
  deliveryPlaces: DeliveryPlace[];
  availableQuantity: number;
  isLoadingCustomers: boolean;
  isLoadingDeliveryPlaces: boolean;
  isSubmitting: boolean;
  onWithdrawalTypeChange: (type: WithdrawalType) => void;
  onCustomerChange: (customerId: number) => void;
  onDeliveryPlaceChange: (deliveryPlaceId: number) => void;
  onShipDateChange: (date: string) => void;
  onQuantityChange: (quantity: number) => void;
  onReferenceNumberChange: (refNum: string) => void;
  onReasonChange: (reason: string) => void;
}

// eslint-disable-next-line max-lines-per-function, complexity -- 関連する画面ロジックを1箇所で管理するため
export function WithdrawalInfoSection({
  formData,
  errors,
  customers,
  deliveryPlaces,
  availableQuantity,
  isLoadingCustomers,
  isLoadingDeliveryPlaces,
  isSubmitting,
  onWithdrawalTypeChange,
  onCustomerChange,
  onDeliveryPlaceChange,
  onShipDateChange,
  onQuantityChange,
  onReferenceNumberChange,
  onReasonChange,
}: WithdrawalInfoSectionProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">出庫情報</h3>
      <div className="space-y-4">
        {/* Withdrawal type */}
        <div>
          <Label htmlFor="withdrawal_type" className="mb-2 block text-sm font-medium">
            出庫タイプ <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.withdrawal_type}
            onValueChange={(v) => onWithdrawalTypeChange(v as WithdrawalType)}
          >
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
        </div>

        {/* Customer (required for order_manual) */}
        {formData.withdrawal_type === "order_manual" && (
          <div>
            <Label htmlFor="customer_id" className="mb-2 block text-sm font-medium">
              得意先 <span className="text-red-500">*</span>
            </Label>
            <SearchableSelect
              options={customers.map((c) => ({
                value: String(c.id),
                label: `${c.customer_code} - ${c.customer_name}`,
              }))}
              value={formData.customer_id ? String(formData.customer_id) : ""}
              onChange={(v) => onCustomerChange(Number(v))}
              placeholder={isLoadingCustomers ? "読み込み中..." : "得意先を検索..."}
              disabled={isLoadingCustomers}
            />
            {errors.customer_id && (
              <p className="mt-1 text-sm text-red-600">{errors.customer_id}</p>
            )}
          </div>
        )}

        {/* Delivery place (optional, only for order_manual) */}
        {formData.withdrawal_type === "order_manual" && (
          <div>
            <Label htmlFor="delivery_place_id" className="mb-2 block text-sm font-medium">
              納入場所 <span className="text-slate-400">(任意)</span>
            </Label>
            <Select
              value={formData.delivery_place_id ? String(formData.delivery_place_id) : ""}
              onValueChange={(v) => onDeliveryPlaceChange(Number(v))}
              disabled={isLoadingDeliveryPlaces || !formData.customer_id}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !formData.customer_id
                      ? "先に得意先を選択"
                      : isLoadingDeliveryPlaces
                        ? "読み込み中..."
                        : "納入場所を選択（任意）"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">指定なし</SelectItem>
                {deliveryPlaces.map((dp) => (
                  <SelectItem key={dp.id} value={String(dp.id)}>
                    {dp.delivery_place_code} - {dp.delivery_place_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Ship date */}
        <div>
          <Label htmlFor="ship_date" className="mb-2 block text-sm font-medium">
            出荷日 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="ship_date"
            type="date"
            value={formData.ship_date}
            onChange={(e) => onShipDateChange(e.target.value)}
            disabled={isSubmitting}
          />
          {errors.ship_date && <p className="mt-1 text-sm text-red-600">{errors.ship_date}</p>}
        </div>

        {/* Quantity */}
        <div>
          <Label htmlFor="quantity" className="mb-2 block text-sm font-medium">
            出庫数量 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="quantity"
            type="number"
            step="0.001"
            min="0"
            max={availableQuantity}
            value={formData.quantity || ""}
            onChange={(e) => onQuantityChange(e.target.value ? Number(e.target.value) : 0)}
            placeholder={`最大: ${availableQuantity}`}
            disabled={isSubmitting}
            inputMode="decimal"
            autoComplete="off"
            style={{ imeMode: "disabled" } as React.CSSProperties}
          />
          {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
        </div>

        {/* Reference number (optional) */}
        <div>
          <Label htmlFor="reference_number" className="mb-2 block text-sm font-medium">
            参照番号（SAP受注番号など）
          </Label>
          <Input
            id="reference_number"
            type="text"
            value={formData.reference_number}
            onChange={(e) => onReferenceNumberChange(e.target.value)}
            placeholder="例: 4500012345"
            disabled={isSubmitting}
          />
        </div>

        {/* Notes (optional) */}
        <div>
          <Label htmlFor="reason" className="mb-2 block text-sm font-medium">
            備考
          </Label>
          <textarea
            id="reason"
            value={formData.reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="出庫理由などを入力"
            rows={3}
            className="w-full rounded-md border px-3 py-2 text-sm"
            disabled={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
