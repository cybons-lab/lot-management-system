/**
 * WithdrawalForm
 *
 * 出庫登録フォームコンポーネント
 * リファクタリング済み: ロジックをフックに分離し、UIをサブコンポーネント化
 */

import type { WithdrawalCreateRequest } from "../api";
import { useWithdrawalForm } from "../hooks/useWithdrawalForm";

import { WithdrawalBasicInfo } from "./WithdrawalBasicInfo";
import { type WithdrawalFormData } from "./withdrawalFormSchema";
import { WithdrawalLotSelection } from "./WithdrawalLotSelection";

import { Button } from "@/components/ui";
import type { LotUI } from "@/shared/libs/normalize";

interface WithdrawalFormProps {
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
 * 出庫登録フォーム
 */
export function WithdrawalForm({
  preselectedLot,
  lots,
  isLoadingLots = false,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: WithdrawalFormProps) {
  // Use Custom Hook for Logic
  const {
    form,
    customers,
    isLoadingCustomers,
    deliveryPlaces,
    isLoadingDeliveryPlaces,
    selectedLot,
    availableQuantity,
    user,
    quantityError,
  } = useWithdrawalForm({ preselectedLot, lots });

  const {
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = form;

  const customerId = watch("customer_id");

  const onFormSubmit = async (data: WithdrawalFormData) => {
    // 利用可能数量チェック (Hook内でもチェック可能だが、念のためここでもガード)
    if (data.quantity > availableQuantity) {
      return;
    }

    const request: WithdrawalCreateRequest = {
      lot_id: data.lot_id,
      quantity: data.quantity,
      withdrawal_type: data.withdrawal_type,
      customer_id: data.customer_id,
      delivery_place_id: data.delivery_place_id,
      ship_date: data.ship_date,
      reason: data.reason || undefined,
      reference_number: data.reference_number || undefined,
      withdrawn_by: user?.id ?? 1,
    };

    await onSubmit(request);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <WithdrawalLotSelection
        control={control}
        errors={errors}
        lots={lots}
        isLoadingLots={isLoadingLots}
        preselectedLot={preselectedLot}
        selectedLot={selectedLot}
        availableQuantity={availableQuantity}
      />

      <WithdrawalBasicInfo
        control={control}
        errors={errors}
        customers={customers}
        isLoadingCustomers={isLoadingCustomers}
        deliveryPlaces={deliveryPlaces}
        isLoadingDeliveryPlaces={isLoadingDeliveryPlaces}
        isSubmitting={isSubmitting}
        customerId={customerId}
        availableQuantity={availableQuantity}
        quantityError={quantityError}
      />

      {/* ボタン */}
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
