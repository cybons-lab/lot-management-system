import type { CandidateLotItem } from "../../../api";
import { getOrderQuantity } from "../../../utils/allocationCalculations";
import { getLineAllocationStatus } from "../FlatAllocationList";

// フィルタ関数で複数のステータス判定に依存するため引数が多い
/* eslint-disable max-params */
import type { FilterStatus, LineWithOrderInfo } from "./types";

export function shouldShowLine(
  item: LineWithOrderInfo,
  filterStatus: FilterStatus,
  getLineAllocations: (lineId: number) => Record<number, number>,
  getCandidateLots: (lineId: number) => CandidateLotItem[],
  isOverAllocated: (lineId: number) => boolean,
): boolean {
  if (filterStatus === "all") return true;

  const line = item.line;
  const allocations = getLineAllocations(line.id);
  const required = getOrderQuantity(line);
  const candidates = getCandidateLots(line.id);
  const hasCandidates = candidates.length > 0;
  const isOver = isOverAllocated(line.id);
  const status = getLineAllocationStatus(line, allocations, required, isOver);

  switch (filterStatus) {
    case "complete":
      return status === "completed";
    case "shortage":
      // ユーザー要望: 候補なしも在庫不足として扱う
      return (status === "shortage" || (status as string) === "no-candidates") && required > 0;
    case "over":
      return status === "over";
    case "unallocated":
      // 未引当かつ候補あり（純粋な未着手）
      return status === "unallocated" && hasCandidates;
    default:
      return true;
  }
}
