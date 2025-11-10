import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  GitBranch,
  TrendingUp,
  Settings,
} from "lucide-react";
import { cn } from "@/shared/libs/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "danger";
}

const navItems: NavItem[] = [
  {
    title: "ダッシュボード",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "在庫管理",
    href: "/inventory",
    icon: Package,
  },
  {
    title: "受注管理",
    href: "/orders",
    icon: ShoppingCart,
  },
  {
    title: "ロット引当処理",
    href: "/allocations",
    icon: GitBranch,
  },
  {
    title: "Forecast一覧",
    href: "/forecast/list",
    icon: TrendingUp,
  },
  {
    title: "Forecast",
    href: "/forecast",
    icon: TrendingUp,
  },
  {
    title: "管理",
    href: "/admin",
    icon: Settings,
    variant: "danger",
  },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 border-r bg-white">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b p-6">
          <h1 className="text-xl font-bold text-gray-900">ロット管理システム</h1>
          <p className="text-sm text-gray-500">MVP</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  item.variant === "danger" &&
                    !isActive &&
                    "text-red-600 hover:bg-red-50 hover:text-red-700",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <p className="text-xs text-gray-500">Version 2.0.0</p>
        </div>
      </div>
    </aside>
  );
}
