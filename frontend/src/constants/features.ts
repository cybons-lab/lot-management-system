/**
 * Feature visibility configuration
 *
 * This file defines all features that can be toggled via page_visibility settings.
 * These features MUST match the `feature` keys used in GlobalNavigation.tsx
 *
 * IMPORTANT: When adding new menu items with `feature` key to GlobalNavigation,
 * add the feature here to ensure it appears in System Settings page.
 */

export const AVAILABLE_FEATURES = [
  "inventory",
  "forecasts",
  "masters",
  "orders",
  "ocr",
  "rpa",
  "dashboard",
  "sap",
  "admin",
  "db_browser",
  "logs",
  "operation_logs",
  "calendar",
  "export",
  "help",
] as const;

export type FeatureKey = (typeof AVAILABLE_FEATURES)[number];

/**
 * Feature display names for UI
 */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  inventory: "在庫・ロット管理",
  forecasts: "需要予測",
  masters: "マスタ",
  orders: "受注管理",
  ocr: "OCR結果",
  rpa: "RPA",
  dashboard: "ダッシュボード",
  sap: "SAP連携",
  admin: "システム管理",
  db_browser: "DBブラウザ",
  logs: "システムログ",
  operation_logs: "操作ログ",
  calendar: "カレンダー",
  export: "エクスポート",
  help: "ヘルプ",
};
