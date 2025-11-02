// src/lib/api-client.ts
import type {
  LotResponse,
  LotCreate,
  Product,
  Supplier,
  OldWarehouse,
  DashboardStats,
  OrderResponse,
  OrderWithLinesResponse,
  OrdersListParams,
  ReMatchResponse,
  ForecastBulkRequest,
  ForecastBulkResponse,
  ResetResponse,
  // --- 倉庫配分 ---
  WarehouseListResponse,
  OrdersWithAllocResponse,
  SaveAllocationsRequest,
  SaveAllocationsResponse,
  // --- Forecast一覧 ---
  ForecastListResponse,
  ForecastListParams,
  WarehouseAlloc,
} from "@/types";

// 🔽 基準となるURLをここで定義
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

/**
 * 汎用レスポンスハンドラ
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "不明なエラーが発生しました" }));
    const message =
      error.detail || error.message || "APIリクエストに失敗しました";
    throw new Error(message);
  }
  if (response.status === 204) {
    return null as T;
  }
  return response.json();
}

/**
 * 汎用API呼び出し
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  return handleResponse<T>(response);
}

// ===== ロット引当関連の型定義 =====
export interface LotCandidate {
  lot_id: number;
  lot_code: string;
  available_qty: number;
  unit: string;
  warehouse_code: string;
  expiry_date?: string;
  mfg_date?: string;
}

export interface AllocatedLot {
  allocation_id: number;
  lot_id: number;
  lot_code: string;
  allocated_qty: number;
  warehouse_code: string;
  expiry_date?: string;
}

export interface LotAllocationRequest {
  allocations: Array<{
    lot_id: number;
    qty: number;
  }>;
}

export interface LotAllocationResponse {
  success: boolean;
  message: string;
  applied: Array<{
    lot_id: number;
    qty: number;
    allocation_id: number;
  }>;
  order_line: any;
}

export interface AllocationCancelRequest {
  allocation_id?: number;
  all?: boolean;
}

export interface AllocationCancelResponse {
  success: boolean;
  message: string;
  order_line: any;
}

/**
 * APIクライアント
 */
export const api = {
  // --- Lot endpoints ---
  getLots: () =>
    fetchApi<LotResponse[]>("/lots", {
      method: "GET",
    }),
  getLot: (id: number) =>
    fetchApi<LotResponse>(`/lots/${id}`, { method: "GET" }),
  createLot: (data: LotCreate) =>
    fetchApi<LotResponse>("/lots", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // --- Order endpoints ---
  getOrders: (params: OrdersListParams) => {
    const searchParams = new URLSearchParams();
    if (params.skip !== undefined)
      searchParams.append("skip", params.skip.toString());
    if (params.limit !== undefined)
      searchParams.append("limit", params.limit.toString());
    if (params.status) searchParams.append("status", params.status);
    if (params.customer_code)
      searchParams.append("customer_code", params.customer_code);

    const queryString = searchParams.toString();
    return fetchApi<OrderResponse[]>(
      `/orders${queryString ? "?" + queryString : ""}`,
      {
        method: "GET",
      }
    );
  },
  getOrder: (orderId: number) =>
    fetchApi<OrderWithLinesResponse>(`/orders/${orderId}`, { method: "GET" }),
  reMatchOrder: (orderId: number) =>
    fetchApi<ReMatchResponse>(`/orders/${orderId}/re-match`, {
      method: "POST",
    }),

  // --- Master endpoints ---
  getProducts: () =>
    fetchApi<Product[]>("/masters/products", { method: "GET" }),
  getSuppliers: () =>
    fetchApi<Supplier[]>("/masters/suppliers", { method: "GET" }),
  getWarehouses: () =>
    fetchApi<OldWarehouse[]>("/masters/warehouses", { method: "GET" }),

  // --- Admin endpoints ---
  getStats: () => fetchApi<DashboardStats>("/admin/stats", { method: "GET" }),
  resetDatabase: () =>
    fetchApi<ResetResponse>("/admin/reset-database", { method: "POST" }),
  loadFullSampleData: (data: any) =>
    fetchApi<ResetResponse>("/admin/load-full-sample-data", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // --- Forecast Import ---
  bulkImportForecast: (data: ForecastBulkRequest) =>
    fetchApi<ForecastBulkResponse>("/forecast/bulk", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // --- Warehouse Allocation Endpoints ---
  getWarehouseAllocList: () =>
    fetchApi<WarehouseListResponse>("/warehouse-alloc/warehouses", {
      method: "GET",
    }),
  getOrdersWithAllocations: () =>
    fetchApi<OrdersWithAllocResponse>("/orders/orders-with-allocations", {
      method: "GET",
    }),
  saveWarehouseAllocations: (
    orderLineId: number,
    allocations: WarehouseAlloc[]
  ) =>
    fetchApi<SaveAllocationsResponse>(
      `/orders/${orderLineId}/warehouse-allocations`,
      {
        method: "POST",
        body: JSON.stringify({ allocations } as SaveAllocationsRequest),
      }
    ),

  // --- Forecast List Endpoint ---
  getForecastList: (params: ForecastListParams) => {
    const searchParams = new URLSearchParams();
    if (params.product_code)
      searchParams.append("product_code", params.product_code);
    if (params.supplier_code)
      searchParams.append("supplier_code", params.supplier_code);

    const queryString = searchParams.toString();
    return fetchApi<ForecastListResponse>(
      `/forecast/list${queryString ? "?" + queryString : ""}`,
      {
        method: "GET",
      }
    );
  },

  // ===== ロット引当関連のエンドポイント =====

  /**
   * 受注明細のステータスを更新
   * ※ サーバ側は `status` フィールドを期待
   */
  updateOrderLineStatus: (orderLineId: number, newStatus: string) =>
    fetchApi<{
      success: boolean;
      message: string;
      order_line_id: number;
      new_status: string;
    }>(`/orders/${orderLineId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    }),

  /**
   * 受注明細に対する引当候補ロットを取得
   */
  getCandidateLots: (orderLineId: number) =>
    fetchApi<{ items: LotCandidate[] }>(
      `/orders/${orderLineId}/candidate-lots`,
      {
        method: "GET",
      }
    ),

  /**
   * ロット引当を実行
   */
  createLotAllocations: (orderLineId: number, request: LotAllocationRequest) =>
    fetchApi<LotAllocationResponse>(`/orders/${orderLineId}/allocations`, {
      method: "POST",
      body: JSON.stringify(request),
    }),

  /**
   * ロット引当を取消
   */
  cancelLotAllocations: (
    orderLineId: number,
    request: AllocationCancelRequest
  ) =>
    fetchApi<AllocationCancelResponse>(
      `/orders/${orderLineId}/allocations/cancel`,
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    ),

  // --- CSV Export Helper ---
  exportToCSV(data: any[], filename: string): void {
    if (!data || data.length === 0) {
      console.warn("No data to export");
      return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      data
        .map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              if (value === null || value === undefined) return "";
              const stringValue = String(value);
              if (
                stringValue.includes(",") ||
                stringValue.includes("\n") ||
                stringValue.includes('"')
              ) {
                return `"${stringValue.replace(/"/g, '""')}"`;
              }
              return stringValue;
            })
            .join(",")
        )
        .join("\n"),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
