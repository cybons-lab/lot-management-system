import axios from "axios";
import type { components } from "@/type/api.gen"; // openapi-typescript の出力

const http = axios.create({ baseURL: "/api" });

// 型エイリアス例
type DragAssignReq = components["schemas"]["DragAssignRequest"];
type DragAssignRes = components["schemas"]["DragAssignResponse"];

// 受注
export const getOrders = (params?: Record<string, unknown>) =>
  http.get("/orders", { params });

export const getOrderDetail = (orderId: number) =>
  http.get(`/orders/${orderId}`);

// 引当（ドラッグアサイン）
export const dragAssignAllocation = (body: DragAssignReq) =>
  http.post<DragAssignRes>("/orders/allocations/drag-assign", body);

// ロット
export const listLots = (params?: Record<string, unknown>) =>
  http.get("/lots", { params });
