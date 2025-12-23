/**
 * CustomerItemOcrSapTab
 * 得意先品番のOCR-SAP変換設定タブ（詳細ダイアログ用）
 */

import { CheckCircle, XCircle } from "lucide-react";

import type { CustomerItem } from "../api";

interface CustomerItemOcrSapTabProps {
  item: CustomerItem;
}

export function CustomerItemOcrSapTab({ item }: CustomerItemOcrSapTabProps) {
  return (
    <div className="space-y-6">
      {/* OCR→SAP変換設定 */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-slate-700">OCR→SAP変換設定</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-500">メーカー品番</div>
            <div className="font-medium">{item.maker_part_no || "-"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">発注区分</div>
            <div className="font-medium">{item.order_category || "-"}</div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-slate-500">発注の有無</div>
            <div className="flex items-center gap-2 font-medium">
              {item.is_procurement_required ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-700">発注が必要（調達対象）</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">発注不要</span>
                </>
              )}
            </div>
          </div>
        </div>

        {item.shipping_slip_text && (
          <div className="mt-4">
            <div className="text-xs text-slate-500">出荷票テキスト</div>
            <div className="mt-1 rounded bg-slate-50 p-2 text-sm">{item.shipping_slip_text}</div>
          </div>
        )}

        {item.ocr_conversion_notes && (
          <div className="mt-4">
            <div className="text-xs text-slate-500">OCR変換用備考</div>
            <div className="mt-1 rounded bg-amber-50 p-2 text-sm">{item.ocr_conversion_notes}</div>
          </div>
        )}
      </div>

      {/* SAPキャッシュ設定 */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-slate-700">SAPキャッシュ設定</h4>
        <p className="mb-3 text-xs text-slate-500">
          SAPマスタから取得した情報のキャッシュです。変換処理で使用されます。
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-500">SAP仕入先コード</div>
            <div className="font-mono text-sm font-medium">{item.sap_supplier_code || "-"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">SAP倉庫コード</div>
            <div className="font-mono text-sm font-medium">{item.sap_warehouse_code || "-"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">SAP出荷倉庫</div>
            <div className="font-mono text-sm font-medium">
              {item.sap_shipping_warehouse || "-"}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">SAP単位</div>
            <div className="font-mono text-sm font-medium">{item.sap_uom || "-"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
