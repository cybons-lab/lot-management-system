// Auto-generated from api-client.ts split
import { fetchApi } from "@/lib/http";
import type { Product, Supplier, OldWarehouse } from "@/types/aliases";

export const getProducts = () => fetchApi.get<Product[]>("/masters/products");

export const getSuppliers = () => fetchApi.get<Supplier[]>("/masters/suppliers");

export const getWarehouses = () => fetchApi.get<OldWarehouse[]>("/masters/warehouses");
