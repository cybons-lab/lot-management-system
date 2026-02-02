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
  Table,
  ClipboardList,
  HelpCircle,
  ChevronDown,
  Download,
  Calendar,
  FileText,
  FileSpreadsheet,
  Network,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/display";
import { type FeatureKey } from "@/constants/features";
import { ROUTES } from "@/constants/routes";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { type User, useAuth } from "@/features/auth/AuthContext";
import { isGuestUser } from "@/features/auth/permissions/guest-permissions";
import { NotificationBell } from "@/features/notifications/components";
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
  feature?: FeatureKey; // Feature key for visibility control
}

const navItems: NavItem[] = [
  {
    title: "ダッシュボード",
    href: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
    feature: "dashboard",
  },
  {
    title: "オリジナル（需要予測）",
    href: ROUTES.FORECASTS.LIST,
    icon: TrendingUp,
    feature: "forecasts",
  },
  {
    title: "入荷予定",
    href: ROUTES.INBOUND_PLANS.LIST,
    icon: PackagePlus,
    feature: "inventory", // Group under inventory? or separate?
  },
  {
    title: "在庫・ロット管理",
    href: ROUTES.INVENTORY.ROOT,
    icon: Package,
    feature: "inventory",
  },
  {
    title: "ロット管理（Excelビュー）",
    href: ROUTES.INVENTORY.EXCEL_PORTAL,
    icon: FileSpreadsheet,
  },
  {
    title: "受注管理",
    href: ROUTES.ORDERS.LIST,
    icon: ShoppingCart,
    feature: "orders",
  },
  {
    title: "OCR結果",
    href: ROUTES.OCR_RESULTS.LIST,
    icon: FileText,
    feature: "ocr",
  },
  {
    title: "RPA",
    href: ROUTES.RPA.ROOT,
    icon: Settings,
    feature: "rpa",
  },
  {
    title: "SAP連携",
    href: ROUTES.SAP.ROOT,
    icon: Network,
    requireAdmin: true,
    feature: "sap",
  },
  {
    title: "管理",
    href: ROUTES.ADMIN.INDEX,
    icon: Settings,
    requireAdmin: true,
    feature: "admin",
  },
  {
    title: "DBブラウザ",
    href: ROUTES.DEBUG.DB_BROWSER,
    icon: Table,
    requireAdmin: true,
    feature: "db_browser",
  },
  {
    title: "システムログ",
    icon: ClipboardList,
    requireAdmin: true,
    feature: "logs",
    subItems: [
      { title: "リアルタイムログ", href: ROUTES.ADMIN.SYSTEM_LOGS },
      { title: "クライアントログ", href: ROUTES.ADMIN.CLIENT_LOGS },
    ],
  },
  {
    title: "操作ログ",
    href: ROUTES.ADMIN.OPERATION_LOGS,
    icon: FileText,
    requireAdmin: true,
    feature: "operation_logs",
  },
  {
    title: "システムデプロイ",
    href: ROUTES.ADMIN.DEPLOY,
    icon: Settings,
    requireAdmin: true,
    feature: "deploy",
  },
  {
    title: "マスタ",
    href: "/masters",
    icon: Database,
    feature: "masters",
  },
  {
    title: "カレンダー",
    href: ROUTES.CALENDAR,
    icon: Calendar,
    requireRoles: ["admin", "user"],
    feature: "calendar",
  },
  {
    title: "エクスポート",
    href: "/admin/export",
    icon: Download,
    requireAdmin: true,
    feature: "export",
  },
  {
    title: "ヘルプ",
    icon: HelpCircle,
    feature: "help",
    subItems: [
      { title: "業務フローガイド", href: ROUTES.HELP.FLOW_MAP },
      { title: "データベーススキーマ", href: ROUTES.HELP.DATABASE_SCHEMA },
    ],
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
    <DropdownMenu key={item.title} modal={false}>
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

  // More specific paths that should NOT match parent routes
  // e.g., /inventory/excel-portal should not activate /inventory
  const specificChildPaths = ["/inventory/excel-portal", "/inventory/excel-view"];

  // Check if current path matches a more specific child route
  const matchesMoreSpecificRoute =
    item.href === ROUTES.INVENTORY.ROOT &&
    specificChildPaths.some((path) => currentPath.startsWith(path));

  const isActive =
    !matchesMoreSpecificRoute &&
    (currentPath === item.href ||
      (item.href !== "/dashboard" && item.href && currentPath.startsWith(item.href)));

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
  const { isFeatureVisible } = useSystemSettings();
  const isGuest = user && isGuestUser(user.roles);

  // ゲストユーザーは限定的なメニューのみ表示
  const guestAllowedFeatures = new Set(["dashboard", "inventory"]);

  const visibleItems = navItems.filter((item) => {
    // ゲストユーザーの場合、許可されたfeatureのみ表示
    if (isGuest && item.feature && !guestAllowedFeatures.has(item.feature)) {
      return false;
    }
    if (item.requireAdmin && !user?.roles?.includes("admin")) return false;
    if (item.requireRoles && !item.requireRoles.some((role) => user?.roles?.includes(role))) {
      return false;
    }
    if (item.feature && !isFeatureVisible(item.feature)) {
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
  const isGuest = user && isGuestUser(user.roles);

  return (
    <div className="flex items-center gap-3 border-l border-gray-200 pl-3">
      {user ? (
        <>
          <NotificationBell />
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
              ) : user.roles?.includes("guest") ? (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-gray-700 uppercase">
                  ゲスト
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
          {/* ゲストはログインボタン、それ以外はログアウトボタン */}
          {isGuest ? (
            <Link
              to="/login"
              className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              ログイン
            </Link>
          ) : (
            <button
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
              className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              ログアウト
            </button>
          )}
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
