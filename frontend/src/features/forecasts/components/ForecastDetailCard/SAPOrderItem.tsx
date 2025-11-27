import { Badge } from "@/components/ui";

interface OrderItem {
    id: number;
    order_number?: string;
    quantity: number | string;
    unit?: string;
    delivery_date: string;
    allocation_status?: string;
    sap_order_number?: string | null;
}

interface SAPOrderItemProps {
    order: OrderItem;
    isSelected: boolean;
    onToggle: (checked: boolean) => void;
}

export function SAPOrderItem({ order, isSelected, onToggle }: SAPOrderItemProps) {
    return (
        <div className="flex items-center gap-3 rounded-md border border-orange-200 bg-white p-2">
            <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onToggle(e.target.checked)}
                className="h-4 w-4"
            />
            <div className="flex-1 text-sm">
                <div className="font-medium">受注番号: {order.order_number || `ID: ${order.id}`}</div>
                <div className="text-xs text-gray-600">
                    数量: {Number(order.quantity).toLocaleString()} {order.unit || "EA"} | 納期:{" "}
                    {new Date(order.delivery_date).toLocaleDateString("ja-JP")}
                </div>
            </div>
            <Badge
                variant={order.allocation_status === "ALLOCATED" ? "default" : "secondary"}
                className="text-xs"
            >
                {order.allocation_status === "ALLOCATED" ? "引当済" : "未引当"}
            </Badge>
        </div>
    );
}
