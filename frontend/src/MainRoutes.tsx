/* eslint-disable max-lines */
import { Navigate, Route, Routes, Outlet } from "react-router-dom";

import { AccessGuard } from "@/components/auth/AccessGuard";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { FeatureGuard } from "@/components/auth/FeatureGuard";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ROUTES, LEGACY_ROUTES } from "@/constants/routes";
// Pages
import { AdjustmentCreatePage } from "@/features/adjustments/pages/AdjustmentCreatePage";
import { AdjustmentsListPage } from "@/features/adjustments/pages/AdjustmentsListPage";
import { AdminPage } from "@/features/admin/pages/AdminPage";
import { BulkExportPage } from "@/features/admin/pages/BulkExportPage";
import { MasterChangeLogsPage } from "@/features/admin/pages/MasterChangeLogsPage";
import { SeedSnapshotsPage } from "@/features/admin/pages/SeedSnapshotsPage";
import { SystemSettingsPage } from "@/features/admin/pages/SystemSettingsPage";
import { SupplierAssignmentsPage } from "@/features/assignments/pages/SupplierAssignmentsPage";
import { BatchJobsPage } from "@/features/batch-jobs/pages/BatchJobsPage";
import { BusinessRulesPage } from "@/features/business-rules/pages/BusinessRulesPage";
import { CalendarSettingsPage } from "@/features/calendar";
import { ClientLogsPage } from "@/features/client-logs";
import { CustomerItemsListPage } from "@/features/customer-items/pages/CustomerItemsListPage";
import { CustomersListPage } from "@/features/customers";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { DbBrowserPage } from "@/features/debug-db/pages/DbBrowserPage";
import { DeliveryPlacesListPage } from "@/features/delivery-places";
import { ForecastCreatePage } from "@/features/forecasts/pages/ForecastCreatePage";
import { ForecastDetailPage } from "@/features/forecasts/pages/ForecastDetailPage";
import { ForecastEditPage } from "@/features/forecasts/pages/ForecastEditPage";
import { ForecastImportPage } from "@/features/forecasts/pages/ForecastImportPage";
import { ForecastListPage } from "@/features/forecasts/pages/ForecastListPage";
import { DatabaseSchemaPage } from "@/features/help/pages/DatabaseSchemaPage";
import { FlowMapHelpPage } from "@/features/help/pages/FlowMapHelpPage";
import { InboundPlanCreatePage } from "@/features/inbound-plans/pages/InboundPlanCreatePage";
import { InboundPlanDetailPage } from "@/features/inbound-plans/pages/InboundPlanDetailPage";
import { InboundPlanEditPage } from "@/features/inbound-plans/pages/InboundPlanEditPage";
import { InboundPlansListPage } from "@/features/inbound-plans/pages/InboundPlansListPage";
import { ExcelViewPage } from "@/features/inventory/components/excel-view/ExcelViewPage";
import { AdhocLotCreatePage } from "@/features/inventory/pages/AdhocLotCreatePage";
import { ExcelPortalPage } from "@/features/inventory/pages/ExcelPortalPage";
import { InventoryItemDetailPage } from "@/features/inventory/pages/InventoryItemDetailPage";
import { InventoryLayout } from "@/features/inventory/pages/InventoryLayout";
import { InventoryPage } from "@/features/inventory/pages/InventoryPage";
import { LotDetailPage } from "@/features/inventory/pages/LotDetailPage";
import { MovesPage } from "@/features/inventory/pages/MovesPage";
import { StockHistoryPage } from "@/features/inventory/pages/StockHistoryPage";
import { MastersBulkLoadPage } from "@/features/masters/pages/MastersBulkLoadPage";
import { OcrResultsListPage } from "@/features/ocr-results/pages/OcrResultsListPage";
import { OperationLogsPage } from "@/features/operation-logs/pages/OperationLogsPage";
import { ConfirmedLinesPage } from "@/features/orders/pages/ConfirmedLinesPage";
import { OrderDetailPage } from "@/features/orders/pages/OrderDetailPage";
import { OrdersListPage } from "@/features/orders/pages/OrdersListPage";
import { RolesListPage } from "@/features/roles/pages/RolesListPage";
import { RPAPage } from "@/features/rpa";
import {
  CsvImportPage,
  LayerCodeMappingsPage,
  MaterialDeliveryNotePage,
  RunDetailPage,
  RunMonitorPage,
  RunsListPage,
  Step1Page,
  Step2CheckListPage,
  Step3PlanPage,
  Step3ExecuteListPage,
  Step3DetailPage,
  Step4DetailPage,
  Step4ListPage,
} from "@/features/rpa/material-delivery-note";
import { GenericCloudFlowExecutePage } from "@/features/rpa/pages/GenericCloudFlowExecutePage";
import { MaterialDeliverySimplePage } from "@/features/rpa/pages/MaterialDeliverySimplePage";
import { SmartReadPage } from "@/features/rpa/smartread";
import { SapIntegrationPage } from "@/features/sap-integration";
import { ShippingMasterListPage } from "@/features/shipping-master/pages/ShippingMasterListPage";
import { SupplierProductsPage } from "@/features/supplier-products/pages/SupplierProductsPage";
import { SuppliersListPage } from "@/features/suppliers";
import { UomConversionsPage } from "@/features/uom-conversions/pages/UomConversionsPage";
import { UsersListPage } from "@/features/users/pages/UsersListPage";
import { WarehouseDeliveryRoutesListPage } from "@/features/warehouse-delivery-routes";
import { WarehousesListPage } from "@/features/warehouses";
import { WithdrawalCreatePage, WithdrawalsListPage } from "@/features/withdrawals/pages";
import { LogViewer } from "@/pages/LogViewer";

// --- Route Groups ---

const FeatureGuardLayout = ({ feature }: { feature: string }) => (
  <FeatureGuard feature={feature}>
    <Outlet />
  </FeatureGuard>
);

function InventoryRoutes() {
  return (
    <Route element={<FeatureGuardLayout feature="inventory" />}>
      {/* Inventory routes */}
      <Route path={ROUTES.INVENTORY.ROOT} element={<InventoryLayout />}>
        <Route index element={<InventoryPage />} />
        <Route path="summary" element={<Navigate to={ROUTES.INVENTORY.ROOT} replace />} />
        <Route path="lots" element={<Navigate to={ROUTES.INVENTORY.ROOT} replace />} />
        <Route path="moves" element={<MovesPage />} />
        <Route path="adjustments" element={<AdjustmentsListPage />} />
        <Route path="adjustments/new" element={<AdjustmentCreatePage />} />
        <Route path="adhoc/new" element={<AdhocLotCreatePage />} />

        <Route path="excel-view/:productId/:warehouseId" element={<ExcelViewPage />} />
        <Route
          path="excel-view/:productId/:warehouseId/:customerItemId"
          element={<ExcelViewPage />}
        />
        <Route path="excel-portal" element={<ExcelPortalPage />} />
        <Route path="history" element={<StockHistoryPage />} />
        <Route path="withdrawals" element={<WithdrawalsListPage />} />
        <Route path="withdrawals/new" element={<WithdrawalCreatePage />} />
      </Route>

      {/* Inventory Item Detail & Lot Detail */}
      <Route path="/inventory/items/:productId/:warehouseId">
        <Route index element={<Navigate to="summary" replace />} />
        <Route path=":tab" element={<InventoryItemDetailPage />} />
      </Route>
      <Route path="/inventory/lots/:lotId" element={<LotDetailPage />} />
    </Route>
  );
}

/* eslint-disable-next-line max-lines-per-function */
function MasterRoutes() {
  return (
    <Route element={<FeatureGuardLayout feature="masters" />}>
      {/* Masters - Phase G-1 */}
      <Route path="/masters" element={<Navigate to={ROUTES.MASTERS.SUPPLIERS} replace />} />
      <Route
        path={ROUTES.MASTERS.SUPPLIER_PRODUCTS}
        element={
          <FeatureGuard feature="masters:supplier-products">
            <SupplierProductsPage />
          </FeatureGuard>
        }
      />
      <Route
        path="/masters/uom-conversions"
        element={
          <FeatureGuard feature="masters:uom-conversions">
            <UomConversionsPage />
          </FeatureGuard>
        }
      />
      <Route
        path={ROUTES.MASTERS.WAREHOUSES}
        element={
          <FeatureGuard feature="masters:warehouses">
            <WarehousesListPage />
          </FeatureGuard>
        }
      />
      <Route
        path={ROUTES.MASTERS.SUPPLIERS}
        element={
          <FeatureGuard feature="masters:suppliers">
            <SuppliersListPage />
          </FeatureGuard>
        }
      />
      <Route
        path={ROUTES.MASTERS.CUSTOMERS}
        element={
          <FeatureGuard feature="masters:customers">
            <CustomersListPage />
          </FeatureGuard>
        }
      />
      <Route
        path={ROUTES.MASTERS.CUSTOMER_ITEMS}
        element={
          <FeatureGuard feature="masters:customer-items">
            <CustomerItemsListPage />
          </FeatureGuard>
        }
      />
      <Route
        path={ROUTES.MASTERS.BULK_LOAD}
        element={
          <FeatureGuard feature="masters:bulk-load">
            <MastersBulkLoadPage />
          </FeatureGuard>
        }
      />
      <Route
        path={ROUTES.MASTERS.SUPPLIER_ASSIGNMENTS}
        element={
          <FeatureGuard feature="masters:supplier-assignments">
            <SupplierAssignmentsPage />
          </FeatureGuard>
        }
      />
      <Route
        path={ROUTES.MASTERS.SHIPPING_MASTERS}
        element={
          <FeatureGuard feature="masters:shipping-masters">
            <ShippingMasterListPage />
          </FeatureGuard>
        }
      />
      <Route
        path={ROUTES.MASTERS.DELIVERY_PLACES}
        element={
          <FeatureGuard feature="masters:delivery-places">
            <DeliveryPlacesListPage />
          </FeatureGuard>
        }
      />
      <Route
        path="/warehouse-delivery-routes"
        element={
          <FeatureGuard feature="masters:warehouse-delivery-routes">
            <WarehouseDeliveryRoutesListPage />
          </FeatureGuard>
        }
      />

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
        path={ROUTES.SETTINGS.ROLES}
        element={
          <AdminGuard>
            <RolesListPage />
          </AdminGuard>
        }
      />
    </Route>
  );
}

/* eslint-disable-next-line max-lines-per-function */
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
        path={ROUTES.ADMIN.SYSTEM_SETTINGS}
        element={
          <AdminGuard>
            <SystemSettingsPage />
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
      <Route
        path="/admin/export"
        element={
          <AdminGuard>
            <BulkExportPage />
          </AdminGuard>
        }
      />
      <Route path={ROUTES.DEBUG.DB_BROWSER}>
        <Route
          index
          element={
            <AdminGuard>
              <Navigate to="schema" replace />
            </AdminGuard>
          }
        />
        <Route
          path=":tab"
          element={
            <AdminGuard>
              <DbBrowserPage />
            </AdminGuard>
          }
        />
      </Route>
      <Route
        path={ROUTES.ADMIN.SYSTEM_LOGS}
        element={
          <AdminGuard>
            <LogViewer />
          </AdminGuard>
        }
      />
    </>
  );
}

/* eslint-disable-next-line max-lines-per-function */
export function MainRoutes() {
  return (
    <Routes>
      {/* 共通のアクセスガード（config.tsに基づいてゲスト制限などを自動適用） */}
      <Route
        element={
          <AccessGuard>
            <Outlet />
          </AccessGuard>
        }
      >
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
        <Route element={<FeatureGuardLayout feature="forecasts" />}>
          <Route path={ROUTES.FORECASTS.LIST} element={<ForecastListPage />} />
          <Route path={ROUTES.FORECASTS.NEW} element={<ForecastCreatePage />} />
          <Route path="/forecasts/:id" element={<ForecastDetailPage />} />
          <Route path="/forecasts/:forecastId/edit" element={<ForecastEditPage />} />
          <Route path={ROUTES.FORECASTS.IMPORT} element={<ForecastImportPage />} />
        </Route>

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

        {/* Calendar */}
        <Route
          path={ROUTES.CALENDAR}
          element={
            <RoleGuard roles={["admin", "user"]}>
              <CalendarSettingsPage />
            </RoleGuard>
          }
        />

        {/* RPA */}
        <Route element={<FeatureGuardLayout feature="rpa" />}>
          <Route path={ROUTES.RPA.ROOT} element={<RPAPage />} />
          <Route
            path={ROUTES.RPA.MATERIAL_DELIVERY_SIMPLE}
            element={<MaterialDeliverySimplePage />}
          />
          <Route path={ROUTES.RPA.GENERIC_CLOUD_FLOW} element={<GenericCloudFlowExecutePage />} />
          <Route path={ROUTES.RPA.SMARTREAD}>
            <Route index element={<Navigate to="import" replace />} />
            <Route path=":tab" element={<SmartReadPage />} />
          </Route>
          <Route
            path={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.LAYER_CODES}
            element={<LayerCodeMappingsPage />}
          />
          <Route
            path={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.ROOT}
            element={<MaterialDeliveryNotePage />}
          />
          <Route path={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP1} element={<Step1Page />} />
          <Route path={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP2} element={<Step2CheckListPage />} />
          <Route path={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP3_PLAN} element={<Step3PlanPage />} />
          <Route
            path={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP3}
            element={<Step3ExecuteListPage />}
          />
          <Route path={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.RUNS} element={<RunsListPage />} />
          <Route path={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.CSV_IMPORT} element={<CsvImportPage />} />
          <Route path="/rpa/material-delivery-note/runs/:runId" element={<RunDetailPage />} />
          <Route
            path="/rpa/material-delivery-note/runs/:runId/monitor"
            element={<RunMonitorPage />}
          />
          <Route path="/rpa/material-delivery-note/step3/:runId" element={<Step3DetailPage />} />
          <Route path={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP4} element={<Step4ListPage />} />
          <Route path="/rpa/material-delivery-note/step4/:runId" element={<Step4DetailPage />} />
        </Route>

        {/* OCR Results */}
        <Route element={<FeatureGuardLayout feature="ocr" />}>
          <Route path={ROUTES.OCR_RESULTS.LIST} element={<OcrResultsListPage />} />
        </Route>

        {/* Help */}
        <Route path={ROUTES.HELP.FLOW_MAP} element={<FlowMapHelpPage />} />
        <Route path={ROUTES.HELP.DATABASE_SCHEMA}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path=":tab" element={<DatabaseSchemaPage />} />
        </Route>

        {/* SAP Integration */}
        <Route path={ROUTES.SAP.ROOT}>
          <Route
            index
            element={
              <AdminGuard>
                <Navigate to="connections" replace />
              </AdminGuard>
            }
          />
          <Route
            path=":tab"
            element={
              <AdminGuard>
                <SapIntegrationPage />
              </AdminGuard>
            }
          />
        </Route>
      </Route>

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
}
