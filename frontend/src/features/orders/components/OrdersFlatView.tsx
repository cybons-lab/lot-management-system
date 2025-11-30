import { orderLineColumns } from "@/features/orders/components/OrderLineColumns";
import type { OrderLineRow } from "@/features/orders/hooks/useOrderLines";
import { DataTable } from "@/shared/components/data/DataTable";

interface OrdersFlatViewProps {
    lines: OrderLineRow[];
    isLoading: boolean;
}

/**
 * フラット表示ビュー（1行単位）
 */
export function OrdersFlatView({ lines, isLoading }: OrdersFlatViewProps) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <DataTable data={lines} columns={orderLineColumns} isLoading={isLoading} emptyMessage="明細がありません" />
        </div>
    );
}
