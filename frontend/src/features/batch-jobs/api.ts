/**
 * Batch Jobs API Client (v2.2 - Phase H-3)
 * バッチジョブ管理
 */

import { http } from "@/shared/api/http-client";

// ===== Types =====

/**
 * Batch Job
 */
export interface BatchJob {
  job_id: number;
  job_name: string;
  job_type: string;
  parameters: Record<string, unknown> | null;
  status: string;
  result_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/**
 * Batch Job List Response
 */
export interface BatchJobListResponse {
  jobs: BatchJob[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * Batch Job Execute Response
 */
export interface BatchJobExecuteResponse {
  job_id: number;
  status: string;
  message: string;
}

/**
 * Request types
 */
export interface CreateBatchJobRequest {
  job_name: string;
  job_type: string;
  parameters?: Record<string, unknown> | null;
}

export interface BatchJobExecuteRequest {
  parameters?: Record<string, unknown> | null;
}

export interface BatchJobsListParams {
  skip?: number;
  limit?: number;
  job_type?: string;
  status?: string;
}

// ===== API Functions =====

/**
 * Get batch jobs list
 * @endpoint GET /batch-jobs
 */
export const getBatchJobs = (params?: BatchJobsListParams) => {
  const searchParams = new URLSearchParams();
  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
  if (params?.job_type) searchParams.append("job_type", params.job_type);
  if (params?.status) searchParams.append("status", params.status);

  const queryString = searchParams.toString();
  return http.get<BatchJobListResponse>(`batch-jobs${queryString ? "?" + queryString : ""}`);
};

/**
 * Get batch job detail
 * @endpoint GET /batch-jobs/{job_id}
 */
export const getBatchJob = (jobId: number) => {
  return http.get<BatchJob>(`batch-jobs/${jobId}`);
};

/**
 * Create batch job
 * @endpoint POST /batch-jobs
 */
export const createBatchJob = (data: CreateBatchJobRequest) => {
  return http.post<BatchJob>("batch-jobs", data);
};

/**
 * Execute batch job
 * @endpoint POST /batch-jobs/{job_id}/execute
 */
export const executeBatchJob = (jobId: number, data?: BatchJobExecuteRequest) => {
  return http.post<BatchJobExecuteResponse>(`batch-jobs/${jobId}/execute`, data ?? {});
};

/**
 * Cancel batch job
 * @endpoint POST /batch-jobs/{job_id}/cancel
 */
export const cancelBatchJob = (jobId: number) => {
  return http.post<BatchJob>(`batch-jobs/${jobId}/cancel`, {});
};

/**
 * Delete batch job
 * @endpoint DELETE /batch-jobs/{job_id}
 */
export const deleteBatchJob = (jobId: number) => {
  return http.delete(`batch-jobs/${jobId}`);
};

// ===== SAP Inventory Sync =====

/**
 * Inventory Sync Alert
 */
export interface InventorySyncAlert {
  rule_id: number;
  rule_code: string;
  rule_name: string;
  rule_type: string;
  rule_parameters: {
    product_group_id: number;
    local_qty: number;
    sap_qty: number;
    diff_pct: number;
    diff_amount: number;
    checked_at: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Inventory Sync Alerts Response
 */
export interface InventorySyncAlertsResponse {
  alerts: InventorySyncAlert[];
  total: number;
}

/**
 * Inventory Sync Execute Response
 */
export interface InventorySyncExecuteResponse {
  success: boolean;
  message: string;
  data?: {
    checked_products: number;
    discrepancies_found: number;
    alerts_created: number;
    details: unknown[];
  };
}

/**
 * Get inventory sync alerts
 * @endpoint GET /batch-jobs/inventory-sync/alerts
 */
export const getInventorySyncAlerts = (activeOnly: boolean = true) => {
  return http.get<InventorySyncAlertsResponse>(
    `batch-jobs/inventory-sync/alerts?active_only=${activeOnly}`,
  );
};

/**
 * Execute inventory sync
 * @endpoint POST /batch-jobs/inventory-sync/execute
 */
export const executeInventorySync = () => {
  return http.post<InventorySyncExecuteResponse>("batch-jobs/inventory-sync/execute", {});
};
