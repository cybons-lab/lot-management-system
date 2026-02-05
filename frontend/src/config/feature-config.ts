/**
 * feature-config.ts
 *
 * システム全体の機能（ページ・タブ）の階層構造を定義します。
 * この定義は以下の用途で使用されます：
 * 1. GlobalNavigation のメニュー生成
 * 2. システム設定（アクセス制御）の項目表示
 * 3. サブルーティングの整合性チェック
 */

export interface SubFeature {
  id: string;
  label: string;
  path?: string;
}

export interface FeatureDefinition {
  id: string;
  label: string;
  icon?: string; // Lucide icon name
  subFeatures?: SubFeature[];
}

export const FEATURE_CONFIG: Record<string, FeatureDefinition> = {
  dashboard: {
    id: "dashboard",
    label: "ダッシュボード",
  },
  inventory: {
    id: "inventory",
    label: "在庫・ロット管理",
    subFeatures: [
      { id: "summary", label: "サマリ" },
      { id: "lots", label: "ロット一覧" },
      { id: "inbound", label: "入荷予定" },
      { id: "intake-history", label: "入庫履歴" },
      { id: "withdrawal-history", label: "出庫履歴" },
      { id: "forecast", label: "需要予測" },
      { id: "replenishment", label: "発注提案" },
    ],
  },
  forecasts: {
    id: "forecasts",
    label: "需要予測 (オリジナル)",
  },
  material_order_forecasts: {
    id: "material_order_forecasts",
    label: "材料発注フォーキャスト",
  },
  inbound_plans: {
    id: "inbound_plans",
    label: "入荷予定",
  },
  reports: {
    id: "reports",
    label: "レポート",
    subFeatures: [{ id: "monthly", label: "月次レポート" }],
  },
  orders: {
    id: "orders",
    label: "受注管理",
  },
  ocr: {
    id: "ocr",
    label: "受注管理",
  },
  rpa: {
    id: "rpa",
    label: "RPA",
  },
  masters: {
    id: "masters",
    label: "マスタ",
    subFeatures: [
      { id: "suppliers", label: "仕入先マスタ" },
      { id: "customers", label: "得意先マスタ" },
      { id: "warehouses", label: "倉庫マスタ" },
      { id: "supplier-products", label: "仕入先品目マスタ" },
      { id: "customer-items", label: "得意先品目マスタ" },
      { id: "uom-conversions", label: "単位変換マスタ" },
      { id: "shipping-masters", label: "出荷元マスタ" },
      { id: "supplier-assignments", label: "担当仕入先割当" },
      { id: "bulk-load", label: "一括登録" },
      { id: "delivery-places", label: "納品先マスタ" },
      { id: "makers", label: "メーカーマスタ" },
      { id: "warehouse-delivery-routes", label: "倉庫配送ルートマスタ" },
    ],
  },
  calendar: {
    id: "calendar",
    label: "カレンダー",
  },
  help: {
    id: "help",
    label: "ヘルプ",
    subFeatures: [
      { id: "flow-map", label: "業務フローガイド" },
      { id: "db-schema", label: "データベーススキーマ", path: "database-schema" },
    ],
  },
  "database-schema": {
    id: "database-schema",
    label: "データベーススキーマ（詳細）",
    subFeatures: [
      { id: "overview", label: "全体概要" },
      { id: "tables", label: "テーブル一覧" },
      { id: "terminology", label: "用語・命名規則" },
    ],
  },
  sap: {
    id: "sap",
    label: "SAP連携",
    subFeatures: [
      { id: "orders", label: "受注データ" },
      { id: "stocks", label: "在庫データ" },
      { id: "history", label: "連携履歴" },
    ],
  },
  // システム管理関連
  system_settings: {
    id: "system_settings",
    label: "システム設定",
    subFeatures: [
      { id: "security", label: "セキュリティ・アクセス制御" },
      { id: "features", label: "機能表示設定" },
      { id: "basic", label: "基本設定" },
    ],
  },
  users_management: {
    id: "users_management",
    label: "ユーザー管理",
    subFeatures: [
      { id: "users", label: "ユーザー一覧" },
      { id: "roles", label: "ロール管理" },
      { id: "invitation", label: "招待・登録" },
    ],
  },
  logs: {
    id: "logs",
    label: "ログビューア",
    subFeatures: [
      { id: "realtime", label: "リアルタイムログ" },
      { id: "client", label: "クライアントログ" },
      { id: "operation", label: "操作ログ" },
    ],
  },
  notification_settings: {
    id: "notification_settings",
    label: "通知設定",
    subFeatures: [
      { id: "rules", label: "通知ルール" },
      { id: "email", label: "メール通知設定" },
      { id: "slack", label: "Slack連携" },
    ],
  },
  db_browser: {
    id: "db_browser",
    label: "DBブラウザ",
    subFeatures: [
      { id: "schema", label: "スキーマ" },
      { id: "rows", label: "データ" },
      { id: "definition", label: "定義" },
      { id: "relations", label: "リレーション" },
    ],
  },
  deploy: {
    id: "deploy",
    label: "システムデプロイ",
  },
  export: {
    id: "export",
    label: "エクスポート",
  },
  // Legacy
  admin: {
    id: "admin",
    label: "システム管理（旧）",
  },
  operation_logs: {
    id: "operation_logs",
    label: "操作ログ（旧）",
  },
  excel_view: {
    id: "excel_view",
    label: "ロット管理（Excelビュー）",
  },
};
