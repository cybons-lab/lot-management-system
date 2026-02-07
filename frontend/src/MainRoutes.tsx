import { Navigate, Route, Routes, Outlet } from "react-router-dom";

import { AdminRoutes } from "./routes/admin-routes";
import { InventoryRoutes } from "./routes/inventory-routes";
import { MasterRoutes } from "./routes/master-routes";
import { ReportRoutes } from "./routes/report-routes";
import { RpaRoutes } from "./routes/rpa-routes";

import { AccessGuard } from "@/components/auth/AccessGuard";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { FeatureGuard } from "@/components/auth/FeatureGuard";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ROUTES, LEGACY_ROUTES } from "@/constants/routes";

// Pages
import { CalendarSettingsPage } from "@/features/calendar";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
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
import MaterialOrderForecastsPage from "@/features/material-order-forecasts/pages/MaterialOrderForecastsPage";
import { OcrResultsListPage } from "@/features/ocr-results/pages/OcrResultsListPage";
import { ConfirmedLinesPage } from "@/features/orders/pages/ConfirmedLinesPage";
import { OrderDetailPage } from "@/features/orders/pages/OrderDetailPage";
import { OrdersListPage } from "@/features/orders/pages/OrdersListPage";
import { SapIntegrationPage } from "@/features/sap-integration";

// Route Groups

const FeatureGuardLayout = ({ feature }: { feature: string }) => (
  <FeatureGuard feature={feature}>
    <Outlet />
  </FeatureGuard>
);

/* eslint-disable-next-line max-lines-per-function -- 各機能別ルートを統合するため */
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

        {/* Material Order Forecasts */}
        <Route element={<FeatureGuardLayout feature="material_order_forecasts" />}>
          <Route
            path={ROUTES.MATERIAL_ORDER_FORECASTS.LIST}
            element={<MaterialOrderForecastsPage />}
          />
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

        {/* Feature Groups */}
        {InventoryRoutes()}
        {MasterRoutes()}
        {ReportRoutes()}
        {AdminRoutes()}
        {RpaRoutes()}

        {/* Calendar */}
        <Route
          path={ROUTES.CALENDAR}
          element={
            <RoleGuard roles={["admin", "user"]}>
              <CalendarSettingsPage />
            </RoleGuard>
          }
        />

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
