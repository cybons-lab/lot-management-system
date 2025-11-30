import { ProductGroupHeader } from "@/features/inventory/components/ProductGroupHeader";
import type { useLotListLogic } from "@/features/inventory/hooks/useLotListLogic";
import type { ProductGroup } from "@/features/inventory/utils/groupLots";
import { DataTable, type Column } from "@/shared/components/data/DataTable";
import type { LotUI } from "@/shared/libs/normalize";

interface LotGroupedViewProps {
    groups: ProductGroup[];
    columns: Column<LotUI>[];
    expandedGroups: Set<string>;
    onToggleGroup: (key: string) => void;
    tableSettings: ReturnType<typeof useLotListLogic>["tableSettings"];
    isLoading: boolean;
    getRowClassName: (lot: LotUI) => string;
}

export function LotGroupedView({
    groups,
    columns,
    expandedGroups,
    onToggleGroup,
    tableSettings,
    isLoading,
    getRowClassName,
}: LotGroupedViewProps) {
    return (
        <div className="space-y-6">
            {groups.map((group) => {
                const isExpanded = expandedGroups.has(group.key);
                return (
                    <div
                        key={group.key}
                        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                    >
                        <ProductGroupHeader
                            productCode={group.productCode}
                            productName={group.productName}
                            supplierName={group.supplierName}
                            totalCurrentQuantity={group.totalCurrentQuantity}
                            lotCount={group.lotCount}
                            minExpiryDate={group.minExpiryDate}
                            isExpanded={isExpanded}
                            onToggle={() => onToggleGroup(group.key)}
                        />
                        {isExpanded && (
                            <DataTable
                                data={group.lots}
                                columns={columns}
                                sort={
                                    tableSettings.sortColumn && tableSettings.sortDirection
                                        ? {
                                            column: tableSettings.sortColumn,
                                            direction: tableSettings.sortDirection,
                                        }
                                        : undefined
                                }
                                isLoading={isLoading}
                                emptyMessage="ロットがありません。"
                                getRowClassName={getRowClassName}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
