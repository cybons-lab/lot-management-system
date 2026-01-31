import { AlertCircle, Save } from "lucide-react";
import { useState } from "react";

import type { OcrResultItem } from "../api";
import { ShippingTextReplacementRules } from "../components/ShippingTextReplacementRules";

import {
  EditableTextCell,
  EditableDateCell,
  EditableShippingSlipCell,
} from "./OcrResultsTableCells";

import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/form/label";

interface OcrResultEditModalProps {
  row: OcrResultItem | null;
  isOpen: boolean;
  onClose: () => void;
}

// eslint-disable-next-line max-lines-per-function -- ModalフォームUI全体の論理的なまとまり
function EditFormGrid({ row }: { row: OcrResultItem }) {
  return (
    <div className="space-y-4 py-4">
      {/* 商品コード情報 + 納期・数量 */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          商品コード情報・納期・数量
        </Label>
        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px]">材質コード</Label>
            <EditableTextCell row={row} field="materialCode" placeholder="材質コード" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">次区</Label>
            <EditableTextCell row={row} field="jikuCode" placeholder="次区" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">納期</Label>
            <EditableDateCell row={row} field="deliveryDate" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">納入量</Label>
            <EditableTextCell
              row={row}
              field="deliveryQuantity"
              placeholder="納入量"
              inputClassName="text-right"
            />
          </div>
        </div>
      </div>

      {/* 区切り線 */}
      <div className="border-t border-slate-200"></div>

      {/* ロット情報(1) */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          ロット情報(1)
        </Label>
        <div className="grid grid-cols-[2fr_2fr_1fr] gap-2">
          <div className="space-y-1">
            <Label className="text-[10px]">ロットNo(1)</Label>
            <EditableTextCell row={row} field="lotNo1" placeholder="ロットNo(1)" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">入庫No(1)</Label>
            <EditableTextCell row={row} field="inboundNo1" placeholder="入庫No(1)" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">数量(1)</Label>
            <EditableTextCell
              row={row}
              field="quantity1"
              placeholder="数量(1)"
              inputClassName="text-right"
            />
          </div>
        </div>
      </div>

      {/* ロット情報(2) */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          ロット情報(2)
        </Label>
        <div className="grid grid-cols-[2fr_2fr_1fr] gap-2">
          <div className="space-y-1">
            <Label className="text-[10px]">ロットNo(2)</Label>
            <EditableTextCell row={row} field="lotNo2" placeholder="ロットNo(2)" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">入庫No(2)</Label>
            <EditableTextCell row={row} field="inboundNo2" placeholder="入庫No(2)" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">数量(2)</Label>
            <EditableTextCell
              row={row}
              field="quantity2"
              placeholder="数量(2)"
              inputClassName="text-right"
            />
          </div>
        </div>
      </div>

      {/* 出荷情報 */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          出荷情報
        </Label>
        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px]">出荷日</Label>
            <EditableDateCell row={row} field="shippingDate" />
          </div>
        </div>
      </div>

      {/* 区切り線 */}
      <div className="border-t border-slate-200"></div>

      {/* 出荷票テキスト（全幅） */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          出荷票テキスト
        </Label>
        <div className="space-y-1">
          <EditableShippingSlipCell row={row} />
          <p className="text-[9px] text-muted-foreground">
            ダブルクリックで直接編集、Ctrl+Enterで確定
          </p>
        </div>
      </div>
    </div>
  );
}

function CustomerAndSupplierInfo({ row }: { row: OcrResultItem }) {
  return (
    <div className="space-y-2">
      <div>
        <span className="font-bold text-slate-400 block mb-0.5">得意先</span>
        <div className="flex gap-2">
          <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">
            {row.customer_code || "-"}
          </span>
          <span>{row.customer_name || "-"}</span>
        </div>
      </div>
      <div>
        <span className="font-bold text-slate-400 block mb-0.5">仕入先 (マスタ)</span>
        <div className="flex gap-2">
          <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">
            {row.supplier_code || "-"}
          </span>
          <span>{row.supplier_name || "-"}</span>
        </div>
      </div>
      <div>
        <span className="font-bold text-slate-400 block mb-0.5">品番 (メーカー / 先方)</span>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">メーカー:</span>
            {row.maker_part_no || "-"}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">先方:</span>
            {row.customer_part_no || "-"}
          </div>
        </div>
      </div>
    </div>
  );
}

function SapAndWarehouseInfo({ row }: { row: OcrResultItem }) {
  return (
    <div className="space-y-2">
      <div>
        <span className="font-bold text-slate-400 block mb-0.5">SAP突合仕入先</span>
        <div className="flex gap-2">
          <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-medium text-blue-600">
            {row.sap_supplier_code || "-"}
          </span>
          <span>{row.sap_supplier_name || "-"}</span>
        </div>
      </div>
      <div>
        <span className="font-bold text-slate-400 block mb-0.5">SAP照合情報</span>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">メーカー品番:</span>
            {row.sap_maker_item || "-"}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">数量単位:</span>
            {row.sap_qty_unit || "-"}
          </div>
        </div>
      </div>
      <div>
        <span className="font-bold text-slate-400 block mb-0.5">倉庫・納入場所</span>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">出荷倉庫:</span>
            {row.shipping_warehouse_name || "-"}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">納入場所:</span>
            {row.delivery_place_name || "-"}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReferenceInfoCols({ row }: { row: OcrResultItem }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-4 rounded-md bg-slate-50 p-3 text-[11px] border border-slate-200">
      <CustomerAndSupplierInfo row={row} />
      <SapAndWarehouseInfo row={row} />
    </div>
  );
}

function ReferenceDataSection({ row }: { row: OcrResultItem }) {
  return (
    <div className="mt-4 border-t pt-4">
      <details className="group">
        <summary className="flex cursor-pointer items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider list-none">
          <span>参照データ (読み取り専用)</span>
          <span className="transition-transform group-open:rotate-180">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </summary>
        <ReferenceInfoCols row={row} />
      </details>
    </div>
  );
}

export function OcrResultEditModal({ row, isOpen, onClose }: OcrResultEditModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  if (!row) return null;

  const handleManualSave = async () => {
    setIsSaving(true);
    // 自動保存機構がすでに動作しているため、ここでは単にユーザーフィードバックを提供
    // 実際の保存は各EditableCellのonChangeで自動的に行われる
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            受注詳細編集
            <span className="text-sm font-normal text-muted-foreground">
              (ID: {row.id} / 行: {row.row_index})
            </span>
          </DialogTitle>
        </DialogHeader>

        <EditFormGrid row={row} />

        <div className="mt-2 rounded-md bg-blue-50 p-3 flex items-start gap-2 border border-blue-100">
          <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
          <div className="text-[11px] text-blue-700 leading-relaxed">
            入力した内容は自動的に保存されます（0.5秒後）。
            商品コードを変更すると、マスタ再照合がバックグラウンドで行われます。
          </div>
        </div>

        <ShippingTextReplacementRules />

        <ReferenceDataSection row={row} />

        <DialogFooter className="mt-6 flex gap-2">
          <Button
            variant="default"
            onClick={handleManualSave}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "保存中..." : "保存"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
