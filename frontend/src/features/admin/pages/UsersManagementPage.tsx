/**
 * UsersManagementPage.tsx
 *
 * ユーザー管理ページ（システム管理メニューから独立）
 * Phase 3: システム管理メニュー分割
 *
 * Note: 現在は既存の /settings/users にリダイレクト
 * 将来的にタブ構造化する際は、このページで直接実装する
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/constants/routes";

export function UsersManagementPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // 既存のユーザー管理ページにリダイレクト
    navigate(ROUTES.SETTINGS.USERS, { replace: true });
  }, [navigate]);

  return null;
}
