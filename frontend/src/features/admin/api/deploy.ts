// frontend/src/features/admin/api/deploy.ts
import { http } from "@/shared/api/http-client";

export type DeployHistoryItem = {
  timestamp: string;
  version: string;
  deployed_at: string;
  backend_changed: boolean;
  requires_restart: boolean;
  notes?: string;
};

export type DeployStatusResponse = {
  current_release: string | null;
  last_deploy_at: string | null;
  history: DeployHistoryItem[];
};

export type UploadResponse = {
  status: string;
  release: string;
  version: string;
  requires_restart: boolean;
};

export async function getDeployStatus(): Promise<DeployStatusResponse> {
  return http.get<DeployStatusResponse>("deploy/status");
}

export async function uploadBundle(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return http.post<UploadResponse>("deploy/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}
