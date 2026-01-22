/**
 * SmartRead OCR Types
 */

export interface SmartReadConfig {
  id: number;
  name: string;
  endpoint: string;
  api_key: string;
  template_ids: string | null;
  export_type: string;
  aggregation_type: string | null;
  watch_dir: string | null;
  export_dir: string | null;
  input_exts: string | null;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SmartReadConfigCreate {
  name: string;
  endpoint: string;
  api_key: string;
  template_ids?: string | null;
  export_type?: string;
  aggregation_type?: string | null;
  watch_dir?: string | null;
  export_dir?: string | null;
  input_exts?: string | null;
  description?: string | null;
  is_active?: boolean;
  is_default?: boolean;
}

export interface SmartReadConfigUpdate {
  name?: string;
  endpoint?: string;
  api_key?: string;
  template_ids?: string | null;
  export_type?: string;
  aggregation_type?: string | null;
  watch_dir?: string | null;
  export_dir?: string | null;
  input_exts?: string | null;
  description?: string | null;
  is_active?: boolean;
  is_default?: boolean;
}

export interface SmartReadAnalyzeResponse {
  success: boolean;
  filename: string;
  data: Record<string, unknown>[] | null;
  error_message: string | null;
}

export interface SmartReadDiagnoseResult {
  success: boolean;
  error_message: string | null;
  response: Record<string, unknown> | null;
}

export interface SmartReadDiagnoseResponse {
  request_flow: SmartReadDiagnoseResult;
  export_flow: SmartReadDiagnoseResult;
}

export interface SmartReadTask {
  task_id: string;
  name: string;
  status: string;
  created_at: string | null;
  request_count: number;
}

export interface SmartReadTaskListResponse {
  tasks: SmartReadTask[];
}

export interface SmartReadExport {
  export_id: string;
  state: string;
  task_id: string | null;
  error_message: string | null;
}

export interface SmartReadValidationError {
  row: number;
  field: string;
  message: string;
  value: string | null;
}

export interface SmartReadLongData {
  id: number;
  config_id: number;
  task_id: string;
  task_date: string;
  row_index: number;
  content: Record<string, unknown>;
  status: string;
  error_reason: string | null;
  created_at: string;
}

export interface SmartReadLongDataListResponse {
  data: SmartReadLongData[];
}

export interface SmartReadResetResponse {
  success: boolean;
  deleted_long_count: number;
  deleted_wide_count: number;
  deleted_request_count: number;
  deleted_task_count: number;
  deleted_export_history_count: number;
  message: string;
}

export interface SmartReadCsvDataResponse {
  wide_data: Record<string, unknown>[];
  long_data: Record<string, unknown>[];
  errors: SmartReadValidationError[];
  filename: string | null;
}

export interface SmartReadTransformResponse {
  long_data: Record<string, unknown>[];
  errors: SmartReadValidationError[];
}

export interface SmartReadTaskDetail {
  id: number;
  config_id: number;
  task_id: string;
  task_date: string;
  name: string | null;
  state: string | null;
  synced_at: string | null;
  skip_today: boolean;
  created_at: string;
}

export interface SmartReadRequest {
  id: number;
  request_id: string;
  task_id: string;
  task_date: string;
  config_id: number;
  filename: string;
  num_of_pages: number | null;
  submitted_at: string;
  state: string;
  error_message: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface SmartReadRequestListResponse {
  requests: SmartReadRequest[];
}

export interface SmartReadSaveLongDataRequest {
  config_id: number;
  task_id: string;
  task_date: string;
  wide_data: Record<string, unknown>[];
  long_data: Record<string, unknown>[];
  filename: string | null;
}

export interface SmartReadSaveLongDataResponse {
  success: boolean;
  saved_wide_count: number;
  saved_long_count: number;
  message: string;
}

export interface SmartReadPadRunStartRequest {
  filenames: string[];
}

export interface SmartReadPadRunStartResponse {
  run_id: string;
  status: string;
  message: string;
}

export interface SmartReadPadRunStatus {
  run_id: string;
  config_id: number;
  status: "RUNNING" | "SUCCEEDED" | "FAILED" | "STALE";
  step: string;
  task_id: string | null;
  export_id: string | null;
  filenames: string[] | null;
  wide_data_count: number;
  long_data_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  heartbeat_at: string;
  completed_at: string | null;
  can_retry: boolean;
  retry_count: number;
  max_retries: number;
}

export interface SmartReadPadRunListItem {
  run_id: string;
  status: string;
  step: string;
  filenames: string[] | null;
  wide_data_count: number;
  long_data_count: number;
  created_at: string;
  completed_at: string | null;
}

export interface SmartReadPadRunListResponse {
  runs: SmartReadPadRunListItem[];
}

export interface SmartReadPadRunRetryResponse {
  new_run_id: string;
  original_run_id: string;
  message: string;
}
