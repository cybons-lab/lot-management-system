/**
 * LotLockDialog.tsx
 *
 * ロットロック確認ダイアログ
 */

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
} from "@/components/ui";
import { FormDialog } from "@/shared/components/form";

interface LotLockDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isSubmitting: boolean;
  lotNumber?: string;
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
}: LotLockDialogProps) {
  const [template, setTemplate] = useState("custom");
  const [reason, setReason] = useState("");

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
    await onConfirm(reason);
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
