import type {
  LotResponse, // Lot -> LotResponse
  LotCreate, // CreateLotInput -> LotCreate
  Product,
  Supplier,
  Warehouse,
} from "@/types";

const API_BASE_URL = "http://localhost:8000/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Unknown error" }));
    const message = error.detail || error.message || "API request failed"; // v2.0のエラー形式に対応
    throw new Error(message);
  }
  if (response.status === 204) {
    return null as T;
  }
  return response.json();
}

export const api = {
  // --- Lot endpoints (v2.0) ---
  async getLots(): Promise<LotResponse[]> {
    const response = await fetch(`${API_BASE_URL}/lots?with_stock=true`); // ?with_stock=true をデフォルトに
    return handleResponse<LotResponse[]>(response);
  },

  async getLot(id: number): Promise<LotResponse> {
    const response = await fetch(`${API_BASE_URL}/lots/${id}`);
    return handleResponse<LotResponse>(response);
  },

  async createLot(data: LotCreate): Promise<LotResponse> {
    const response = await fetch(`${API_BASE_URL}/lots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<LotResponse>(response);
  },

  // updateLot, deleteLot は一旦省略 (v2.0スキーマに合わせる必要あり)

  // --- Master endpoints (v2.0) ---
  async getProducts(): Promise<Product[]> {
    const response = await fetch(`${API_BASE_URL}/masters/products`);
    return handleResponse<Product[]>(response);
  },

  async getSuppliers(): Promise<Supplier[]> {
    const response = await fetch(`${API_BASE_URL}/masters/suppliers`);
    return handleResponse<Supplier[]>(response);
  },

  async getWarehouses(): Promise<Warehouse[]> {
    const response = await fetch(`${API_BASE_URL}/masters/warehouses`);
    return handleResponse<Warehouse[]>(response);
  },

  // (古いShipmentエンドポイントは削除)

  // --- Admin endpoints ---
  async resetDatabase(): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    const response = await fetch(`${API_BASE_URL}/admin/reset-database`, {
      method: "POST",
    });
    return handleResponse<{ success: boolean; message: string; data: any }>(
      response
    );
  },

  async loadFullSampleData(
    data: any
  ): Promise<{ success: boolean; message: string; data: any }> {
    const response = await fetch(
      `${API_BASE_URL}/admin/load-full-sample-data`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    return handleResponse<{ success: boolean; message: string; data: any }>(
      response
    );
  },
};
