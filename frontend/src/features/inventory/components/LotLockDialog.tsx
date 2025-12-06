/**
 * LotLockDialog.tsx
 *
 * ロットロック確認ダイアログ
 */

// ダイアログのフォームとUIを一箇所にまとめるため分割しない
/* eslint-disable max-lines-per-function */
import { useState } from "react";

import {
  Button,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Checkbox,
} from "@/components/ui";
import { FormDialog } from "@/shared/components/form";

interface LotLockDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, quantity?: number) => Promise<void>;
  isSubmitting: boolean;
  lotNumber?: string;
  availableQuantity: number;
}

const LOCK_REASON_TEMPLATES = [
  { value: "custom", label: "その他（手入力）" },
  { value: "quality_inspection", label: "品質検査中" },
  { value: "return_processing", label: "返品対応中" },
  { value: "inventory_count", label: "棚卸中" },
  { value: "expiry_check", label: "期限確認中" },
  { value: "quarantine", label: "隔離保管" },
];

export function LotLockDialog({
  open,
  onClose,
  onConfirm,
  isSubmitting,
  lotNumber,
  availableQuantity,
}: LotLockDialogProps) {
  const [template, setTemplate] = useState("custom");
  const [reason, setReason] = useState("");
  const [isPartialLock, setIsPartialLock] = useState(false);
  const [quantity, setQuantity] = useState<string>("");

  const handleTemplateChange = (value: string) => {
    setTemplate(value);
    if (value !== "custom") {
      const selectedTemplate = LOCK_REASON_TEMPLATES.find((t) => t.value === value);
      if (selectedTemplate) {
        setReason(selectedTemplate.label);
      }
    } else {
      setReason("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = isPartialLock && quantity ? Number(quantity) : undefined;
    await onConfirm(reason, qty);
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="ロットのロック"
      description={`ロット ${lotNumber} をロックします。ロックされたロットは引当対象から除外されます。`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="lock_reason_template">ロック理由テンプレート</Label>
          <Select value={template} onValueChange={handleTemplateChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCK_REASON_TEMPLATES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="lock_reason">ロック理由 {template === "custom" && "*"}</Label>
          <Textarea
            id="lock_reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={template === "custom" ? "例: 品質調査のため一時保留" : ""}
            required={template === "custom"}
            disabled={template !== "custom"}
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2 rounded-md border p-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="partial_lock"
              checked={isPartialLock}
              onCheckedChange={(checked) => setIsPartialLock(checked as boolean)}
            />
            <Label htmlFor="partial_lock" className="cursor-pointer font-medium">
              数量を指定してロックする（部分ロック）
            </Label>
          </div>

          {isPartialLock && (
            <div className="pt-2 pl-6">
              <Label htmlFor="lock_quantity">ロックする数量 (有効在庫: {availableQuantity})</Label>
              <Input
                id="lock_quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0.001"
                max={availableQuantity}
                step="0.001"
                required={isPartialLock}
                placeholder="数量を入力"
              />
            </div>
          )}
          {!isPartialLock && (
            <p className="text-muted-foreground pl-6 text-sm">
              チェックを外すと、現在の有効在庫 ({availableQuantity}) 全てをロックします。
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button type="submit" variant="destructive" disabled={isSubmitting || !reason.trim()}>
            {isSubmitting ? "ロック中..." : "ロックする"}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
