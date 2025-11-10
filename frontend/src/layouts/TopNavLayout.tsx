/**
 * TopNavLayout.tsx
 *
 * 上部水平ナビゲーションレイアウト
 * - Sticky ヘッダー（スクロール時も固定）
 * - モダン＋ポップなデザイン
 * - 左サイドバーなし
 */

import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  GitBranch,
  Settings,
  Sparkles,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { cn } from "@/shared/libs/utils";

// ============================================
// 型定義
// ============================================

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  activeColor?: string;
}

const navItems: NavItem[] = [
  {
    title: "ダッシュボード",
    href: "/dashboard",
    icon: LayoutDashboard,
    color: "text-gray-600",
    activeColor: "text-blue-600 bg-blue-50",
  },
  {
    title: "在庫管理",
    href: "/inventory/summary",
    icon: Package,
    color: "text-gray-600",
    activeColor: "text-purple-600 bg-purple-50",
  },
  {
    title: "受注管理",
    href: "/orders",
    icon: ShoppingCart,
    color: "text-gray-600",
    activeColor: "text-green-600 bg-green-50",
  },
  {
    title: "ロット引当",
    href: "/allocations",
    icon: GitBranch,
    color: "text-gray-600",
    activeColor: "text-orange-600 bg-orange-50",
  },
  {
    title: "管理",
    href: "/admin",
    icon: Settings,
    color: "text-gray-600",
    activeColor: "text-red-600 bg-red-50",
  },
];

// ============================================
// メインコンポーネント
// ============================================

interface TopNavLayoutProps {
  children: React.ReactNode;
}

export function TopNavLayout({ children }: TopNavLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* ロゴ & ブランド */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-lg font-bold text-transparent">
                  ロット管理システム
                </h1>
                <p className="text-xs text-gray-500">Smart Inventory Manager</p>
              </div>
            </div>

            {/* ナビゲーション */}
            <nav className="flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== "/dashboard" && location.pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
                      isActive
                        ? `${item.activeColor} shadow-sm`
                        : `${item.color} hover:bg-gray-100`,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.title}</span>
                  </Link>
                );
              })}
            </nav>

            {/* 右側のユーザー情報など（将来拡張用） */}
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 px-3 py-1.5 md:flex">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="text-xs font-medium text-gray-700">オンライン</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>

      {/* フッター（オプション） */}
      <footer className="mt-auto border-t bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <p>© 2024 ロット管理システム - All rights reserved.</p>
            <p className="font-medium">Version 2.1.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
