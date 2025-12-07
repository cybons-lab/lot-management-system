import { useEffect, useState, useMemo } from "react";

import type { SupplierAssignment, SupplierGroup } from "../types";

import { http } from "@/shared/api/http-client";

export function usePrimaryAssignments() {
  const [assignments, setAssignments] = useState<SupplierAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setIsLoading(true);
        const data = await http.get<SupplierAssignment[]>("assignments");
        setAssignments(data);
      } catch (err) {
        console.error("Failed to fetch assignments", err);
        setError("データの取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssignments();
  }, [refreshKey]);

  // 仕入先ごとにグループ化
  const supplierGroups: SupplierGroup[] = useMemo(
    () =>
      Object.values(
        assignments.reduce(
          (acc, assignment) => {
            const key = assignment.supplier_id;
            if (!acc[key]) {
              acc[key] = {
                supplier_id: assignment.supplier_id,
                supplier_code: assignment.supplier_code,
                supplier_name: assignment.supplier_name,
                assignments: [],
                primaryUser: null,
              };
            }
            acc[key].assignments.push(assignment);
            if (assignment.is_primary) {
              acc[key].primaryUser = assignment;
            }
            return acc;
          },
          {} as Record<number, SupplierGroup>,
        ),
      ),
    [assignments],
  );

  // 主担当がいない仕入先を上に表示
  const sortedGroups = useMemo(
    () =>
      [...supplierGroups].sort((a, b) => {
        if (!a.primaryUser && b.primaryUser) return -1;
        if (a.primaryUser && !b.primaryUser) return 1;
        return a.supplier_code.localeCompare(b.supplier_code);
      }),
    [supplierGroups],
  );

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return {
    assignments,
    isLoading,
    error,
    supplierGroups,
    sortedGroups,
    handleRefresh,
  };
}
