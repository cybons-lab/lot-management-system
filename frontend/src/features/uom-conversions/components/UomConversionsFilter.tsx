import { Filter, X } from "lucide-react";

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
} from "@/components/ui";
import { Label } from "@/components/ui/form/label";

interface UomConversionsFilterProps {
  suppliers: { id: number; supplier_code: string; supplier_name: string }[];
  selectedSupplierId: string;
  onSelectedSupplierIdChange: (val: string) => void;
  showInactive: boolean;
  onShowInactiveChange: (val: boolean) => void;
  displayCount: number;
  totalCount: number;
}

export function UomConversionsFilter({
  suppliers,
  selectedSupplierId,
  onSelectedSupplierIdChange,
  showInactive,
  onShowInactiveChange,
  displayCount,
  totalCount,
}: UomConversionsFilterProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-slate-500" />
        <span className="text-sm font-medium">仕入先で絞り込み:</span>
      </div>
      <div className="w-[300px]">
        <Select value={selectedSupplierId} onValueChange={onSelectedSupplierIdChange}>
          <SelectTrigger>
            <SelectValue placeholder="仕入先を選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべての仕入先</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.supplier_code} - {s.supplier_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedSupplierId !== "all" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelectedSupplierIdChange("all")}
          className="h-8 px-2 text-slate-500"
        >
          <X className="mr-1 h-3 w-3" />
          解除
        </Button>
      )}
      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={(checked) => onShowInactiveChange(checked as boolean)}
          />
          <Label htmlFor="show-inactive" className="cursor-pointer text-sm">
            削除済みを表示
          </Label>
        </div>
        <div className="text-sm text-slate-500">
          表示中: {displayCount} / {totalCount} 件
        </div>
      </div>
    </div>
  );
}
