import { Input, Label } from "@/components/ui";
import type { LotUI } from "@/shared/libs/normalize";

interface LotEditFieldsProps {
    initialData: LotUI;
}

// eslint-disable-next-line max-lines-per-function
export function LotEditFields({ initialData }: LotEditFieldsProps) {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <Label htmlFor="lot_number">ロット番号</Label>
                <Input
                    id="lot_number"
                    name="lot_number"
                    defaultValue={initialData.lot_number}
                    disabled
                    className="bg-gray-100"
                />
            </div>

            <div>
                <Label htmlFor="product_code">製品コード</Label>
                <Input
                    id="product_code"
                    name="product_code"
                    defaultValue={initialData.product_code ?? ""}
                    disabled
                    className="bg-gray-100"
                />
            </div>

            <div>
                <Label htmlFor="supplier_name">仕入先</Label>
                <Input
                    id="supplier_name"
                    name="supplier_name"
                    defaultValue={initialData.supplier_name ?? ""}
                    disabled
                    className="bg-gray-100"
                />
            </div>

            <div>
                <Label htmlFor="warehouse_name">倉庫</Label>
                <Input
                    id="warehouse_name"
                    name="warehouse_name"
                    defaultValue={initialData.warehouse_name ?? ""}
                    disabled
                    className="bg-gray-100"
                />
            </div>

            <div>
                <Label htmlFor="quantity">現在数量</Label>
                <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    required
                    min="0"
                    step="0.001"
                    defaultValue={initialData.current_quantity}
                />
            </div>

            <div>
                <Label htmlFor="lot_unit">単位</Label>
                <Input id="lot_unit" name="lot_unit" required defaultValue={initialData.unit} />
            </div>

            <div>
                <Label htmlFor="receipt_date">入荷日</Label>
                <Input
                    id="receipt_date"
                    name="receipt_date"
                    type="date"
                    required
                    defaultValue={initialData.received_date}
                />
            </div>

            <div>
                <Label htmlFor="expiry_date">有効期限</Label>
                <Input
                    id="expiry_date"
                    name="expiry_date"
                    type="date"
                    defaultValue={initialData.expiry_date ?? ""}
                />
            </div>
        </div>
    );
}
