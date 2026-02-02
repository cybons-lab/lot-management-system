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
// eslint-disable-next-line max-lines-per-function
export function WithdrawalFormFiltered({
  preselectedLot,
  lots,
  isLoadingLots = false,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: WithdrawalFormFilteredProps) {
  const {
    // Master data
    suppliers,
    customers,
    products,
    deliveryPlaces,
    isLoadingSuppliers,
    isLoadingCustomers,
    isLoadingProducts,
    isLoadingDeliveryPlaces,

    // Filter state
    filters,
    updateFilter,

    // Form state
    formData,
    updateFormData,
    errors,

    // Computed values
    filteredLots,
    filteredProducts,
    availableQuantity,

    // Handlers
    handleCustomerChange,
    handleDeliveryPlaceChange,
    handleSubmit,
  } = useWithdrawalFormState({
    preselectedLot,
    lots,
    onSubmit,
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Filter section */}
      <LotFilterSection
        suppliers={suppliers}
        products={products}
        filteredProducts={filteredProducts}
        isLoadingSuppliers={isLoadingSuppliers}
        isLoadingProducts={isLoadingProducts}
        filteredLotsCount={filteredLots.length}
        filters={filters}
        onSupplierChange={(id) => updateFilter("supplier_id", id)}
        onProductChange={(id) => updateFilter("supplier_item_id", id)}
      />

      {/* Lot selector */}
      <LotSelector
        preselectedLot={preselectedLot}
        filteredLots={filteredLots}
        selectedLotId={formData.lot_id}
        availableQuantity={availableQuantity}
        isLoading={isLoadingLots}
        error={errors.lot_id}
        onLotChange={(id) => updateFormData("lot_id", id)}
      />

      {/* Withdrawal info section */}
      <WithdrawalInfoSection
        formData={formData}
        errors={errors}
        customers={customers}
        deliveryPlaces={deliveryPlaces}
        availableQuantity={availableQuantity}
        isLoadingCustomers={isLoadingCustomers}
        isLoadingDeliveryPlaces={isLoadingDeliveryPlaces}
        isSubmitting={isSubmitting}
        onWithdrawalTypeChange={(type) => updateFormData("withdrawal_type", type as WithdrawalType)}
        onCustomerChange={handleCustomerChange}
        onDeliveryPlaceChange={handleDeliveryPlaceChange}
        onShipDateChange={(date) => updateFormData("ship_date", date)}
        onQuantityChange={(qty) => updateFormData("quantity", qty)}
        onReferenceNumberChange={(ref) => updateFormData("reference_number", ref)}
        onReasonChange={(reason) => updateFormData("reason", reason)}
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
