import { useState, useCallback, useMemo } from "react";

import type { Supplier, SupplierCreate } from "../api";

import { useSupplierListResources, useSupplierBulkActions } from "./useSupplierListResources";

import { useAuth } from "@/features/auth/AuthContext";
import { useListPageDialogs, useTable } from "@/hooks/ui";
import { type SortConfig } from "@/shared/components/data/DataTable";

export function useSupplierListPage() {
  const { user } = useAuth();
  const [showInact, setShowInact] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "supplier_code", direction: "asc" });
  const [selCode, setSelCode] = useState<string | null>(null);
  const [selIds, setSelIds] = useState<(string | number)[]>([]);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const table = useTable({ initialPageSize: 25 });
  const dlgs = useListPageDialogs<Supplier>();
  const r = useSupplierListResources(showInact);
  const bulk = useSupplierBulkActions(r.list.data ?? [], selIds, setSelIds);

  const filtered = useMemo(() => {
    const s = r.list.data ?? [],
      query = q.toLowerCase();
    return s.filter(
      (i) =>
        i.supplier_code.toLowerCase().includes(query) ||
        i.supplier_name.toLowerCase().includes(query),
    );
  }, [r.list.data, q]);

  const sorted = useMemo(() => sortSuppliers(filtered, sort), [filtered, sort]);

  const h = {
    handleCreate: (d: SupplierCreate) => r.create.mutate(d, { onSuccess: dlgs.close }),
    handleSoftDelete: (e: string | null) =>
      r.softDel.mutate(
        {
          id: dlgs.deletingItem?.supplier_code || "",
          version: dlgs.deletingItem?.version || 0,
          endDate: e || undefined,
        },
        { onSuccess: dlgs.close },
      ),
    handlePermanentDelete: () =>
      r.permDel.mutate(
        { id: dlgs.deletingItem?.supplier_code || "", version: dlgs.deletingItem?.version || 0 },
        { onSuccess: dlgs.close },
      ),
    handleRestore: () =>
      r.rest.mutate(dlgs.restoringItem?.supplier_code || "", { onSuccess: dlgs.close }),
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
    selectedSupplierCode: selCode,
    setSelectedSupplierCode: setSelCode,
    selectedIds: selIds,
    setSelectedIds: setSelIds,
    isBulkOpen,
    setIsBulkOpen,
    isBulkDeleting,
    table,
    sorted,
    isAdmin: user?.roles?.includes("admin") ?? false,
    handleRowClick: useCallback((s: Supplier) => setSelCode(s.supplier_code), []),
  };
}

function sortSuppliers(data: any[], sort: SortConfig): any[] {
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
