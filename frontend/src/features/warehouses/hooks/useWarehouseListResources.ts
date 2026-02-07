import { toast } from "sonner";

import type { Warehouse } from "../api";
import { useWarehouses } from "../hooks";

export function useWarehouseListResources(showInactive: boolean) {
  const { useList, useCreate, useSoftDelete, usePermanentDelete, useRestore } = useWarehouses();
  return {
    list: useList(showInactive),
    create: useCreate(),
    softDel: useSoftDelete(),
    permDel: usePermanentDelete(),
    rest: useRestore(),
  };
}

export function useWarehouseBulkActions(
  warehouses: Warehouse[],
  selectedIds: (string | number)[],
  setSelectedIds: (ids: (string | number)[]) => void,
) {
  const executeBulk = async (
    fn: (p: { id: string; version: number }) => Promise<any>,
    msg: string,
  ) => {
    const vMap = new Map(warehouses.map((w) => [w.warehouse_code, w.version]));
    const res = await Promise.allSettled(
      selectedIds.map((id) => {
        const v = vMap.get(id as string);
        return v != null ? fn({ id: id as string, version: v }) : Promise.reject("no v");
      }),
    );
    toast.success(`${res.filter((r) => r.status === "fulfilled").length} 件の${msg}を完了`);
    setSelectedIds([]);
  };
  return { executeBulk };
}
