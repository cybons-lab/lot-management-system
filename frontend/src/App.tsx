import { Route, Routes, Navigate } from "react-router-dom";

// Route constants
import { ROUTES, LEGACY_ROUTES } from "@/constants/routes";

// Pages - all imported from features (Phase A cleanup)
import { AdminPage } from "@/features/admin/pages/AdminPage";
import { MasterChangeLogsPage } from "@/features/admin/pages/MasterChangeLogsPage";
import { SeedSnapshotsPage } from "@/features/admin/pages/SeedSnapshotsPage";
import { AdjustmentCreatePage } from "@/features/adjustments/pages/AdjustmentCreatePage";
import { AdjustmentsListPage } from "@/features/adjustments/pages/AdjustmentsListPage";
import { LotAllocationPage } from "@/features/allocations/pages/LotAllocationPage";
import { AllocationSuggestionsPage } from "@/features/allocations/pages/AllocationSuggestionsPage";
import { CustomerItemsListPage } from "@/features/customer-items/pages/CustomerItemsListPage";
import { CustomersPage } from "@/features/customers/pages/CustomersPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { ForecastCreatePage } from "@/features/forecasts/pages/ForecastCreatePage";
import { ForecastDetailPage } from "@/features/forecasts/pages/ForecastDetailPage";
import { ForecastEditPage } from "@/features/forecasts/pages/ForecastEditPage";
import { ForecastImportPage } from "@/features/forecasts/pages/ForecastImportPage";
import { ForecastListPage } from "@/features/forecasts/pages/ForecastListPage";
import { InboundPlanCreatePage } from "@/features/inbound-plans/pages/InboundPlanCreatePage";
import { InboundPlanDetailPage } from "@/features/inbound-plans/pages/InboundPlanDetailPage";
import { InboundPlanEditPage } from "@/features/inbound-plans/pages/InboundPlanEditPage";
import { InboundPlansListPage } from "@/features/inbound-plans/pages/InboundPlansListPage";
import { InventoryItemDetailPage } from "@/features/inventory/pages/InventoryItemDetailPage";
import { InventoryLayout } from "@/features/inventory/pages/InventoryLayout";
import { LotDetailPage } from "@/features/inventory/pages/LotDetailPage";
import { LotsPage } from "@/features/inventory/pages/LotsPage";
import { MovesPage } from "@/features/inventory/pages/MovesPage";
import { SummaryPage } from "@/features/inventory/pages/SummaryPage";
import { MastersBulkLoadPage } from "@/features/masters/pages/MastersBulkLoadPage";
import { OrderDetailPage } from "@/features/orders/pages/OrderDetailPage";
import { OrdersListPage } from "@/features/orders/pages/OrdersListPage";
import { ProductsPage } from "@/features/products/pages/ProductsPage";
import { SuppliersPage } from "@/features/suppliers/pages/SuppliersPage";
import { WarehousesPage } from "@/features/warehouses/pages/WarehousesPage";
import { BatchJobsPage } from "@/features/batch-jobs/pages/BatchJobsPage";
import { BusinessRulesPage } from "@/features/business-rules/pages/BusinessRulesPage";
import { OperationLogsPage } from "@/features/operation-logs/pages/OperationLogsPage";
import { RolesListPage } from "@/features/roles/pages/RolesListPage";
import { UsersListPage } from "@/features/users/pages/UsersListPage";
import { UserDetailPage } from "@/features/users/pages/UserDetailPage";
import { TopNavLayout } from "@/layouts/TopNavLayout";

function App() {
  return (
    <TopNavLayout>
      <Routes>
        {/* Root */}
        <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />

        {/* Orders */}
        <Route path={ROUTES.ORDERS.LIST} element={<OrdersListPage />} />
        <Route path="/orders/:orderId" element={<OrderDetailPage />} />

        {/* Allocations */}
        <Route path={ROUTES.ALLOCATIONS.INDEX} element={<LotAllocationPage />} />
        <Route path={ROUTES.ALLOCATIONS.SUGGESTIONS} element={<AllocationSuggestionsPage />} />

        {/* Forecasts - New structure (v2.2 - Phase B) */}
        <Route path={ROUTES.FORECASTS.LIST} element={<ForecastListPage />} />
        <Route path={ROUTES.FORECASTS.NEW} element={<ForecastCreatePage />} />
        <Route path="/forecasts/:id" element={<ForecastDetailPage />} />
        <Route path="/forecasts/:forecastId/edit" element={<ForecastEditPage />} />
        <Route path={ROUTES.FORECASTS.IMPORT} element={<ForecastImportPage />} />

        {/* Legacy forecast routes - Redirect to new structure */}
        <Route
          path={LEGACY_ROUTES.FORECAST}
          element={<Navigate to={ROUTES.FORECASTS.IMPORT} replace />}
        />
        <Route
          path={LEGACY_ROUTES.FORECAST_LIST}
          element={<Navigate to={ROUTES.FORECASTS.LIST} replace />}
        />

        {/* Inbound Plans - New (v2.2 - Phase C) */}
        <Route path={ROUTES.INBOUND_PLANS.LIST} element={<InboundPlansListPage />} />
        <Route path={ROUTES.INBOUND_PLANS.NEW} element={<InboundPlanCreatePage />} />
        <Route path="/inbound-plans/:id" element={<InboundPlanDetailPage />} />
        <Route path="/inbound-plans/:planId/edit" element={<InboundPlanEditPage />} />

        {/* Inventory routes with nested children */}
        <Route path={ROUTES.INVENTORY.ROOT} element={<InventoryLayout />}>
          <Route index element={<Navigate to={ROUTES.INVENTORY.SUMMARY} replace />} />
          <Route path="summary" element={<SummaryPage />} />
          <Route path="lots" element={<LotsPage />} />
          <Route path="moves" element={<MovesPage />} />
          <Route path="adjustments" element={<AdjustmentsListPage />} />
          <Route path="adjustments/new" element={<AdjustmentCreatePage />} />
        </Route>

        {/* Inventory Item Detail & Lot Detail (outside nested routes) */}
        <Route
          path="/inventory/items/:productId/:warehouseId"
          element={<InventoryItemDetailPage />}
        />
        <Route path="/inventory/lots/:lotId" element={<LotDetailPage />} />

        {/* Masters - Phase G-1 */}
        <Route path={ROUTES.MASTERS.WAREHOUSES} element={<WarehousesPage />} />
        <Route path={ROUTES.MASTERS.SUPPLIERS} element={<SuppliersPage />} />
        <Route path={ROUTES.MASTERS.CUSTOMERS} element={<CustomersPage />} />
        <Route path={ROUTES.MASTERS.PRODUCTS} element={<ProductsPage />} />
        <Route path={ROUTES.MASTERS.CUSTOMER_ITEMS} element={<CustomerItemsListPage />} />
        <Route path={ROUTES.MASTERS.BULK_LOAD} element={<MastersBulkLoadPage />} />

        {/* Settings - Phase G-2 */}
        <Route path={ROUTES.SETTINGS.USERS} element={<UsersListPage />} />
        <Route path="/settings/users/:id" element={<UserDetailPage />} />
        <Route path={ROUTES.SETTINGS.ROLES} element={<RolesListPage />} />

        {/* Admin - Phase H */}
        <Route path={ROUTES.ADMIN.INDEX} element={<AdminPage />} />
        <Route path={ROUTES.ADMIN.OPERATION_LOGS} element={<OperationLogsPage />} />
        <Route path={ROUTES.ADMIN.BUSINESS_RULES} element={<BusinessRulesPage />} />
        <Route path={ROUTES.ADMIN.BATCH_JOBS} element={<BatchJobsPage />} />
        <Route path={ROUTES.ADMIN.MASTER_CHANGE_LOGS} element={<MasterChangeLogsPage />} />
        <Route path={ROUTES.ADMIN.SEED_SNAPSHOTS} element={<SeedSnapshotsPage />} />

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </TopNavLayout>
  );
}

export default App;
