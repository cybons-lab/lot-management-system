import { http as fetchApi } from "@/shared/api/http-client";
import type { components } from "@/shared/types/openapi";

type SAPOrderRegistrationRequest = components["schemas"]["SAPOrderRegistrationRequest"];
type SAPOrderRegistrationResponse = components["schemas"]["SAPOrderRegistrationResponse"];

export const integrationApi = {
  registerSalesOrders: async (
    data: SAPOrderRegistrationRequest,
  ): Promise<SAPOrderRegistrationResponse> => {
    return fetchApi.post<SAPOrderRegistrationResponse>("/integration/sap/sales-orders", data);
  },
};
