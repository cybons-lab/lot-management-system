/**
 * RoleGuard.tsx
 *
 * 指定したロールを持つユーザーのみアクセス可能にするガード。
 */

import { Navigate } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthContext";

interface RoleGuardProps {
  children: React.ReactNode;
  roles: string[];
  fallbackPath?: string;
}

export function RoleGuard({ children, roles, fallbackPath = "/dashboard" }: RoleGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  const hasRole = roles.some((role) => user?.roles?.includes(role));

  if (!user || !hasRole) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
