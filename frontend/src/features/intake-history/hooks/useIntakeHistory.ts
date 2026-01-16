/**
 * Intake History hooks
 *
 * 入庫履歴のReact Query hooks
 */

import { useQuery } from "@tanstack/react-query";

import type { IntakeHistoryListParams } from "../api";
import { getIntakeCalendarSummary, getIntakeHistory, getIntakeHistoryDetail } from "../api";

export const intakeHistoryKeys = {
  all: ["intake-history"] as const,
  lists: () => [...intakeHistoryKeys.all, "list"] as const,
  list: (params: IntakeHistoryListParams) => [...intakeHistoryKeys.lists(), params] as const,
  details: () => [...intakeHistoryKeys.all, "detail"] as const,
  detail: (id: number) => [...intakeHistoryKeys.details(), id] as const,
  calendar: (year: number, month: number) =>
    [...intakeHistoryKeys.all, "calendar", year, month] as const,
};

export function useIntakeHistory(params?: IntakeHistoryListParams) {
  return useQuery({
    queryKey: intakeHistoryKeys.list(params || {}),
    queryFn: () => getIntakeHistory(params),
  });
}

export function useIntakeHistoryDetail(intakeId: number) {
  return useQuery({
    queryKey: intakeHistoryKeys.detail(intakeId),
    queryFn: () => getIntakeHistoryDetail(intakeId),
    enabled: !!intakeId,
  });
}

export function useIntakeCalendarSummary(params: {
  year: number;
  month: number;
  warehouse_id?: number;
  product_id?: number;
  supplier_id?: number;
}) {
  return useQuery({
    queryKey: [...intakeHistoryKeys.calendar(params.year, params.month), params],
    queryFn: () => getIntakeCalendarSummary(params),
  });
}
