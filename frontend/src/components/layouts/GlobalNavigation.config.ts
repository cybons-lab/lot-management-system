import {
  ClipboardList,
  Database,
  Download,
  FileSpreadsheet,
  HelpCircle,
  LayoutDashboard,
  Network,
  Package,
  Settings,
  Settings2,
  ShoppingCart,
  Table,
  TrendingUp,
  Users,
  Bell,
  Calendar,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";

import type { FeatureKey } from "@/constants/features";
import { ROUTES } from "@/constants/routes";

export interface NavItem {
  title: string;
  href?: string;
  icon: ComponentType<{ className?: string }>;
  color?: string;
  activeColor?: string;
  requireAdmin?: boolean;
  requireRoles?: string[];
  subItems?: { title: string; href: string }[];
  feature?: FeatureKey;
}

export const businessNavItems: NavItem[] = [
  { title: "ダッシュボード", href: ROUTES.DASHBOARD, icon: LayoutDashboard, feature: "dashboard" },
  { title: "在庫管理", href: ROUTES.INVENTORY.ROOT, icon: Package, feature: "inventory" },
  {
    title: "ロット管理（Excelビュー）",
    href: ROUTES.INVENTORY.EXCEL_PORTAL,
    icon: FileSpreadsheet,
    feature: "excel_view",
  },
  {
    title: "受注管理",
    href: ROUTES.OCR_RESULTS.LIST,
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
  { title: "マスタ", href: "/masters", icon: Database, feature: "masters" },
  {
    title: "カレンダー",
    href: ROUTES.CALENDAR,
    icon: Calendar,
    requireRoles: ["admin", "user"],
    feature: "calendar",
  },
];

export const automationNavItems: NavItem[] = [
  { title: "RPA", href: ROUTES.RPA.ROOT, icon: Zap, feature: "rpa" },
  {
    title: "SAP連携",
    href: ROUTES.SAP.ROOT,
    icon: Network,
    requireAdmin: true,
    feature: "sap",
  },
];

export const adminNavItems: NavItem[] = [
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

export const otherNavItems: NavItem[] = [
  {
    title: "オリジナル（需要予測）",
    href: ROUTES.FORECASTS.LIST,
    icon: TrendingUp,
    feature: "forecasts",
  },
  {
    title: "受注管理（旧）",
    href: ROUTES.ORDERS.LIST,
    icon: ShoppingCart,
    feature: "orders",
  },
  { title: "月次レポート", href: ROUTES.REPORTS.MONTHLY, icon: Table, feature: "reports" },
];
