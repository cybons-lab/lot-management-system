/**
 * Unified Query Keys for TanStack Query
 *
 * This file centralizes all query keys to prevent inconsistencies and ensure
 * proper cache invalidation across the application.
 *
 * Usage:
 * ```typescript
 * import { QUERY_KEYS } from "@/shared/constants/query-keys";
 *
 * useQuery({ queryKey: QUERY_KEYS.inventoryItems });
 * queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventoryItems });
 * ```
 */

export const QUERY_KEYS = {
  // Inventory-related queries
  inventoryItems: ["inventory-items"] as const,
  inventoryBySupplier: ["inventory-by-supplier"] as const,
  inventoryByWarehouse: ["inventory-by-warehouse"] as const,
  inventoryByProduct: ["inventory-by-product"] as const,

  // Lot-related queries
  lots: ["lots"] as const,
  lot: (id: number) => ["lots", "detail", id] as const,

  // Order-related queries
  orders: ["orders"] as const,
  order: (id: number) => ["orders", "detail", id] as const,
  orderLines: ["order-lines"] as const,

  // Allocation-related queries
  allocations: ["allocations"] as const,
  allocationCandidates: ["allocationCandidates"] as const,
  planningAllocationSummary: ["planning-allocation-summary"] as const,

  // Dashboard queries
  dashboard: ["dashboard"] as const,
  dashboardStats: ["dashboard", "stats"] as const,

  // Forecast-related queries
  forecasts: ["forecasts"] as const,
  forecastList: ["forecasts", "list"] as const,
  forecast: (id: number) => ["forecasts", "detail", id] as const,
  forecastHistory: ["forecasts", "history"] as const,

  // Warehouse-related queries
  warehouses: ["warehouses"] as const,
  warehouse: (id: number) => ["warehouses", "detail", id] as const,

  // Product-related queries
  products: ["products"] as const,
  product: (id: number) => ["products", "detail", id] as const,

  // Supplier-related queries
  suppliers: ["suppliers"] as const,
  supplier: (id: number) => ["suppliers", "detail", id] as const,

  // Assignment-related queries
  assignments: ["assignments"] as const,
  mySuppliers: ["my-suppliers"] as const,
  primaryAssignments: ["primary-assignments"] as const,

  // Inbound plan queries
  inboundPlans: ["inbound-plans"] as const,
  inboundPlan: (id: number) => ["inbound-plans", "detail", id] as const,

  // Withdrawal queries
  withdrawals: ["withdrawals"] as const,
  withdrawal: (id: number) => ["withdrawals", "detail", id] as const,
} as const;

/**
 * Helper function to invalidate all inventory-related queries
 */
export const getInventoryQueryKeys = () => [
  QUERY_KEYS.inventoryItems,
  QUERY_KEYS.inventoryBySupplier,
  QUERY_KEYS.inventoryByWarehouse,
  QUERY_KEYS.inventoryByProduct,
  QUERY_KEYS.lots,
];

/**
 * Helper function to invalidate all allocation-related queries
 */
export const getAllocationQueryKeys = () => [
  QUERY_KEYS.allocations,
  QUERY_KEYS.allocationCandidates,
  QUERY_KEYS.orders,
  QUERY_KEYS.orderLines,
  QUERY_KEYS.planningAllocationSummary,
  ...getInventoryQueryKeys(),
  QUERY_KEYS.dashboard,
  QUERY_KEYS.dashboardStats,
];

/**
 * Helper function to invalidate all forecast-related queries
 */
export const getForecastQueryKeys = () => [
  QUERY_KEYS.forecasts,
  QUERY_KEYS.forecastList,
  QUERY_KEYS.forecastHistory,
  QUERY_KEYS.planningAllocationSummary, // Planning allocation is tied to forecasts
];
