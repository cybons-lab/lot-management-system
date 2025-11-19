import { fetchApi } from "@/shared/libs/http";
import type { Supplier } from "@/shared/types/aliases";

const BASE_URL = "/suppliers";

/**
 * Get all suppliers
 * @endpoint GET /suppliers
 */
export const getSuppliers = () => fetchApi.get<Supplier[]>(BASE_URL);
