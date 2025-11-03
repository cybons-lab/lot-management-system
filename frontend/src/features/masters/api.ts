// Auto-generated from api-client.ts split
import { fetchApi } from "@/lib/http";
import type { Product, Supplier, OldWarehouse } from "@/types";

export const getProducts = () =>
  fetchApi<Product[]>("/masters/products", { method: "GET" });

export const getSuppliers = () =>
  fetchApi<Supplier[]>("/masters/suppliers", { method: "GET" });

export const getWarehouses = () =>
  fetchApi<OldWarehouse[]>("/masters/warehouses", { method: "GET" });
