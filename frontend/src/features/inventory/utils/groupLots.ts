/**
 * グループ化ユーティリティ
 * ロットを製品別にグルーピングする
 */

import type { LotUI } from "@/shared/libs/normalize";

export interface ProductGroup {
    key: string; // Unique key for the group (productId-supplierCode)
    productId: number;
    productCode: string;
    productName: string;
    supplierCode: string;
    supplierName: string;
    lots: LotUI[];
    totalCurrentQuantity: number;
    lotCount: number;
    minExpiryDate: string | null;
}

/**
 * ロット配列を製品別・仕入先別にグルーピング
 */
export function groupLotsByProduct(lots: LotUI[]): ProductGroup[] {
    const groupMap = new Map<string, ProductGroup>();

    for (const lot of lots) {
        const productId = lot.product_id;
        const supplierCode = lot.supplier_code ?? "unknown";
        const key = `${productId}-${supplierCode}`;

        if (!groupMap.has(key)) {
            groupMap.set(key, {
                key,
                productId,
                productCode: lot.product_code ?? "",
                productName: lot.product_name ?? "",
                supplierCode: lot.supplier_code ?? "",
                supplierName: lot.supplier_name ?? "",
                lots: [],
                totalCurrentQuantity: 0,
                lotCount: 0,
                minExpiryDate: null,
            });
        }

        const group = groupMap.get(key)!;
        group.lots.push(lot);
        group.lotCount++;
        group.totalCurrentQuantity += Number(lot.current_quantity ?? 0);

        // 最短有効期限を更新
        if (lot.expiry_date) {
            if (!group.minExpiryDate || lot.expiry_date < group.minExpiryDate) {
                group.minExpiryDate = lot.expiry_date;
            }
        }
    }

    // product_code -> supplier_code でソート
    return Array.from(groupMap.values()).sort((a, b) => {
        const productCompare = a.productCode.localeCompare(b.productCode);
        if (productCompare !== 0) return productCompare;
        return a.supplierCode.localeCompare(b.supplierCode);
    });
}
