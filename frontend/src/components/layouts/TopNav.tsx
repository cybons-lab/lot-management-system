import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  GitBranch,
  Settings,
  Sparkles,
  TrendingUp,
  PackagePlus,
  Database,
  Users,
  Warehouse,
  Building2,
  ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

import { cn } from "@/shared/libs/utils";
import { ROUTES } from "@/constants/routes";

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

interface MasterSubItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const masterSubItems: MasterSubItem[] = [
  {
    title: "得意先マスタ",
    href: ROUTES.MASTERS.CUSTOMERS,
    icon: Users,
  },
  {
    title: "倉庫マスタ",
    href: ROUTES.MASTERS.WAREHOUSES,
    icon: Warehouse,
  },
  {
    title: "商品マスタ",
    href: ROUTES.MASTERS.PRODUCTS,
    icon: Package,
  },
  {
    title: "仕入先マスタ",
    href: ROUTES.MASTERS.SUPPLIERS,
    icon: Building2,
  },
  {
    title: "得意先商品マスタ",
    href: ROUTES.MASTERS.CUSTOMER_ITEMS,
    icon: Database,
  },
];

const navItems: NavItem[] = [
  {
    title: "ダッシュボード",
    href: "/dashboard",
    icon: LayoutDashboard,
    color: "text-gray-600",
    activeColor: "text-blue-600 bg-blue-50",
  },
  {
    title: "需要予測",
    href: "/forecasts",
    icon: TrendingUp,
    color: "text-gray-600",
    activeColor: "text-cyan-600 bg-cyan-50",
  },
  {
    title: "入荷予定",
    href: "/inbound-plans",
    icon: PackagePlus,
    color: "text-gray-600",
    activeColor: "text-indigo-600 bg-indigo-50",
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
    title: "設定",
    href: "/settings/users",
    icon: Users,
    color: "text-gray-600",
    activeColor: "text-amber-600 bg-amber-50",
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

interface TopNavProps {
  currentPath: string;
}

export function TopNav({ currentPath }: TopNavProps) {
  const [isMasterDropdownOpen, setIsMasterDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // クリック外でドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMasterDropdownOpen(false);
      }
    };

    if (isMasterDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMasterDropdownOpen]);

  // マスタページがアクティブかどうか
  const isMasterActive = masterSubItems.some((item) => currentPath.startsWith(item.href));

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
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentPath === item.href ||
                (item.href !== "/dashboard" && currentPath.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "group flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200",
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

            {/* マスタドロップダウン */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsMasterDropdownOpen(!isMasterDropdownOpen)}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200",
                  isMasterActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                <Database
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isMasterActive ? "text-gray-900" : "text-gray-500 group-hover:text-gray-900",
                  )}
                />
                <span className="hidden lg:inline">マスタ</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    isMasterDropdownOpen && "rotate-180",
                  )}
                />
              </button>

              {/* ドロップダウンメニュー */}
              {isMasterDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-56 rounded-md border border-gray-200 bg-white shadow-lg">
                  <div className="py-1">
                    {masterSubItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isSubActive = currentPath.startsWith(subItem.href);

                      return (
                        <Link
                          key={subItem.href}
                          to={subItem.href}
                          onClick={() => setIsMasterDropdownOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                            isSubActive
                              ? "bg-teal-50 font-medium text-teal-900"
                              : "text-gray-700 hover:bg-gray-50",
                          )}
                        >
                          <SubIcon
                            className={cn(
                              "h-4 w-4",
                              isSubActive ? "text-teal-600" : "text-gray-400",
                            )}
                          />
                          {subItem.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* 右側のユーザー情報など */}
          <div className="flex items-center gap-3 border-l border-gray-200 pl-3">
            <div className="hidden items-center gap-2 rounded-full bg-gray-100 px-3 py-1 md:flex">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs font-medium text-gray-700">オンライン</span>
            </div>
            <button className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
