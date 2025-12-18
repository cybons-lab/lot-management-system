import { Controller, type Control, type FieldErrors } from "react-hook-form";

import type { WithdrawalFormData } from "./withdrawalFormSchema";

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import type { LotUI } from "@/shared/libs/normalize";

interface WithdrawalLotSelectionProps {
  control: Control<WithdrawalFormData>;
  errors: FieldErrors<WithdrawalFormData>;
  lots: LotUI[];
  isLoadingLots: boolean;
  preselectedLot?: LotUI | null;
  selectedLot?: LotUI | null;
  availableQuantity: number;
}

export function WithdrawalLotSelection({
  control,
  errors,
  lots,
  isLoadingLots,
  preselectedLot,
  selectedLot,
  availableQuantity,
}: WithdrawalLotSelectionProps) {
  return (
    <div>
      <Label htmlFor="lot_id" className="mb-2 block text-sm font-medium">
        ロット <span className="text-red-500">*</span>
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
        <Controller
          name="lot_id"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : ""}
              onValueChange={(v) => field.onChange(Number(v))}
              disabled={isLoadingLots}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingLots ? "読み込み中..." : "ロットを選択"} />
              </SelectTrigger>
              <SelectContent>
                {lots
                  .filter((lot) => lot.status === "active")
                  .map((lot) => {
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
        />
      )}
      {errors.lot_id && <p className="mt-1 text-sm text-red-600">{errors.lot_id.message}</p>}
      {selectedLot && !preselectedLot && (
        <p className="mt-1 text-sm text-gray-500">
          利用可能数量: <span className="font-semibold">{availableQuantity}</span>
        </p>
      )}
    </div>
  );
}
