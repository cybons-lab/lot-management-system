import { type paths } from "../../types/api";

import { apiClient } from "@/shared/api/http-client";

export type Maker =
  paths["/api/makers"]["get"]["responses"]["200"]["content"]["application/json"] extends (infer T)[]
    ? T
    : never;
export type MakerCreateRequest =
  paths["/api/makers"]["post"]["requestBody"]["content"]["application/json"];
export type MakerUpdateRequest =
  paths["/api/makers/{maker_id}"]["put"]["requestBody"]["content"]["application/json"];

export const makersApi = {
  getMakers: async (params?: { limit?: number; offset?: number }): Promise<Maker[]> => {
    return apiClient.get("makers", { searchParams: params }).json();
  },

  getMaker: async (id: number): Promise<Maker> => {
    return apiClient.get(`makers/${id}`).json();
  },

  createMaker: async (data: MakerCreateRequest): Promise<Maker> => {
    return apiClient.post("makers", { json: data }).json();
  },

  updateMaker: async (id: number, data: MakerUpdateRequest): Promise<Maker> => {
    return apiClient.put(`makers/${id}`, { json: data }).json();
  },

  deleteMaker: async (id: number): Promise<void> => {
    await apiClient.delete(`makers/${id}`);
  },
};
