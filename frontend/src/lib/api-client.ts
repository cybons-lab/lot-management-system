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
  getLots: () => fetchApi.get<LotResponse[]>("/lots"),

  getLot: (id: number) => fetchApi.get<LotResponse>(`/lots/${id}`),

  createLot: (data: LotCreate) => fetchApi.post<LotResponse>("/lots", data),

  // ========================================
  // マスタデータ
  // ========================================
  getProducts: () => fetchApi.get<Product[]>("/masters/products"),

  getSuppliers: () => fetchApi.get<Supplier[]>("/masters/suppliers"),

  getWarehouses: () => fetchApi.get<Warehouse[]>("/masters/warehouses"),

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
    return fetchApi.get<OrderResponse[]>(`/orders${queryString ? "?" + queryString : ""}`);
  },

  getOrder: (orderId: number) => fetchApi.get<OrderWithLinesResponse>(`/orders/${orderId}`),
};
