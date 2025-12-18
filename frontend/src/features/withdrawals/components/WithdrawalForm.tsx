/**
 * WithdrawalForm
 *
 * 出庫登録フォームコンポーネント
 * react-hook-form + zodを使用した型安全なバリデーション
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import type { WithdrawalCreateRequest } from "../api";
import { WITHDRAWAL_TYPES } from "../api";

import {
  withdrawalFormSchema,
  WITHDRAWAL_FORM_DEFAULTS,
  type WithdrawalFormData,
} from "./withdrawalFormSchema";

import { Button, Input, Label } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";
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
// eslint-disable-next-line max-lines-per-function, complexity -- Form component with many fields and conditional logic
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

  // 納入場所は得意先APIから取得
  const [deliveryPlaces, setDeliveryPlaces] = useState<DeliveryPlace[]>([]);
  const [isLoadingDeliveryPlaces, setIsLoadingDeliveryPlaces] = useState(false);

  // react-hook-form setup
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalFormSchema),
    defaultValues: {
      ...WITHDRAWAL_FORM_DEFAULTS,
      lot_id: preselectedLot?.lot_id ?? 0,
    },
  });

  // 監視対象のフィールド
  const lotId = watch("lot_id");
  const customerId = watch("customer_id");
  const quantity = watch("quantity");

  // 事前選択ロットがある場合
  useEffect(() => {
    if (preselectedLot) {
      setValue("lot_id", preselectedLot.lot_id);
    }
  }, [preselectedLot, setValue]);

  // 得意先が変わったら納入場所を取得
  useEffect(() => {
    if (customerId) {
      setIsLoadingDeliveryPlaces(true);
      http
        .get<DeliveryPlace[]>(`masters/delivery-places?customer_id=${customerId}`)
        .then((places) => {
          setDeliveryPlaces(places);
          setValue("delivery_place_id", 0);
        })
        .catch(() => {
          setDeliveryPlaces([]);
        })
        .finally(() => {
          setIsLoadingDeliveryPlaces(false);
        });
    } else {
      setDeliveryPlaces([]);
      setValue("delivery_place_id", 0);
    }
  }, [customerId, setValue]);

  // 選択されたロット
  const selectedLot = lots.find((l) => l.lot_id === lotId) ?? preselectedLot;

  // 利用可能数量
  const availableQuantity = selectedLot
    ? Number(selectedLot.current_quantity) -
      Number(selectedLot.allocated_quantity) -
      Number(selectedLot.locked_quantity || 0)
    : 0;

  // カスタムバリデーション: 利用可能数量チェック
  const quantityError =
    quantity > availableQuantity
      ? `利用可能数量（${availableQuantity}）を超えています`
      : errors.quantity?.message;

  const onFormSubmit = async (data: WithdrawalFormData) => {
    // 利用可能数量チェック
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
          <Controller
            name="lot_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(Number(v))}
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
                        <SelectItem
                          key={lot.lot_id}
                          value={String(lot.lot_id)}
                          disabled={avail <= 0}
                        >
                          {lot.lot_number} - {lot.product_name} (利用可能: {avail})
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            )}
          />
        )}
        {errors.lot_id && <p className="mt-1 text-sm text-red-600">{errors.lot_id.message}</p>}
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
            <Select
              value={field.value ? String(field.value) : ""}
              onValueChange={(v) => field.onChange(Number(v))}
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

      {/* 出荷日 */}
      <div>
        <Label htmlFor="ship_date" className="mb-2 block text-sm font-medium">
          出荷日 <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="ship_date"
          control={control}
          render={({ field }) => (
            <Input
              id="ship_date"
              type="date"
              value={field.value}
              onChange={field.onChange}
              disabled={isSubmitting}
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
            <textarea
              id="reason"
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder="出庫理由などを入力"
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm"
              disabled={isSubmitting}
            />
          )}
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
