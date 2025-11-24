/**
 * Alert API client
 *
 * Provides functions to fetch alerts and alert summaries from the backend.
 */

import type { AlertCategory, AlertItem, AlertSeverity, AlertSummaryResponse } from "../types/alerts";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

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
