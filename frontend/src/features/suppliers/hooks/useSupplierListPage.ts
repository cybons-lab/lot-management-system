import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";

import type { Supplier, SupplierCreate } from "../api";
import { useSuppliers } from "../hooks";

import { useAuth } from "@/features/auth/AuthContext";
import { useListPageDialogs, useTable } from "@/hooks/ui";
import { type SortConfig } from "@/shared/components/data/DataTable";

export function useSupplierListPage() {
  const { user } = useAuth();
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "supplier_code", direction: "asc" });
  const [selCode, setSelCode] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const table = useTable({ initialPageSize: 25 });
  const dlgs = useListPageDialogs<Supplier>();
  const { useList, useCreate, useSoftDelete, usePermanentDelete, useRestore } = useSuppliers();

  const resources = {
    list: useList(showInactive),
    create: useCreate(),
    softDel: useSoftDelete(),
    permDel: usePermanentDelete(),
    rest: useRestore(),
  };

  const suppliersRaw = resources.list.data;
  const filtered = useMemo(() => {
    const s = suppliersRaw ?? [];
    const q = searchQuery.toLowerCase();
    return s.filter(
      (i) => i.supplier_code.toLowerCase().includes(q) || i.supplier_name.toLowerCase().includes(q),
    );
  }, [suppliersRaw, searchQuery]);

  const sorted = useMemo(() => {
    const s = [...filtered];
    s.sort((a, b) => {
      const av = a[sort.column as keyof Supplier],
        bv = b[sort.column as keyof Supplier];
      if (av === undefined || bv === undefined) return 0;
      const comp = String(av).localeCompare(String(bv), "ja");
      return sort.direction === "asc" ? comp : -comp;
    });
    return s;
  }, [filtered, sort]);

  const executeBulk = async (
    fn: (p: { id: string; version: number }) => Promise<any>,
    msg: string,
  ) => {
    setIsBulkDeleting(true);
    try {
      const vMap = new Map((suppliersRaw ?? []).map((s) => [s.supplier_code, s.version]));
      const res = await Promise.allSettled(
        selectedIds.map((id) => {
          const v = vMap.get(id as string);
          return v != null ? fn({ id: id as string, version: v }) : Promise.reject("no v");
        }),
      );
      toast.success(`${res.filter((r) => r.status === "fulfilled").length} 件の${msg}を完了`);
      setSelectedIds([]);
    } finally {
      setIsBulkDeleting(false);
      setIsBulkOpen(false);
    }
  };

  return {
    ...resources,
    dlgs,
    showInactive,
    setShowInactive,
    searchQuery,
    setSearchQuery,
    sort,
    setSort,
    selectedSupplierCode: selCode,
    setSelectedSupplierCode: setSelCode,
    selectedIds,
    setSelectedIds,
    isBulkOpen,
    setIsBulkOpen,
    isBulkDeleting,
    executeBulk,
    table,
    sorted,
    isAdmin: user?.roles?.includes("admin") ?? false,
    handleRowClick: useCallback((s: Supplier) => setSelCode(s.supplier_code), []),
    handleCreate: (d: SupplierCreate) => resources.create.mutate(d, { onSuccess: dlgs.close }),
    handleSoftDelete: (e: string | null) =>
      resources.softDel.mutate(
        {
          id: dlgs.deletingItem?.supplier_code || "",
          version: dlgs.deletingItem?.version || 0,
          endDate: e || undefined,
        },
        { onSuccess: dlgs.close },
      ),
    handlePermanentDelete: () =>
      resources.permDel.mutate(
        { id: dlgs.deletingItem?.supplier_code || "", version: dlgs.deletingItem?.version || 0 },
        { onSuccess: dlgs.close },
      ),
    handleRestore: () =>
      resources.rest.mutate(dlgs.restoringItem?.supplier_code || "", { onSuccess: dlgs.close }),
  };
}
