import { useMemo } from "react";

import { type listCustomers, type listProducts } from "@/services/api/master-service";

type CustomerList = Awaited<ReturnType<typeof listCustomers>>;
type ProductList = Awaited<ReturnType<typeof listProducts>>;

interface UseLotAllocationComputedOptions {
  customers?: CustomerList;
  products?: ProductList;
}

export function useLotAllocationComputed({ customers, products }: UseLotAllocationComputedOptions) {
  const customerMap = useMemo(() => {
    if (!customers) return {};
    return customers.reduce(
      (acc, customer) => {
        acc[customer.id] = customer.customer_name ?? "";
        return acc;
      },
      {} as Record<number, string>,
    );
  }, [customers]);

  const productMap = useMemo(() => {
    if (!products) return {};
    return products.reduce(
      (acc, product) => {
        acc[product.id] = product.product_name ?? "";
        return acc;
      },
      {} as Record<number, string>,
    );
  }, [products]);

  return { customerMap, productMap };
}
