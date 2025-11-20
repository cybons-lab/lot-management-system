/**
 * Custom hook for processing and sorting order cards
 */

import { useMemo } from "react";

import type { Order, OrderCardData } from "../types";
import { createOrderCardData } from "../utils/priority";
import { compareOrderCards, isValidOrder } from "../utils/sorting";

export function useOrderCards(orders: Order[] | undefined): OrderCardData[] {
  return useMemo(() => {
    if (!orders) return [];

    return orders.map(createOrderCardData).filter(isValidOrder).sort(compareOrderCards);
  }, [orders]);
}
