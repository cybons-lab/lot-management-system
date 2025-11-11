// frontend/src/features/admin/api/admin-simulate.ts
import { http } from "@/shared/libs/http";

// リクエスト型
export type SimulateSeedRequest = {
  profile?: string | null;
  random_seed?: number | null;
  warehouses?: number;
  lot_split_max_per_line?: number;
  order_line_items_per_order?: number;
  destinations_max_per_order?: number;
  save_snapshot?: boolean;
  snapshot_name?: string | null;
  use_last_snapshot?: boolean;
  case_mix?: Record<string, number> | null;
};

// レスポンス型
export type SimulateSeedResponse = {
  task_id: string;
  message: string;
};

export type SimulateProgressResponse = {
  task_id: string;
  status: string;
  phase: string;
  progress_pct: number;
  logs: string[];
  error?: string | null;
};

export type CapCheckResult = {
  lot_split: string;
  destinations: string;
  order_lines: string;
};

export type SimulateResultSummary = {
  warehouses: number;
  orders: number;
  order_lines: number;
  lots: number;
  allocations: number;
  cap_checks: CapCheckResult;
  stock_equation_ok: boolean;
  orphan_count: number;
};

export type SimulateResultResponse = {
  success: boolean;
  summary?: SimulateResultSummary | null;
  snapshot_id?: number | null;
  error?: string | null;
};

export type SeedSnapshotListItem = {
  id: number;
  name: string;
  created_at: string;
  params_json: Record<string, any>;
  summary_json?: Record<string, any> | null;
};

export type SeedSnapshotListResponse = {
  snapshots: SeedSnapshotListItem[];
};

// API関数
export async function postSimulateSeedData(
  body: SimulateSeedRequest,
): Promise<SimulateSeedResponse> {
  return http.post<SimulateSeedResponse>("admin/simulate-seed-data", body);
}

export async function getSimulateProgress(taskId: string): Promise<SimulateProgressResponse> {
  return http.get<SimulateProgressResponse>(`admin/simulate-progress/${taskId}`);
}

export async function getSimulateResult(taskId: string): Promise<SimulateResultResponse> {
  return http.get<SimulateResultResponse>(`admin/simulate-result/${taskId}`);
}

export async function getSeedSnapshots(): Promise<SeedSnapshotListResponse> {
  return http.get<SeedSnapshotListResponse>("admin/seed-snapshots");
}

export async function deleteSeedSnapshot(snapshotId: number): Promise<{ success: boolean }> {
  return http.delete<{ success: boolean }>(`admin/seed-snapshots/${snapshotId}`);
}

export async function restoreSeedSnapshot(
  snapshotId: number,
): Promise<{ task_id: string; message: string }> {
  return http.post<{ task_id: string; message: string }>(
    `admin/seed-snapshots/${snapshotId}/restore`,
    {},
  );
}
