import { useQuery } from "@tanstack/react-query";

import {
  getInventoryByProduct,
  getInventoryBySupplier,
  getInventoryByWarehouse,
} from "@/features/inventory/api";

export const useInventoryBySupplier = () => {
  return useQuery({
    queryKey: ["inventory", "by-supplier"],
    queryFn: () => getInventoryBySupplier(),
  });
};

export const useInventoryByWarehouse = () => {
  return useQuery({
    queryKey: ["inventory", "by-warehouse"],
    queryFn: () => getInventoryByWarehouse(),
  });
};

export const useInventoryByProduct = () => {
  return useQuery({
    queryKey: ["inventory", "by-product"],
    queryFn: () => getInventoryByProduct(),
  });
};
