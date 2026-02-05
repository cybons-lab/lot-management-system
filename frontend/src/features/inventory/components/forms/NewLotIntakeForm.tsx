/* eslint-disable max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため */
import { Input, Label } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";

interface NewLotIntakeFormProps {
  lotNumber: string;
  setLotNumber: (val: string) => void;
  productId: string;
  setProductId: (val: string) => void;
  warehouseId: string;
  setWarehouseId: (val: string) => void;
  supplierId: string;
  setSupplierId: (val: string) => void;
  newQuantity: string;
  setNewQuantity: (val: string) => void;
  unit: string;
  setUnit: (val: string) => void;
  receivedDate: string;
  setReceivedDate: (val: string) => void;
  expiryDate: string;
  setExpiryDate: (val: string) => void;
  productOptions: { value: string; label: string }[];
  warehouseOptions: { value: string; label: string }[];
  supplierOptions: { value: string; label: string }[];
  isLoadingProducts: boolean;
  isLoadingWarehouses: boolean;
  isLoadingSuppliers: boolean;
  isSubmitting: boolean;
  /** Whether supplier was auto-selected from row context */
  hasInitialSupplier?: boolean;
}

export function NewLotIntakeForm({
  lotNumber,
  setLotNumber,
  productId,
  setProductId,
  warehouseId,
  setWarehouseId,
  supplierId,
  setSupplierId,
  newQuantity,
  setNewQuantity,
  unit,
  setUnit,
  receivedDate,
  setReceivedDate,
  expiryDate,
  setExpiryDate,
  productOptions,
  warehouseOptions,
  supplierOptions,
  isLoadingProducts,
  isLoadingWarehouses,
  isLoadingSuppliers,
  isSubmitting,
  hasInitialSupplier = false,
}: NewLotIntakeFormProps) {
  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="text-xs text-slate-500">ロット番号は未入力の場合に自動採番されます。</div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="lot_number">ロット番号</Label>
          <Input
            id="lot_number"
            value={lotNumber}
            onChange={(e) => setLotNumber(e.target.value)}
            placeholder="未入力で自動採番"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <Label className="mb-2 block">製品 *</Label>
          <SearchableSelect
            options={productOptions}
            value={productId}
            onChange={setProductId}
            placeholder={isLoadingProducts ? "読み込み中..." : "製品を選択"}
            disabled={isLoadingProducts || isSubmitting}
          />
        </div>
        <div>
          <Label className="mb-2 block">倉庫 *</Label>
          <SearchableSelect
            options={warehouseOptions}
            value={warehouseId}
            onChange={setWarehouseId}
            placeholder={isLoadingWarehouses ? "読み込み中..." : "倉庫を選択"}
            disabled={isLoadingWarehouses || isSubmitting}
          />
        </div>
        <div>
          <Label className="mb-2 block">仕入先</Label>
          <SearchableSelect
            options={supplierOptions}
            value={supplierId}
            onChange={setSupplierId}
            placeholder={isLoadingSuppliers ? "読み込み中..." : "仕入先を選択"}
            disabled={isLoadingSuppliers || isSubmitting}
          />
          {!hasInitialSupplier && !supplierId && supplierOptions.length > 1 && (
            <p className="mt-1 text-xs text-amber-600">
              この組み合わせには複数の仕入先があります。選択してください。
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="new_quantity">入庫数量 *</Label>
          <Input
            id="new_quantity"
            type="number"
            min="0"
            step="0.001"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <Label htmlFor="unit">単位 *</Label>
          <Input
            id="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <Label htmlFor="received_date">入庫日 *</Label>
          <Input
            id="received_date"
            type="date"
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <Label htmlFor="expiry_date">有効期限</Label>
          <Input
            id="expiry_date"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
