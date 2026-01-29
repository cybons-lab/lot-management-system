/**
 * RBAC 権限設定（静的定義）
 *
 * 【設計意図】
 * Phase 1: 静的定義ファイルで権限を管理
 * Phase 2以降: DB化して管理画面から変更可能に
 *
 * 【ロール設計】
 * - admin: 全機能アクセス可能
 * - user: 業務機能アクセス可能（管理機能は不可）
 * - guest: 閲覧のみ（未ログイン状態）
 *
 * 【権限方針】
 * - guest可: 閲覧系ページ（dashboard, orders, inventory等の一覧表示）
 * - user以上: 操作が必要なページ（OCR結果、RPA等）
 * - admin専用: 管理系ページ（ユーザー管理、システム設定等）
 */

import type {
  HardDeleteConditions,
  OperationPermission,
  PermissionConfig,
  RoutePermission,
  TabPermission,
} from "./types";

/**
 * ルート権限設定
 */
export const routePermissions: RoutePermission[] = [
  // ========================================
  // guest可（閲覧系）
  // ========================================
  { routeKey: "ROOT", path: "/", allowedRoles: ["admin", "user", "guest"] },
  { routeKey: "DASHBOARD", path: "/dashboard", allowedRoles: ["admin", "user", "guest"] },
  { routeKey: "HELP.FLOW_MAP", path: "/help/flow-map", allowedRoles: ["admin", "user", "guest"] },

  // 受注一覧（閲覧）
  { routeKey: "ORDERS.LIST", path: "/orders", allowedRoles: ["admin", "user", "guest"] },
  { routeKey: "ORDERS.DETAIL", path: "/orders/:orderId", allowedRoles: ["admin", "user", "guest"] },
  {
    routeKey: "CONFIRMED_LINES",
    path: "/confirmed-lines",
    allowedRoles: ["admin", "user", "guest"],
  },

  // 在庫一覧（閲覧）
  { routeKey: "INVENTORY.ROOT", path: "/inventory", allowedRoles: ["admin", "user", "guest"] },
  {
    routeKey: "INVENTORY.SUMMARY",
    path: "/inventory/summary",
    allowedRoles: ["admin", "user", "guest"],
  },
  { routeKey: "INVENTORY.LOTS", path: "/inventory/lots", allowedRoles: ["admin", "user", "guest"] },
  {
    routeKey: "INVENTORY.LOT_DETAIL",
    path: "/inventory/lots/:lotId",
    allowedRoles: ["admin", "user", "guest"],
  },
  {
    routeKey: "INVENTORY.ITEMS.DETAIL",
    path: "/inventory/items/:productId/:warehouseId",
    allowedRoles: ["admin", "user", "guest"],
  },

  // フォーキャスト一覧（閲覧）
  { routeKey: "FORECASTS.LIST", path: "/forecasts", allowedRoles: ["admin", "user", "guest"] },
  {
    routeKey: "FORECASTS.DETAIL",
    path: "/forecasts/:id",
    allowedRoles: ["admin", "user", "guest"],
  },

  // 入荷予定一覧（閲覧）
  {
    routeKey: "INBOUND_PLANS.LIST",
    path: "/inbound-plans",
    allowedRoles: ["admin", "user", "guest"],
  },
  {
    routeKey: "INBOUND_PLANS.DETAIL",
    path: "/inbound-plans/:id",
    allowedRoles: ["admin", "user", "guest"],
  },

  // マスタ一覧（閲覧）
  { routeKey: "MASTERS.INDEX", path: "/masters", allowedRoles: ["admin", "user", "guest"] },
  {
    routeKey: "MASTERS.WAREHOUSES",
    path: "/warehouses",
    allowedRoles: ["admin", "user", "guest"],
  },
  { routeKey: "MASTERS.SUPPLIERS", path: "/suppliers", allowedRoles: ["admin", "user", "guest"] },
  { routeKey: "MASTERS.CUSTOMERS", path: "/customers", allowedRoles: ["admin", "user", "guest"] },
  {
    routeKey: "MASTERS.SUPPLIER_PRODUCTS",
    path: "/supplier-products",
    allowedRoles: ["admin", "user", "guest"],
  },
  {
    routeKey: "MASTERS.CUSTOMER_ITEMS",
    path: "/customer-items",
    allowedRoles: ["admin", "user", "guest"],
  },
  {
    routeKey: "MASTERS.DELIVERY_PLACES",
    path: "/delivery-places",
    allowedRoles: ["admin", "user", "guest"],
  },
  {
    routeKey: "MASTERS.PRODUCT_MAPPINGS",
    path: "/product-mappings",
    allowedRoles: ["admin", "user", "guest"],
  },
  {
    routeKey: "MASTERS.SHIPPING_MASTERS",
    path: "/masters/shipping-masters",
    allowedRoles: ["admin", "user", "guest"],
  },

  // レガシーリダイレクト用 / ユーティリティ
  {
    routeKey: "LEGACY.ALLOCATIONS",
    path: "/allocations",
    allowedRoles: ["admin", "user", "guest"],
  },
  {
    routeKey: "INVENTORY.EXCEL_VIEW",
    path: "/inventory/excel-view",
    allowedRoles: ["admin", "user", "guest"],
  },
  {
    routeKey: "INVENTORY.EXCEL_VIEW_ANY",
    path: "/inventory/excel-view/*",
    allowedRoles: ["admin", "user", "guest"],
  },

  // ========================================
  // user以上（操作が必要なページ）
  // ========================================

  // 在庫操作
  { routeKey: "INVENTORY.MOVES", path: "/inventory/moves", allowedRoles: ["admin", "user"] },
  {
    routeKey: "INVENTORY.ADJUSTMENTS.LIST",
    path: "/inventory/adjustments",
    allowedRoles: ["admin", "user"],
  },
  {
    routeKey: "INVENTORY.ADJUSTMENTS.NEW",
    path: "/inventory/adjustments/new",
    allowedRoles: ["admin", "user"],
  },
  {
    routeKey: "INVENTORY.ADHOC.NEW",
    path: "/inventory/adhoc/new",
    allowedRoles: ["admin", "user"],
  },
  { routeKey: "INVENTORY.HISTORY", path: "/inventory/history", allowedRoles: ["admin", "user"] },
  {
    routeKey: "INVENTORY.WITHDRAWALS.LIST",
    path: "/inventory/withdrawals",
    allowedRoles: ["admin", "user"],
  },
  {
    routeKey: "INVENTORY.WITHDRAWALS.NEW",
    path: "/inventory/withdrawals/new",
    allowedRoles: ["admin", "user"],
  },

  // フォーキャスト操作
  { routeKey: "FORECASTS.NEW", path: "/forecasts/new", allowedRoles: ["admin", "user"] },
  {
    routeKey: "FORECASTS.EDIT",
    path: "/forecasts/:forecastId/edit",
    allowedRoles: ["admin", "user"],
  },
  { routeKey: "FORECASTS.IMPORT", path: "/forecasts/import", allowedRoles: ["admin", "user"] },

  // 入荷予定操作
  { routeKey: "INBOUND_PLANS.NEW", path: "/inbound-plans/new", allowedRoles: ["admin", "user"] },
  {
    routeKey: "INBOUND_PLANS.EDIT",
    path: "/inbound-plans/:planId/edit",
    allowedRoles: ["admin", "user"],
  },

  // OCR結果（操作あり）
  { routeKey: "OCR_RESULTS.LIST", path: "/ocr-results", allowedRoles: ["admin", "user"] },

  // RPA
  { routeKey: "RPA.ROOT", path: "/rpa", allowedRoles: ["admin", "user"] },
  {
    routeKey: "RPA.MATERIAL_DELIVERY_SIMPLE",
    path: "/rpa/material-delivery-simple",
    allowedRoles: ["admin", "user"],
  },
  {
    routeKey: "RPA.GENERIC_CLOUD_FLOW",
    path: "/rpa/generic-cloud-flow",
    allowedRoles: ["admin", "user"],
  },
  { routeKey: "RPA.SMARTREAD", path: "/rpa/smartread", allowedRoles: ["admin", "user"] },
  {
    routeKey: "RPA.MATERIAL_DELIVERY_NOTE.ROOT",
    path: "/rpa/material-delivery-note",
    allowedRoles: ["admin", "user"],
  },
  {
    routeKey: "RPA.MATERIAL_DELIVERY_NOTE.STEP1",
    path: "/rpa/material-delivery-note/step1",
    allowedRoles: ["admin", "user"],
  },
  {
    routeKey: "RPA.MATERIAL_DELIVERY_NOTE.CSV_IMPORT",
    path: "/rpa/material-delivery-note/csv-import",
    allowedRoles: ["admin", "user"],
  },
  {
    routeKey: "RPA.MATERIAL_DELIVERY_NOTE.STEP2",
    path: "/rpa/material-delivery-note/step2",
    allowedRoles: ["admin", "user"],
  },
  {
    routeKey: "RPA.MATERIAL_DELIVERY_NOTE.STEP3",
    path: "/rpa/material-delivery-note/step3",
    allowedRoles: ["admin", "user"],
  },
  {
    routeKey: "RPA.MATERIAL_DELIVERY_NOTE.STEP4",
    path: "/rpa/material-delivery-note/step4",
    allowedRoles: ["admin", "user"],
  },
  {
    routeKey: "RPA.MATERIAL_DELIVERY_NOTE.RUNS",
    path: "/rpa/material-delivery-note/runs",
    allowedRoles: ["admin", "user"],
  },
  {
    routeKey: "RPA.MATERIAL_DELIVERY_NOTE.RUN_DETAIL",
    path: "/rpa/material-delivery-note/runs/:runId",
    allowedRoles: ["admin", "user"],
  },
  {
    routeKey: "RPA.MATERIAL_DELIVERY_NOTE.RUN_MONITOR",
    path: "/rpa/material-delivery-note/runs/:runId/monitor",
    allowedRoles: ["admin", "user"],
  },
  {
    routeKey: "RPA.MATERIAL_DELIVERY_NOTE.STEP3_DETAIL",
    path: "/rpa/material-delivery-note/step3/:runId",
    allowedRoles: ["admin", "user"],
  },
  {
    routeKey: "RPA.MATERIAL_DELIVERY_NOTE.STEP4_DETAIL",
    path: "/rpa/material-delivery-note/step4/:runId",
    allowedRoles: ["admin", "user"],
  },
  {
    routeKey: "RPA.MATERIAL_DELIVERY_NOTE.LAYER_CODES",
    path: "/rpa/material-delivery-note/layer-codes",
    allowedRoles: ["admin", "user"],
  },

  // カレンダー設定
  { routeKey: "CALENDAR", path: "/calendar", allowedRoles: ["admin", "user"] },

  // マスタ操作
  { routeKey: "MASTERS.BULK_LOAD", path: "/masters/bulk-load", allowedRoles: ["admin", "user"] },
  {
    routeKey: "MASTERS.SUPPLIER_PRODUCTS",
    path: "/masters/supplier-products",
    allowedRoles: ["admin", "user"],
  },
  {
    routeKey: "MASTERS.UOM_CONVERSIONS",
    path: "/masters/uom-conversions",
    allowedRoles: ["admin", "user"],
  },
  {
    routeKey: "MASTERS.PRIMARY_ASSIGNMENTS",
    path: "/masters/primary-assignments",
    allowedRoles: ["admin", "user"],
  },
  {
    routeKey: "MASTERS.WAREHOUSE_DELIVERY_ROUTES",
    path: "/warehouse-delivery-routes",
    allowedRoles: ["admin", "user"],
  },

  // ========================================
  // admin専用
  // ========================================
  { routeKey: "SETTINGS.USERS", path: "/settings/users", allowedRoles: ["admin"] },
  { routeKey: "SETTINGS.ROLES", path: "/settings/roles", allowedRoles: ["admin"] },
  { routeKey: "ADMIN.INDEX", path: "/admin", allowedRoles: ["admin"] },
  { routeKey: "ADMIN.OPERATION_LOGS", path: "/admin/operation-logs", allowedRoles: ["admin"] },
  { routeKey: "ADMIN.BUSINESS_RULES", path: "/admin/business-rules", allowedRoles: ["admin"] },
  { routeKey: "ADMIN.BATCH_JOBS", path: "/admin/batch-jobs", allowedRoles: ["admin"] },
  {
    routeKey: "ADMIN.MASTER_CHANGE_LOGS",
    path: "/admin/master-change-logs",
    allowedRoles: ["admin"],
  },
  { routeKey: "ADMIN.SEED_SNAPSHOTS", path: "/admin/seed-snapshots", allowedRoles: ["admin"] },
  { routeKey: "ADMIN.CLIENT_LOGS", path: "/admin/client-logs", allowedRoles: ["admin"] },
  { routeKey: "ADMIN.EXPORT", path: "/admin/export", allowedRoles: ["admin"] },
  { routeKey: "DEBUG.DB_BROWSER", path: "/debug/db", allowedRoles: ["admin"] },
  { routeKey: "SAP.ROOT", path: "/sap", allowedRoles: ["admin"] },
];

/**
 * タブ権限設定
 */
export const tabPermissions: TabPermission[] = [
  // 在庫ページのタブ
  { routeKey: "INVENTORY.ROOT", tabKey: "summary", allowedRoles: ["admin", "user", "guest"] },
  { routeKey: "INVENTORY.ROOT", tabKey: "lots", allowedRoles: ["admin", "user", "guest"] },
  { routeKey: "INVENTORY.ROOT", tabKey: "moves", allowedRoles: ["admin", "user"] },
  { routeKey: "INVENTORY.ROOT", tabKey: "adjustments", allowedRoles: ["admin", "user"] },
  { routeKey: "INVENTORY.ROOT", tabKey: "history", allowedRoles: ["admin", "user"] },
  { routeKey: "INVENTORY.ROOT", tabKey: "withdrawals", allowedRoles: ["admin", "user"] },

  // 在庫アイテム詳細ページのタブ
  {
    routeKey: "INVENTORY.ITEMS.DETAIL",
    tabKey: "summary",
    allowedRoles: ["admin", "user", "guest"],
  },
  { routeKey: "INVENTORY.ITEMS.DETAIL", tabKey: "lots", allowedRoles: ["admin", "user", "guest"] },
  {
    routeKey: "INVENTORY.ITEMS.DETAIL",
    tabKey: "withdrawals",
    allowedRoles: ["admin", "user", "guest"],
  },
  {
    routeKey: "INVENTORY.ITEMS.DETAIL",
    tabKey: "forecasts",
    allowedRoles: ["admin", "user", "guest"],
  },
  {
    routeKey: "INVENTORY.ITEMS.DETAIL",
    tabKey: "inbound-plans",
    allowedRoles: ["admin", "user", "guest"],
  },
  {
    routeKey: "INVENTORY.ITEMS.DETAIL",
    tabKey: "replenishment",
    allowedRoles: ["admin", "user"],
  },

  // ロット詳細ページのタブ
  {
    routeKey: "INVENTORY.LOT_DETAIL",
    tabKey: "summary",
    allowedRoles: ["admin", "user", "guest"],
  },
  {
    routeKey: "INVENTORY.LOT_DETAIL",
    tabKey: "intake-history",
    allowedRoles: ["admin", "user", "guest"],
  },
  {
    routeKey: "INVENTORY.LOT_DETAIL",
    tabKey: "withdrawal-history",
    allowedRoles: ["admin", "user", "guest"],
  },
];

/**
 * 操作権限設定
 */
export const operationPermissions: OperationPermission[] = [
  // 在庫操作
  { operationKey: "inventory:view", allowedRoles: ["admin", "user", "guest"] },
  { operationKey: "inventory:create", allowedRoles: ["admin", "user"] },
  { operationKey: "inventory:update", allowedRoles: ["admin", "user"] },
  { operationKey: "inventory:delete", allowedRoles: ["admin"] },
  {
    operationKey: "inventory:hardDelete",
    allowedRoles: ["admin"],
    additionalConditions: ["noRelatedData", "within5minutes"],
  },

  // 受注操作
  { operationKey: "order:view", allowedRoles: ["admin", "user", "guest"] },
  { operationKey: "order:create", allowedRoles: ["admin", "user"] },
  { operationKey: "order:update", allowedRoles: ["admin", "user"] },
  { operationKey: "order:allocate", allowedRoles: ["admin", "user"] },
  { operationKey: "order:delete", allowedRoles: ["admin"] },

  // フォーキャスト操作
  { operationKey: "forecast:view", allowedRoles: ["admin", "user", "guest"] },
  { operationKey: "forecast:create", allowedRoles: ["admin", "user"] },
  { operationKey: "forecast:update", allowedRoles: ["admin", "user"] },
  { operationKey: "forecast:delete", allowedRoles: ["admin", "user"] },

  // マスタ操作
  { operationKey: "master:view", allowedRoles: ["admin", "user", "guest"] },
  { operationKey: "master:create", allowedRoles: ["admin", "user"] },
  { operationKey: "master:update", allowedRoles: ["admin", "user"] },
  { operationKey: "master:delete", allowedRoles: ["admin"] },
  {
    operationKey: "master:hardDelete",
    allowedRoles: ["admin"],
    additionalConditions: ["noRelatedData", "within5minutes"],
  },

  // RPA操作
  { operationKey: "rpa:view", allowedRoles: ["admin", "user"] },
  { operationKey: "rpa:execute", allowedRoles: ["admin", "user"] },
  { operationKey: "rpa:configure", allowedRoles: ["admin"] },

  // OCR操作
  { operationKey: "ocr:view", allowedRoles: ["admin", "user"] },
  { operationKey: "ocr:edit", allowedRoles: ["admin", "user"] },
  { operationKey: "ocr:export", allowedRoles: ["admin", "user"] },

  // システム操作
  { operationKey: "admin:viewLogs", allowedRoles: ["admin"] },
  { operationKey: "admin:manageUsers", allowedRoles: ["admin"] },
  { operationKey: "admin:manageRoles", allowedRoles: ["admin"] },
  { operationKey: "admin:resetDatabase", allowedRoles: ["admin"] },
  { operationKey: "admin:bulkExport", allowedRoles: ["admin"] },
  { operationKey: "admin:configureBatchJobs", allowedRoles: ["admin"] },
  { operationKey: "admin:sapIntegration", allowedRoles: ["admin"] },
];

/**
 * adminHardDelete条件
 */
export const hardDeleteConditions: HardDeleteConditions = {
  requireNoRelatedData: true,
  maxAgeMinutes: 5,
};

/**
 * 権限設定全体
 */
export const permissionConfig: PermissionConfig = {
  routes: routePermissions,
  tabs: tabPermissions,
  operations: operationPermissions,
};
