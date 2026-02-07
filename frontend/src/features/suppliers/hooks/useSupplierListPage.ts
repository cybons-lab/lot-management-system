import { useCallback } from "react";

import type { Supplier, SupplierCreate } from "../api";

import { useSupplierListResources } from "./useSupplierListResources";

import { useMasterListPage } from "@/hooks/ui/useMasterListPage";

/**
 * 仕入先マスタ一覧ページ用のカスタムフック
 * useMasterListPage を利用して共通ロジックを簡素化
 */
// eslint-disable-next-line max-lines-per-function -- 仕入先マスタ一覧ページの状態管理を1箇所で管理するため
export function useSupplierListPage() {
  const master = useMasterListPage<Supplier>({
    featureName: "Suppliers",
    defaultSort: { column: "supplier_code", direction: "asc" },
    getRowId: (s) => s.supplier_code,
    filterFn: (items, q) => {
      const query = q.toLowerCase();
      return items.filter(
        (i) =>
          i.supplier_code.toLowerCase().includes(query) ||
          i.supplier_name.toLowerCase().includes(query),
      );
    },
    sortFn: (data, sort) => {
      const s = [...data];
      s.sort((a, b) => {
        const av = a[sort.column as keyof Supplier],
          bv = b[sort.column as keyof Supplier];
        if (av === undefined || bv === undefined) return 0;
        const comp = String(av).localeCompare(String(bv), "ja");
        return sort.direction === "asc" ? comp : -comp;
      });
      return s;
    },
  });

  // リソースを master の showInactive 状態に同期
  const list = useSupplierListResources(master.showInactive);

  // -- Mutation Handlers --
  const handleCreate = useCallback(
    (d: SupplierCreate) =>
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
          id: master.dlgs.deletingItem?.supplier_code || "",
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
          id: master.dlgs.deletingItem?.supplier_code || "",
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
      list.rest.mutate(master.dlgs.restoringItem?.supplier_code || "", {
        onSuccess: () => {
          master.log("Restore success");
          master.dlgs.close();
        },
      }),
    [list.rest, master],
  );

  const handleBulkAction = useCallback(
    async (fn: any, msg: string) => {
      await master.executeBulkWithStatus(list.list.data ?? [], fn, msg);
    },
    [list.list.data, master],
  );

  return {
    ...master,
    list: list.list, // データ本体
    create: list.create,
    softDel: list.softDel,
    permDel: list.permDel,
    rest: list.rest,
    handleCreate,
    handleSoftDelete,
    handlePermanentDelete,
    handleRestore,
    handleBulkAction,
    // 既存のページコンポーネントとの互換性のためのエイリアス
    selectedSupplierCode: master.selectedItemCode,
    setSelectedSupplierCode: master.setSelectedItemCode,
    isBulkDeleting: master.isBulkProcessing,
  };
}
