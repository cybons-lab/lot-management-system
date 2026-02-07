import type { CandidateLotItem } from "@/features/allocations/api";
import type { LineStatus } from "@/features/allocations/hooks/useLotAllocation";
import type { OrderLine, OrderWithLinesResponse } from "@/shared/types/aliases";

export type FilterStatus = "all" | "complete" | "shortage" | "over" | "unallocated";

export type ViewMode = "line" | "order";

export interface LineWithOrderInfo {
  id: number;
  line: OrderLine;
  order: OrderWithLinesResponse;
  order_code: string;
  customer_name: string;
  order_date: string;
  order_id: number;
}

export interface GroupedOrder {
  order_id: number;
  order_code: string;
  customer_name: string;
  order_date: string;
  lines: LineWithOrderInfo[];
}

export interface AllocationListProps {
  orders: OrderWithLinesResponse[];
  isLoading: boolean;
  onSaveAllocations: (lineId: number) => void;
  customerMap: Record<number, string>;
  productMap: Record<number, string>;
  getLineAllocations: (lineId: number) => Record<number, number>;
  getCandidateLots: (lineId: number) => CandidateLotItem[];
  isOverAllocated: (lineId: number) => boolean;
  onLotAllocationChange: (lineId: number, lotId: number, quantity: number) => void;
  onAutoAllocate: (lineId: number) => void;
  onClearAllocations: (lineId: number) => void;
  lineStatuses: Record<number, LineStatus>;
}
