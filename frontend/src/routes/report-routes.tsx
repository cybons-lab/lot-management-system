import { Route, Outlet } from "react-router-dom";

import { FeatureGuard } from "@/components/auth/FeatureGuard";
import { ROUTES } from "@/constants/routes";

// Pages
import { MonthlyReportPage } from "@/features/reports/components/MonthlyReportPage";

const FeatureGuardLayout = ({ feature }: { feature: string }) => (
  <FeatureGuard feature={feature}>
    <Outlet />
  </FeatureGuard>
);

export function ReportRoutes() {
  return (
    <Route element={<FeatureGuardLayout feature="reports" />}>
      <Route path={ROUTES.REPORTS.MONTHLY} element={<MonthlyReportPage />} />
    </Route>
  );
}
