// Auto-generated from api-client.ts split
import { fetchApi } from "@/shared/libs/http";
import type { Supplier } from "@/shared/types/aliases";

export const getSuppliers = () => fetchApi.get<Supplier[]>("/masters/suppliers");
