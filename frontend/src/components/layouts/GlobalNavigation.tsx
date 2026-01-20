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
  ClipboardList,
  HelpCircle,
  ChevronDown,
  Download,
  Calendar,
  FileText,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/display/dropdown-menu";
import { ROUTES } from "@/constants/routes";
import { type User, useAuth } from "@/features/auth/AuthContext";
import { cn } from "@/shared/libs/utils";

// ============================================
// 型定義
// ============================================

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  activeColor?: string;
  requireAdmin?: boolean;
  requireRoles?: string[];
  subItems?: { title: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    title: "ダッシュボード",
    href: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
  },
  {
    title: "オリジナル（需要予測）",
    href: ROUTES.FORECASTS.LIST,
    icon: TrendingUp,
  },
  {
    title: "入荷予定",
    href: ROUTES.INBOUND_PLANS.LIST,
    icon: PackagePlus,
  },
  {
    title: "在庫・ロット管理",
    href: ROUTES.INVENTORY.ROOT,
    icon: Package,
  },
  {
    title: "受注管理",
    href: ROUTES.ORDERS.LIST,
    icon: ShoppingCart,
  },
  {
    title: "OCR結果",
    href: ROUTES.OCR_RESULTS.LIST,
    icon: FileText,
  },
  {
    title: "RPA",
    href: ROUTES.RPA.ROOT,
    icon: Settings,
  },
  {
    title: "管理",
    href: ROUTES.ADMIN.INDEX,
    icon: Settings,
    requireAdmin: true,
  },
  {
    title: "ログ",
    icon: ClipboardList,
    requireAdmin: true,
    subItems: [
      { title: "操作ログ", href: ROUTES.ADMIN.OPERATION_LOGS },
      { title: "クライアントログ", href: ROUTES.ADMIN.CLIENT_LOGS },
    ],
  },
  {
    title: "マスタ",
    href: "/masters",
    icon: Database,
  },
  {
    title: "カレンダー",
    href: ROUTES.CALENDAR,
    icon: Calendar,
    requireRoles: ["admin", "user"],
  },
  {
    title: "エクスポート",
    href: "/admin/export",
    icon: Download,
    requireAdmin: true,
  },
  {
    title: "ヘルプ",
    icon: HelpCircle,
    subItems: [{ title: "フローマップ", href: ROUTES.HELP.FLOW_MAP }],
  },
];

// ============================================
// メインコンポーネント
// ============================================

// --- Sub-components ---

function NavItemDropdown({ item, currentPath }: { item: NavItem; currentPath: string }) {
  const Icon = item.icon;
  const isSubActive = item.subItems?.some(
    (sub) => currentPath === sub.href || currentPath.startsWith(sub.href),
  );

  return (
    <DropdownMenu key={item.title}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex flex-shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 outline-none",
            isSubActive
              ? "bg-gray-100 text-gray-900"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4 transition-colors",
              isSubActive ? "text-gray-900" : "text-gray-500 group-hover:text-gray-900",
            )}
          />
          <span className="hidden lg:inline">{item.title}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {item.subItems?.map((sub) => (
          <DropdownMenuItem key={sub.href} asChild>
            <Link
              to={sub.href}
              className={cn(
                "w-full cursor-pointer",
                currentPath === sub.href && "bg-gray-100 font-bold",
              )}
            >
              {sub.title}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavItemSingle({ item, currentPath }: { item: NavItem; currentPath: string }) {
  const Icon = item.icon;
  const isActive =
    currentPath === item.href ||
    (item.href !== "/dashboard" && item.href && currentPath.startsWith(item.href));

  return (
    <Link
      to={item.href || "#"}
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
}

function NavItems({ user, currentPath }: { currentPath: string; user: User | null }) {
  const visibleItems = navItems.filter((item) => {
    if (item.requireAdmin && !user?.roles?.includes("admin")) return false;
    if (item.requireRoles && !item.requireRoles.some((role) => user?.roles?.includes(role))) {
      return false;
    }
    return true;
  });

  return (
    <nav className="flex flex-1 items-center gap-1 overflow-x-auto px-2">
      {visibleItems.map((item) => {
        if (item.subItems) {
          return <NavItemDropdown key={item.title} item={item} currentPath={currentPath} />;
        }
        return (
          <NavItemSingle key={item.title || item.href} item={item} currentPath={currentPath} />
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

          <NavItems user={user} currentPath={currentPath} />
          <UserMenu user={user} logout={logout} />
        </div>
      </div>
    </header>
  );
}
