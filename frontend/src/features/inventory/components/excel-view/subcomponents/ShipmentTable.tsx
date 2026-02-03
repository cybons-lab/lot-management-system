import { type DestinationRowData } from "../types";

import { Input } from "@/components/ui";

const hHeader = "h-8";
const hRow = "h-10";
const hFooter = "h-10";

interface Props {
  destinations: DestinationRowData[];
  totalShipment: number;
  lotId: number;
  localChanges?: Record<string, number>;
  onCoaDateChange?: (lotId: number, dpId: number, date: string) => void;
}

/* eslint-disable max-lines-per-function */
export function ShipmentTable({
  destinations,
  totalShipment,
  lotId,
  localChanges,
  onCoaDateChange,
}: Props) {
  // Compute totals considering local changes
  const computedDestinations = destinations.map((dest) => {
    let rowTotal = dest.totalShipmentQty;

    if (localChanges) {
      // Find all changes for this lot and delivery place
      const prefix = `${lotId}:${dest.deliveryPlaceId}:`;
      const originalRowTotalFromSuggestions = Object.keys(dest.shipmentQtyByDate).reduce(
        (sum, date) => sum + (dest.shipmentQtyByDate[date] || 0),
        0,
      );

      let adjustedRowTotal = originalRowTotalFromSuggestions;

      Object.keys(localChanges).forEach((key) => {
        if (key.startsWith(prefix)) {
          const date = key.replace(prefix, "");
          const originalVal = dest.shipmentQtyByDate[date] || 0;
          const newVal = localChanges[key];
          adjustedRowTotal = adjustedRowTotal - originalVal + newVal;
        }
      });
      rowTotal = adjustedRowTotal;
    }

    return { ...dest, totalShipmentQty: rowTotal };
  });

  const computedTotalShipment = localChanges
    ? computedDestinations.reduce((sum, d) => sum + d.totalShipmentQty, 0)
    : totalShipment;

  return (
    <div className="flex flex-col border-r border-slate-300">
      <div
        className={`${hHeader} flex border-b border-slate-300 font-bold bg-slate-50 divide-x divide-slate-200`}
      >
        <div className="w-48 p-2 flex items-center">納入先</div>
        <div className="w-16 p-2 flex items-center justify-center text-[10px] text-slate-500">
          成績書
        </div>
        <div className="w-20 p-2 flex items-center justify-end pr-2 text-slate-700 text-[10px]">
          出荷計
        </div>
      </div>
      <div className="flex-1 flex flex-col divide-y divide-slate-100">
        {computedDestinations.map((dest, i) => (
          <div key={i} className={`${hRow} flex group hover:bg-slate-50 divide-x divide-slate-100`}>
            <div
              className="w-48 p-2 flex items-center truncate text-sm"
              title={dest.destination.deliveryPlaceName}
            >
              {dest.destination.deliveryPlaceName}
            </div>
            <div className="w-16 px-1 py-1 flex items-center justify-center">
              <Input
                type="date"
                value={dest.coaIssueDate || ""}
                onChange={(e) => onCoaDateChange?.(lotId, dest.deliveryPlaceId, e.target.value)}
                className="h-8 text-[10px] bg-transparent border-0 hover:bg-slate-50 focus:bg-blue-50 p-0 text-center"
                placeholder="未設定"
              />
            </div>
            <div className="w-20 p-2 flex items-center justify-end font-bold text-blue-600 pr-2 text-sm">
              {dest.totalShipmentQty || ""}
            </div>
          </div>
        ))}
        {destinations.length < 5 &&
          Array.from({ length: 5 - destinations.length }).map((_, i) => (
            <div key={i} className={`${hRow} flex divide-x divide-slate-100`}>
              <div className="w-48"></div>
              <div className="w-16"></div>
              <div className="w-20"></div>
            </div>
          ))}
      </div>
      <div
        className={`${hFooter} flex border-t border-slate-300 bg-slate-100 font-bold divide-x divide-slate-200`}
      >
        <div className="w-64 p-2 flex items-center text-slate-700 font-bold">ロット合計</div>
        <div className="w-20 p-2 flex items-center justify-end pr-2 text-sm font-bold">
          {computedTotalShipment}
        </div>
      </div>
    </div>
  );
}
