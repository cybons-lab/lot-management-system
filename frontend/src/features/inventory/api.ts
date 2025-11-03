// Auto-generated from api-client.ts split
import { fetchApi } from "@/lib/http";
import type { LotResponse, LotCreate } from "@/types";

export const getLots = () =>
  fetchApi<LotResponse[]>("/lots", { method: "GET" });

export const getLot = (id: number) =>
  fetchApi<LotResponse>(`/lots/${id}`, { method: "GET" });

export const createLot = (data: LotCreate) =>
  fetchApi<LotResponse>("/lots", {
    method: "POST",
    body: JSON.stringify(data),
  });
