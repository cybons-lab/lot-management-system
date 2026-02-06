/**
 * WithdrawalFormFiltered
 *
 * フィルタ連動型の出庫登録フォームコンポーネント
 *
 * フィルタ順序:
 * 1. 仕入元 → 2. 得意先 → 3. 納入場所（任意） → 4. 製品 → 5. ロット番号
 */

import type { WithdrawalCreateRequest, WithdrawalType } from "../api";
import { useWithdrawalFormState } from "../hooks/useWithdrawalFormState";

import { LotFilterSection } from "./LotFilterSection";
import { LotSelector } from "./LotSelector";
import { WithdrawalInfoSection } from "./WithdrawalInfoSection";

import { Button } from "@/components/ui";
import type { LotUI } from "@/shared/libs/normalize";

interface WithdrawalFormFilteredProps {
  /** 事前選択されたロット（ロット詳細ページからの遷移時） */
  preselectedLot?: LotUI | null;
  /** 利用可能なロット一覧 */
  lots: LotUI[];
  /** ロット読み込み中 */
  isLoadingLots?: boolean;
  /** フォーム送信ハンドラ */
  onSubmit: (data: WithdrawalCreateRequest) => Promise<void>;
  /** キャンセルハンドラ */
  onCancel: () => void;
  /** 送信中状態 */
  isSubmitting?: boolean;
}

/**
 * フィルタ連動型出庫登録フォーム
 */
export function WithdrawalFormFiltered({
  preselectedLot,
  lots,
  isLoadingLots = false,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: WithdrawalFormFilteredProps) {
  const state = useWithdrawalFormState({
    preselectedLot,
    lots,
    onSubmit,
  });

  return (
    <form onSubmit={state.handleSubmit} className="space-y-6">
      {/* Filter section */}
      <LotFilterSection
        suppliers={state.suppliers}
        products={state.products}
        filteredProducts={state.filteredProducts}
        isLoadingSuppliers={state.isLoadingSuppliers}
        isLoadingProducts={state.isLoadingProducts}
        filteredLotsCount={state.filteredLots.length}
        filters={state.filters}
        onSupplierChange={(id) => state.updateFilter("supplier_id", id)}
        onProductChange={(id) => state.updateFilter("supplier_item_id", id)}
      />

      {/* Lot selector */}
      <LotSelector
        preselectedLot={preselectedLot}
        filteredLots={state.filteredLots}
        selectedLotId={state.formData.lot_id}
        availableQuantity={state.availableQuantity}
        isLoading={isLoadingLots}
        error={state.errors.lot_id}
        onLotChange={(id) => state.updateFormData("lot_id", id)}
      />

      {/* Withdrawal info section */}
      <WithdrawalInfoSection
        formData={state.formData}
        errors={state.errors}
        customers={state.customers}
        deliveryPlaces={state.deliveryPlaces}
        availableQuantity={state.availableQuantity}
        isLoadingCustomers={state.isLoadingCustomers}
        isLoadingDeliveryPlaces={state.isLoadingDeliveryPlaces}
        isSubmitting={isSubmitting}
        onWithdrawalTypeChange={(type) =>
          state.updateFormData("withdrawal_type", type as WithdrawalType)
        }
        onCustomerChange={state.handleCustomerChange}
        onDeliveryPlaceChange={state.handleDeliveryPlaceChange}
        onShipDateChange={(date) => state.updateFormData("ship_date", date)}
        onQuantityChange={(qty) => state.updateFormData("quantity", qty)}
        onReferenceNumberChange={(ref) => state.updateFormData("reference_number", ref)}
        onReasonChange={(reason) => state.updateFormData("reason", reason)}
      />

      {/* Buttons */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "登録中..." : "出庫登録"}
        </Button>
      </div>
    </form>
  );
}
