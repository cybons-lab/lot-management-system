import { Route, Outlet } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { FeatureGuard } from "@/components/auth/FeatureGuard";

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
