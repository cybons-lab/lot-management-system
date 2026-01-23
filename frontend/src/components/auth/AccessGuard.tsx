import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthContext";

type Role = "admin" | "user" | "guest";

interface AccessGuardProps {
  children: React.ReactNode;
  roles: Role[];
}

export function AccessGuard({ children, roles }: AccessGuardProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  const currentRoles = user?.roles?.length ? user.roles : ["guest"];
  const isAllowed = roles.some((role) => currentRoles.includes(role));

  if (!isAllowed) {
    if (!user && !roles.includes("guest")) {
      const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
      return <Navigate to={`/login?returnTo=${returnTo}`} replace state={{ from: location }} />;
    }
    return <Navigate to="/forbidden" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
