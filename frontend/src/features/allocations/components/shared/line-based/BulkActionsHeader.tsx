import { Button } from "../../../../../components/ui";
import * as styles from "../LineBasedAllocationList.styles";

export function BulkActionsHeader({
    selectedCount,
    onSelectAll,
    onDeselectAll,
    onBulkSave,
}: {
    selectedCount: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onBulkSave: () => void;
}) {
    return (
        <div className={styles.bulkActionsHeader}>
            <div className={styles.bulkActionsLeft}>
                <span className={styles.bulkActionsLabel}>一括操作:</span>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onSelectAll}
                    className="h-8 text-xs"
                >
                    <span className="i-lucide-check-square mr-1.5 h-4 w-4" />
                    全選択
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onDeselectAll}
                    disabled={selectedCount === 0}
                    className="h-8 text-xs"
                >
                    <span className="i-lucide-square mr-1.5 h-4 w-4" />
                    選択解除
                </Button>
            </div>
            <div className={styles.bulkActionsRight}>
                <span className={styles.bulkActionsSelectedCount}>{selectedCount} 件選択中</span>
                <Button
                    type="button"
                    onClick={onBulkSave}
                    disabled={selectedCount === 0}
                    className="h-8 bg-blue-600 text-xs font-bold hover:bg-blue-700"
                >
                    <span className="i-lucide-save mr-1.5 h-4 w-4" />
                    選択した行を一括保存
                </Button>
            </div>
        </div>
    );
}
