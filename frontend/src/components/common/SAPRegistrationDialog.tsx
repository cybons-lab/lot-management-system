import { Package, Send } from "lucide-react";
import { useState } from "react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import type { ConfirmedOrderLine } from "@/hooks/useConfirmedOrderLines";
import { useSAPBatchRegistration } from "@/hooks/useSAPBatchRegistration";
import { formatDate } from "@/shared/utils/date";

interface SAPRegistrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  confirmedLines: ConfirmedOrderLine[];
}

// eslint-disable-next-line max-lines-per-function
export function SAPRegistrationDialog({
  isOpen,
  onClose,
  confirmedLines,
}: SAPRegistrationDialogProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { registerToSAP, isRegistering } = useSAPBatchRegistration();

  const handleToggle = (lineId: number) => {
    setSelectedIds((prev) =>
      prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId],
    );
  };

  const handleToggleAll = () => {
    if (selectedIds.length === confirmedLines.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(confirmedLines.map((line) => line.line_id));
    }
  };

  const handleRegister = () => {
    registerToSAP(selectedIds, {
      onSuccess: () => {
        setSelectedIds([]);
        onClose();
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            SAP受注登録 - 引当確定済み明細
          </DialogTitle>
          <DialogDescription>引当が完了している明細を選択してSAPに登録します</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between border-b pb-2">
          <div className="text-sm text-gray-600">全{confirmedLines.length}件</div>
          <Button variant="outline" size="sm" onClick={handleToggleAll}>
            {selectedIds.length === confirmedLines.length ? "全解除" : "全選択"}
          </Button>
        </div>

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {confirmedLines.map((line) => (
            <label
              key={line.line_id}
              htmlFor={`line-${line.line_id}`}
              aria-label={`Select ${line.customer_name} - ${line.product_code}`}
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50"
            >
              <input
                id={`line-${line.line_id}`}
                type="checkbox"
                checked={selectedIds.includes(line.line_id)}
                onChange={() => handleToggle(line.line_id)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>{line.customer_name}</span>
                  <span className="text-gray-400">|</span>
                  <span className="font-mono text-gray-600">{line.product_code}</span>
                  <span>{line.product_name}</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  受注: {line.order_number} | 数量: {line.order_quantity} {line.unit} | 納期:{" "}
                  {formatDate(line.delivery_date)}
                </div>
              </div>
            </label>
          ))}
        </div>

        <DialogFooter>
          <div className="flex w-full items-center justify-between">
            <div className="text-sm text-gray-600">選択: {selectedIds.length}件</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isRegistering}>
                キャンセル
              </Button>
              <Button onClick={handleRegister} disabled={selectedIds.length === 0 || isRegistering}>
                <Send className="mr-2 h-4 w-4" />
                {isRegistering ? "登録中..." : "SAP登録"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
