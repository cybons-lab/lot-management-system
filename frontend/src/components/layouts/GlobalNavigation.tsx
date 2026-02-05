/* eslint-disable max-lines */
/**
 * GlobalNavigation.tsx
 *
 * グローバルナビゲーションコンポーネント
 * システム全体のメインメニューを提供
 *
 * Note: このファイルはナビゲーション構造全体を定義する論理的なまとまりであるため、
 * max-lines制限を無効化しています。
 */

import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  Settings2,
  Sparkles,
  TrendingUp,
  Database,
  Table,
  ClipboardList,
  HelpCircle,
  ChevronDown,
  Download,
  Calendar,
  FileSpreadsheet,
  Network,
  Users,
  Bell,
  Zap,
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

// 業務メニュー（3層構造の第1層）
const businessNavItems: NavItem[] = [
  {
    title: "ダッシュボード",
    href: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
    feature: "dashboard",
  },
  {
    title: "在庫管理",
    href: ROUTES.INVENTORY.ROOT,
    icon: Package,
    feature: "inventory",
  },
  {
    title: "ロット管理（Excelビュー）",
    href: ROUTES.INVENTORY.EXCEL_PORTAL,
    icon: FileSpreadsheet,
    feature: "excel_view",
  },
  {
    title: "受注管理",
    href: ROUTES.OCR_RESULTS.LIST, // OCR結果を受注管理として統合
    icon: ShoppingCart,
    feature: "ocr",
  },
  {
    title: "材料発注フォーキャスト",
    href: ROUTES.MATERIAL_ORDER_FORECASTS.LIST,
    icon: TrendingUp,
    feature: "material_order_forecasts",
  },
  {
    title: "入荷予定",
    href: ROUTES.INBOUND_PLANS.LIST,
    icon: Calendar,
    feature: "inbound_plans",
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
];

// 業務自動化メニュー（3層構造の第2層）
const automationNavItems: NavItem[] = [
  {
    title: "RPA",
    href: ROUTES.RPA.ROOT,
    icon: Zap,
    feature: "rpa",
  },
  {
    title: "SAP連携",
    href: ROUTES.SAP.ROOT,
    icon: Network,
    requireAdmin: true,
    feature: "sap",
  },
];

// システム管理メニュー（3層構造の第3層）
// システム管理メニュー（Admin専用）
const adminNavItems: NavItem[] = [
  {
    title: "管理",
    href: ROUTES.ADMIN.INDEX,
    icon: Settings,
    requireAdmin: true,
    feature: "admin",
  },
  {
    title: "システム設定",
    href: ROUTES.ADMIN.SYSTEM_SETTINGS,
    icon: Settings2,
    requireAdmin: true,
    feature: "system_settings",
  },
  {
    title: "ユーザー管理",
    href: ROUTES.ADMIN.USERS_MANAGEMENT,
    icon: Users,
    requireAdmin: true,
    feature: "users_management",
  },
  {
    title: "ログビューア",
    icon: ClipboardList,
    requireAdmin: true,
    feature: "logs",
    subItems: [
      { title: "リアルタイムログ", href: ROUTES.ADMIN.SYSTEM_LOGS },
      { title: "クライアントログ", href: ROUTES.ADMIN.CLIENT_LOGS },
      { title: "操作ログ", href: ROUTES.ADMIN.OPERATION_LOGS },
    ],
  },
  {
    title: "通知設定",
    href: ROUTES.ADMIN.NOTIFICATION_SETTINGS,
    icon: Bell,
    requireAdmin: true,
    feature: "notification_settings",
  },
  {
    title: "DBブラウザ",
    href: ROUTES.DEBUG.DB_BROWSER,
    icon: Table,
    requireAdmin: true,
    feature: "db_browser",
  },
  {
    title: "システムデプロイ",
    href: ROUTES.ADMIN.DEPLOY,
    icon: Settings2,
    requireAdmin: true,
    feature: "deploy",
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

// その他の機能メニュー（将来的に統合または整理予定）
const otherNavItems: NavItem[] = [
  {
    title: "オリジナル（需要予測）", // 旧版として残す
    href: ROUTES.FORECASTS.LIST,
    icon: TrendingUp,
    feature: "forecasts",
  },
  {
    title: "受注管理（旧）", // 旧版として残す
    href: ROUTES.ORDERS.LIST,
    icon: ShoppingCart,
    feature: "orders",
  },
  {
    title: "月次レポート",
    href: ROUTES.REPORTS.MONTHLY,
    icon: Table,
    feature: "reports",
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

  const filterItems = (items: NavItem[]) => {
    return items.filter((item) => {
      // ゲストユーザーの場合、許可されたfeatureのみ表示
      if (isGuest) {
        if (!item.feature || !guestAllowedFeatures.has(item.feature)) {
          return false;
        }
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
  };

  const visibleBusinessItems = filterItems(businessNavItems);
  const visibleAutomationItems = filterItems(automationNavItems);
  const visibleAdminItems = filterItems(adminNavItems);
  const visibleOtherItems = filterItems(otherNavItems);

  // 全てのアイテムを結合（3層構造 + その他機能）
  const allVisibleItems = [
    ...visibleBusinessItems,
    ...visibleAutomationItems,
    ...visibleAdminItems,
    ...visibleOtherItems,
  ];

  return (
    <nav className="flex flex-1 items-center gap-1 overflow-x-auto px-2">
      {allVisibleItems.map((item) => {
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
              <h1 className="text-base font-bold tracking-tight text-gray-900">Lossy</h1>
              <p className="text-[10px] font-medium tracking-wider text-gray-500 uppercase">
                Lot & Order Support System
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
