import type { AllocatedLot, OrderLine } from "@/shared/types/aliases";

export function coerceAllocatedLots(
  source: OrderLine["allocated_lots"] | null | undefined,
): AllocatedLot[] {
  if (!Array.isArray(source)) {
    return [];
  }

  return source.reduce<AllocatedLot[]>((acc, allocation) => {
    if (!allocation || typeof (allocation as AllocatedLot).lot_id !== "number") {
      return acc;
    }

    const typed = allocation as AllocatedLot;
    const quantity = typed.allocated_quantity ?? typed.allocated_qty ?? "0"; // DDL v2.2: prefer allocated_quantity
    acc.push({
      ...(typed.allocation_id !== undefined && { allocation_id: typed.allocation_id }),
      lot_id: typed.lot_id,
      allocated_quantity: quantity, // DDL v2.2
      allocated_qty: Number(quantity), // Legacy field
      delivery_place_code: typed.delivery_place_code ?? null,
      delivery_place_name: typed.delivery_place_name ?? null,
    });
    return acc;
  }, []);
}
