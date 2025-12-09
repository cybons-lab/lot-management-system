/**
 * WithdrawalForm
 *
 * 出庫登録フォームコンポーネント
 */

import { useEffect, useState } from "react";

import type { WithdrawalCreateRequest, WithdrawalType } from "../api";
import { WITHDRAWAL_TYPES } from "../api";

import { Button, Input, Label } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";
/* eslint-disable complexity */

import { useCustomers } from "@/features/customers/hooks";
import { http } from "@/shared/api/http-client";
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

interface DeliveryPlace {
  id: number;
  delivery_place_code: string;
  delivery_place_name: string;
  customer_id: number;
}

/**
 * 出庫登録フォーム
 */
// eslint-disable-next-line max-lines-per-function -- Form component with many fields
export function WithdrawalForm({
  preselectedLot,
  lots,
  isLoadingLots = false,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: WithdrawalFormProps) {
  const { user } = useAuth();
  const { useList: useCustomerList } = useCustomers();
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomerList();

  // 納入場所は得意先APIから取得（簡易実装：得意先選択後にフェッチ）
  const [deliveryPlaces, setDeliveryPlaces] = useState<DeliveryPlace[]>([]);
  const [isLoadingDeliveryPlaces, setIsLoadingDeliveryPlaces] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState<{
    lot_id: number;
    quantity: number;
    withdrawal_type: WithdrawalType;
    customer_id: number;
    delivery_place_id: number;
    ship_date: string;
    reason: string;
    reference_number: string;
  }>({
    lot_id: preselectedLot?.lot_id ?? 0,
    quantity: 0,
    withdrawal_type: "order_manual",
    customer_id: 0,
    delivery_place_id: 0,
    ship_date: today,
    reason: "",
    reference_number: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 事前選択ロットがある場合
  useEffect(() => {
    if (preselectedLot) {
      setFormData((prev) => ({
        ...prev,
        lot_id: preselectedLot.lot_id,
      }));
    }
  }, [preselectedLot]);

  // 得意先が変わったら納入場所を取得
  useEffect(() => {
    if (formData.customer_id) {
      setIsLoadingDeliveryPlaces(true);
      http
        .get<DeliveryPlace[]>(`masters/delivery-places?customer_id=${formData.customer_id}`)
        .then((places) => {
          setDeliveryPlaces(places);
          setFormData((prev) => ({ ...prev, delivery_place_id: 0 }));
        })
        .catch(() => {
          setDeliveryPlaces([]);
        })
        .finally(() => {
          setIsLoadingDeliveryPlaces(false);
        });
    } else {
      setDeliveryPlaces([]);
      setFormData((prev) => ({ ...prev, delivery_place_id: 0 }));
    }
  }, [formData.customer_id]);

  // 選択されたロット
  const selectedLot = lots.find((l) => l.lot_id === formData.lot_id) ?? preselectedLot;

  // 利用可能数量
  const availableQuantity = selectedLot
    ? Number(selectedLot.current_quantity) -
      Number(selectedLot.allocated_quantity) -
      Number(selectedLot.locked_quantity || 0)
    : 0;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.lot_id || formData.lot_id <= 0) {
      newErrors.lot_id = "ロットを選択してください";
    }

    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = "出庫数量を入力してください";
    } else if (formData.quantity > availableQuantity) {
      newErrors.quantity = `利用可能数量（${availableQuantity}）を超えています`;
    }

    if (!formData.customer_id || formData.customer_id <= 0) {
      newErrors.customer_id = "得意先を選択してください";
    }

    if (!formData.delivery_place_id || formData.delivery_place_id <= 0) {
      newErrors.delivery_place_id = "納入場所を選択してください";
    }

    if (!formData.ship_date) {
      newErrors.ship_date = "出荷日を入力してください";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const request: WithdrawalCreateRequest = {
      lot_id: formData.lot_id,
      quantity: formData.quantity,
      withdrawal_type: formData.withdrawal_type,
      customer_id: formData.customer_id,
      delivery_place_id: formData.delivery_place_id,
      ship_date: formData.ship_date,
      reason: formData.reason || undefined,
      reference_number: formData.reference_number || undefined,
      withdrawn_by: user?.id ?? 1,
    };

    await onSubmit(request);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ロット選択 */}
      <div>
        <Label htmlFor="lot_id" className="mb-2 block text-sm font-medium">
          ロット <span className="text-red-500">*</span>
        </Label>
        {preselectedLot ? (
          <div className="rounded-md border bg-gray-50 p-3">
            <div className="font-medium">{preselectedLot.lot_number}</div>
            <div className="text-sm text-gray-600">
              {preselectedLot.product_name} ({preselectedLot.product_code})
            </div>
            <div className="mt-1 text-sm">
              利用可能: <span className="font-semibold">{availableQuantity}</span>
            </div>
          </div>
        ) : (
          <Select
            value={formData.lot_id ? String(formData.lot_id) : ""}
            onValueChange={(v) => setFormData({ ...formData, lot_id: Number(v) })}
            disabled={isLoadingLots}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoadingLots ? "読み込み中..." : "ロットを選択"} />
            </SelectTrigger>
            <SelectContent>
              {lots
                .filter((lot) => lot.status === "active")
                .map((lot) => {
                  const avail =
                    Number(lot.current_quantity) -
                    Number(lot.allocated_quantity) -
                    Number(lot.locked_quantity || 0);
                  return (
                    <SelectItem key={lot.lot_id} value={String(lot.lot_id)} disabled={avail <= 0}>
                      {lot.lot_number} - {lot.product_name} (利用可能: {avail})
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>
        )}
        {errors.lot_id && <p className="mt-1 text-sm text-red-600">{errors.lot_id}</p>}
        {selectedLot && !preselectedLot && (
          <p className="mt-1 text-sm text-gray-500">
            利用可能数量: <span className="font-semibold">{availableQuantity}</span>
          </p>
        )}
      </div>

      {/* 出庫タイプ */}
      <div>
        <Label htmlFor="withdrawal_type" className="mb-2 block text-sm font-medium">
          出庫タイプ <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.withdrawal_type}
          onValueChange={(v) => setFormData({ ...formData, withdrawal_type: v as WithdrawalType })}
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

      {/* 得意先 */}
      <div>
        <Label htmlFor="customer_id" className="mb-2 block text-sm font-medium">
          得意先 <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.customer_id ? String(formData.customer_id) : ""}
          onValueChange={(v) => setFormData({ ...formData, customer_id: Number(v) })}
          disabled={isLoadingCustomers}
        >
          <SelectTrigger>
            <SelectValue placeholder={isLoadingCustomers ? "読み込み中..." : "得意先を選択"} />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.customer_code} - {c.customer_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.customer_id && <p className="mt-1 text-sm text-red-600">{errors.customer_id}</p>}
      </div>

      {/* 納入場所 */}
      <div>
        <Label htmlFor="delivery_place_id" className="mb-2 block text-sm font-medium">
          納入場所 <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.delivery_place_id ? String(formData.delivery_place_id) : ""}
          onValueChange={(v) => setFormData({ ...formData, delivery_place_id: Number(v) })}
          disabled={isLoadingDeliveryPlaces || !formData.customer_id}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                !formData.customer_id
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
        {errors.delivery_place_id && (
          <p className="mt-1 text-sm text-red-600">{errors.delivery_place_id}</p>
        )}
      </div>

      {/* 出荷日 */}
      <div>
        <Label htmlFor="ship_date" className="mb-2 block text-sm font-medium">
          出荷日 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="ship_date"
          type="date"
          value={formData.ship_date}
          onChange={(e) => setFormData({ ...formData, ship_date: e.target.value })}
          disabled={isSubmitting}
        />
        {errors.ship_date && <p className="mt-1 text-sm text-red-600">{errors.ship_date}</p>}
      </div>

      {/* 出庫数量 */}
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
          onChange={(e) =>
            setFormData({ ...formData, quantity: e.target.value ? Number(e.target.value) : 0 })
          }
          placeholder={`最大: ${availableQuantity}`}
          disabled={isSubmitting}
        />
        {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
      </div>

      {/* 参照番号（任意） */}
      <div>
        <Label htmlFor="reference_number" className="mb-2 block text-sm font-medium">
          参照番号（SAP受注番号など）
        </Label>
        <Input
          id="reference_number"
          type="text"
          value={formData.reference_number}
          onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
          placeholder="例: 4500012345"
          disabled={isSubmitting}
        />
      </div>

      {/* 備考（任意） */}
      <div>
        <Label htmlFor="reason" className="mb-2 block text-sm font-medium">
          備考
        </Label>
        <textarea
          id="reason"
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder="出庫理由などを入力"
          rows={3}
          className="w-full rounded-md border px-3 py-2 text-sm"
          disabled={isSubmitting}
        />
      </div>

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
