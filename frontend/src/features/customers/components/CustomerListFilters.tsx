import * as styles from "../pages/styles";

import { Input, Checkbox } from "@/components/ui";
import { Label } from "@/components/ui/form/label";

interface CustomerListFiltersProps {
  showInactive: boolean;
  setShowInactive: (show: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function CustomerListFilters({
  showInactive,
  setShowInactive,
  searchQuery,
  setSearchQuery,
}: CustomerListFiltersProps) {
  return (
    <div className={styles.tableHeader}>
      <h3 className={styles.tableTitle}>得意先一覧</h3>
      <div className={styles.tableActions}>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={(c) => setShowInactive(c as boolean)}
          />
          <Label htmlFor="show-inactive" className="cursor-pointer text-sm">
            削除済みを表示
          </Label>
        </div>
        <Input
          type="search"
          placeholder="コード・名称で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>
    </div>
  );
}
