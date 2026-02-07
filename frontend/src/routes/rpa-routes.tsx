import { Navigate, Route, Outlet } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { FeatureGuard } from "@/components/auth/FeatureGuard";

// Pages
import { RPAPage } from "@/features/rpa";
import { MaterialDeliverySimplePage } from "@/features/rpa/pages/MaterialDeliverySimplePage";
import { GenericCloudFlowExecutePage } from "@/features/rpa/pages/GenericCloudFlowExecutePage";
import { SmartReadPage } from "@/features/rpa/smartread";
import {
    LayerCodeMappingsPage,
    MaterialDeliveryNotePage,
    Step1Page,
    Step2CheckListPage,
    Step3PlanPage,
    Step3ExecuteListPage,
    RunsListPage,
    CsvImportPage,
    RunDetailPage,
    RunMonitorPage,
    Step3DetailPage,
    Step4ListPage,
    Step4DetailPage,
} from "@/features/rpa/material-delivery-note";

const FeatureGuardLayout = ({ feature }: { feature: string }) => (
    <FeatureGuard feature={feature}>
        <Outlet />
    </FeatureGuard>
);

export function RpaRoutes() {
    return (
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
    );
}
