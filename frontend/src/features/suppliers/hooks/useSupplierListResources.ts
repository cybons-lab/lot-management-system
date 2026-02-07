import { toast } from "sonner";

import type { Supplier } from "../api";
import { useSuppliers } from "../hooks";

export function useSupplierListResources(showInactive: boolean) {
    const { useList, useCreate, useSoftDelete, usePermanentDelete, useRestore } = useSuppliers();
    return {
        list: useList(showInactive),
        create: useCreate(),
        softDel: useSoftDelete(),
        permDel: usePermanentDelete(),
        rest: useRestore(),
    };
}

export function useSupplierBulkActions(suppliers: Supplier[], selectedIds: (string | number)[], setSelectedIds: (ids: (string | number)[]) => void) {
    const executeBulk = async (fn: (p: { id: string; version: number }) => Promise<any>, msg: string) => {
        const vMap = new Map(suppliers.map(s => [s.supplier_code, s.version]));
        const res = await Promise.allSettled(selectedIds.map(id => {
            const v = vMap.get(id as string);
            return v != null ? fn({ id: id as string, version: v }) : Promise.reject("no v");
        }));
        toast.success(`${res.filter(r => r.status === "fulfilled").length} 件の${msg}を完了`);
        setSelectedIds([]);
    };
    return { executeBulk };
}
