/**
 * LotSelector - Lot selection component for withdrawal form
 *
 * Shows either:
 * - Preselected lot info (when navigating from lot detail page)
 * - Lot dropdown with filtered options
 */

import { Label } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
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
        <SearchableSelect
          options={filteredLots.map((lot) => {
            const avail =
              Number(lot.current_quantity) -
              Number(lot.allocated_quantity) -
              Number(lot.locked_quantity || 0);
            return {
              value: String(lot.lot_id),
              label: `${lot.lot_number} - ${lot.product_name} (利用可能: ${avail})`,
            };
          })}
          value={selectedLotId ? String(selectedLotId) : ""}
          onChange={(v) => onLotChange(Number(v))}
          placeholder={isLoading ? "読み込み中..." : "ロットを検索..."}
          disabled={isLoading}
        />
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
