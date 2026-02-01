/**
 * Alert API client
 *
 * Provides functions to fetch alerts and alert summaries from the backend.
 */

import type {
  AlertCategory,
  AlertItem,
  AlertSeverity,
  AlertSummaryResponse,
} from "../../shared/types/alerts";

// 開発環境では常にViteプロキシ(/api)を使用する
const API_BASE = import.meta.env.DEV ? "/api" : import.meta.env.VITE_API_BASE || "/api";

interface AlertListParams {
  severity?: AlertSeverity | AlertSeverity[];
  category?: AlertCategory | AlertCategory[];
  limit?: number;
  onlyOpen?: boolean;
}

/**
 * Fetch list of alerts
 */
export async function getAlerts(params: AlertListParams = {}): Promise<AlertItem[]> {
  const queryParams = new URLSearchParams();

  if (params.severity) {
    const severities = Array.isArray(params.severity) ? params.severity : [params.severity];
    queryParams.append("severity", severities.join(","));
  }

  if (params.category) {
    const categories = Array.isArray(params.category) ? params.category : [params.category];
    queryParams.append("category", categories.join(","));
  }

  if (params.limit !== undefined) {
    queryParams.append("limit", params.limit.toString());
  }

  if (params.onlyOpen !== undefined) {
    queryParams.append("only_open", params.onlyOpen.toString());
  }

  const url = `${API_BASE}/alerts?${queryParams.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch alerts: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch alert summary
 */
export async function getAlertSummary(): Promise<AlertSummaryResponse> {
  const url = `${API_BASE}/alerts/summary`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch alert summary: ${response.statusText}`);
  }

  return response.json();
}
