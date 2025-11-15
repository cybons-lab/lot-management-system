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
  },

  // Forecasts - New structure (v2.2)
  FORECASTS: {
    LIST: "/forecasts",
    DETAIL: (id: number | string) => `/forecasts/${id}`,
    IMPORT: "/forecasts/import",
  },

  // Inbound Plans - New (v2.2)
  INBOUND_PLANS: {
    LIST: "/inbound-plans",
    DETAIL: (id: number | string) => `/inbound-plans/${id}`,
  },

  // Inventory
  INVENTORY: {
    ROOT: "/inventory",
    SUMMARY: "/inventory/summary",
    LOTS: "/inventory/lots",
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
    CUSTOMER_ITEMS: "/masters/customer-items",
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
