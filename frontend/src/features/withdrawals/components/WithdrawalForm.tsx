/**
 * WithdrawalForm
 *
 * 出庫登録フォームコンポーネント
 * リファクタリング済み: ロジックをフックに分離し、UIをサブコンポーネント化
 */

import { toast } from "sonner";

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
  } = useWithdrawalForm({ preselectedLot: preselectedLot ?? null, lots });

  const {
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = form;

  const customerId = watch("customer_id");
  const onFormSubmit = async (data: WithdrawalFormData) => {
    if (data.quantity > availableQuantity) return;
    if (!user?.id) {
      toast.error("ログインしてください");
      return;
    }
    await onSubmit({
      lot_id: data.lot_id,
      quantity: data.quantity,
      withdrawal_type: data.withdrawal_type,
      ...(data.customer_id ? { customer_id: data.customer_id } : {}),
      ...(data.delivery_place_id ? { delivery_place_id: data.delivery_place_id } : {}),
      ...(data.ship_date ? { ship_date: data.ship_date } : {}),
      due_date: data.due_date,
      ...(data.reason ? { reason: data.reason } : {}),
      ...(data.reference_number ? { reference_number: data.reference_number } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <WithdrawalLotSelection
        control={control}
        errors={errors}
        lots={lots}
        isLoadingLots={isLoadingLots}
        preselectedLot={preselectedLot ?? null}
        selectedLot={selectedLot ?? null}
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
        quantityError={quantityError || ""}
      />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting || !user?.id}>
          {isSubmitting ? "登録中..." : "出庫登録"}
        </Button>
      </div>
    </form>
  );
}
