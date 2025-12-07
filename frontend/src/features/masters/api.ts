/**
 * Master Import API
 * マスタ一括インポートのAPIクライアント
 */

import type {
  MasterImportRequest,
  MasterImportResponse,
  MasterImportTemplate,
  TemplateGroup,
} from "./types";

import { apiClient } from "@/shared/api/http-client";

const BASE_PATH = "admin/master-import";

/**
 * Upload and import master data from file (Excel, JSON, YAML)
 */
export async function uploadMasterImport(
  file: File,
  dryRun: boolean = false,
): Promise<MasterImportResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("dry_run", String(dryRun));

  return apiClient.post(BASE_PATH + "/upload", { body: formData }).json<MasterImportResponse>();
}

/**
 * Import master data directly from JSON
 */
export async function importMasterJson(
  data: MasterImportRequest,
): Promise<MasterImportResponse> {
  return apiClient.post(BASE_PATH + "/json", { json: data }).json<MasterImportResponse>();
}

/**
 * Download import template
 */
export async function getMasterImportTemplate(
  group: TemplateGroup,
): Promise<MasterImportTemplate> {
  return apiClient.get(BASE_PATH + "/template", {
    searchParams: { group },
  }).json<MasterImportTemplate>();
}
