import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button, Input, Badge } from "@/components/ui";
import { CandidateLotItem } from "@/features/allocations/api";
import { cn } from "@/shared/libs/utils";
import { OrderLine } from "@/shared/types/aliases";
import { formatDate } from "@/shared/utils/date";
import { formatQuantity } from "@/shared/utils/formatQuantity";

interface LotCandidateRowProps {
  lot: CandidateLotItem;
  line: OrderLine;
  currentQty: number;
  allocatedTotal: number;
  requiredQty: number;
  onChangeAllocation: (lineId: number, lotId: number, value: number) => void;
  onSave: () => void;
}

export function LotCandidateRow({
  lot,
  line,
  currentQty,
  allocatedTotal,
  requiredQty,
  onChangeAllocation,
  onSave,
}: LotCandidateRowProps) {
  const [isShaking, setIsShaking] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (isShaking) {
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isShaking]);

  const freeQty = Number(lot.available_quantity ?? 0);
  const remainingInLot = Math.max(0, freeQty - currentQty);
  const isExpired = lot.expiry_date ? new Date(lot.expiry_date) < new Date() : false;
  const isLocked = lot.status === "locked" || lot.status === "quarantine";

  const limit = freeQty;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = Number(value);

    if (value === "") {
      onChangeAllocation(line.id, lot.lot_id, 0);
      setIsConfirmed(false);
      return;
    }

    if (isNaN(numValue)) return;

    if (numValue < 0) {
      setIsShaking(true);
      toast.error("マイナスの数量は入力できません");
      onChangeAllocation(line.id, lot.lot_id, 0);
      setIsConfirmed(false);
      return;
    }

    if (numValue > limit) {
      setIsShaking(true);
      toast.warning(`在庫数量(${freeQty})を超えています`);
      onChangeAllocation(line.id, lot.lot_id, limit);
      setIsConfirmed(false);
      return;
    }

    onChangeAllocation(line.id, lot.lot_id, numValue);
    setIsConfirmed(false);
  };

  const handleFull = () => {
    const otherAllocated = allocatedTotal - currentQty;
    const needed = Math.max(0, requiredQty - otherAllocated);
    const fillQty = Math.min(freeQty, needed);

    if (fillQty === 0 && needed === 0) {
      toast.info("既に必要数を満たしています");
      return;
    }

    onChangeAllocation(line.id, lot.lot_id, fillQty);
    setIsConfirmed(true);
  };

  const handleConfirm = () => {
    if (currentQty > 0) {
      onSave();
      setIsConfirmed(true);
      toast.success("引当を確定しました");
    }
  };

  const handleClear = () => {
    onChangeAllocation(line.id, lot.lot_id, 0);
    setIsConfirmed(false);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-x-4 rounded border bg-white px-4 py-2 text-sm shadow-sm",
        isExpired ? "border-red-200 bg-red-50" : "border-slate-100",
        isLocked && "bg-gray-100",
        freeQty <= 0 && "opacity-50",
      )}
    >
      <LotInfoSection
        lot={lot}
        line={line}
        currentQty={currentQty}
        isLocked={isLocked}
        isExpired={isExpired}
      />

      <LotActionSection
        currentQty={currentQty}
        remainingInLot={remainingInLot}
        freeQty={freeQty}
        line={line}
        limit={limit}
        isConfirmed={isConfirmed}
        isShaking={isShaking}
        isLocked={isLocked}
        onInputChange={handleInputChange}
        onFull={handleFull}
        onConfirm={handleConfirm}
        onClear={handleClear}
      />
    </div>
  );
}

function LotInfoSection({
  lot,
  line,
  currentQty,
  isLocked,
  isExpired,
}: {
  lot: CandidateLotItem;
  line: OrderLine;
  currentQty: number;
  isLocked: boolean;
  isExpired: boolean;
}) {
  const lockReason = lot.lock_reason || (lot.status === "quarantine" ? "検疫中" : "ロック中");
  const freeQty = Number(lot.available_quantity ?? 0);

  return (
    <div className="flex min-w-0 flex-grow items-center gap-x-4">
      <div className="min-w-[120px] shrink-0">
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold text-gray-400">LOT NO</div>
          {currentQty > 0 && (
            <Badge className="h-5 bg-blue-500 px-1.5 text-[11px] font-bold text-white hover:bg-blue-600">
              仮払出
            </Badge>
          )}
          {isLocked && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
              <span className="i-lucide-lock h-3 w-3" />
              {lockReason}
            </div>
          )}
        </div>
        <div className="truncate text-base font-bold text-gray-900" title={lot.lot_number}>
          {lot.lot_number}
        </div>
      </div>

      <div className="h-8 w-px shrink-0 bg-gray-100" />

      <div className="min-w-[150px] shrink-0">
        <div className="text-xs font-bold text-gray-400">物流フロー</div>
        <div className="truncate text-sm text-gray-600">
          <span className="font-medium text-gray-700">
            {lot.warehouse_name || lot.warehouse_code || lot.delivery_place_name || "倉庫未指定"}
          </span>
          <span className="mx-1 text-gray-400">→</span>
          <span>{line.delivery_place_name || line.delivery_place_code || "納入先未指定"}</span>
        </div>
        {isExpired && freeQty > 0 && (
          <div className="mt-0.5 flex items-center text-xs font-medium text-red-500">
            <span className="i-lucide-alert-circle mr-1 h-3 w-3" />
            期限切れ
          </div>
        )}
      </div>

      <div className="h-8 w-px shrink-0 bg-gray-100" />

      <div className="min-w-[80px] shrink-0 flex-grow">
        <div className="text-xs font-bold text-gray-400">有効期限</div>
        <div className="text-sm text-gray-500">
          {formatDate(lot.expiry_date, { fallback: "-" })}
        </div>
      </div>
    </div>
  );
}

interface LotActionSectionProps {
  currentQty: number;
  remainingInLot: number;
  freeQty: number;
  line: OrderLine;
  limit: number;
  isConfirmed: boolean;
  isShaking: boolean;
  isLocked: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFull: () => void;
  onConfirm: () => void;
  onClear: () => void;
}

function LotActionSection({
  currentQty,
  remainingInLot,
  freeQty,
  line,
  limit,
  isConfirmed,
  isShaking,
  isLocked,
  onInputChange,
  onFull,
  onConfirm,
  onClear,
}: LotActionSectionProps) {
  return (
    <div className="flex shrink-0 items-center gap-x-3">
      <div className="min-w-[140px] text-right">
        <div className="text-xs font-bold text-gray-400">残量 / 総量</div>
        <div className="text-sm font-bold text-gray-900">
          {formatQuantity(remainingInLot, line.unit || "PCS")} /{" "}
          {formatQuantity(freeQty, line.unit || "PCS")} {line.unit}
        </div>
      </div>

      <div className="h-8 w-px shrink-0 bg-gray-100" />

      <div className="flex items-center gap-1">
        <Input
          type="number"
          className={cn(
            "h-8 w-20 text-center text-sm font-bold transition-all",
            isConfirmed
              ? "border-blue-600 text-blue-900 ring-2 ring-blue-600/20"
              : currentQty > 0
                ? "border-orange-500 text-orange-700 ring-1 ring-orange-500/20"
                : "border-gray-300 text-gray-900",
            isShaking && "animate-shake border-red-500 text-red-600 ring-red-500",
          )}
          value={currentQty > 0 ? currentQty : ""}
          placeholder="0"
          onChange={onInputChange}
          min={0}
          max={limit}
        />
        <span className="text-xs text-gray-500">{line.unit}</span>
      </div>

      <div className="flex items-center gap-1 rounded-md bg-gray-50 p-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={onFull}
          disabled={freeQty <= 0 || isLocked}
          title="不足分をこのロットで埋める"
        >
          全量
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2 text-xs",
            isConfirmed && "border-blue-300 bg-blue-50 text-blue-700",
          )}
          onClick={onConfirm}
          disabled={currentQty === 0}
        >
          引確
        </Button>

        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 text-gray-500 transition-colors",
            "border border-gray-300 bg-white shadow-sm",
            "hover:border-red-300 hover:bg-red-50 hover:text-red-600",
            currentQty === 0 && "cursor-not-allowed border-gray-200 bg-gray-50 opacity-50",
          )}
          onClick={onClear}
          disabled={currentQty === 0}
          title="クリア"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
