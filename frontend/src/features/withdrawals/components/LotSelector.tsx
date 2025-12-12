/**
 * LotSelector - Lot selection component for withdrawal form
 *
 * Shows either:
 * - Preselected lot info (when navigating from lot detail page)
 * - Lot dropdown with filtered options
 */

import { Label } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import type { LotUI } from "@/shared/libs/normalize";

interface LotSelectorProps {
  preselectedLot?: LotUI | null;
  filteredLots: LotUI[];
  selectedLotId: number;
  availableQuantity: number;
  isLoading: boolean;
  error?: string;
  onLotChange: (lotId: number) => void;
}

export function LotSelector({
  preselectedLot,
  filteredLots,
  selectedLotId,
  availableQuantity,
  isLoading,
  error,
  onLotChange,
}: LotSelectorProps) {
  const selectedLot = filteredLots.find((l) => l.lot_id === selectedLotId);

  return (
    <div>
      <Label htmlFor="lot_id" className="mb-2 block text-sm font-medium">
        ロット番号 <span className="text-red-500">*</span>
      </Label>
      {preselectedLot ? (
        <div className="rounded-md border bg-gray-50 p-3">
          <div className="font-medium">{preselectedLot.lot_number}</div>
          <div className="text-sm text-gray-600">
            {preselectedLot.product_name} ({preselectedLot.product_code})
          </div>
          <div className="mt-1 text-sm">
            利用可能: <span className="font-semibold">{availableQuantity}</span>
          </div>
        </div>
      ) : (
        <Select
          value={selectedLotId ? String(selectedLotId) : ""}
          onValueChange={(v) => onLotChange(Number(v))}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={isLoading ? "読み込み中..." : "ロットを選択"} />
          </SelectTrigger>
          <SelectContent>
            {filteredLots.map((lot) => {
              const avail =
                Number(lot.current_quantity) -
                Number(lot.allocated_quantity) -
                Number(lot.locked_quantity || 0);
              return (
                <SelectItem key={lot.lot_id} value={String(lot.lot_id)} disabled={avail <= 0}>
                  {lot.lot_number} - {lot.product_name} (利用可能: {avail})
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {selectedLot && !preselectedLot && (
        <p className="mt-1 text-sm text-gray-500">
          利用可能数量: <span className="font-semibold">{availableQuantity}</span>
        </p>
      )}
    </div>
  );
}
