// frontend/src/lib/api.ts
import * as orders from "@/features/orders/api";
import * as inventory from "@/features/inventory/api";
import * as forecast from "@/features/forecast/api";
import * as masters from "@/features/masters/api";
import * as admin from "@/lib/admin-api"; // ← lib配下のadminを集約

export const api = {
  ...orders,
  ...inventory,
  ...forecast,
  ...masters,
  ...admin, // ← 追加
};
