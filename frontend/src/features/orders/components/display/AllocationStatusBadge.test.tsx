import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AllocationStatusBadge, determineAllocationStatus } from "./AllocationStatusBadge";

describe("determineAllocationStatus", () => {
  it("returns unallocated when both are 0", () => {
    expect(determineAllocationStatus(0, 0)).toBe("unallocated");
  });

  it("returns soft when only soft > 0", () => {
    expect(determineAllocationStatus(10, 0)).toBe("soft");
  });

  it("returns hard when only hard > 0", () => {
    expect(determineAllocationStatus(0, 10)).toBe("hard");
  });

  it("returns mixed when both > 0", () => {
    expect(determineAllocationStatus(5, 10)).toBe("mixed");
  });
});

describe("AllocationStatusBadge", () => {
  it("renders 未引当 for unallocated", () => {
    render(<AllocationStatusBadge softAllocated={0} hardAllocated={0} />);
    expect(screen.getByText("未引当")).toBeInTheDocument();
  });

  it("renders 仮引当 for soft only", () => {
    render(<AllocationStatusBadge softAllocated={10} hardAllocated={0} />);
    expect(screen.getByText("仮引当")).toBeInTheDocument();
  });

  it("renders 確定済 for hard only", () => {
    render(<AllocationStatusBadge softAllocated={0} hardAllocated={10} />);
    expect(screen.getByText("確定済")).toBeInTheDocument();
  });

  it("renders 一部仮引当 for mixed", () => {
    render(<AllocationStatusBadge softAllocated={5} hardAllocated={10} />);
    expect(screen.getByText("一部仮引当")).toBeInTheDocument();
  });
});
