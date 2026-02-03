import { useEffect, useRef, useState } from "react";

import { type LotInfo } from "../types";

import { Input } from "@/components/ui";

const hHeader = "h-8";
const hRow = "h-10";
const hFooter = "h-10";

interface Props {
  lotInfo: LotInfo;
  lotId: number;
  isEditing?: boolean;
  onFieldChange?: (lotId: number, field: string, value: string) => void;
  warehouseName?: string;
  warehouseCode?: string;
}

export function LotInfoGroups({
  lotInfo,
  lotId,
  isEditing,
  onFieldChange,
  warehouseName,
  warehouseCode,
}: Props) {
  const handleChange = (field: string, value: string) => {
    if (onFieldChange) {
      onFieldChange(lotId, field, value);
    }
  };

  return (
    <div className="flex border-r border-slate-300">
      <LabelColumn />
      <ValueColumn
        lotInfo={lotInfo}
        isEditing={isEditing}
        onChange={handleChange}
        warehouseName={warehouseName}
        warehouseCode={warehouseCode}
      />
    </div>
  );
}

function LabelColumn() {
  return (
    <div className="w-28 bg-slate-100 border-r border-slate-200 flex flex-col font-bold">
      <div className={`${hHeader} p-2 bg-slate-200/50 border-b border-slate-300 flex items-center`}>
        入荷情報
      </div>
      <div className={`${hRow} p-2 flex items-center border-b border-slate-100 whitespace-nowrap`}>
        倉庫
      </div>
      <div className={`${hRow} p-2 flex items-center border-b border-slate-100 whitespace-nowrap`}>
        入荷日
      </div>
      <div className={`${hRow} p-2 flex items-center border-b border-slate-100`}>Lot</div>
      <div className={`${hRow} p-2 flex items-center border-b border-slate-100 whitespace-nowrap`}>
        入庫No.
      </div>
      <div className={`${hRow} p-2 flex items-center border-b border-slate-100 whitespace-nowrap`}>
        発注NO.
      </div>
      <div className={`${hRow} p-2 flex items-center text-slate-500`}>消費期限</div>
      <div className="flex-1 bg-slate-50/50"></div>
      <div className={`${hFooter} bg-slate-100 border-t border-slate-300`}></div>
    </div>
  );
}

/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
function ValueColumn({
  lotInfo,
  isEditing,
  onChange,
  warehouseName,
  warehouseCode,
}: {
  lotInfo: LotInfo;
  isEditing?: boolean;
  onChange: (field: string, value: string) => void;
  warehouseName?: string;
  warehouseCode?: string;
}) {
  const isTmpLot = lotInfo.lotNo?.startsWith("TMP-");
  const lotNoDisplay = isTmpLot ? "" : lotInfo.lotNo || "-";
  const [editingField, setEditingField] = useState<string | null>(null);
  const receivedDateInputRef = useRef<HTMLInputElement>(null);
  const lotNumberInputRef = useRef<HTMLInputElement>(null);
  const expiryDateInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (editingField === "received_date" && receivedDateInputRef.current) {
      receivedDateInputRef.current.focus();
    } else if (editingField === "lot_number" && lotNumberInputRef.current) {
      lotNumberInputRef.current.focus();
    } else if (editingField === "expiry_date" && expiryDateInputRef.current) {
      expiryDateInputRef.current.focus();
    }
  }, [editingField]);

  const handleDoubleClick = (field: string) => {
    if (!isEditing) {
      setEditingField(field);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setEditingField(null);
    } else if (e.key === "Enter") {
      setEditingField(null);
    }
  };

  const isFieldEditing = (field: string) => isEditing || editingField === field;

  return (
    <div className="w-36 flex flex-col">
      <div
        className={`${hHeader} border-b border-slate-300 bg-slate-50 font-bold flex items-center px-2 text-slate-400`}
      >
        VALUES
      </div>
      <div className={`${hRow} px-2 flex items-center border-b border-slate-100`}>
        <div className="flex flex-col min-w-0 leading-[1.1]">
          <span className="text-[11px] font-medium text-slate-700 whitespace-normal break-all">
            {warehouseName || "-"}
          </span>
          <span className="text-[10px] text-slate-400 whitespace-normal break-all">
            {warehouseCode && warehouseCode !== "-" ? `(${warehouseCode})` : ""}
          </span>
        </div>
      </div>
      <div className={`${hRow} px-1 py-1 flex items-center border-b border-slate-100`}>
        {isFieldEditing("received_date") ? (
          <Input
            ref={receivedDateInputRef}
            type="date"
            value={lotInfo.inboundDate}
            onChange={(e) => onChange("received_date", e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setEditingField(null)}
            className="h-8 text-sm"
          />
        ) : (
          <span
            className="px-2 text-sm font-medium cursor-pointer hover:bg-slate-100 w-full rounded"
            onDoubleClick={() => handleDoubleClick("received_date")}
            title="ダブルクリックで編集"
          >
            {lotInfo.inboundDate}
          </span>
        )}
      </div>
      <div className={`${hRow} px-1 py-1 flex items-center border-b border-slate-100`}>
        {isFieldEditing("lot_number") ? (
          <Input
            ref={lotNumberInputRef}
            type="text"
            value={isTmpLot ? "" : lotInfo.lotNo || ""}
            onChange={(e) => onChange("lot_number", e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setEditingField(null)}
            placeholder=""
            className="h-8 text-sm font-mono"
          />
        ) : (
          <span
            className="px-2 text-sm font-mono font-bold text-slate-700 cursor-pointer hover:bg-slate-100 w-full rounded"
            onDoubleClick={() => handleDoubleClick("lot_number")}
            title="ダブルクリックで編集"
          >
            {lotNoDisplay}
          </span>
        )}
      </div>
      <div className={`${hRow} px-1 py-1 flex items-center border-b border-slate-100`}>
        <Input
          type="text"
          value={lotInfo.inboundNo || ""}
          onChange={(e) => onChange("origin_reference", e.target.value)}
          placeholder="-"
          className="h-8 text-xs font-mono bg-transparent border-0 hover:bg-slate-50 focus:bg-blue-50"
        />
      </div>
      <div className={`${hRow} px-1 py-1 flex items-center border-b border-slate-100`}>
        <Input
          type="text"
          value={lotInfo.orderNo || ""}
          onChange={(e) => onChange("order_no", e.target.value)}
          placeholder="-"
          className="h-8 text-xs font-mono bg-transparent border-0 hover:bg-slate-50 focus:bg-blue-50"
        />
      </div>
      <div className={`${hRow} px-1 py-1 flex items-center`}>
        {isFieldEditing("expiry_date") ? (
          <Input
            ref={expiryDateInputRef}
            type="date"
            value={lotInfo.expiryDate !== "期限なし" ? lotInfo.expiryDate : ""}
            onChange={(e) => onChange("expiry_date", e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setEditingField(null)}
            className="h-8 text-xs"
          />
        ) : (
          <span
            className="px-2 text-xs text-slate-500 cursor-pointer hover:bg-slate-100 w-full rounded"
            onDoubleClick={() => handleDoubleClick("expiry_date")}
            title="ダブルクリックで編集"
          >
            {lotInfo.expiryDate}
          </span>
        )}
      </div>
      <div className="flex-1"></div>
      <div className={`${hFooter} border-t border-slate-300 bg-slate-100`}></div>
    </div>
  );
}
