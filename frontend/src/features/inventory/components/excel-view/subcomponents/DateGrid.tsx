import { format, isValid, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarPlus, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";

import { type DestinationRowData } from "../types";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const hHeader = "h-8";
const hRow = "h-10";
const hFooter = "h-10";
const MAX_VISIBLE_ROWS = 5; // Minimum number of rows to display (including empty rows)

/**
 * Format forecast_period for column header display (納期日).
 * Supports both YYYY-MM (monthly) and YYYY-MM-DD (daily) formats.
 * Always displays as MM/dd format.
 */
export function formatPeriodHeader(period: string): string {
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
  onQtyChange?: (lotId: number, dpId: number, date: string, value: number) => void;
  onAddColumn?: (date: Date) => void;
  // Phase 9.2: Cell-level comments
  onCommentChange?: (lotId: number, dpId: number, date: string, comment: string | null) => void;
}

interface CellProps extends React.HTMLAttributes<HTMLDivElement> {
  date: string;
  currentValue: number;
  lotId: number;
  dest: DestinationRowData;
  isConfirmed: boolean;
  onQtyChange?: (lotId: number, dpId: number, date: string, value: number) => void;
  // Phase 9.2: Cell-level comments
  comment?: string | null;
  onCommentChange?: (lotId: number, dpId: number, date: string, comment: string | null) => void;
}

/* eslint-disable max-lines-per-function */
function DateCell({
  date,
  lotId,
  dest,
  currentValue,
  isConfirmed,
  onQtyChange,
  comment,
  onCommentChange,
}: CellProps) {
  const [localValue, setLocalValue] = useState<string>(currentValue ? String(currentValue) : "");
  // Phase 9.2: Comment dialog state
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [localComment, setLocalComment] = useState(comment || "");

  // Update local value when currentValue changes (e.g., from server response after save)
  useEffect(() => {
    setLocalValue(currentValue ? String(currentValue) : "");
  }, [currentValue]);

  // Update local comment when comment prop changes
  useEffect(() => {
    setLocalComment(comment || "");
  }, [comment]);

  const handleBlur = () => {
    const val = parseInt(localValue, 10) || 0;
    if (val !== currentValue) {
      onQtyChange?.(lotId, dest.deliveryPlaceId, date, val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const handleSaveComment = () => {
    onCommentChange?.(lotId, dest.deliveryPlaceId, date, localComment || null);
    setIsCommentDialogOpen(false);
  };

  const handleDeleteComment = () => {
    setLocalComment("");
    onCommentChange?.(lotId, dest.deliveryPlaceId, date, null);
    setIsCommentDialogOpen(false);
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="w-16 p-0 flex items-center justify-center relative group h-full"
            title={comment || undefined}
          >
            {/* Red triangle indicator for comments */}
            {comment && (
              <div
                className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-r-[8px] border-t-red-500 border-r-transparent z-10 pointer-events-none"
                title={comment}
              />
            )}
            <input
              type="number"
              className={`w-full h-full bg-transparent text-right pr-2 py-2 hover:bg-slate-50 focus:bg-blue-50 focus:ring-2 focus:ring-blue-400 focus:ring-inset outline-none transition-all font-medium border-0 rounded cursor-pointer ${
                isConfirmed ? "text-blue-600 font-bold bg-blue-50/30" : "text-slate-600"
              }`}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="-"
            />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setIsCommentDialogOpen(true)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            {comment ? "コメントを編集" : "コメントを追加"}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Comment Edit Dialog */}
      <Dialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>コメント編集</DialogTitle>
            <DialogDescription>
              {formatPeriodHeader(date)} の数量にコメントを追加できます
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="w-full min-h-[100px] p-3 border border-slate-300 rounded bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={localComment}
            onChange={(e) => setLocalComment(e.target.value)}
            placeholder="コメントを入力..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCommentDialogOpen(false)}>
              キャンセル
            </Button>
            {comment && (
              <Button variant="destructive" onClick={handleDeleteComment}>
                削除
              </Button>
            )}
            <Button onClick={handleSaveComment}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* eslint-disable max-lines-per-function */

export function DateGrid({
  dateColumns,
  destinations,
  lotId,
  onQtyChange,
  onAddColumn,
  onCommentChange,
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
      <div className="min-w-max flex flex-col h-full">
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
          <div className="w-10 flex items-center justify-center bg-slate-100/50">
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className="w-full h-full flex flex-col items-center justify-center text-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-all group"
                  title="列を追加"
                >
                  <CalendarPlus className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span className="text-[8px] scale-90 mt-0.5 font-bold">追加</span>
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
            <div
              key={i}
              className={`${hRow} flex divide-x divide-slate-100 hover:bg-slate-50 border-b border-slate-100`}
            >
              {dateColumns.map((date) => (
                <DateCell
                  key={date}
                  date={date}
                  lotId={lotId}
                  dest={dest}
                  currentValue={dest.shipmentQtyByDate[date] || 0}
                  isConfirmed={false} // Placeholder
                  onQtyChange={onQtyChange}
                  comment={dest.commentByDate?.[date]}
                  onCommentChange={onCommentChange}
                />
              ))}
              {/* Spacer for add column button (prevent row misalignment) */}
              <div className="w-10 bg-slate-50/10 border-l border-slate-200" />
            </div>
          ))}
          {destinations.length < MAX_VISIBLE_ROWS &&
            Array.from({ length: MAX_VISIBLE_ROWS - destinations.length }).map((_, i) => (
              <div
                key={i}
                className={`${hRow} flex divide-x divide-slate-100 border-b border-slate-100`}
              >
                {dateColumns.map((d) => (
                  <div key={d} className="w-16 bg-slate-50/5"></div>
                ))}
                <div className="w-10 bg-slate-50/10 border-l border-slate-200"></div>
              </div>
            ))}
        </div>

        {/* Footer */}
        <div
          className={`${hFooter} flex border-t border-slate-300 bg-slate-100 font-bold divide-x divide-slate-200`}
        >
          {dateColumns.map((date) => {
            const dayTotal = destinations.reduce(
              (sum, d) => sum + (d.shipmentQtyByDate[date] || 0),
              0,
            );
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
