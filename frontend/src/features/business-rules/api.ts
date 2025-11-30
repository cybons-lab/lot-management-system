/**
 * Business Rules API Client (v2.2 - Phase H-2)
 * 業務ルール管理
 */

import { http } from "@/shared/api/http-client";

// ===== Types =====

/**
 * Business Rule
 */
export interface BusinessRule {
  rule_id: number;
  rule_code: string;
  rule_name: string;
  rule_type: string;
  rule_parameters: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Business Rule List Response
 */
export interface BusinessRuleListResponse {
  rules: BusinessRule[];
  total: number;
}

/**
 * Request types
 */
export interface CreateBusinessRuleRequest {
  rule_code: string;
  rule_name: string;
  rule_type: string;
  rule_parameters: Record<string, unknown>;
  is_active?: boolean;
}

export interface UpdateBusinessRuleRequest {
  rule_name?: string;
  rule_type?: string;
  rule_parameters?: Record<string, unknown>;
  is_active?: boolean;
}

export interface BusinessRulesListParams {
  skip?: number;
  limit?: number;
  rule_type?: string;
  is_active?: boolean;
}

// ===== API Functions =====

/**
 * Get business rules list
 * @endpoint GET /business-rules
 */
export const getBusinessRules = (params?: BusinessRulesListParams) => {
  const searchParams = new URLSearchParams();
  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
  if (params?.rule_type) searchParams.append("rule_type", params.rule_type);
  if (params?.is_active !== undefined)
    searchParams.append("is_active", params.is_active.toString());

  const queryString = searchParams.toString();
  return http.get<BusinessRuleListResponse>(
    `business-rules${queryString ? "?" + queryString : ""}`,
  );
};

/**
 * Get business rule detail by ID
 * @endpoint GET /business-rules/{rule_id}
 */
export const getBusinessRule = (ruleId: number) => {
  return http.get<BusinessRule>(`business-rules/${ruleId}`);
};

/**
 * Get business rule detail by code
 * @endpoint GET /business-rules/code/{rule_code}
 */
export const getBusinessRuleByCode = (ruleCode: string) => {
  return http.get<BusinessRule>(`business-rules/code/${ruleCode}`);
};

/**
 * Create business rule
 * @endpoint POST /business-rules
 */
export const createBusinessRule = (data: CreateBusinessRuleRequest) => {
  return http.post<BusinessRule>("business-rules", data);
};

/**
 * Update business rule by ID
 * @endpoint PUT /business-rules/{rule_id}
 */
export const updateBusinessRule = (ruleId: number, data: UpdateBusinessRuleRequest) => {
  return http.put<BusinessRule>(`business-rules/${ruleId}`, data);
};

/**
 * Update business rule by code
 * @endpoint PUT /business-rules/code/{rule_code}
 */
export const updateBusinessRuleByCode = (ruleCode: string, data: UpdateBusinessRuleRequest) => {
  return http.put<BusinessRule>(`business-rules/code/${ruleCode}`, data);
};

/**
 * Delete business rule
 * @endpoint DELETE /business-rules/{rule_id}
 */
export const deleteBusinessRule = (ruleId: number) => {
  return http.delete(`business-rules/${ruleId}`);
};

/**
 * Toggle business rule active status
 * @endpoint PATCH /business-rules/{rule_id}/toggle
 */
export const toggleBusinessRuleActive = (ruleId: number) => {
  return http.patch<BusinessRule>(`business-rules/${ruleId}/toggle`, {});
};
