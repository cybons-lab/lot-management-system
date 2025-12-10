import { Navigate, Route, Routes } from "react-router-dom";

import { AdminGuard } from "@/components/auth/AdminGuard";
import { ROUTES, LEGACY_ROUTES } from "@/constants/routes";
// Pages
import { AdjustmentCreatePage } from "@/features/adjustments/pages/AdjustmentCreatePage";
import { AdjustmentsListPage } from "@/features/adjustments/pages/AdjustmentsListPage";
import { AdminPage } from "@/features/admin/pages/AdminPage";
import { MasterChangeLogsPage } from "@/features/admin/pages/MasterChangeLogsPage";
import { SeedSnapshotsPage } from "@/features/admin/pages/SeedSnapshotsPage";
import { PrimaryAssignmentsPage } from "@/features/assignments/pages/PrimaryAssignmentsPage";
import { BatchJobsPage } from "@/features/batch-jobs/pages/BatchJobsPage";
import { BusinessRulesPage } from "@/features/business-rules/pages/BusinessRulesPage";
import { ClientLogsPage } from "@/features/client-logs";
import { CustomerItemsListPage } from "@/features/customer-items/pages/CustomerItemsListPage";
import { CustomersListPage, CustomerDetailPage } from "@/features/customers";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { DeliveryPlacesListPage } from "@/features/delivery-places";
import { ForecastCreatePage } from "@/features/forecasts/pages/ForecastCreatePage";
import { ForecastDetailPage } from "@/features/forecasts/pages/ForecastDetailPage";
import { ForecastEditPage } from "@/features/forecasts/pages/ForecastEditPage";
import { ForecastImportPage } from "@/features/forecasts/pages/ForecastImportPage";
import { ForecastListPage } from "@/features/forecasts/pages/ForecastListPage";
import { InboundPlanCreatePage } from "@/features/inbound-plans/pages/InboundPlanCreatePage";
import { InboundPlanDetailPage } from "@/features/inbound-plans/pages/InboundPlanDetailPage";
import { InboundPlanEditPage } from "@/features/inbound-plans/pages/InboundPlanEditPage";
import { InboundPlansListPage } from "@/features/inbound-plans/pages/InboundPlansListPage";
import { AdhocLotCreatePage } from "@/features/inventory/pages/AdhocLotCreatePage";
import { InventoryItemDetailPage } from "@/features/inventory/pages/InventoryItemDetailPage";
import { InventoryLayout } from "@/features/inventory/pages/InventoryLayout";
import { InventoryPage } from "@/features/inventory/pages/InventoryPage";
import { LotDetailPage } from "@/features/inventory/pages/LotDetailPage";
import { MovesPage } from "@/features/inventory/pages/MovesPage";
import { MastersBulkLoadPage } from "@/features/masters/pages/MastersBulkLoadPage";
import { MastersPage } from "@/features/masters/pages/MastersPage";
import { OperationLogsPage } from "@/features/operation-logs/pages/OperationLogsPage";
import { ConfirmedLinesPage } from "@/features/orders/pages/ConfirmedLinesPage";
import { OrderDetailPage } from "@/features/orders/pages/OrderDetailPage";
import { OrdersListPage } from "@/features/orders/pages/OrdersListPage";
import { ProductsListPage, ProductDetailPage } from "@/features/products";
import { RolesListPage } from "@/features/roles/pages/RolesListPage";
import { RPAPage } from "@/features/rpa";
import { SupplierProductsPage } from "@/features/supplier-products/pages/SupplierProductsPage";
import { SuppliersListPage, SupplierDetailPage } from "@/features/suppliers";
import { UomConversionsPage } from "@/features/uom-conversions/pages/UomConversionsPage";
import { UserDetailPage } from "@/features/users/pages/UserDetailPage";
import { UsersListPage } from "@/features/users/pages/UsersListPage";
import { WarehousesListPage, WarehouseDetailPage } from "@/features/warehouses";
import { WithdrawalCreatePage, WithdrawalsListPage } from "@/features/withdrawals/pages";

// --- Route Groups ---

function InventoryRoutes() {
  return (
    <>
      {/* Inventory routes */}
      <Route path={ROUTES.INVENTORY.ROOT} element={<InventoryLayout />}>
        <Route index element={<InventoryPage />} />
        <Route path="summary" element={<Navigate to={ROUTES.INVENTORY.ROOT} replace />} />
        <Route path="lots" element={<Navigate to={ROUTES.INVENTORY.ROOT} replace />} />
        <Route path="moves" element={<MovesPage />} />
        <Route path="adjustments" element={<AdjustmentsListPage />} />
        <Route path="adjustments/new" element={<AdjustmentCreatePage />} />
        <Route path="adhoc/new" element={<AdhocLotCreatePage />} />
        <Route path="withdrawals" element={<WithdrawalsListPage />} />
        <Route path="withdrawals/new" element={<WithdrawalCreatePage />} />
      </Route>

      {/* Inventory Item Detail & Lot Detail */}
      <Route
        path="/inventory/items/:productId/:warehouseId"
        element={<InventoryItemDetailPage />}
      />
      <Route path="/inventory/lots/:lotId" element={<LotDetailPage />} />
    </>
  );
}

function MasterRoutes() {
  return (
    <>
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
      <Route path="/masters/primary-assignments" element={<PrimaryAssignmentsPage />} />
      <Route path="/delivery-places" element={<DeliveryPlacesListPage />} />

      {/* Settings - Phase G-2 (Admin Only) */}
      <Route
        path={ROUTES.SETTINGS.USERS}
        element={
          <AdminGuard>
            <UsersListPage />
          </AdminGuard>
        }
      />
      <Route
        path="/settings/users/:id"
        element={
          <AdminGuard>
            <UserDetailPage />
          </AdminGuard>
        }
      />
      <Route
        path={ROUTES.SETTINGS.ROLES}
        element={
          <AdminGuard>
            <RolesListPage />
          </AdminGuard>
        }
      />
    </>
  );
}

function AdminRoutes() {
  return (
    <>
      {/* Admin - Phase H (Admin Only) */}
      <Route
        path={ROUTES.ADMIN.INDEX}
        element={
          <AdminGuard>
            <AdminPage />
          </AdminGuard>
        }
      />
      <Route
        path={ROUTES.ADMIN.OPERATION_LOGS}
        element={
          <AdminGuard>
            <OperationLogsPage />
          </AdminGuard>
        }
      />
      <Route
        path={ROUTES.ADMIN.BUSINESS_RULES}
        element={
          <AdminGuard>
            <BusinessRulesPage />
          </AdminGuard>
        }
      />
      <Route
        path={ROUTES.ADMIN.BATCH_JOBS}
        element={
          <AdminGuard>
            <BatchJobsPage />
          </AdminGuard>
        }
      />
      <Route
        path={ROUTES.ADMIN.MASTER_CHANGE_LOGS}
        element={
          <AdminGuard>
            <MasterChangeLogsPage />
          </AdminGuard>
        }
      />
      <Route
        path={ROUTES.ADMIN.SEED_SNAPSHOTS}
        element={
          <AdminGuard>
            <SeedSnapshotsPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/client-logs"
        element={
          <AdminGuard>
            <ClientLogsPage />
          </AdminGuard>
        }
      />
    </>
  );
}

export function MainRoutes() {
  return (
    <Routes>
      {/* Root */}
      <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />

      {/* Orders */}
      <Route path={ROUTES.ORDERS.LIST} element={<OrdersListPage />} />
      <Route path="/orders/:orderId" element={<OrderDetailPage />} />
      <Route path="/confirmed-lines" element={<ConfirmedLinesPage />} />

      {/* Allocations */}
      <Route path="/allocations" element={<Navigate to="/orders" replace />} />
      <Route path="/allocations/suggestions" element={<Navigate to="/orders" replace />} />

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

      {InventoryRoutes()}
      {MasterRoutes()}
      {AdminRoutes()}

      {/* RPA */}
      <Route path={ROUTES.RPA} element={<RPAPage />} />

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
}
