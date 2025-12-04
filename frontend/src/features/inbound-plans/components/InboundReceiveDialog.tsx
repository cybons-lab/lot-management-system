// Inbound plan receive dialog component
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { InboundReceiveLotForm } from "./InboundReceiveLotForm";

import { Button } from "@/components/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui";
import type { components } from "@/shared/types/openapi";

type InboundPlan = components["schemas"]["InboundPlanDetailResponse"];

interface LotFormData {
  expected_lot_id: number;
  product_name: string;
  planned_quantity: number;
  unit: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLotForms(lines: any[] | undefined): LotFormData[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return lines?.flatMap((line: any) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    line.expected_lots?.map((lot: any) => ({
      expected_lot_id: lot.expected_lot_id || lot.id,
      product_name: line.product_name || "Unknown Product",
      planned_quantity: lot.expected_quantity || lot.planned_quantity,
      unit: line.unit,
    })),
  ) || [];
}

interface InboundReceiveDialogProps {
  inboundPlan: InboundPlan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReceive: (data: { lots: Array<{ expected_lot_id: number; lot_number: string }> }) => Promise<void>;
}

export function InboundReceiveDialog({ inboundPlan, open, onOpenChange, onReceive }: InboundReceiveDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lotNumbers, setLotNumbers] = useState<Record<number, string>>({});
  const lotForms = extractLotForms(inboundPlan.lines);

  const handleLotNumberChange = (expectedLotId: number, value: string) => {
    setLotNumbers((prev) => ({ ...prev, [expectedLotId]: value }));
  };

  const handleSubmit = async () => {
    const lots = lotForms.map((lot) => ({
      expected_lot_id: lot.expected_lot_id,
      lot_number: lotNumbers[lot.expected_lot_id] || "",
    }));

    if (lots.some((lot) => !lot.lot_number)) {
      toast.error("全てのロット番号を入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      await onReceive({ lots });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to receive inbound plan:", error);
      toast.error(error instanceof Error ? error.message : "入庫確定に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>入庫確定 - {inboundPlan.plan_number}</DialogTitle>
          <DialogDescription>各ロットのロット番号を入力してください。本番環境では必須です。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {lotForms.map((lot, index) => (
            <InboundReceiveLotForm
              key={lot.expected_lot_id}
              lot={lot}
              index={index}
              value={lotNumbers[lot.expected_lot_id] || ""}
              onChange={(value) => handleLotNumberChange(lot.expected_lot_id, value)}
            />
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            入庫確定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
