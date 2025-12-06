/**
 * AdminGuard.tsx
 * 
 * 管理者権限が必要なページのガードコンポーネント
 * adminロールを持たないユーザーはダッシュボードにリダイレクトされる
 */

import { Navigate } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthContext";

interface AdminGuardProps {
    children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
    const { user, isLoading } = useAuth();

    // ローディング中は何も表示しない
    if (isLoading) {
        return null;
    }

    // 未ログインまたは管理者権限がない場合はリダイレクト
    if (!user || !user.roles?.includes("admin")) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
