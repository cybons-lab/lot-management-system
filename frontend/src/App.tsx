import { Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { AuthProvider } from "@/features/auth/AuthContext";
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
        <SystemStatus />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="*"
            element={
              <TopNavLayout>
                <MainRoutes />
                <Toaster position="top-right" richColors closeButton />
              </TopNavLayout>
            }
          />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
