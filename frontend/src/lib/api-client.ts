/**
 * API Client
 * バックエンドAPIとの通信を一元管理
 */

import { fetchApi } from "./http";

import type {
  LotResponse,
  LotCreate,
  Product,
  Supplier,
  Warehouse,
  OrderResponse,
  OrderWithLinesResponse,
  OrdersListParams,
} from "@/types/aliases";

export const api = {
  // ========================================
  // ロット管理
  // ========================================
  getLots: () => fetchApi<LotResponse[]>("/lots", { method: "GET" }),

  getLot: (id: number) => fetchApi<LotResponse>(`/lots/${id}`, { method: "GET" }),

  createLot: (data: LotCreate) =>
    fetchApi<LotResponse>("/lots", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ========================================
  // マスタデータ
  // ========================================
  getProducts: () => fetchApi<Product[]>("/masters/products", { method: "GET" }),

  getSuppliers: () => fetchApi<Supplier[]>("/masters/suppliers", { method: "GET" }),

  getWarehouses: () => fetchApi<Warehouse[]>("/masters/warehouses", { method: "GET" }),

  // ========================================
  // 受注管理
  // ========================================
  getOrders: (params?: OrdersListParams) => {
    const searchParams = new URLSearchParams();
    if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
    if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
    if (params?.status) searchParams.append("status", params.status);
    if (params?.customer_code) searchParams.append("customer_code", params.customer_code);

    const queryString = searchParams.toString();
    return fetchApi<OrderResponse[]>(`/orders${queryString ? "?" + queryString : ""}`, {
      method: "GET",
    });
  },

  getOrder: (orderId: number) =>
    fetchApi<OrderWithLinesResponse>(`/orders/${orderId}`, { method: "GET" }),
};
