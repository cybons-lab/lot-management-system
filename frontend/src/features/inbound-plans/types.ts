import type { InboundPlan as APIInboundPlan } from "./api";

export interface InboundPlan extends APIInboundPlan {
  supplier_code?: string | null;
  is_assigned_supplier?: boolean;
  sap_po_number?: string | null;
}

export interface InboundPlansFilters {
  supplier_id: string;
  supplier_item_id?: string;
  status: "" | "planned" | "partially_received" | "received" | "cancelled";
  date_from: string;
  date_to: string;
  prioritize_assigned?: boolean;
}
