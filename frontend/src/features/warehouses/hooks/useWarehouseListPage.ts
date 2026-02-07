import { useCallback } from "react";

import type { Warehouse, WarehouseCreate } from "../api";

import { useWarehouseListResources } from "./useWarehouseListResources";

import { useMasterListPage } from "@/hooks/ui/useMasterListPage";

/**
 * 倉庫マスタ一覧ページ用のカスタムフック
 * useMasterListPage を利用して共通ロジックを簡素化
 */
// eslint-disable-next-line max-lines-per-function -- 倉庫マスタ一覧ページの状態管理を1箇所で管理するため
export function useWarehouseListPage() {
  const master = useMasterListPage<Warehouse>({
    featureName: "Warehouses",
    defaultSort: { column: "warehouse_code", direction: "asc" },
    getRowId: (w) => w.warehouse_code,
    filterFn: (items, q) => {
      const query = q.toLowerCase();
      return items.filter(
        (i) =>
          i.warehouse_code.toLowerCase().includes(query) ||
          i.warehouse_name.toLowerCase().includes(query),
      );
    },
    sortFn: (data, sort) => {
      const s = [...data];
      s.sort((a, b) => {
        const av = a[sort.column as keyof Warehouse],
          bv = b[sort.column as keyof Warehouse];
        if (av === undefined || bv === undefined) return 0;
        const comp = String(av).localeCompare(String(bv), "ja");
        return sort.direction === "asc" ? comp : -comp;
      });
      return s;
    },
  });

  // リソースを master の showInactive 状態に同期
  const list = useWarehouseListResources(master.showInactive);

  // -- Mutation Handlers --
  const handleCreate = useCallback(
    (d: WarehouseCreate) =>
      list.create.mutate(d, {
        onSuccess: () => {
          master.log("Create success");
          master.dlgs.close();
        },
      }),
    [list.create, master],
  );

  const handleSoftDelete = useCallback(
    (e: string | null) =>
      list.softDel.mutate(
        {
          id: master.dlgs.deletingItem?.warehouse_code || "",
          version: master.dlgs.deletingItem?.version || 0,
          ...(e ? { endDate: e } : {}),
        },
        {
          onSuccess: () => {
            master.log("Soft delete success");
            master.dlgs.close();
          },
        },
      ),
    [list.softDel, master],
  );

  const handlePermanentDelete = useCallback(
    () =>
      list.permDel.mutate(
        {
          id: master.dlgs.deletingItem?.warehouse_code || "",
          version: master.dlgs.deletingItem?.version || 0,
        },
        {
          onSuccess: () => {
            master.log("Permanent delete success");
            master.dlgs.close();
          },
        },
      ),
    [list.permDel, master],
  );

  const handleRestore = useCallback(
    () =>
      list.rest.mutate(master.dlgs.restoringItem?.warehouse_code || "", {
        onSuccess: () => {
          master.log("Restore success");
          master.dlgs.close();
        },
      }),
    [list.rest, master],
  );

  const handleBulkAction = useCallback(
    async (fn: (p: { id: string | number; version: number }) => Promise<unknown>, msg: string) => {
      await master.executeBulkWithStatus(list.list.data ?? [], fn, msg);
    },
    [list.list.data, master],
  );

  return {
    ...master,
    list: list.list,
    create: list.create,
    softDel: list.softDel,
    permDel: list.permDel,
    rest: list.rest,
    handleCreate,
    handleSoftDelete,
    handlePermanentDelete,
    handleRestore,
    handleBulkAction,
    // 互換性のためのエイリアス
    selectedWarehouseCode: master.selectedItemCode,
    setSelectedWarehouseCode: master.setSelectedItemCode,
    isBulkDeleting: master.isBulkProcessing,
  };
}
