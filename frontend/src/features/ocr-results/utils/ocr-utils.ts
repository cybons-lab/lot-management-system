import { toast } from "sonner";

import type { OcrResultItem, OcrResultEditPayload } from "../api";

export const buildPayload = (input: RowInputState): OcrResultEditPayload => {
  const formatToIso = (d: string | null | undefined) => {
    if (!d) return null;
    return d.replace(/\//g, "-");
  };

  const payload: Partial<OcrResultEditPayload> = {
    version: input.version,
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

// ============================================
// Shipping Slip Text Logic (Shared)
// ============================================

/**
 * OCR結果行の入力状態を表す型
 * 循環依存を避けるため、ocr-utils.ts で定義
 */
export type RowInputState = {
  version: number;
  lotNo1: string;
  quantity1: string;
  lotNo2: string;
  quantity2: string;
  inboundNo1: string;
  inboundNo2: string;
  shippingDate: string;
  shippingSlipText: string;
  shippingSlipTextEdited: boolean;
  jikuCode: string;
  materialCode: string;
  deliveryQuantity: string;
  deliveryDate: string;
  processStatus: string;
  errorFlags: Record<string, boolean>;
};

const buildLotWithQuantity = (
  lot: string | null | undefined,
  qty: string | null | undefined,
): string | null => {
  if (!lot) return null;
  if (qty) return `${lot}(${qty})`;
  return lot;
};

const buildLotString = (input: {
  lotNo1: string;
  quantity1: string;
  lotNo2: string;
  quantity2: string;
}): string => {
  const lotEntries = [
    buildLotWithQuantity(input.lotNo1, input.quantity1),
    buildLotWithQuantity(input.lotNo2, input.quantity2),
  ].filter(Boolean);
  return lotEntries.join("/");
};

const formatDateToMMDD = (dateStr: string): string | null => {
  if (!dateStr) return null;
  const dateObj = new Date(dateStr);
  if (Number.isNaN(dateObj.getTime())) return null;
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${month}/${day}`;
};

const applyDateReplacements = (
  template: string,
  input: { shippingDate: string; deliveryDate: string },
): string => {
  let result = template;

  // ユーザーが出荷日をクリアした場合は、計算値にフォールバックしない
  // プレースホルダーを保持する（置換しない）
  const shippingFormatted = input.shippingDate ? formatDateToMMDD(input.shippingDate) : "";
  if (shippingFormatted) {
    result = result.replace(/[▲]+[/][▲]+/, shippingFormatted);
  }

  const deliveryFormatted = input.deliveryDate ? formatDateToMMDD(input.deliveryDate) : "";
  if (deliveryFormatted) {
    result = result.replace(/[●]+[/][●]+/, deliveryFormatted);
  }

  return result;
};

export const computeShippingSlipText = (
  template: string | null | undefined,
  input: {
    lotNo1: string;
    quantity1: string;
    lotNo2: string;
    quantity2: string;
    inboundNo1: string;
    inboundNo2: string;
    shippingDate: string;
    deliveryDate: string;
  },
): string => {
  if (!template) return "";

  let result = template;
  result = applyDateReplacements(result, input);

  const hasInboundPlaceholder = result.includes("入庫番号");
  const hasLotPlaceholder = result.includes("ロット");
  const lotCombined = buildLotString(input);

  if (hasInboundPlaceholder && !hasLotPlaceholder) {
    const inbound1WithQty = buildLotWithQuantity(input.inboundNo1, input.quantity1);
    const inbound2WithQty = buildLotWithQuantity(input.inboundNo2, input.quantity2);
    const inboundCombined = [inbound1WithQty, inbound2WithQty].filter(Boolean).join("/");
    if (inboundCombined) {
      result = result.replace("入庫番号", inboundCombined);
    }
  } else if (hasInboundPlaceholder && hasLotPlaceholder) {
    const inboundCombined = [input.inboundNo1, input.inboundNo2].filter(Boolean).join("/");
    if (inboundCombined) {
      result = result.replace("入庫番号", inboundCombined);
    }
    if (lotCombined) {
      result = result.replace("ロット", lotCombined);
    }
  } else if (hasLotPlaceholder && !hasInboundPlaceholder) {
    if (lotCombined) {
      result = result.replace("ロット", lotCombined);
    }
  }

  return result;
};

export const computeShippingDate = (
  deliveryDate: string,
  transportLtDays: number | null | undefined,
): string | null => {
  if (!deliveryDate || transportLtDays == null) return null;
  const dateObj = new Date(deliveryDate);
  if (Number.isNaN(dateObj.getTime())) return null;

  // 納期 - 輸送LT (日)
  dateObj.setDate(dateObj.getDate() - transportLtDays);

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
