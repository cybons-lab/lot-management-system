import { useState, useCallback, useMemo } from "react";

import type { Warehouse, WarehouseCreate } from "../api";

import { useWarehouseListResources, useWarehouseBulkActions } from "./useWarehouseListResources";

import { useAuth } from "@/features/auth/AuthContext";
import { useListPageDialogs } from "@/hooks/ui";
import { type SortConfig } from "@/shared/components/data/DataTable";

export function useWarehouseListPage() {
  const { user } = useAuth();
  const [showInact, setShowInact] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "warehouse_code", direction: "asc" });
  const [selCode, setSelCode] = useState<string | null>(null);
  const [selIds, setSelIds] = useState<(string | number)[]>([]);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const dlgs = useListPageDialogs<Warehouse>();
  const r = useWarehouseListResources(showInact);
  const bulk = useWarehouseBulkActions(r.list.data ?? [], selIds, setSelIds);

  const filtered = useMemo(() => {
    const s = r.list.data ?? [],
      query = q.toLowerCase();
    return s.filter(
      (i) =>
        i.warehouse_code.toLowerCase().includes(query) ||
        i.warehouse_name.toLowerCase().includes(query),
    );
  }, [r.list.data, q]);

  const sorted = useMemo(() => sortWarehouses(filtered, sort), [filtered, sort]);

  const h = {
    handleCreate: (d: WarehouseCreate) => r.create.mutate(d, { onSuccess: dlgs.close }),
    handleSoftDelete: (e: string | null) =>
      r.softDel.mutate(
        {
          id: dlgs.deletingItem?.warehouse_code || "",
          version: dlgs.deletingItem?.version || 0,
          endDate: e || undefined,
        },
        { onSuccess: dlgs.close },
      ),
    handlePermanentDelete: () =>
      r.permDel.mutate(
        { id: dlgs.deletingItem?.warehouse_code || "", version: dlgs.deletingItem?.version || 0 },
        { onSuccess: dlgs.close },
      ),
    handleRestore: () =>
      r.rest.mutate(dlgs.restoringItem?.warehouse_code || "", { onSuccess: dlgs.close }),
    executeBulkWithStatus: async (fn: any, msg: string) => {
      setIsBulkDeleting(true);
      try {
        await bulk.executeBulk(fn, msg);
      } finally {
        setIsBulkDeleting(false);
        setIsBulkOpen(false);
      }
    },
  };

  return {
    ...r,
    dlgs,
    ...h,
    showInactive: showInact,
    setShowInactive: setShowInact,
    searchQuery: q,
    setSearchQuery: setQ,
    sort,
    setSort,
    selectedWarehouseCode: selCode,
    setSelectedWarehouseCode: setSelCode,
    selectedIds: selIds,
    setSelectedIds: setSelIds,
    isBulkOpen,
    setIsBulkOpen,
    isBulkDeleting,
    sorted,
    isAdmin: user?.roles?.includes("admin") ?? false,
    handleRowClick: useCallback((w: Warehouse) => setSelCode(w.warehouse_code), []),
  };
}

function sortWarehouses(data: any[], sort: SortConfig): any[] {
  const s = [...data];
  s.sort((a, b) => {
    const av = a[sort.column],
      bv = b[sort.column];
    if (av === undefined || bv === undefined) return 0;
    const comp = String(av).localeCompare(String(bv), "ja");
    return sort.direction === "asc" ? comp : -comp;
  });
  return s;
}
