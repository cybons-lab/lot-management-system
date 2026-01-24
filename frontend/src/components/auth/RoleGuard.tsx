/**
 * RoleGuard.tsx
 *
 * 指定したロールを持つユーザーのみアクセス可能にするガード。
 */

import { AccessGuard } from "@/components/auth/AccessGuard";
import type { RoleCode } from "@/features/auth/permissions";

interface RoleGuardProps {
  children: React.ReactNode;
  roles: RoleCode[];
}

export function RoleGuard({ children, roles }: RoleGuardProps) {
  return <AccessGuard roles={roles}>{children}</AccessGuard>;
}
