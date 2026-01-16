import { Input, Label } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";

interface LotInfo {
  current_quantity: number | string;
  unit: string;
}

interface ExistingLotIntakeFormProps {
  existingLotId: string;
  setExistingLotId: (id: string) => void;
  existingQuantity: string;
  setExistingQuantity: (qty: string) => void;
  existingDate: string;
  setExistingDate: (date: string) => void;
  lotOptions: { value: string; label: string }[];
  selectedLot: LotInfo | undefined;
  isLoadingLots: boolean;
  isSubmitting: boolean;
}

export function ExistingLotIntakeForm({
  existingLotId,
  setExistingLotId,
  existingQuantity,
  setExistingQuantity,
  existingDate,
  setExistingDate,
  lotOptions,
  selectedLot,
  isLoadingLots,
  isSubmitting,
}: ExistingLotIntakeFormProps) {
  return (
    <div className="space-y-4 rounded-md border p-4">
      <div>
        <Label className="mb-2 block">ロット</Label>
        <SearchableSelect
          options={lotOptions}
          value={existingLotId}
          onChange={setExistingLotId}
          placeholder={isLoadingLots ? "読み込み中..." : "ロットを選択"}
          disabled={isLoadingLots || isSubmitting}
        />
        {selectedLot && (
          <div className="mt-2 text-xs text-slate-500">
            現在在庫: {selectedLot.current_quantity} {selectedLot.unit}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="existing_quantity">追加入庫数量 *</Label>
          <Input
            id="existing_quantity"
            type="number"
            min="0"
            step="0.001"
            value={existingQuantity}
            onChange={(e) => setExistingQuantity(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <Label htmlFor="existing_date">入庫日 *</Label>
          <Input
            id="existing_date"
            type="date"
            value={existingDate}
            onChange={(e) => setExistingDate(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
