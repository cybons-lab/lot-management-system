/**
 * OrdersListPage.tsx
 *
 * 受注一覧画面（リファクタリング版）
 * - カスタムフック化により80行以下に削減
 * - ビューコンポーネント分割
 * - UIコンポーネント分離
 */

import { useNavigate } from "react-router-dom";

import { ErrorState } from "@/features/inventory/components/ErrorState";
import { OrderCreateForm } from "@/features/orders/components/OrderCreateForm";
import { OrdersDeliveryView } from "@/features/orders/components/OrdersDeliveryView";
import { OrdersFilters } from "@/features/orders/components/OrdersFilters";
import { OrdersFlatView } from "@/features/orders/components/OrdersFlatView";
import { OrdersHeader } from "@/features/orders/components/OrdersHeader";
import { OrdersOrderView } from "@/features/orders/components/OrdersOrderView";
import { useOrdersGrouping } from "@/features/orders/hooks/useOrdersGrouping";
import { useOrdersListLogic } from "@/features/orders/hooks/useOrdersListLogic";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { FormDialog } from "@/shared/components/form";

export function OrdersListPage() {
  const navigate = useNavigate();
  const logic = useOrdersListLogic();

  const groups = useOrdersGrouping(
    logic.paginatedLines,
    logic.viewMode === "flat" ? "delivery" : logic.viewMode,
  );

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <OrdersHeader
        confirmedLinesCount={logic.confirmedLines.length}
        isLoading={logic.isLoading}
        onRefresh={logic.refetch}
        onCreateClick={logic.createDialog.open}
        onNavigateToConfirmed={() => navigate("/confirmed-lines")}
      />

      <OrdersFilters filters={logic.filters} viewMode={logic.viewMode} onViewModeChange={logic.setViewMode} />

      <ErrorState error={logic.error} onRetry={logic.refetch} />

      <div className="space-y-4">
        {logic.viewMode === "delivery" && <OrdersDeliveryView groups={groups} />}
        {logic.viewMode === "order" && <OrdersOrderView groups={groups} />}
        {logic.viewMode === "flat" && <OrdersFlatView lines={logic.paginatedLines} isLoading={logic.isLoading} />}

        {!logic.error && logic.sortedLines.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <TablePagination
              currentPage={logic.table.calculatePagination(logic.filteredLines.length).page ?? 1}
              pageSize={logic.table.calculatePagination(logic.filteredLines.length).pageSize ?? 25}
              totalCount={logic.table.calculatePagination(logic.filteredLines.length).totalItems ?? logic.filteredLines.length}
              onPageChange={logic.table.setPage}
              onPageSizeChange={logic.table.setPageSize}
            />
          </div>
        )}
      </div>

      <FormDialog
        open={logic.createDialog.isOpen}
        onClose={logic.createDialog.close}
        title="受注新規登録"
        description="新しい受注を登録します"
        size="lg"
      >
        <OrderCreateForm
          onSubmit={async (data) => {
            await logic.createOrderMutation.mutateAsync(data);
          }}
          onCancel={logic.createDialog.close}
          isSubmitting={logic.createOrderMutation.isPending}
        />
      </FormDialog>
    </div>
  );
}
