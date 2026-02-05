import { Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthErrorOverlay } from "@/components/auth/AuthErrorOverlay";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { SystemSettingsProvider } from "@/contexts/SystemSettingsContext";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ForbiddenPage } from "@/features/auth/pages/ForbiddenPage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { SystemStatus } from "@/features/system/SystemStatus";
import { useGlobalErrorHandlers } from "@/hooks/useGlobalErrorHandlers";
import { TopNavLayout } from "@/layouts/TopNavLayout";
import { MainRoutes } from "@/MainRoutes";

function App() {
  // Global error handlers
  useGlobalErrorHandlers();

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SystemSettingsProvider>
          <SystemStatus />
          <Routes>
            <Route
              path="/login"
              element={
                <TopNavLayout>
                  <LoginPage />
                </TopNavLayout>
              }
            />
            <Route
              path="/forbidden"
              element={
                <TopNavLayout>
                  <ForbiddenPage />
                </TopNavLayout>
              }
            />
            <Route
              path="*"
              element={
                <TopNavLayout>
                  <AuthErrorOverlay />
                  <MainRoutes />
                  <Toaster position="bottom-right" richColors closeButton />
                </TopNavLayout>
              }
            />
          </Routes>
        </SystemSettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
