/**
 * RoleGuard.tsx
 *
 * 指定したロールを持つユーザーのみアクセス可能にするガード。
 */

import { AccessGuard } from "@/components/auth/AccessGuard";

interface RoleGuardProps {
  children: React.ReactNode;
  roles: string[];
}

export function RoleGuard({ children, roles }: RoleGuardProps) {
  return (
    <AccessGuard roles={roles as ("admin" | "user" | "guest")[]}>
      {children}
    </AccessGuard>
  );
}
