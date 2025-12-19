/**
 * Route constants for the application
 * Phase A-3: Route redesign
 *
 * Usage:
 * - Use these constants instead of hardcoded strings
 * - Easy to maintain and refactor
 * - Type-safe navigation
 */

export const ROUTES = {
  // Root
  ROOT: "/",

  // Dashboard
  DASHBOARD: "/dashboard",

  // Orders
  ORDERS: {
    LIST: "/orders",
    DETAIL: (id: number | string) => `/orders/${id}`,
  },

  // Allocations
  ALLOCATIONS: {
    INDEX: "/allocations",
    SUGGESTIONS: "/allocations/suggestions",
  },

  // Forecasts - New structure (v2.2)
  FORECASTS: {
    LIST: "/forecasts",
    DETAIL: (id: number | string) => `/forecasts/${id}`,
    IMPORT: "/forecasts/import",
    NEW: "/forecasts/new",
    EDIT: (id: number | string) => `/forecasts/${id}/edit`,
  },

  // Inbound Plans - New (v2.2)
  INBOUND_PLANS: {
    LIST: "/inbound-plans",
    DETAIL: (id: number | string) => `/inbound-plans/${id}`,
    NEW: "/inbound-plans/new",
    EDIT: (id: number | string) => `/inbound-plans/${id}/edit`,
  },

  // Inventory
  INVENTORY: {
    ROOT: "/inventory",
    SUMMARY: "/inventory/summary",
    LOTS: "/inventory/lots",
    LOT_DETAIL: (lotId: number | string) => `/inventory/lots/${lotId}`,
    MOVES: "/inventory/moves",
    ADJUSTMENTS: {
      LIST: "/inventory/adjustments",
      NEW: "/inventory/adjustments/new",
    },
    ITEMS: {
      DETAIL: (productId: number | string, warehouseId: number | string) =>
        `/inventory/items/${productId}/${warehouseId}`,
    },
  },

  // Masters
  MASTERS: {
    WAREHOUSES: "/warehouses",
    SUPPLIERS: "/suppliers",
    CUSTOMERS: "/customers",
    PRODUCTS: "/products",
    CUSTOMER_ITEMS: "/customer-items",
    BULK_LOAD: "/masters/bulk-load",
  },

  // Settings - New (v2.2)
  SETTINGS: {
    USERS: "/settings/users",
    ROLES: "/settings/roles",
  },

  // Admin
  ADMIN: {
    INDEX: "/admin",
    OPERATION_LOGS: "/admin/operation-logs",
    BUSINESS_RULES: "/admin/business-rules",
    BATCH_JOBS: "/admin/batch-jobs",
    MASTER_CHANGE_LOGS: "/admin/master-change-logs",
    SEED_SNAPSHOTS: "/admin/seed-snapshots",
  },

  // RPA
  RPA: {
    ROOT: "/rpa",
    MATERIAL_DELIVERY_NOTE: {
      ROOT: "/rpa/material-delivery-note",
      STEP1: "/rpa/material-delivery-note/step1",
      CSV_IMPORT: "/rpa/material-delivery-note/csv-import",
      STEP2: "/rpa/material-delivery-note/step2",
      STEP3: "/rpa/material-delivery-note/step3",
      STEP3_EXECUTE: (runId: number | string) => `/rpa/material-delivery-note/step3/${runId}`,
      CLOUD_FLOW_EXECUTE: "/rpa/material-delivery-note/execute",
      RUNS: "/rpa/material-delivery-note/runs",
      RUN_DETAIL: (runId: number | string) => `/rpa/material-delivery-note/runs/${runId}`,
      LAYER_CODES: "/rpa/material-delivery-note/layer-codes",
    },
  },
} as const;

/**
 * Legacy routes for backward compatibility
 * These should redirect to new routes
 */
export const LEGACY_ROUTES = {
  FORECAST: "/forecast", // → /forecasts/import
  FORECAST_LIST: "/forecast/list", // → /forecasts
} as const;
