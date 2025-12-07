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
import { type User, useAuth } from "@/features/auth/AuthContext";
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

// --- Sub-components ---

function NavItems({ currentPath, user }: { currentPath: string; user: User | null }) {
  return (
    <nav className="flex flex-1 items-center gap-1 overflow-x-auto px-2">
      {navItems
        .filter((item) => !item.requireAdmin || user?.roles?.includes("admin"))
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
  );
}

function UserMenu({ user, logout }: { user: User | null; logout: () => void }) {
  return (
    <div className="flex items-center gap-3 border-l border-gray-200 pl-3">
      {user ? (
        <>
          <div className="hidden flex-col items-end justify-center md:flex">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase">
                Online
              </span>
              {/* ロールバッジ */}
              {user.roles?.includes("admin") ? (
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-red-700 uppercase">
                  管理者
                </span>
              ) : (
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-blue-700 uppercase">
                  一般
                </span>
              )}
            </div>
            <div className="mt-0.5 text-sm leading-none font-bold text-gray-900">
              {user.display_name}
            </div>
          </div>
          {/* ログアウトボタン */}
          <button
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
            className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            ログアウト
          </button>
        </>
      ) : (
        <Link
          to="/login"
          className="hidden flex-col items-end justify-center transition-opacity hover:opacity-80 md:flex"
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-300" />
            <span className="text-[10px] font-medium tracking-wider text-gray-400 uppercase">
              Guest
            </span>
          </div>
          <div className="mt-0.5 text-sm leading-none font-medium text-gray-500">ゲスト</div>
        </Link>
      )}
      <button className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900">
        <Settings className="h-5 w-5" />
      </button>
    </div>
  );
}

// ============================================
// メインコンポーネント
// ============================================

interface GlobalNavigationProps {
  currentPath: string;
}

// ナビゲーション項目とレイアウトを一箇所にまとめるため分割しない
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

          <NavItems currentPath={currentPath} user={user} />
          <UserMenu user={user} logout={logout} />
        </div>
      </div>
    </header>
  );
}
