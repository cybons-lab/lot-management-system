import { Navigate, Route } from "react-router-dom";

import { AdminGuard } from "@/components/auth/AdminGuard";
import { ROUTES } from "@/constants/routes";

// Pages
import { AdminPage } from "@/features/admin/pages/AdminPage";
import { BulkExportPage } from "@/features/admin/pages/BulkExportPage";
import { DataMaintenancePage } from "@/features/admin/pages/DataMaintenancePage";
import { DeployPage } from "@/features/admin/pages/DeployPage";
import { MasterChangeLogsPage } from "@/features/admin/pages/MasterChangeLogsPage";
import { NotificationSettingsPage } from "@/features/admin/pages/NotificationSettingsPage";
import { SeedSnapshotsPage } from "@/features/admin/pages/SeedSnapshotsPage";
import { SystemSettingsPage } from "@/features/admin/pages/SystemSettingsPage";
import { UsersManagementPage } from "@/features/admin/pages/UsersManagementPage";
import { BatchJobsPage } from "@/features/batch-jobs/pages/BatchJobsPage";
import { BusinessRulesPage } from "@/features/business-rules/pages/BusinessRulesPage";
import { ClientLogsPage } from "@/features/client-logs";
import { DbBrowserPage } from "@/features/debug-db/pages/DbBrowserPage";
import { OperationLogsPage } from "@/features/operation-logs/pages/OperationLogsPage";
import { LogViewer } from "@/pages/LogViewer";

export function AdminRoutes() {
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
        path={ROUTES.ADMIN.USERS_MANAGEMENT}
        element={
          <AdminGuard>
            <UsersManagementPage />
          </AdminGuard>
        }
      />
      <Route
        path={ROUTES.ADMIN.NOTIFICATION_SETTINGS}
        element={
          <AdminGuard>
            <NotificationSettingsPage />
          </AdminGuard>
        }
      />
      <Route
        path={ROUTES.ADMIN.DEPLOY}
        element={
          <AdminGuard>
            <DeployPage />
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
      <Route
        path={ROUTES.ADMIN.DATA_MAINTENANCE}
        element={
          <AdminGuard>
            <DataMaintenancePage />
          </AdminGuard>
        }
      />
    </>
  );
}
