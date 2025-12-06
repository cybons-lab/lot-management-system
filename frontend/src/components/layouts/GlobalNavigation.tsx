/**
 * GlobalNavigation.tsx
 *
 * グローバルナビゲーションコンポーネント
 * システム全体のメインメニューを提供
 */

import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  Sparkles,
  TrendingUp,
  PackagePlus,
  Database,
} from "lucide-react";
import { Link } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { cn } from "@/shared/libs/utils";
import { useAuth } from "@/features/auth/AuthContext";

// ============================================
// 型定義
// ============================================

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  activeColor?: string;
  requireAdmin?: boolean;
}

const navItems: NavItem[] = [
  {
    title: "ダッシュボード",
    href: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
    color: "text-gray-600",
    activeColor: "text-blue-600 bg-blue-50",
  },
  {
    title: "オリジナル（需要予測）",
    href: ROUTES.FORECASTS.LIST,
    icon: TrendingUp,
    color: "text-gray-600",
    activeColor: "text-cyan-600 bg-cyan-50",
  },
  {
    title: "入荷予定",
    href: ROUTES.INBOUND_PLANS.LIST,
    icon: PackagePlus,
    color: "text-gray-600",
    activeColor: "text-indigo-600 bg-indigo-50",
  },
  {
    title: "在庫・ロット管理",
    href: ROUTES.INVENTORY.ROOT,
    icon: Package,
    color: "text-gray-600",
    activeColor: "text-purple-600 bg-purple-50",
  },
  {
    title: "受注管理",
    href: ROUTES.ORDERS.LIST,
    icon: ShoppingCart,
    color: "text-gray-600",
    activeColor: "text-green-600 bg-green-50",
  },
  {
    title: "RPA",
    href: ROUTES.RPA,
    icon: Settings,
    color: "text-gray-600",
    activeColor: "text-indigo-600 bg-indigo-50",
  },
  {
    title: "管理",
    href: ROUTES.ADMIN.INDEX,
    icon: Settings,
    color: "text-gray-600",
    activeColor: "text-red-600 bg-red-50",
    requireAdmin: true,
  },
  {
    title: "マスタ",
    href: "/masters",
    icon: Database,
    color: "text-gray-600",
    activeColor: "text-teal-600 bg-teal-50",
  },
];

// ============================================
// メインコンポーネント
// ============================================

interface GlobalNavigationProps {
  currentPath: string;
}

export function GlobalNavigation({ currentPath }: GlobalNavigationProps) {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* ロゴ & ブランド */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-900 shadow-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-gray-900">
                ロット管理システム
              </h1>
              <p className="text-[10px] font-medium tracking-wider text-gray-500 uppercase">
                Smart Inventory Manager
              </p>
            </div>
          </div>

          {/* ナビゲーション */}
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto px-2">
            {navItems
              .filter((item) => !item.requireAdmin || user?.roles?.includes('admin'))
              .map((item) => {
                const Icon = item.icon;
                const isActive =
                  currentPath === item.href ||
                  (item.href !== "/dashboard" && currentPath.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "group flex flex-shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200",
                      isActive
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isActive ? "text-gray-900" : "text-gray-500 group-hover:text-gray-900",
                      )}
                    />
                    <span className="hidden lg:inline">{item.title}</span>
                  </Link>
                );
              })}
          </nav>

          {/* 右側のユーザー情報など */}
          <div className="flex items-center gap-3 border-l border-gray-200 pl-3">
            {user ? (
              <>
                <div className="hidden flex-col items-end justify-center md:flex">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Online</span>
                    {/* ロールバッジ */}
                    {user.roles?.includes('admin') ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 rounded">
                        管理者
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 rounded">
                        一般
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-gray-900 leading-none mt-0.5">{user.display_name}</div>
                </div>
                {/* ログアウトボタン */}
                <button
                  onClick={() => {
                    logout();
                    window.location.href = '/login';
                  }}
                  className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  ログアウト
                </button>
              </>
            ) : (
              <Link to="/login" className="hidden flex-col items-end justify-center hover:opacity-80 transition-opacity md:flex">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gray-300" />
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Guest</span>
                </div>
                <div className="text-sm font-medium text-gray-500 leading-none mt-0.5">ゲスト</div>
              </Link>
            )}
            <button className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
