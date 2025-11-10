import { X, Plus, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WarehouseAllocation {
  warehouse_code: string;
  quantity: number;
}

interface WarehouseAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (allocations: WarehouseAllocation[]) => void;
  productCode: string;
  totalQuantity: number;
  unit: string;
  initialAllocations?: WarehouseAllocation[];
  availableWarehouses: Array<{ code: string; name: string }>;
}

export function WarehouseAllocationModal({
  isOpen,
  onClose,
  onSave,
  productCode,
  totalQuantity,
  unit,
  initialAllocations = [],
  availableWarehouses,
}: WarehouseAllocationModalProps) {
  const [allocations, setAllocations] = useState<WarehouseAllocation[]>(
    initialAllocations.length > 0 ? initialAllocations : [],
  );

  useEffect(() => {
    if (initialAllocations.length > 0) {
      setAllocations(initialAllocations);
    }
  }, [initialAllocations]);

  const handleAdd = () => {
    setAllocations([...allocations, { warehouse_code: "", quantity: 0 }]);
  };

  const handleRemove = (index: number) => {
    setAllocations(allocations.filter((_: WarehouseAllocation, i: number) => i !== index));
  };

  const handleWarehouseChange = (index: number, warehouseCode: string) => {
    const newAllocations = [...allocations];
    newAllocations[index].warehouse_code = warehouseCode;
    setAllocations(newAllocations);
  };

  const handleQuantityChange = (index: number, quantity: string) => {
    const newAllocations = [...allocations];
    newAllocations[index].quantity = parseFloat(quantity) || 0;
    setAllocations(newAllocations);
  };

  const allocatedTotal = allocations.reduce(
    (sum: number, alloc: WarehouseAllocation) => sum + alloc.quantity,
    0,
  );
  const isValid = Math.abs(allocatedTotal - totalQuantity) < 0.01; // 浮動小数点誤差を考慮
  const usedWarehouses = new Set(allocations.map((a: WarehouseAllocation) => a.warehouse_code));

  const handleSave = () => {
    if (isValid) {
      onSave(allocations);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>倉庫別数量編集</DialogTitle>
          <DialogDescription>
            製品の総数量を複数の倉庫に割り当てます。割当合計が総数量と一致する必要があります。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ヘッダー情報 */}
          <div className="bg-muted grid grid-cols-2 gap-4 rounded-lg p-4">
            <div>
              <p className="text-muted-foreground text-sm">品番</p>
              <p className="font-medium">{productCode}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">総数量</p>
              <p className="font-medium">
                {totalQuantity.toLocaleString()} {unit}
              </p>
            </div>
          </div>

          {/* 倉庫割当テーブル */}
          <div className="rounded-lg border">
            <div className="bg-muted/50 grid grid-cols-12 gap-2 border-b p-3 text-sm font-medium">
              <div className="col-span-5">倉庫</div>
              <div className="col-span-3">数量</div>
              <div className="col-span-2">単位</div>
              <div className="col-span-2">操作</div>
            </div>

            <div className="space-y-2 p-3">
              {allocations.map((allocation: WarehouseAllocation, index: number) => (
                <div key={index} className="grid grid-cols-12 items-center gap-2">
                  <div className="col-span-5">
                    <Select
                      value={allocation.warehouse_code}
                      onValueChange={(value: string) => handleWarehouseChange(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="倉庫を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableWarehouses.map((wh) => (
                          <SelectItem
                            key={wh.code}
                            value={wh.code}
                            disabled={
                              usedWarehouses.has(wh.code) && allocation.warehouse_code !== wh.code
                            }
                          >
                            {wh.code} - {wh.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      step="0.01"
                      value={allocation.quantity || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleQuantityChange(index, e.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-sm">{unit}</span>
                  </div>
                  <div className="col-span-2">
                    <Button variant="ghost" size="sm" onClick={() => handleRemove(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {allocations.length === 0 && (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  倉庫を追加してください
                </div>
              )}
            </div>

            <div className="border-t p-3">
              <Button variant="outline" size="sm" onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                倉庫を追加
              </Button>
            </div>
          </div>

          {/* 合計チェック */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">割当合計:</span>
              <span
                className={`text-lg font-bold ${isValid ? "text-green-600" : "text-destructive"}`}
              >
                {allocatedTotal.toLocaleString()} {unit} / {totalQuantity.toLocaleString()} {unit}
                {isValid ? " ✓" : ""}
              </span>
            </div>
            {!isValid && (
              <div className="text-destructive mt-2 flex items-start gap-2 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <span>
                  割当合計が総数量と一致していません。差分:{" "}
                  {Math.abs(allocatedTotal - totalQuantity).toLocaleString()} {unit}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
