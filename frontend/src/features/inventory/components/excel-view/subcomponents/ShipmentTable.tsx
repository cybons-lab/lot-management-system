import { format, isValid, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar as CalendarIcon, GripVertical, Plus } from "lucide-react";
import { useState, type DragEvent } from "react";

import { type DestinationRowData } from "../types";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const hHeader = "h-8";
const hRow = "h-10";
const hFooter = "h-10";
const MAX_VISIBLE_ROWS = 5; // Minimum number of rows to display (including empty rows)

interface Props {
  destinations: DestinationRowData[];
  dateColumns: string[];
  totalShipment: number;
  lotId: number;
  onCoaDateChange?: (lotId: number, dpId: number, date: string, coaDate: string | null) => void;
  onAddDestination?: () => void;
  onReorderDestination?: (fromId: number, toId: number) => void;
}

/* eslint-disable max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため */
export function ShipmentTable({
  destinations,
  dateColumns,
  totalShipment,
  lotId,
  onCoaDateChange,
  onAddDestination,
  onReorderDestination,
}: Props) {
  const defaultDate = dateColumns[0] || "2026-02"; // Fallback if no columns
  const emptyRows = Math.max(0, MAX_VISIBLE_ROWS - destinations.length);
  const hasEmptyRows = emptyRows > 0;
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  const formatCoaDate = (value?: string) => {
    if (!value) return "";
    const parsed = parseISO(value);
    if (!isValid(parsed)) return "";
    return format(parsed, "MM/dd");
  };

  const handleDragStart = (event: DragEvent, id: number) => {
    if (!onReorderDestination) return;
    event.dataTransfer.setData("text/plain", String(id));
    event.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  };

  const handleDragOver = (event: DragEvent, id: number) => {
    if (!onReorderDestination) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = (event: DragEvent, id: number) => {
    if (!onReorderDestination) return;
    event.preventDefault();
    const fromId = Number(event.dataTransfer.getData("text/plain"));
    if (!Number.isFinite(fromId) || fromId === id) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    onReorderDestination(fromId, id);
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  return (
    <div className="flex flex-col border-r border-slate-300 bg-white h-full">
      {/* Header */}
      <div
        className={`${hHeader} flex items-center bg-slate-50 border-b border-slate-300 font-bold text-[10px] text-slate-500 uppercase tracking-wider`}
      >
        <div className="w-40 px-3 border-r border-slate-200">納入先</div>
        <div className="w-24 px-3 border-r border-slate-200 text-center">検査書</div>
        <div className="w-16 px-3 text-right">合計</div>
      </div>

      {/* Rows */}
      <div className="flex-1 flex flex-col">
        {destinations.map((dest) => (
          <div
            key={dest.deliveryPlaceId}
            className={`${hRow} flex items-center hover:bg-slate-50 relative group border-b border-slate-100 ${
              dragOverId === dest.deliveryPlaceId ? "bg-blue-50/70" : ""
            } ${draggingId === dest.deliveryPlaceId ? "opacity-70" : ""}`}
            onDragOver={(event) => handleDragOver(event, dest.deliveryPlaceId)}
            onDragLeave={() => {
              if (dragOverId === dest.deliveryPlaceId) {
                setDragOverId(null);
              }
            }}
            onDrop={(event) => handleDrop(event, dest.deliveryPlaceId)}
          >
            <div className="w-40 px-3 border-r border-slate-200 truncate h-full flex flex-col justify-center">
              <div className="flex items-center gap-1 font-medium text-slate-900 leading-tight">
                {onReorderDestination && (
                  <span
                    className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing"
                    draggable
                    onDragStart={(event) => handleDragStart(event, dest.deliveryPlaceId)}
                    onDragEnd={handleDragEnd}
                    title="ドラッグで並び替え"
                  >
                    <GripVertical className="h-3 w-3" />
                  </span>
                )}
                <span className="truncate">{dest.destination.deliveryPlaceName}</span>
              </div>
            </div>

            <div className="w-24 px-3 border-r border-slate-200 flex items-center justify-center h-full">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full h-6 px-1 text-[10px] text-center rounded hover:bg-slate-50 text-slate-600 flex items-center justify-center gap-1"
                    title="検査書日付を設定"
                  >
                    <CalendarIcon className="h-3 w-3 text-slate-400" />
                    <span>{formatCoaDate(dest.coaIssueDate) || "--/--"}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dest.coaIssueDate ? parseISO(dest.coaIssueDate) : undefined}
                    onSelect={(date) =>
                      onCoaDateChange?.(
                        lotId,
                        dest.deliveryPlaceId,
                        defaultDate,
                        date ? format(date, "yyyy-MM-dd") : null,
                      )
                    }
                    locale={ja}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="w-16 px-3 text-right font-bold text-slate-700 h-full flex items-center justify-end">
              {dest.totalShipmentQty > 0 ? dest.totalShipmentQty : "-"}
            </div>
          </div>
        ))}
        {hasEmptyRows && (
          <div className={`${hRow} flex items-center border-b border-slate-100`}>
            <div className="w-40 px-3 border-r border-slate-200 h-full flex items-center justify-between">
              <span className="text-[10px] text-slate-400">空行</span>
              <button
                onClick={onAddDestination}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all text-[10px]"
                title="納入先を追加"
              >
                <Plus className="h-3 w-3" />
                <span>追加</span>
              </button>
            </div>
            <div className="w-24 border-r border-slate-200 h-full bg-slate-50/5"></div>
            <div className="w-16 h-full bg-slate-50/5"></div>
          </div>
        )}
        {hasEmptyRows &&
          Array.from({ length: emptyRows - 1 }).map((_, i) => (
            <div key={i} className={`${hRow} flex items-center border-b border-slate-100`}>
              <div className="w-40 border-r border-slate-200 h-full bg-slate-50/5"></div>
              <div className="w-24 border-r border-slate-200 h-full bg-slate-50/5"></div>
              <div className="w-16 h-full bg-slate-50/5"></div>
            </div>
          ))}
      </div>

      {/* Footer */}
      <div
        className={`${hFooter} flex items-center bg-slate-100 border-t border-slate-300 font-bold`}
      >
        <div className="w-40 px-3 border-r border-slate-200 flex items-center justify-between">
          <span className="text-slate-600">合計</span>
          {!hasEmptyRows && (
            <button
              onClick={onAddDestination}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all text-[10px]"
              title="納入先を追加"
            >
              <Plus className="h-3 w-3" />
              <span>追加</span>
            </button>
          )}
        </div>
        <div className="w-24 border-r border-slate-200"></div>
        <div className="w-16 px-3 text-right text-slate-900">{totalShipment}</div>
      </div>
    </div>
  );
}
