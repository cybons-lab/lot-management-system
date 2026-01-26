import { format, isValid, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarPlus } from "lucide-react";
import { useState } from "react";

import { type DestinationRowData } from "../types";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const hHeader = "h-8";
const hRow = "h-10";
const hFooter = "h-10";

/**
 * Format forecast_period for column header display (納期日).
 * Supports both YYYY-MM (monthly) and YYYY-MM-DD (daily) formats.
 * Always displays as MM/dd format.
 */
function formatPeriodHeader(period: string): string {
  // Monthly format: "2026-02" → "02/01" (1st of the month)
  if (/^\d{4}-\d{2}$/.test(period)) {
    const month = period.substring(5, 7);
    return `${month}/01`;
  }
  // Daily format: "2026-01-15" → "01/15"
  const parsed = parseISO(period);
  if (isValid(parsed)) {
    return format(parsed, "MM/dd");
  }
  // Fallback: return as-is
  return period;
}

interface Props {
  dateColumns: string[];
  destinations: DestinationRowData[];
  lotId: number;
  isEditing?: boolean;
  localChanges?: Record<string, number>;
  onQtyChange?: (lotId: number, dpId: number, date: string, value: number) => void;
  onAddColumn?: (date: Date) => void;
}

interface CellProps {
  date: string;
  lotId: number;
  dest: DestinationRowData;
  isEditing?: boolean;
  localChanges?: Record<string, number>;
  onQtyChange?: (lotId: number, dpId: number, date: string, value: number) => void;
}

function DateCell({ date, lotId, dest, isEditing, localChanges, onQtyChange }: CellProps) {
  const changeKey = `${lotId}:${dest.deliveryPlaceId}:${date}`;
  const currentValue =
    localChanges && localChanges[changeKey] !== undefined
      ? localChanges[changeKey]
      : dest.shipmentQtyByDate[date] || 0;

  const isChanged = localChanges && localChanges[changeKey] !== undefined;

  return (
    <div className="w-16 p-0 flex items-center justify-center">
      {isEditing ? (
        <input
          type="number"
          className={`w-full h-full bg-transparent text-right pr-2 focus:bg-blue-50 outline-none transition-colors font-medium border-0 ${
            isChanged ? "text-blue-600 font-bold" : "text-slate-600"
          }`}
          value={currentValue || ""}
          onChange={(e) =>
            onQtyChange?.(lotId, dest.deliveryPlaceId, date, parseInt(e.target.value, 10) || 0)
          }
        />
      ) : (
        <div className="w-full text-right pr-2 text-sm font-medium text-slate-600">
          {currentValue || ""}
        </div>
      )}
    </div>
  );
}

/* eslint-disable max-lines-per-function */
export function DateGrid({
  dateColumns,
  destinations,
  lotId,
  isEditing,
  localChanges,
  onQtyChange,
  onAddColumn,
}: Props) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const isDateDisabled = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return dateColumns.includes(dateStr);
  };

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return;
    if (isDateDisabled(date)) return; // Extra guard against duplicates
    onAddColumn?.(date);
    setIsPopoverOpen(false);
  };

  return (
    <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 bg-slate-50/5">
      <div className="min-w-max flex flex-col">
        {/* Header */}
        <div
          className={`${hHeader} flex border-b border-slate-300 font-bold bg-slate-50 divide-x divide-slate-200`}
        >
          {dateColumns.map((date) => (
            <div
              key={date}
              className="w-16 p-2 flex items-center justify-center text-center text-[10px] text-slate-500"
            >
              {formatPeriodHeader(date)}
            </div>
          ))}
          {/* Add Column Button (Always Visible) */}
          <div className="w-10 flex items-center justify-center bg-slate-50">
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className="w-full h-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="列を追加"
                >
                  <CalendarPlus className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={undefined}
                  onSelect={handleSelectDate}
                  disabled={isDateDisabled}
                  initialFocus
                  locale={ja}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Rows */}
        <div className="flex-1 flex flex-col divide-y divide-slate-100">
          {destinations.map((dest, i) => (
            <div key={i} className={`${hRow} flex divide-x divide-slate-100 hover:bg-slate-50`}>
              {dateColumns.map((date) => (
                <DateCell
                  key={date}
                  date={date}
                  lotId={lotId}
                  dest={dest}
                  isEditing={isEditing}
                  localChanges={localChanges}
                  onQtyChange={onQtyChange}
                />
              ))}
              {/* Spacer for add column button (prevent row misalignment) */}
              <div className="w-10 bg-slate-50/30" />
            </div>
          ))}
          {destinations.length < 5 &&
            Array.from({ length: 5 - destinations.length }).map((_, i) => (
              <div key={i} className={`${hRow} flex divide-x divide-slate-100`}>
                {dateColumns.map((d) => (
                  <div key={d} className="w-16"></div>
                ))}
                <div className="w-10"></div>
              </div>
            ))}
        </div>

        {/* Footer */}
        <div
          className={`${hFooter} flex border-t border-slate-300 bg-slate-100 font-bold divide-x divide-slate-200`}
        >
          {dateColumns.map((date) => {
            const dayTotal = destinations.reduce((sum, d) => {
              const changeKey = `${lotId}:${d.deliveryPlaceId}:${date}`;
              const val =
                localChanges && localChanges[changeKey] !== undefined
                  ? localChanges[changeKey]
                  : d.shipmentQtyByDate[date] || 0;
              return sum + val;
            }, 0);
            return (
              <div
                key={date}
                className="w-16 p-2 flex items-center justify-end pr-2 text-sm text-slate-800"
              >
                {dayTotal > 0 ? dayTotal : ""}
              </div>
            );
          })}
          <div className="w-10 bg-slate-100"></div>
        </div>
      </div>
    </div>
  );
}
