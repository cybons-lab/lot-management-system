import { Navigate, Route, Outlet } from "react-router-dom";

import { FeatureGuard } from "@/components/auth/FeatureGuard";
import { ROUTES } from "@/constants/routes";

// Pages
import { AdjustmentCreatePage } from "@/features/adjustments/pages/AdjustmentCreatePage";
import { AdjustmentsListPage } from "@/features/adjustments/pages/AdjustmentsListPage";
import { ExcelViewPage } from "@/features/inventory/components/excel-view/ExcelViewPage";
import { AdhocLotCreatePage } from "@/features/inventory/pages/AdhocLotCreatePage";
import { ExcelPortalPage } from "@/features/inventory/pages/ExcelPortalPage";
import { InventoryItemDetailPage } from "@/features/inventory/pages/InventoryItemDetailPage";
import { InventoryLayout } from "@/features/inventory/pages/InventoryLayout";
import { InventoryPage } from "@/features/inventory/pages/InventoryPage";
import { LotDetailPage } from "@/features/inventory/pages/LotDetailPage";
import { MovesPage } from "@/features/inventory/pages/MovesPage";
import { StockHistoryPage } from "@/features/inventory/pages/StockHistoryPage";
import { WithdrawalsListPage, WithdrawalCreatePage } from "@/features/withdrawals/pages";

const FeatureGuardLayout = ({ feature }: { feature: string }) => (
  <FeatureGuard feature={feature}>
    <Outlet />
  </FeatureGuard>
);

export function InventoryRoutes() {
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

        <Route path="excel-view/:productId" element={<ExcelViewPage />} />
        <Route path="excel-view/:productId/:customerItemId" element={<ExcelViewPage />} />
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
