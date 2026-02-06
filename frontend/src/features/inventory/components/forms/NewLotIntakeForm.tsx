import { Input, Label } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";

type SelectOption = { value: string; label: string };

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
  productOptions: SelectOption[];
  warehouseOptions: SelectOption[];
  supplierOptions: SelectOption[];
  isLoadingProducts: boolean;
  isLoadingWarehouses: boolean;
  isLoadingSuppliers: boolean;
  isSubmitting: boolean;
  hasInitialSupplier?: boolean;
}

interface SelectFieldProps {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
}

function SelectField({ label, options, value, onChange, placeholder, disabled }: SelectFieldProps) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <SearchableSelect
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

interface InputFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  type?: string;
  placeholder?: string;
  min?: string;
  step?: string;
  className?: string;
}

function InputField({
  id,
  label,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
  min,
  step,
  className,
}: InputFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

interface SupplierFieldProps {
  supplierOptions: SelectOption[];
  supplierId: string;
  setSupplierId: (value: string) => void;
  hasInitialSupplier: boolean;
  isLoadingSuppliers: boolean;
  isSubmitting: boolean;
}

function SupplierField({
  supplierOptions,
  supplierId,
  setSupplierId,
  hasInitialSupplier,
  isLoadingSuppliers,
  isSubmitting,
}: SupplierFieldProps) {
  const showWarning = !hasInitialSupplier && !supplierId && supplierOptions.length > 1;

  return (
    <div>
      <Label className="mb-2 block">仕入先</Label>
      <SearchableSelect
        options={supplierOptions}
        value={supplierId}
        onChange={setSupplierId}
        placeholder={isLoadingSuppliers ? "読み込み中..." : "仕入先を選択"}
        disabled={isLoadingSuppliers || isSubmitting}
      />
      {showWarning && (
        <p className="mt-1 text-xs text-amber-600">
          この組み合わせには複数の仕入先があります。選択してください。
        </p>
      )}
    </div>
  );
}

type NewLotIntakeFieldsProps = NewLotIntakeFormProps & { hasInitialSupplier: boolean };

function LotSelectionFields({
  lotNumber,
  productId,
  warehouseId,
  supplierId,
  productOptions,
  warehouseOptions,
  supplierOptions,
  isLoadingProducts,
  isLoadingWarehouses,
  isLoadingSuppliers,
  isSubmitting,
  hasInitialSupplier,
  setLotNumber,
  setProductId,
  setWarehouseId,
  setSupplierId,
}: NewLotIntakeFieldsProps) {
  return (
    <>
      <InputField
        id="lot_number"
        className="col-span-2"
        label="ロット番号"
        value={lotNumber}
        onChange={setLotNumber}
        placeholder="未入力で自動採番"
        disabled={isSubmitting}
      />

      <SelectField
        label="製品 *"
        options={productOptions}
        value={productId}
        onChange={setProductId}
        placeholder={isLoadingProducts ? "読み込み中..." : "製品を選択"}
        disabled={isLoadingProducts || isSubmitting}
      />

      <SelectField
        label="倉庫 *"
        options={warehouseOptions}
        value={warehouseId}
        onChange={setWarehouseId}
        placeholder={isLoadingWarehouses ? "読み込み中..." : "倉庫を選択"}
        disabled={isLoadingWarehouses || isSubmitting}
      />

      <SupplierField
        supplierOptions={supplierOptions}
        supplierId={supplierId}
        setSupplierId={setSupplierId}
        hasInitialSupplier={hasInitialSupplier}
        isLoadingSuppliers={isLoadingSuppliers}
        isSubmitting={isSubmitting}
      />
    </>
  );
}

function LotQuantityFields({
  newQuantity,
  unit,
  receivedDate,
  expiryDate,
  isSubmitting,
  setNewQuantity,
  setUnit,
  setReceivedDate,
  setExpiryDate,
}: NewLotIntakeFieldsProps) {
  return (
    <>
      <InputField
        id="new_quantity"
        label="入庫数量 *"
        type="number"
        min="0"
        step="0.001"
        value={newQuantity}
        onChange={setNewQuantity}
        disabled={isSubmitting}
      />

      <InputField
        id="unit"
        label="単位 *"
        value={unit}
        onChange={setUnit}
        disabled={isSubmitting}
      />

      <InputField
        id="received_date"
        label="入庫日 *"
        type="date"
        value={receivedDate}
        onChange={setReceivedDate}
        disabled={isSubmitting}
      />

      <InputField
        id="expiry_date"
        label="有効期限"
        type="date"
        value={expiryDate}
        onChange={setExpiryDate}
        disabled={isSubmitting}
      />
    </>
  );
}

function NewLotIntakeFields(props: NewLotIntakeFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <LotSelectionFields {...props} />
      <LotQuantityFields {...props} />
    </div>
  );
}

export function NewLotIntakeForm(props: NewLotIntakeFormProps) {
  const hasInitialSupplier = props.hasInitialSupplier ?? false;

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="text-xs text-slate-500">ロット番号は未入力の場合に自動採番されます。</div>
      <NewLotIntakeFields {...props} hasInitialSupplier={hasInitialSupplier} />
    </div>
  );
}
