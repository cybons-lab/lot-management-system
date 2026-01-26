import { Navigate } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

interface FeatureGuardProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGuard({ feature, children, fallback }: FeatureGuardProps) {
  const { isFeatureVisible, isLoading } = useSystemSettings();

  if (isLoading) {
    // Optionally return loading spinner
    return null;
  }

  if (!isFeatureVisible(feature)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    // Redirect to dashboard (or 403 page if preferred)
    // Using simple redirect to Dashboard for now as per plan "redirect to dashboard"
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <>{children}</>;
}
