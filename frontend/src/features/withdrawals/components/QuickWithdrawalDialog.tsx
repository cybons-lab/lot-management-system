/**
 * QuickWithdrawalDialog
 * 在庫アイテム詳細画面からの簡易出庫ダイアログ
 */
/* eslint-disable max-lines-per-function, complexity, max-lines */
import { Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

import { createWithdrawal, getDefaultDestination, type WithdrawalCreateRequest } from "../api";
import type { DeliveryPlace } from "../hooks/useWithdrawalFormState";

import { QuickMappingSetupDialog } from "./QuickMappingSetupDialog";

import { Button, Input, Label } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { DatePicker } from "@/components/ui/date-picker";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import { useAuth } from "@/features/auth/AuthContext";
import { useCustomersQuery } from "@/hooks/api/useMastersQuery";
import { http } from "@/shared/api/http-client";
import type { LotUI } from "@/shared/libs/normalize";
import { fmt } from "@/shared/utils/number";

export interface QuickWithdrawalDialogProps {
  lot: LotUI;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialShipDate?: string;
}

interface FormState {
  customer_id: number;
  delivery_place_id: number;
  ship_date: string;
  due_date: string;
  quantity: number;
  reference_number: string;
  reason: string;
}

interface FormErrors {
  customer_id?: string;
  delivery_place_id?: string;
  quantity?: string;
}

export function QuickWithdrawalDialog({
  lot,
  open,
  onOpenChange,
  onSuccess,
  initialShipDate,
}: QuickWithdrawalDialogProps) {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomersQuery();

  const [deliveryPlaces, setDeliveryPlaces] = useState<DeliveryPlace[]>([]);
  const [isLoadingDeliveryPlaces, setIsLoadingDeliveryPlaces] = useState(false);

  const availableQuantity =
    Number(lot.current_quantity) -
    Number(lot.allocated_quantity) -
    Number(lot.locked_quantity || 0);

  const [formState, setFormState] = useState<FormState>({
    customer_id: 0,
    delivery_place_id: 0,
    ship_date: "", // Optional
    due_date: today,
    quantity: 0,
    reference_number: "",
    reason: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [mappingNotFound, setMappingNotFound] = useState(false);
  const [deliveryPlaceNotFound, setDeliveryPlaceNotFound] = useState(false);
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false);
  const deliveryPlaceIdRef = useRef(formState.delivery_place_id);
  const customerIdRef = useRef(formState.customer_id);
  const deliveryPlacesRequestIdRef = useRef(0);

  const buildInitialFormState = useCallback(
    (shipDate: string | undefined): FormState => ({
      customer_id: 0,
      delivery_place_id: 0,
      ship_date: shipDate || "",
      due_date: today,
      quantity: 0,
      reference_number: "",
      reason: "",
    }),
    [today],
  );

  const resetFormState = useCallback(
    (shipDate?: string) => {
      setFormState(buildInitialFormState(shipDate));
      setDeliveryPlaces([]);
      setErrors({});
      setMappingNotFound(false);
      setDeliveryPlaceNotFound(false);
    },
    [buildInitialFormState],
  );

  const isLatestDeliveryPlaceRequest = useCallback(
    (requestId: number, customerId: number) =>
      deliveryPlacesRequestIdRef.current === requestId && customerIdRef.current === customerId,
    [],
  );

  useEffect(() => {
    if (open) {
      resetFormState(initialShipDate);

      // 製品IDからデフォルトの得意先・納入先を取得
      if (lot.product_group_id) {
        getDefaultDestination({ product_group_id: lot.product_group_id })
          .then((result) => {
            if (result.mapping_found && result.customer_id) {
              setFormState((prev) => ({
                ...prev,
                customer_id: result.customer_id!,
                delivery_place_id: result.delivery_place_id || 0,
              }));
              setMappingNotFound(false);
              if (!result.delivery_place_id) {
                setDeliveryPlaceNotFound(true);
                toast.warning("納入先の自動選択ができませんでした。手動で選択してください。");
              } else {
                setDeliveryPlaceNotFound(false);
              }
            } else {
              // マッピングが見つからない、または得意先IDが空の場合
              setMappingNotFound(true);
              setDeliveryPlaceNotFound(false);
              if (!result.mapping_found) {
                toast.warning(
                  `製品 (ID: ${lot.product_group_id}) のマッピングが未設定です。設定を行ってください。`,
                );
              }
            }
          })
          .catch((error) => {
            console.error("デフォルト得意先取得エラー:", error);
            // エラーが発生した場合（404等）も、マッピング未設定として扱う
            setMappingNotFound(true);
            setDeliveryPlaceNotFound(false);
          });
      }
    }
  }, [open, initialShipDate, lot.product_group_id, resetFormState]);

  useEffect(() => {
    deliveryPlaceIdRef.current = formState.delivery_place_id;
  }, [formState.delivery_place_id]);

  useEffect(() => {
    customerIdRef.current = formState.customer_id;
  }, [formState.customer_id]);

  const clearFieldError = useCallback(<K extends keyof FormErrors>(key: K) => {
    setErrors((prev) => {
      if (!(key in prev)) {
        return prev;
      }
      return { ...prev, [key]: undefined };
    });
  }, []);

  // 得意先が変わったら納入先を再取得（レースコンディション対策）
  useEffect(() => {
    const customerId = formState.customer_id;

    if (!customerId) {
      setDeliveryPlaces([]);
      updateField("delivery_place_id", 0);
      return;
    }

    const abortController = new AbortController();
    const requestId = deliveryPlacesRequestIdRef.current + 1;
    deliveryPlacesRequestIdRef.current = requestId;
    setIsLoadingDeliveryPlaces(true);

    http
      .get<DeliveryPlace[]>(`masters/delivery-places?customer_id=${customerId}`, {
        signal: abortController.signal,
      })
      .then((places) => {
        // レスポンス時点でcustomer_idが変わっていないか確認
        if (isLatestDeliveryPlaceRequest(requestId, customerId)) {
          setDeliveryPlaces(places);
          // 既存の選択が新しいリストに含まれていない場合のみリセット
          if (!places.some((p) => p.id === deliveryPlaceIdRef.current)) {
            updateField("delivery_place_id", 0);
          }
        }
      })
      .catch((error) => {
        // AbortErrorは無視
        if ((error as Error).name !== "AbortError") {
          console.error("納入先取得エラー:", error);
          if (isLatestDeliveryPlaceRequest(requestId, customerId)) {
            setDeliveryPlaces([]);
          }
        }
      })
      .finally(() => {
        if (isLatestDeliveryPlaceRequest(requestId, customerId)) {
          setIsLoadingDeliveryPlaces(false);
        }
      });

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.customer_id]);

  // フィールド更新
  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setFormState((prev) => ({ ...prev, [key]: value }));
      if (key === "delivery_place_id" && Number(value) > 0) {
        setDeliveryPlaceNotFound(false);
      }
      if (key === "customer_id") {
        setDeliveryPlaceNotFound(false);
      }
      // エラーをクリア
      if (key === "customer_id" || key === "delivery_place_id" || key === "quantity") {
        clearFieldError(key);
      }
    },
    [clearFieldError],
  );

  // バリデーション
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formState.customer_id || formState.customer_id <= 0) {
      newErrors.customer_id = "得意先を選択してください";
    }

    if (!formState.delivery_place_id || formState.delivery_place_id <= 0) {
      newErrors.delivery_place_id = "納入場所を選択してください";
    }

    if (!formState.quantity || formState.quantity <= 0) {
      newErrors.quantity = "出庫数量を入力してください";
    } else if (formState.quantity > availableQuantity) {
      newErrors.quantity = `利用可能数量（${fmt(availableQuantity)}）を超えています`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formState, availableQuantity]);

  // 送信処理
  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (!user?.id) {
        toast.error("ログインしてください");
        return;
      }

      const request: WithdrawalCreateRequest = {
        lot_id: lot.lot_id,
        quantity: formState.quantity,
        withdrawal_type: "order_manual",
        customer_id: formState.customer_id,
        delivery_place_id: formState.delivery_place_id || undefined,
        ship_date: formState.ship_date || undefined,
        due_date: formState.due_date,
        reason: formState.reason || undefined,
        reference_number: formState.reference_number || undefined,
      };

      await createWithdrawal(request);
      toast.success(`ロット ${lot.lot_number} から ${fmt(formState.quantity)} を出庫しました`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("出庫登録に失敗:", error);
      toast.error(error instanceof Error ? error.message : "出庫登録に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>簡易出庫</DialogTitle>
          <DialogDescription>ロット: {lot.lot_number}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* マッピング警告 */}
          {mappingNotFound && (
            <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>マッピング設定が見つかりません</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-amber-300 bg-amber-100 text-[10px] hover:bg-amber-200"
                onClick={() => setIsSetupDialogOpen(true)}
              >
                今すぐ設定する
              </Button>
            </div>
          )}
          {deliveryPlaceNotFound && (
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <span>納入先の自動選択ができませんでした。手動で選択してください。</span>
            </div>
          )}

          {/* ロット情報表示 */}
          <div className="rounded-lg border bg-slate-50 p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-500">商品:</span>{" "}
                <span className="font-medium">{lot.product_name || lot.product_code}</span>
              </div>
              <div>
                <span className="text-slate-500">現在在庫:</span>{" "}
                <span className="font-medium">
                  {fmt(Number(lot.current_quantity))} {lot.unit}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">利用可能:</span>{" "}
                <span className="font-semibold text-blue-600">
                  {fmt(availableQuantity)} {lot.unit}
                </span>
              </div>
            </div>
          </div>

          {/* 得意先 */}
          <div>
            <Label htmlFor="customer_id" className="mb-2 block text-sm font-medium">
              得意先 <span className="text-red-500">*</span>
            </Label>
            <SearchableSelect
              options={customers.map((c) => ({
                value: String(c.id),
                label: `${c.customer_code} - ${c.customer_name}`,
              }))}
              value={formState.customer_id ? String(formState.customer_id) : ""}
              onChange={(v) => updateField("customer_id", Number(v))}
              placeholder={isLoadingCustomers ? "読み込み中..." : "得意先を検索..."}
              disabled={isLoadingCustomers || isSubmitting}
            />
            {errors.customer_id && (
              <p className="mt-1 text-sm text-red-600">{errors.customer_id}</p>
            )}
          </div>

          {/* 納入場所 */}
          <div>
            <Label htmlFor="delivery_place_id" className="mb-2 block text-sm font-medium">
              納入場所 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formState.delivery_place_id ? String(formState.delivery_place_id) : ""}
              onValueChange={(v) => updateField("delivery_place_id", Number(v))}
              disabled={isLoadingDeliveryPlaces || !formState.customer_id || isSubmitting}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !formState.customer_id
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
            {!formState.delivery_place_id && formState.customer_id > 0 && (
              <p className="mt-1 text-xs text-slate-500">出庫登録には納入場所の選択が必須です</p>
            )}
            {errors.delivery_place_id && (
              <p className="mt-1 text-xs text-red-500">{errors.delivery_place_id}</p>
            )}
          </div>

          {/* 納期 */}
          <div>
            <Label htmlFor="due_date" className="mb-2 block text-sm font-medium">
              納期 <span className="text-red-500">*</span>
            </Label>
            <DatePicker
              value={formState.due_date}
              onChange={(v) => updateField("due_date", v || today)}
              disabled={isSubmitting}
              placeholder="納期を選択"
            />
          </div>

          {/* 出荷日 */}
          <div>
            <Label htmlFor="ship_date" className="mb-2 block text-sm font-medium">
              出荷日
            </Label>
            <DatePicker
              value={formState.ship_date}
              onChange={(v) => updateField("ship_date", v || "")}
              disabled={isSubmitting}
              placeholder="出荷日を選択（任意）"
            />
          </div>

          {/* 数量 */}
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
              value={formState.quantity || ""}
              onChange={(e) => updateField("quantity", e.target.value ? Number(e.target.value) : 0)}
              placeholder={`最大: ${fmt(availableQuantity)}`}
              disabled={isSubmitting}
            />
            {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
          </div>

          {/* 参照番号 */}
          <div>
            <Label htmlFor="reference_number" className="mb-2 block text-sm font-medium">
              参照番号（SAP受注番号など）
            </Label>
            <Input
              id="reference_number"
              type="text"
              value={formState.reference_number}
              onChange={(e) => updateField("reference_number", e.target.value)}
              placeholder="例: 4500012345"
              disabled={isSubmitting}
            />
          </div>

          {/* 備考 */}
          <div>
            <Label htmlFor="reason" className="mb-2 block text-sm font-medium">
              備考
            </Label>
            <textarea
              id="reason"
              value={formState.reason}
              onChange={(e) => updateField("reason", e.target.value)}
              placeholder="出庫理由などを入力"
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || availableQuantity <= 0 || !user?.id}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            出庫登録
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* マッピング設定ダイアログ */}
      <QuickMappingSetupDialog
        productId={lot.product_group_id}
        productName={lot.product_name || "不明な製品"}
        productCode={lot.product_code || String(lot.product_group_id)}
        defaultUnit={lot.unit}
        open={isSetupDialogOpen}
        onOpenChange={setIsSetupDialogOpen}
        onSuccess={(cid, dpid) => {
          setFormState((prev) => ({
            ...prev,
            customer_id: cid,
            delivery_place_id: dpid,
          }));
          setMappingNotFound(false);
        }}
      />
    </Dialog>
  );
}
