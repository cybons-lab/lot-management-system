import { useEffect, useState, useMemo, useRef } from "react";
import { toast } from "sonner";

import type { SupplierAssignment, SupplierGroup } from "../types";

import { http } from "@/shared/api/http-client";

export function useSupplierAssignmentsList() {
  const [assignments, setAssignments] = useState<SupplierAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Use ref to track current refreshKey for race condition prevention
  const refreshKeyRef = useRef(refreshKey);
  refreshKeyRef.current = refreshKey;

  useEffect(() => {
    const currentRefreshKey = refreshKey;
    const abortController = new AbortController();

    const fetchAssignments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await http.get<SupplierAssignment[]>("assignments", {
          signal: abortController.signal,
        });
        // Check if refreshKey hasn't changed during the request
        if (refreshKeyRef.current === currentRefreshKey) {
          setAssignments(data);
        }
      } catch (err) {
        // Ignore AbortError (expected when component unmounts or refreshKey changes)
        if ((err as Error).name !== "AbortError") {
          console.error("Failed to fetch assignments", err);
          const errorMessage = "データの取得に失敗しました";
          if (refreshKeyRef.current === currentRefreshKey) {
            setError(errorMessage);
          }
          toast.error(errorMessage);
        }
      } finally {
        if (refreshKeyRef.current === currentRefreshKey) {
          setIsLoading(false);
        }
      }
    };

    fetchAssignments();

    return () => {
      abortController.abort();
    };
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
              };
            }
            acc[key].assignments.push(assignment);
            return acc;
          },
          {} as Record<number, SupplierGroup>,
        ),
      ),
    [assignments],
  );

  // 仕入先コード順にソート
  const sortedGroups = useMemo(
    () => [...supplierGroups].sort((a, b) => a.supplier_code.localeCompare(b.supplier_code)),
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
