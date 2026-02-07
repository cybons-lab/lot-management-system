import { Trash2 } from "lucide-react";

import { type WarehouseWithValidTo } from "../pages/columns";
import * as styles from "../pages/styles";


import { Input, Checkbox, Button } from "@/components/ui";
import { Label } from "@/components/ui/form/label";
import { DataTable } from "@/shared/components/data/DataTable";

interface WarehouseTableSectionProps {
    p: any;
    cols: any;
}

export function WarehouseTableSection({ p, cols }: WarehouseTableSectionProps) {
    return (
        <div className={styles.tableContainer}>
            <div className={styles.tableHeader}>
                <h3 className={styles.tableTitle}>倉庫一覧</h3>
                <div className={styles.tableActions}>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="show-inactive" checked={p.showInactive} onCheckedChange={(c) => p.setShowInactive(c as boolean)} />
                        <Label htmlFor="show-inactive" className="cursor-pointer text-sm">削除済みを表示</Label>
                    </div>
                    <Input type="search" placeholder="コード・名称で検索..." value={p.searchQuery} onChange={(e) => p.setSearchQuery(e.target.value)} className={styles.searchInput} />
                </div>
            </div>

            {p.selectedIds.length > 0 && (
                <div className={`flex items-center justify-between rounded-lg border p-3 ${p.isAdmin ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                    <span className={`text-sm font-medium ${p.isAdmin ? "text-red-800" : "text-amber-800"}`}>{p.selectedIds.length} 件選択中</span>
                    <Button variant={p.isAdmin ? "destructive" : "outline"} size="sm" onClick={() => p.setIsBulkOpen(true)} className={!p.isAdmin ? "border-amber-600 text-amber-700 hover:bg-amber-100" : ""}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        {p.isAdmin ? "一括削除" : "一括無効化"}
                    </Button>
                </div>
            )}

            <DataTable data={p.sorted as WarehouseWithValidTo[]} columns={cols} sort={p.sort} onSortChange={p.setSort} getRowId={(r) => r.warehouse_code} onRowClick={p.handleRowClick} isLoading={p.list.isLoading} emptyMessage="倉庫が登録されていません" selectable selectedIds={p.selectedIds} onSelectionChange={p.setSelectedIds} />
        </div>
    );
}
