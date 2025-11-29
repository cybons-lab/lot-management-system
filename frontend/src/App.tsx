import { useEffect } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { SAPRegistrationButton } from "@/components/common/SAPRegistrationButton";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ROUTES, LEGACY_ROUTES } from "@/constants/routes";
// Pages - all imported from features (Phase A cleanup)
import { AdjustmentCreatePage } from "@/features/adjustments/pages/AdjustmentCreatePage";
import { AdjustmentsListPage } from "@/features/adjustments/pages/AdjustmentsListPage";
import { AdminPage } from "@/features/admin/pages/AdminPage";
import { MasterChangeLogsPage } from "@/features/admin/pages/MasterChangeLogsPage";
import { SeedSnapshotsPage } from "@/features/admin/pages/SeedSnapshotsPage";
import { AllocationSuggestionsPage } from "@/features/allocations/pages/AllocationSuggestionsPage";
import { LotAllocationPage } from "@/features/allocations/pages/LotAllocationPage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { BatchJobsPage } from "@/features/batch-jobs/pages/BatchJobsPage";
import { BusinessRulesPage } from "@/features/business-rules/pages/BusinessRulesPage";
import { CustomerItemsListPage } from "@/features/customer-items/pages/CustomerItemsListPage";
import { CustomersListPage, CustomerDetailPage } from "@/features/customers";
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
import { InventoryPage } from "@/features/inventory/pages/InventoryPage";
import { LotDetailPage } from "@/features/inventory/pages/LotDetailPage";
import { MovesPage } from "@/features/inventory/pages/MovesPage";
import { MastersBulkLoadPage } from "@/features/masters/pages/MastersBulkLoadPage";
import { OperationLogsPage } from "@/features/operation-logs/pages/OperationLogsPage";
import { OrderDetailPage } from "@/features/orders/pages/OrderDetailPage";
import { OrdersListPage } from "@/features/orders/pages/OrdersListPage";
import { ConfirmedLinesPage } from "@/features/orders/pages/ConfirmedLinesPage";
import { ProductsListPage, ProductDetailPage } from "@/features/products";
import { RolesListPage } from "@/features/roles/pages/RolesListPage";
import { SuppliersListPage, SupplierDetailPage } from "@/features/suppliers";
import { SystemStatus } from "@/features/system/SystemStatus";
import { UserDetailPage } from "@/features/users/pages/UserDetailPage";
import { UsersListPage } from "@/features/users/pages/UsersListPage";
import { WarehousesListPage, WarehouseDetailPage } from "@/features/warehouses";
import { MastersPage } from "@/features/masters/pages/MastersPage";
import { SupplierProductsPage } from "@/features/masters/pages/SupplierProductsPage";
import { UomConversionsPage } from "@/features/masters/pages/UomConversionsPage";
import { TopNavLayout } from "@/layouts/TopNavLayout";
import { logError } from "@/services/error-logger";

// eslint-disable-next-line max-lines-per-function
function App() {
  // Global error handlers
  useEffect(() => {
    // Handle uncaught errors
    const handleError = (event: ErrorEvent) => {
      logError("Global", event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logError("UnhandledRejection", event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return (
    <ErrorBoundary>
      <SAPRegistrationButton />
      <SystemStatus />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="*"
          element={
            <TopNavLayout>
              <Routes>
                {/* Root */}
                <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
                <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />

                {/* Orders */}
                <Route path={ROUTES.ORDERS.LIST} element={<OrdersListPage />} />
                <Route path="/orders/:orderId" element={<OrderDetailPage />} />
                <Route path="/confirmed-lines" element={<ConfirmedLinesPage />} />

                {/* Allocations */}
                <Route path={ROUTES.ALLOCATIONS.INDEX} element={<LotAllocationPage />} />
                <Route
                  path={ROUTES.ALLOCATIONS.SUGGESTIONS}
                  element={<AllocationSuggestionsPage />}
                />

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

                {/* Inventory routes */}
                <Route path={ROUTES.INVENTORY.ROOT} element={<InventoryLayout />}>
                  <Route index element={<InventoryPage />} />
                  <Route path="summary" element={<Navigate to={ROUTES.INVENTORY.ROOT} replace />} />
                  <Route path="lots" element={<Navigate to={ROUTES.INVENTORY.ROOT} replace />} />
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
                <Route path="/masters" element={<MastersPage />} />
                <Route path="/masters/supplier-products" element={<SupplierProductsPage />} />
                <Route path="/masters/uom-conversions" element={<UomConversionsPage />} />
                <Route path={ROUTES.MASTERS.WAREHOUSES} element={<WarehousesListPage />} />
                <Route path="/warehouses/:warehouseCode" element={<WarehouseDetailPage />} />
                <Route path={ROUTES.MASTERS.SUPPLIERS} element={<SuppliersListPage />} />
                <Route path="/suppliers/:supplierCode" element={<SupplierDetailPage />} />
                <Route path={ROUTES.MASTERS.CUSTOMERS} element={<CustomersListPage />} />
                <Route path="/customers/:customerCode" element={<CustomerDetailPage />} />
                <Route path={ROUTES.MASTERS.PRODUCTS} element={<ProductsListPage />} />
                <Route path="/products/:makerPartCode" element={<ProductDetailPage />} />
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
              <Toaster position="top-right" richColors closeButton />
            </TopNavLayout>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
