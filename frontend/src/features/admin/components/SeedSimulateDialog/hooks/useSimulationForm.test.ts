/**
 * useSimulationForm Hook Tests
 *
 * Tests for simulation form state management:
 * - Initial form state
 * - Profile change handling
 * - Warehouse mapping based on profile
 * - Form reset functionality
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { DEFAULT_FORM, DEFAULT_PROFILE_VALUE, PROFILE_WAREHOUSE_MAP } from "../constants";

import { useSimulationForm } from "./useSimulationForm";

describe("useSimulationForm", () => {
  it("initializes with default form values", () => {
    const { result } = renderHook(() => useSimulationForm());

    expect(result.current.form).toEqual(DEFAULT_FORM);
  });

  it("resets form to default values", () => {
    const { result } = renderHook(() => useSimulationForm());

    // Change form values
    act(() => {
      result.current.setForm((prev) => ({
        ...prev,
        order_count: 100,
      }));
    });

    // Verify change
    expect(result.current.form.order_count).toBe(100);

    // Reset form
    act(() => {
      result.current.resetForm();
    });

    // Verify reset
    expect(result.current.form).toEqual(DEFAULT_FORM);
  });

  describe("handleProfileChange", () => {
    it("sets profile to null when DEFAULT_PROFILE_VALUE is selected", () => {
      const { result } = renderHook(() => useSimulationForm());

      // First set to a profile
      act(() => {
        result.current.handleProfileChange("small");
      });

      // Then reset to default
      act(() => {
        result.current.handleProfileChange(DEFAULT_PROFILE_VALUE);
      });

      expect(result.current.form.profile).toBeNull();
      expect(result.current.form.warehouses).toEqual(DEFAULT_FORM.warehouses);
    });

    it("updates profile and warehouses based on selection", () => {
      const { result } = renderHook(() => useSimulationForm());

      // Get a valid profile key if available
      const profileKeys = Object.keys(PROFILE_WAREHOUSE_MAP);

      if (profileKeys.length > 0) {
        const testProfile = profileKeys[0];
        const expectedWarehouses = PROFILE_WAREHOUSE_MAP[testProfile];

        act(() => {
          result.current.handleProfileChange(testProfile);
        });

        expect(result.current.form.profile).toBe(testProfile);
        expect(result.current.form.warehouses).toEqual(expectedWarehouses);
      }
    });

    it("keeps previous warehouses when profile not in map", () => {
      const { result } = renderHook(() => useSimulationForm());

      const initialWarehouses = result.current.form.warehouses;

      act(() => {
        result.current.handleProfileChange("unknown-profile");
      });

      expect(result.current.form.profile).toBe("unknown-profile");
      expect(result.current.form.warehouses).toEqual(initialWarehouses);
    });
  });

  it("allows direct form updates via setForm", () => {
    const { result } = renderHook(() => useSimulationForm());

    act(() => {
      result.current.setForm((prev) => ({
        ...prev,
        order_count: 50,
        product_count: 20,
      }));
    });

    expect(result.current.form.order_count).toBe(50);
    expect(result.current.form.product_count).toBe(20);
  });
});
