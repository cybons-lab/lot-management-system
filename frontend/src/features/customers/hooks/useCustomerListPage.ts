import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";

import type { Customer } from "../api";

import { useCustomerListResources } from "./useCustomerListResources";

import { useAuth } from "@/features/auth/AuthContext";
import { useTable } from "@/hooks/ui";
import { type SortConfig } from "@/shared/components/data/DataTable";

function useCustomerListPageState(customers: Customer[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "customer_code", direction: "asc" });
  const table = useTable({ initialPageSize: 25 });
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) => c.customer_code.toLowerCase().includes(q) || c.customer_name.toLowerCase().includes(q),
    );
  }, [customers, searchQuery]);
  const sorted = useMemo(() => {
    const s = [...filtered];
    s.sort((a, b) => {
      const av = a[sort.column as keyof Customer],
        bv = b[sort.column as keyof Customer];
      if (av === undefined || bv === undefined) return 0;
      const comp = String(av).localeCompare(String(bv), "ja");
      return sort.direction === "asc" ? comp : -comp;
    });
    return s;
  }, [filtered, sort]);
  return {
    searchQuery,
    setSearchQuery,
    sort,
    setSort,
    table,
    filtered,
    sorted,
    stats: { total: customers.length, filtered: filtered.length },
  };
}

function useCustomerBulkActions(customers: Customer[]) {
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const executeBulk = async (
    fn: (p: { id: string; version: number }) => Promise<any>,
    msg: string,
  ) => {
    setIsBulkDeleting(true);
    try {
      const vMap = new Map(customers.map((c) => [c.customer_code, c.version]));
      const res = await Promise.allSettled(
        selectedIds.map((id) => {
          const v = vMap.get(id as string);
          return v != null ? fn({ id: id as string, version: v }) : Promise.reject("no version");
        }),
      );
      const ok = res.filter((r) => r.status === "fulfilled").length;
      toast.success(`${ok} 件の${msg}を完了しました`);
      setSelectedIds([]);
    } finally {
      setIsBulkDeleting(false);
      setIsBulkOpen(false);
    }
  };
  return { selectedIds, setSelectedIds, isBulkOpen, setIsBulkOpen, isBulkDeleting, executeBulk };
}

export function useCustomerListPage() {
  const { user } = useAuth();
  const r = useCustomerListResources();
  const state = useCustomerListPageState(r.cust);
  const bulk = useCustomerBulkActions(r.cust);
  const [selCode, setSelCode] = useState<string | null>(null);

  const handlers = {
    handleCreate: (d: any) => r.create.mutate(d, { onSuccess: r.dlgs.close }),
    handleSoftDelete: (e: string | null) =>
      r.softDel.mutate(
        {
          id: r.dlgs.deletingItem?.customer_code || "",
          version: r.dlgs.deletingItem?.version || 0,
          endDate: e || undefined,
        },
        { onSuccess: r.dlgs.close },
      ),
    handlePermanentDelete: () =>
      r.permDel.mutate(
        {
          id: r.dlgs.deletingItem?.customer_code || "",
          version: r.dlgs.deletingItem?.version || 0,
        },
        { onSuccess: r.dlgs.close },
      ),
    handleRestore: () =>
      r.rest.mutate(r.dlgs.restoringItem?.customer_code || "", { onSuccess: r.dlgs.close }),
  };

  return {
    ...r,
    ...state,
    ...bulk,
    ...handlers,
    showInactive: r.showInact,
    setShowInactive: r.setShowInact,
    selectedCustomerCode: selCode,
    setSelectedCustomerCode: setSelCode,
    isAdmin: user?.roles?.includes("admin") ?? false,
    handleRowClick: useCallback((c: Customer) => setSelCode(c.customer_code), []),
  };
}
