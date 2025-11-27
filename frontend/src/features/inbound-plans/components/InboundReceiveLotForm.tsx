import { Input } from "@/components/ui/input";

interface LotFormItem {
    expected_lot_id: number;
    product_name: string;
    planned_quantity: number;
    unit: string;
}

interface InboundReceiveLotFormProps {
    lot: LotFormItem;
    index: number;
    value: string;
    onChange: (value: string) => void;
}

export function InboundReceiveLotForm({ lot, index, value, onChange }: InboundReceiveLotFormProps) {
    return (
        <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-medium">{lot.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                        数量: {lot.planned_quantity} {lot.unit}
                    </p>
                </div>
                <span className="text-sm text-muted-foreground">#{index + 1}</span>
            </div>

            <div>
                <div>
                    <label htmlFor={`lot-number-${lot.expected_lot_id}`} className="text-sm font-medium">
                        ロット番号 <span className="text-red-500">*</span>
                    </label>
                    <Input
                        id={`lot-number-${lot.expected_lot_id}`}
                        placeholder="ロット番号を入力"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="mt-1"
                    />
                </div>
            </div>
        </div>
    );
}
