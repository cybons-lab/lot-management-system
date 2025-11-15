import { Route, Routes, Navigate } from "react-router-dom";

// Route constants
import { ROUTES, LEGACY_ROUTES } from "@/constants/routes";

// Pages - all imported from features (Phase A cleanup)
import { AdminPage } from "@/features/admin/pages/AdminPage";
import { LotAllocationPage } from "@/features/allocations/pages/LotAllocationPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { ForecastDetailPage } from "@/features/forecasts/pages/ForecastDetailPage";
import { ForecastImportPage } from "@/features/forecasts/pages/ForecastImportPage";
import { ForecastListPage } from "@/features/forecasts/pages/ForecastListPage";
import { InboundPlanDetailPage } from "@/features/inbound-plans/pages/InboundPlanDetailPage";
import { InboundPlansListPage } from "@/features/inbound-plans/pages/InboundPlansListPage";
import { InventoryLayout } from "@/features/inventory/pages/InventoryLayout";
import { LotsPage } from "@/features/inventory/pages/LotsPage";
import { MovesPage } from "@/features/inventory/pages/MovesPage";
import { SummaryPage } from "@/features/inventory/pages/SummaryPage";
import { OrdersListPage } from "@/features/orders/pages/OrdersListPage";
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

        {/* Allocations */}
        <Route path={ROUTES.ALLOCATIONS.INDEX} element={<LotAllocationPage />} />

        {/* Forecasts - New structure (v2.2 - Phase B) */}
        <Route path={ROUTES.FORECASTS.LIST} element={<ForecastListPage />} />
        <Route path="/forecasts/:id" element={<ForecastDetailPage />} />
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
        <Route path="/inbound-plans/:id" element={<InboundPlanDetailPage />} />

        {/* Inventory routes with nested children */}
        <Route path={ROUTES.INVENTORY.ROOT} element={<InventoryLayout />}>
          <Route index element={<Navigate to={ROUTES.INVENTORY.SUMMARY} replace />} />
          <Route path="summary" element={<SummaryPage />} />
          <Route path="lots" element={<LotsPage />} />
          <Route path="moves" element={<MovesPage />} />
        </Route>

        {/* Admin */}
        <Route path={ROUTES.ADMIN.INDEX} element={<AdminPage />} />

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </TopNavLayout>
  );
}

export default App;
