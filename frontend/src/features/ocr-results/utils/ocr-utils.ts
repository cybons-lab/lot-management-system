import { toast } from "sonner";

import type { OcrResultItem, OcrResultEditPayload } from "../api";
import type { RowInputState } from "../pages/OcrResultsTableCells";

export const buildPayload = (input: RowInputState): OcrResultEditPayload => {
  const formatToIso = (d: string | null | undefined) => {
    if (!d) return null;
    return d.replace(/\//g, "-");
  };

  const payload: Partial<OcrResultEditPayload> = {
    shipping_slip_text_edited: input.shippingSlipTextEdited,
    error_flags: input.errorFlags || {},
  };

  const mapping: Array<[keyof RowInputState, keyof OcrResultEditPayload]> = [
    ["lotNo1", "lot_no_1"],
    ["quantity1", "quantity_1"],
    ["lotNo2", "lot_no_2"],
    ["quantity2", "quantity_2"],
    ["inboundNo1", "inbound_no"],
    ["inboundNo2", "inbound_no_2"],
    ["shippingDate", "shipping_date"],
    ["shippingSlipText", "shipping_slip_text"],
    ["jikuCode", "jiku_code"],
    ["materialCode", "material_code"],
    ["deliveryQuantity", "delivery_quantity"],
    ["deliveryDate", "delivery_date"],
    ["processStatus", "process_status"],
  ];

  mapping.forEach(([src, dest]) => {
    const val = input[src];
    if (typeof val === "string") {
      let finalVal: string | null = val || null;
      if (dest === "shipping_date" || dest === "delivery_date") {
        finalVal = formatToIso(val);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload as any)[dest] = finalVal;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload as any)[dest] = val;
    }
  });

  return payload as OcrResultEditPayload;
};

export const executeExportCompletion = async (
  items: OcrResultItem[],
  completeIds: (ids: number[]) => Promise<void>,
) => {
  const validItems = items.filter((i) => !i.has_error);
  const idsToComplete = validItems.map((i) => i.id);

  if (idsToComplete.length === 0) {
    if (items.length > 0) {
      toast.error("エラーのない項目が一つもありませんでした");
    }
    return;
  }

  await completeIds(idsToComplete);
  const skippedCount = items.length - validItems.length;
  if (skippedCount > 0) {
    toast.warning(`${skippedCount}件のエラー項目は完了処理から除外されました`);
  }
};
