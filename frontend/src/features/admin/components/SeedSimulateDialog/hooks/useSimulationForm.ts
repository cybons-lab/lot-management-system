import { useCallback, useState } from "react";

import { DEFAULT_FORM, DEFAULT_PROFILE_VALUE, PROFILE_WAREHOUSE_MAP } from "../constants";
import type { UseSimulationFormReturn } from "../types";

import type { SimulateSeedRequest } from "@/features/admin/api/admin-simulate";

/**
 * Hook for managing simulation form state and handlers
 */
export function useSimulationForm(): UseSimulationFormReturn {
  const [form, setForm] = useState<SimulateSeedRequest>(DEFAULT_FORM);

  const handleProfileChange = useCallback((profile: string) => {
    setForm((prev) => {
      if (profile === DEFAULT_PROFILE_VALUE) {
        const next: SimulateSeedRequest = {
          ...prev,
          profile: null,
        };
        // Omit warehouses if it's undefined in DEFAULT_FORM, though it's 2
        if (DEFAULT_FORM.warehouses !== undefined) {
          next.warehouses = DEFAULT_FORM.warehouses;
        }
        return next;
      }

      const warehouses =
        PROFILE_WAREHOUSE_MAP[profile] ?? prev.warehouses ?? DEFAULT_FORM.warehouses;

      const next: SimulateSeedRequest = {
        ...prev,
        profile,
      };
      if (warehouses !== undefined) {
        next.warehouses = warehouses;
      }
      return next;
    });
  }, []);

  const resetForm = useCallback(() => {
    setForm(DEFAULT_FORM);
  }, []);

  return {
    form,
    setForm,
    handleProfileChange,
    resetForm,
  };
}
