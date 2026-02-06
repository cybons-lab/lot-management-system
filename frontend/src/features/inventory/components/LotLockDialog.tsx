/**
 * LotLockDialog.tsx
 *
 * ロットロック確認ダイアログ
 */

import { useState } from "react";

import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
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

function LockReasonTemplateSelect({
  template,
  onTemplateChange,
}: {
  template: string;
  onTemplateChange: (value: string) => void;
}) {
  return (
    <div>
      <Label htmlFor="lock_reason_template">ロック理由テンプレート</Label>
      <Select value={template} onValueChange={onTemplateChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LOCK_REASON_TEMPLATES.map((templateItem) => (
            <SelectItem key={templateItem.value} value={templateItem.value}>
              {templateItem.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function LockReasonInput({
  template,
  reason,
  onReasonChange,
}: {
  template: string;
  reason: string;
  onReasonChange: (value: string) => void;
}) {
  const isCustomTemplate = template === "custom";

  return (
    <div>
      <Label htmlFor="lock_reason">ロック理由 {isCustomTemplate && "*"}</Label>
      <Textarea
        id="lock_reason"
        value={reason}
        onChange={(event) => onReasonChange(event.target.value)}
        placeholder={isCustomTemplate ? "例: 品質調査のため一時保留" : ""}
        required={isCustomTemplate}
        disabled={!isCustomTemplate}
        className="min-h-[100px]"
      />
    </div>
  );
}

interface LockQuantitySectionProps {
  isPartialLock: boolean;
  onPartialLockChange: (value: boolean) => void;
  quantity: string;
  onQuantityChange: (value: string) => void;
  availableQuantity: number;
}

function LockQuantitySection({
  isPartialLock,
  onPartialLockChange,
  quantity,
  onQuantityChange,
  availableQuantity,
}: LockQuantitySectionProps) {
  return (
    <div className="space-y-2 rounded-md border p-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="partial_lock"
          checked={isPartialLock}
          onCheckedChange={(checked) => onPartialLockChange(checked === true)}
        />
        <Label htmlFor="partial_lock" className="cursor-pointer font-medium">
          数量を指定してロックする（部分ロック）
        </Label>
      </div>

      {isPartialLock ? (
        <div className="pl-6 pt-2">
          <Label htmlFor="lock_quantity">ロックする数量 (有効在庫: {availableQuantity})</Label>
          <Input
            id="lock_quantity"
            type="number"
            value={quantity}
            onChange={(event) => onQuantityChange(event.target.value)}
            min="0.001"
            max={availableQuantity}
            step="0.001"
            required={isPartialLock}
            placeholder="数量を入力"
          />
        </div>
      ) : (
        <p className="text-muted-foreground pl-6 text-sm">
          チェックを外すと、現在の有効在庫 ({availableQuantity}) 全てをロックします。
        </p>
      )}
    </div>
  );
}

function DialogActions({
  onClose,
  isSubmitting,
  canSubmit,
}: {
  onClose: () => void;
  isSubmitting: boolean;
  canSubmit: boolean;
}) {
  return (
    <div className="flex justify-end space-x-2 pt-4">
      <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
        キャンセル
      </Button>
      <Button type="submit" variant="destructive" disabled={isSubmitting || !canSubmit}>
        {isSubmitting ? "ロック中..." : "ロックする"}
      </Button>
    </div>
  );
}

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
    if (value === "custom") {
      setReason("");
      return;
    }
    const selectedTemplate = LOCK_REASON_TEMPLATES.find(
      (templateItem) => templateItem.value === value,
    );
    if (selectedTemplate) {
      setReason(selectedTemplate.label);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
        <LockReasonTemplateSelect template={template} onTemplateChange={handleTemplateChange} />
        <LockReasonInput template={template} reason={reason} onReasonChange={setReason} />
        <LockQuantitySection
          isPartialLock={isPartialLock}
          onPartialLockChange={setIsPartialLock}
          quantity={quantity}
          onQuantityChange={setQuantity}
          availableQuantity={availableQuantity}
        />
        <DialogActions
          onClose={onClose}
          isSubmitting={isSubmitting}
          canSubmit={reason.trim().length > 0}
        />
      </form>
    </FormDialog>
  );
}
