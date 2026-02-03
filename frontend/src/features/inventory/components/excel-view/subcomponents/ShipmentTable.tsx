import { format, parse } from "date-fns";
import { Plus } from "lucide-react";
import { useState } from "react";

import { type DestinationRowData } from "../types";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const hHeader = "h-8";
const hRow = "h-10";
const hFooter = "h-10";

interface Props {
  destinations: DestinationRowData[];
  totalShipment: number;
  lotId: number;
  localChanges?: Record<string, number>;
  onCoaDateChange?: (lotId: number, dpId: number, date: string) => void;
  onAddDestination?: () => void;
}

/**
 * 成績書の日付を月/日形式でフォーマット
 */
function formatCoaDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const parsed = parse(dateStr, "yyyy-MM-dd", new Date());
    return format(parsed, "M/d");
  } catch {
    return dateStr;
  }
}

/* eslint-disable max-lines-per-function */
export function ShipmentTable({
  destinations,
  totalShipment,
  lotId,
  localChanges,
  onCoaDateChange,
  onAddDestination,
}: Props) {
  const [selectedDpId, setSelectedDpId] = useState<number | null>(null);
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
              <Popover
                open={selectedDpId === dest.deliveryPlaceId}
                onOpenChange={(open) => setSelectedDpId(open ? dest.deliveryPlaceId : null)}
              >
                <PopoverTrigger asChild>
                  <button className="h-8 w-full text-[11px] bg-transparent hover:bg-slate-50 focus:bg-blue-50 px-1 text-center rounded cursor-pointer font-medium">
                    {formatCoaDate(dest.coaIssueDate) || "未設定"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={
                      dest.coaIssueDate
                        ? parse(dest.coaIssueDate, "yyyy-MM-dd", new Date())
                        : undefined
                    }
                    onSelect={(date) => {
                      if (date) {
                        const formatted = format(date, "yyyy-MM-dd");
                        onCoaDateChange?.(lotId, dest.deliveryPlaceId, formatted);
                        setSelectedDpId(null);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="w-20 p-2 flex items-center justify-end font-bold text-blue-600 pr-2 text-sm">
              {dest.totalShipmentQty || ""}
            </div>
          </div>
        ))}
        {destinations.length < 5 &&
          Array.from({ length: 5 - destinations.length }).map((_, i) => {
            // 一番上の空白行に「+」ボタンを追加
            const isFirstEmptyRow = i === 0;
            return (
              <div key={i} className={`${hRow} flex divide-x divide-slate-100`}>
                <div className="w-48 flex items-center justify-center">
                  {isFirstEmptyRow && onAddDestination && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onAddDestination}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                      title="納入先を追加"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="w-16"></div>
                <div className="w-20"></div>
              </div>
            );
          })}
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
