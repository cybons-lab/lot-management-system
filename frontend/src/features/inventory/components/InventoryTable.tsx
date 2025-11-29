import { format } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { useLotsQuery } from "@/hooks/api";
import { LotStatusIcon } from "@/shared/components/data/LotStatusIcon";
import { fmt } from "@/shared/utils/number";
import { getLotStatuses } from "@/shared/utils/status";
import * as styles from "@/features/inventory/pages/styles";
import type { InventoryItem } from "@/features/inventory/api";

interface InventoryTableProps {
  data: InventoryItem[];
  isLoading: boolean;
  onRowClick?: (item: InventoryItem) => void;
}

export function InventoryTable({ data, isLoading, onRowClick }: InventoryTableProps) {
  const navigate = useNavigate();

  // 展開状態管理（製品ID-倉庫IDのキー）
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // 全ロット取得（展開行のフィルタリング用）
  // Note: This fetches all lots. For large datasets, this should be optimized to fetch only needed lots or use a better API.
  const { data: allLots = [] } = useLotsQuery({});

  const toggleRow = (productId: number, warehouseId: number) => {
    const key = `${productId}-${warehouseId}`;
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const isRowExpanded = (productId: number, warehouseId: number) => {
    return expandedRows.has(`${productId}-${warehouseId}`);
  };

  const getLotsForItem = (productId: number, warehouseId: number) => {
    return allLots.filter(
      (lot) => lot.product_id === productId && lot.warehouse_id === warehouseId,
    );
  };

  const handleViewDetail = (productId: number, warehouseId: number) => {
    navigate(ROUTES.INVENTORY.ITEMS.DETAIL(productId, warehouseId));
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">データがありません</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">{data.length} 件の在庫アイテム</div>

      <div className={styles.table.container}>
        <table className={styles.table.root}>
          <thead className={styles.table.thead}>
            <tr>
              <th className={styles.table.th} style={{ width: "40px" }}></th>
              <th className={styles.table.th}>製品</th>
              <th className={styles.table.th}>倉庫</th>
              <th className={styles.table.thRight}>ロット数</th>
              <th className={styles.table.thRight}>総在庫数</th>
              <th className={styles.table.thRight}>引当済</th>
              <th className={styles.table.thRight}>利用可能</th>
              <th className={styles.table.th}>最終更新</th>
              <th className={styles.table.thRight}>アクション</th>
            </tr>
          </thead>
          <tbody className={styles.table.tbody}>
            {data.map((item) => {
              const expanded = isRowExpanded(item.product_id, item.warehouse_id);
              const lots = expanded ? getLotsForItem(item.product_id, item.warehouse_id) : [];

              return (
                <Fragment key={`${item.product_id}-${item.warehouse_id}`}>
                  <tr
                    className={`${styles.table.tr} ${onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}`}
                    onClick={(e) => {
                      // Prevent triggering when clicking buttons or expander
                      if ((e.target as HTMLElement).closest("button")) return;
                      onRowClick?.(item);
                    }}
                  >
                    <td className={styles.table.td}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(item.product_id, item.warehouse_id);
                        }}
                        className="rounded p-1 hover:bg-gray-100"
                      >
                        {expanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-600" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                    </td>
                    <td className={styles.table.td}>
                      {item.product_name || item.product_code || `ID: ${item.product_id}`}
                    </td>
                    <td className={styles.table.td}>
                      {item.warehouse_name || item.warehouse_code || `ID: ${item.warehouse_id}`}
                    </td>
                    <td className={styles.table.tdRight}>
                      {getLotsForItem(item.product_id, item.warehouse_id).length}
                    </td>
                    <td className={styles.table.tdRight}>{fmt(item.total_quantity)}</td>
                    <td className={styles.table.tdRightYellow}>{fmt(item.allocated_quantity)}</td>
                    <td className={styles.table.tdRightGreen}>{fmt(item.available_quantity)}</td>
                    <td className={styles.table.tdGray}>
                      {new Date(item.last_updated).toLocaleString("ja-JP")}
                    </td>
                    <td className={styles.table.tdRight}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetail(item.product_id, item.warehouse_id);
                        }}
                      >
                        詳細
                      </Button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={8} className="bg-gray-50 p-0">
                        <div className="px-12 py-4">
                          <h4 className="mb-3 text-sm font-semibold text-gray-700">
                            ロット一覧 ({lots.length}件)
                          </h4>
                          {lots.length > 0 ? (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="pb-2 text-left font-medium text-gray-600">
                                    ロット番号
                                  </th>
                                  <th className="pb-2 text-right font-medium text-gray-600">
                                    現在在庫
                                  </th>
                                  <th className="pb-2 text-left font-medium text-gray-600">単位</th>
                                  <th className="pb-2 text-left font-medium text-gray-600">
                                    入荷日
                                  </th>
                                  <th className="pb-2 text-left font-medium text-gray-600">
                                    有効期限
                                  </th>
                                  <th className="pb-2 text-left font-medium text-gray-600">
                                    ステータス
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {lots.map((lot) => {
                                  const statuses = getLotStatuses(lot);
                                  return (
                                    <tr
                                      key={lot.id}
                                      className="border-b border-gray-100 hover:bg-gray-100"
                                    >
                                      <td className="py-2 font-medium text-gray-900">
                                        {lot.lot_number}
                                      </td>
                                      <td className="py-2 text-right font-semibold">
                                        {fmt(Number(lot.current_quantity))}
                                      </td>
                                      <td className="py-2 text-gray-600">{lot.unit}</td>
                                      <td className="py-2 text-gray-600">
                                        {lot.received_date
                                          ? format(new Date(lot.received_date), "yyyy/MM/dd")
                                          : "-"}
                                      </td>
                                      <td className="py-2 text-gray-600">
                                        {lot.expiry_date
                                          ? format(new Date(lot.expiry_date), "yyyy/MM/dd")
                                          : "-"}
                                      </td>
                                      <td className="py-2">
                                        <div className="flex items-center gap-1">
                                          {statuses.map((s) => (
                                            <LotStatusIcon
                                              key={s}
                                              status={s as "locked" | "available" | "depleted"}
                                            />
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-sm text-gray-500">ロットがありません</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
