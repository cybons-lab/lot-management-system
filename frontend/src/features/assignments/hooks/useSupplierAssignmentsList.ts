import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { SupplierAssignment, SupplierGroup } from "../types";

import { assignmentKeys } from "./useAssignments";

import { http } from "@/shared/api/http-client";

export function useSupplierAssignmentsList() {
  const {
    data: assignments = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: assignmentKeys.all,
    queryFn: () => http.get<SupplierAssignment[]>("assignments"),
  });

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

  return {
    assignments,
    isLoading,
    error: error ? "データの取得に失敗しました" : null,
    supplierGroups,
    sortedGroups,
    handleRefresh: refetch,
  };
}
