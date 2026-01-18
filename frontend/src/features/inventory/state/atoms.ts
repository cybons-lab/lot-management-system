/**
 * Inventory derived atoms (Lot list pipeline)
 *
 * Phase 0: useLotDataProcessing 現状整理メモ
 * - 入力:
 *   - raw lots: useLotsQuery() から取得（with_stock/product_code/warehouse_code をパラメータ）
 *   - lotFiltersAtom.search（検索テキスト）
 *   - lotTableSettingsAtom（sortColumn/sortDirection/page/pageSize）
 * - 出力:
 *   - sortedLots: フィルタ + ソート済み（ページング前）
 *   - groupedLots: ページング後に groupLotsByProduct() でグルーピング
 * - 変換順序:
 *   raw → filter(search) → sort → paginate → group → (kpi)
 *
 * Dependency graph (read-only)
 * inventoryLotsQueryParamsAtom
 *   └─ inventoryLotsRawAtom (async query)
 *        └─ inventoryLotsRawLoadableAtom
 *             └─ inventoryLotsRawDataAtom
 *                  └─ inventoryLotsFilteredAtom
 *                       └─ inventoryLotsSortedAtom
 *                            └─ inventoryLotsPaginatedAtom
 *                                 └─ inventoryLotsGroupedAtom
 * inventoryLotsFilteredAtom
 *   └─ inventoryKpiAtom
 */

import { atom } from "jotai";
import { loadable } from "jotai/utils";

import { getLots, type LotResponse, type LotsGetParams } from "@/features/inventory/api";
import { groupLotsByProduct, type ProductGroup } from "@/features/inventory/utils/groupLots";
import { normalizeLot, type LotUI } from "@/shared/libs/normalize";
import { queryClient } from "@/shared/libs/query-client";

import {
  lotFiltersAtom,
  lotTableSettingsAtom,
  type LotTableSettings,
} from "@/features/inventory/state";

type LotsQueryParams = LotsGetParams & { delivery_place_code?: string | null };

export const inventoryLotsQueryParamsAtom = atom<LotsQueryParams>((get) => {
  const filters = get(lotFiltersAtom);
  return {
    with_stock: filters.inStockOnly || undefined,
    product_code: filters.productCode ?? undefined,
    delivery_place_code: filters.warehouseCode ?? undefined,
  };
});

export const inventoryLotSearchQueryAtom = atom((get) => {
  const searchTerm = get(lotFiltersAtom).search ?? "";
  return {
    raw: searchTerm,
    normalized: searchTerm.toLowerCase(),
  };
});

const normalizeLots = (data: LotResponse[]) =>
  (data ?? []).map((item) =>
    normalizeLot(
      item as unknown as Record<string, unknown> & {
        lot_id: number;
        product_id: number;
        warehouse_id: number;
      },
    ),
  );

export const inventoryLotsRawAtom = atom(async (get) => {
  const params = get(inventoryLotsQueryParamsAtom);
  const data = await queryClient.fetchQuery({
    queryKey: ["lots", params],
    queryFn: () => getLots(params),
    staleTime: 30_000,
  });
  return normalizeLots(data ?? []);
});

export const inventoryLotsRawLoadableAtom = loadable(inventoryLotsRawAtom);

export const inventoryLotsRawDataAtom = atom((get) => {
  const result = get(inventoryLotsRawLoadableAtom);
  if (result.state === "hasData") {
    return result.data;
  }
  return [];
});

export function filterLotsBySearchTerm(
  lots: LotUI[],
  searchTerm: string,
  normalizedTerm = searchTerm.toLowerCase(),
) {
  if (!searchTerm) return lots;
  return lots.filter(
    (lot) =>
      lot.lot_number?.toLowerCase().includes(normalizedTerm) ||
      lot.product_code?.toLowerCase().includes(normalizedTerm) ||
      lot.product_name?.toLowerCase().includes(normalizedTerm),
  );
}

export function sortLots(lots: LotUI[], tableSettings: LotTableSettings) {
  if (!tableSettings.sortColumn) return lots;
  return [...lots].sort((a, b) => {
    const aVal = a[tableSettings.sortColumn as keyof LotUI];
    const bVal = b[tableSettings.sortColumn as keyof LotUI];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === "string" && typeof bVal === "string") {
      return tableSettings.sortDirection === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    if (typeof aVal === "number" && typeof bVal === "number") {
      return tableSettings.sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });
}

export function paginateLots(lots: LotUI[], tableSettings: LotTableSettings) {
  const start = (tableSettings.page ?? 0) * (tableSettings.pageSize ?? 25);
  return lots.slice(start, start + (tableSettings.pageSize ?? 25));
}

export const inventoryLotsFilteredAtom = atom((get) => {
  const lots = get(inventoryLotsRawDataAtom);
  const { raw, normalized } = get(inventoryLotSearchQueryAtom);
  return filterLotsBySearchTerm(lots, raw, normalized);
});

export const inventoryLotsSortedAtom = atom((get) =>
  sortLots(get(inventoryLotsFilteredAtom), get(lotTableSettingsAtom)),
);

export const inventoryLotsPaginatedAtom = atom((get) =>
  paginateLots(get(inventoryLotsSortedAtom), get(lotTableSettingsAtom)),
);

export const inventoryLotsGroupedAtom = atom<ProductGroup[]>((get) =>
  groupLotsByProduct(get(inventoryLotsPaginatedAtom)),
);

export interface InventoryKpi {
  totalLots: number;
  totalCurrentQuantity: number;
  totalGroups: number;
}

export function calculateInventoryKpi(lots: LotUI[]): InventoryKpi {
  const totalCurrentQuantity = lots.reduce(
    (sum, lot) => sum + Number(lot.current_quantity ?? 0),
    0,
  );
  return {
    totalLots: lots.length,
    totalCurrentQuantity,
    totalGroups: groupLotsByProduct(lots).length,
  };
}

export const inventoryKpiAtom = atom((get) =>
  calculateInventoryKpi(get(inventoryLotsFilteredAtom)),
);
