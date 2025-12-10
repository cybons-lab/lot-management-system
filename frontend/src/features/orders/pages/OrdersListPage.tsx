/**
 * OrdersListPage.tsx
 *
 * 受注一覧画面（統合版）
 * - 明細一覧として統一表示
 * - 得意先・種別を含む全情報を1テーブルで表示
 */

import { Plus, RefreshCw, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge, Button } from "@/components/ui";
import { ErrorState } from "@/features/inventory/components/ErrorState";
import { OrderCreateForm } from "@/features/orders/components/OrderCreateForm";
import { OrdersFilters } from "@/features/orders/components/OrdersFilters";
import { OrdersFlatView } from "@/features/orders/components/OrdersFlatView";
import { useOrdersListLogic } from "@/features/orders/hooks/useOrdersListLogic";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { FormDialog } from "@/shared/components/form";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function OrdersListPage() {
  const navigate = useNavigate();
  const logic = useOrdersListLogic();

  return (
    <PageContainer>
      <PageHeader
        title="受注管理"
        subtitle="受注明細一覧と引当状況を管理します"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/confirmed-lines")}>
              <Send className="mr-2 h-4 w-4" />
              SAP受注登録
              {logic.confirmedLines.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {logic.confirmedLines.length}
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logic.refetch()}
              disabled={logic.isLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              更新
            </Button>
            <Button size="sm" onClick={logic.createDialog.open}>
              <Plus className="mr-2 h-4 w-4" />
              新規登録
            </Button>
          </div>
        }
      />

      <OrdersFilters filters={logic.filters} />

      <ErrorState error={logic.error} onRetry={logic.refetch} />

      <div className="space-y-4">
        <OrdersFlatView lines={logic.paginatedLines} isLoading={logic.isLoading} />

        {!logic.error && logic.sortedLines.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <TablePagination
              currentPage={logic.table.calculatePagination(logic.filteredLines.length).page ?? 1}
              pageSize={logic.table.calculatePagination(logic.filteredLines.length).pageSize ?? 25}
              totalCount={
                logic.table.calculatePagination(logic.filteredLines.length).totalItems ??
                logic.filteredLines.length
              }
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
    </PageContainer>
  );
}
