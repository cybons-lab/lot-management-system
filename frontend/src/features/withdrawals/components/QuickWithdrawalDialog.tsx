/**
 * QuickWithdrawalDialog
 *
 * 在庫アイテム詳細画面からの簡易出庫ダイアログ
 * - 受注出庫（order_manual）専用
 * - 得意先、出荷日、数量を入力して出庫
 */

/* eslint-disable max-lines-per-function */
import { Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import { createWithdrawal, type WithdrawalCreateRequest } from "../api";

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
import { useAuth } from "@/features/auth/AuthContext";
import { useCustomersQuery } from "@/hooks/api/useMastersQuery";
import type { LotUI } from "@/shared/libs/normalize";
import { fmt } from "@/shared/utils/number";

export interface QuickWithdrawalDialogProps {
  /** 出庫対象のロット */
  lot: LotUI;
  /** ダイアログの開閉状態 */
  open: boolean;
  /** ダイアログの開閉制御 */
  onOpenChange: (open: boolean) => void;
  /** 出庫成功時のコールバック */
  onSuccess?: () => void;
}

interface FormState {
  customer_id: number;
  ship_date: string;
  quantity: number;
  reference_number: string;
  reason: string;
}

interface FormErrors {
  customer_id?: string;
  quantity?: string;
}

export function QuickWithdrawalDialog({
  lot,
  open,
  onOpenChange,
  onSuccess,
}: QuickWithdrawalDialogProps) {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomersQuery();

  // 利用可能数量を計算
  const availableQuantity =
    Number(lot.current_quantity) -
    Number(lot.allocated_quantity) -
    Number(lot.locked_quantity || 0);

  // フォーム状態
  const [formState, setFormState] = useState<FormState>({
    customer_id: 0,
    ship_date: today,
    quantity: 0,
    reference_number: "",
    reason: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ダイアログが開くたびにフォームをリセット
  useEffect(() => {
    if (open) {
      setFormState({
        customer_id: 0,
        ship_date: today,
        quantity: 0,
        reference_number: "",
        reason: "",
      });
      setErrors({});
    }
  }, [open, today]);

  // フィールド更新
  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setFormState((prev) => ({ ...prev, [key]: value }));
      // エラーをクリア
      if (key in errors) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    },
    [errors],
  );

  // バリデーション
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formState.customer_id || formState.customer_id <= 0) {
      newErrors.customer_id = "得意先を選択してください";
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
      const request: WithdrawalCreateRequest = {
        lot_id: lot.lot_id,
        quantity: formState.quantity,
        withdrawal_type: "order_manual",
        customer_id: formState.customer_id,
        ship_date: formState.ship_date,
        reason: formState.reason || undefined,
        reference_number: formState.reference_number || undefined,
        withdrawn_by: user?.id ?? 1,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>簡易出庫</DialogTitle>
          <DialogDescription>ロット: {lot.lot_number}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* ロット情報表示 */}
          <div className="rounded-lg border bg-slate-50 p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-500">製品:</span>{" "}
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
            <Select
              value={formState.customer_id ? String(formState.customer_id) : ""}
              onValueChange={(v) => updateField("customer_id", Number(v))}
              disabled={isLoadingCustomers || isSubmitting}
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
            {errors.customer_id && (
              <p className="mt-1 text-sm text-red-600">{errors.customer_id}</p>
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
              value={formState.ship_date}
              onChange={(e) => updateField("ship_date", e.target.value)}
              disabled={isSubmitting}
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
          <Button onClick={handleSubmit} disabled={isSubmitting || availableQuantity <= 0}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            出庫登録
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
