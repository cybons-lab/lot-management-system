import { Input, Label } from "@/components/ui";
import type { LotUI } from "@/shared/libs/normalize";

interface LotEditFieldsProps {
  initialData: LotUI;
}

interface LotFieldConfig {
  id: string;
  name: string;
  label: string;
  value: string | number;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
}

function LotField({ field }: { field: LotFieldConfig }) {
  return (
    <div>
      <Label htmlFor={field.id}>{field.label}</Label>
      <Input
        id={field.id}
        name={field.name}
        type={field.type}
        required={field.required}
        defaultValue={field.value}
        disabled={field.disabled}
        className={field.disabled ? "bg-gray-100" : undefined}
      />
      {field.hint && <p className="mt-1 text-xs text-gray-500">{field.hint}</p>}
    </div>
  );
}

export function LotEditFields({ initialData }: LotEditFieldsProps) {
  const fields: LotFieldConfig[] = [
    {
      id: "lot_number",
      name: "lot_number",
      label: "ロット番号",
      value: initialData.lot_number || "",
      disabled: true,
    },
    {
      id: "product_code",
      name: "product_code",
      label: "メーカー品番",
      value: initialData.product_code ?? "",
      disabled: true,
    },
    {
      id: "supplier_name",
      name: "supplier_name",
      label: "仕入先",
      value: initialData.supplier_name ?? "",
      disabled: true,
    },
    {
      id: "warehouse_name",
      name: "warehouse_name",
      label: "倉庫",
      value: initialData.warehouse_name ?? "",
      disabled: true,
    },
    {
      id: "current_quantity",
      name: "current_quantity",
      label: "現在数量（参照のみ）",
      value: initialData.current_quantity,
      type: "text",
      disabled: true,
      hint: "※数量の変更は入出庫操作を通して行ってください",
    },
    {
      id: "lot_unit",
      name: "lot_unit",
      label: "単位",
      value: initialData.unit,
      required: true,
    },
    {
      id: "receipt_date",
      name: "receipt_date",
      label: "入荷日",
      value: initialData.received_date,
      type: "date",
      required: true,
    },
    {
      id: "expiry_date",
      name: "expiry_date",
      label: "有効期限",
      value: initialData.expiry_date ?? "",
      type: "date",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {fields.map((field) => (
        <LotField key={field.id} field={field} />
      ))}
    </div>
  );
}
