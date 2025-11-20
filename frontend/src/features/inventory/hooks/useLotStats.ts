import { useMemo } from "react";

import type { LotUI } from "@/shared/libs/normalize";

export function useLotStats(lots: LotUI[]) {
  return useMemo(() => {
    const totalLots = lots.length;
    const activeLots = lots.filter((lot) => Number(lot.current_quantity) > 0).length;
    const totalQuantity = lots.reduce<number>((sum, lot) => sum + Number(lot.current_quantity), 0);

    return { totalLots, activeLots, totalQuantity };
  }, [lots]);
}
