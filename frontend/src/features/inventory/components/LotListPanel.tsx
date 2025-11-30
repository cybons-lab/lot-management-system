import { Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui";
import { ErrorState } from "@/features/inventory/components/ErrorState";
import { LotDialogs } from "@/features/inventory/components/LotDialogs";
import { LotGroupedView } from "@/features/inventory/components/LotGroupedView";
import { LotsPageFilters } from "@/features/inventory/components/LotsPageFilters";
import { LotStatsCards } from "@/features/inventory/components/LotStatsCards";
import { useLotColumns } from "@/features/inventory/hooks/useLotColumns";
import { useLotListLogic } from "@/features/inventory/hooks/useLotListLogic";
import { useLotStats } from "@/features/inventory/hooks/useLotStats";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { getLotStatuses } from "@/shared/utils/status";

export function LotListPanel() {
  const logic = useLotListLogic();
  const stats = useLotStats(logic.allLots);
  const columns = useLotColumns({
    viewMode: "grouped",
    onEdit: logic.handleEdit,
    onLock: logic.handleLock,
    onUnlock: logic.handleUnlock,
  });

  const handleToggleGroup = (key: string) => {
    const newExpanded = new Set(logic.expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    logic.setExpandedGroups(newExpanded);
  };

  const getRowClassName = (lot: Parameters<typeof getLotStatuses>[0]) => {
    const statuses = getLotStatuses(lot);
    return statuses.includes("locked") ? "opacity-50" : "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => logic.refetch()} disabled={logic.isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          更新
        </Button>
        <Button size="sm" onClick={logic.createDialog.open}>
          <Plus className="mr-2 h-4 w-4" />
          新規登録
        </Button>
      </div>

      <LotStatsCards stats={stats} />

      <LotsPageFilters
        filters={logic.filters}
        onFilterChange={logic.handleFilterChange}
        onReset={logic.handleResetFilters}
        searchTerm={logic.searchTerm}
        onSearchChange={logic.setSearchTerm}
        isAdvancedOpen={logic.isAdvancedFilterOpen}
        onToggleAdvanced={() => logic.setIsAdvancedFilterOpen(!logic.isAdvancedFilterOpen)}
      />

      <ErrorState error={logic.error} onRetry={() => logic.refetch()} />

      <LotGroupedView
        groups={logic.groupedLots}
        columns={columns}
        expandedGroups={logic.expandedGroups}
        onToggleGroup={handleToggleGroup}
        tableSettings={logic.tableSettings}
        isLoading={logic.isLoading}
        getRowClassName={getRowClassName}
      />

      {!logic.isLoading && !logic.error && logic.sortedLots.length > 0 && (
        <TablePagination
          currentPage={(logic.tableSettings.page ?? 0) + 1}
          pageSize={logic.tableSettings.pageSize ?? 25}
          totalCount={logic.sortedLots.length}
          onPageChange={(page) => logic.setTableSettings({ ...logic.tableSettings, page: page - 1 })}
          onPageSizeChange={(pageSize) =>
            logic.setTableSettings({ ...logic.tableSettings, pageSize, page: 0 })
          }
        />
      )}

      <LotDialogs logic={logic} />
    </div>
  );
}
