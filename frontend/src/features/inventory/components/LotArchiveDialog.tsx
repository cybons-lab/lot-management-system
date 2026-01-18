import { AlertTriangle, Archive } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
  Label,
} from "@/components/ui";
import { type LotUI } from "@/shared/libs/normalize";
import { parseDecimal } from "@/shared/utils/decimal";

interface LotArchiveDialogProps {
  lot: LotUI;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
}

function QuantityWarning({ lot }: { lot: LotUI }) {
  return (
    <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 border border-yellow-200">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-bold block mb-1">注意: 在庫が残っています</span>
          現在の在庫数:{" "}
          <strong>
            {lot.current_quantity} {lot.unit}
          </strong>
          <br />
          在庫が残っているロットをアーカイブすると、これらは在庫資産から消失します。
          本当に実行してよろしいですか？
        </div>
      </div>
    </div>
  );
}

function ConfirmInput({
  value,
  onChange,
  lotNumber,
}: {
  value: string;
  onChange: (value: string) => void;
  lotNumber: string;
}) {
  return (
    <div className="pt-2">
      <Label htmlFor="confirm-lot-number" className="text-xs text-muted-foreground">
        確認のため、ロット番号を入力してください:
      </Label>
      <Input
        id="confirm-lot-number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={lotNumber}
        className="mt-1"
      />
    </div>
  );
}

export function LotArchiveDialog({
  lot,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: LotArchiveDialogProps) {
  const [confirmInput, setConfirmInput] = useState("");
  const currentQuantity = parseDecimal(lot.current_quantity);
  const hasQuantity = currentQuantity.gt(0);

  const handleConfirm = async () => {
    await onConfirm();
    setConfirmInput("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setConfirmInput("");
    onOpenChange(false);
  };

  const isConfirmDisabled = hasQuantity && confirmInput !== lot.lot_number;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Archive className="h-5 w-5" />
            ロットのアーカイブ
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <div>
              ロット <strong>{lot.lot_number}</strong> をアーカイブしますか？
              <br />
              アーカイブされたロットは通常の一覧には表示されなくなり、在庫計算からも除外されます。
            </div>

            {hasQuantity && <QuantityWarning lot={lot} />}
            {hasQuantity && (
              <ConfirmInput
                value={confirmInput}
                onChange={setConfirmInput}
                lotNumber={lot.lot_number}
              />
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting || isConfirmDisabled}
          >
            {isSubmitting ? "処理中..." : "アーカイブする"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
