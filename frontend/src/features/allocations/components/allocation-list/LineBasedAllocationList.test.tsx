import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { AllocationListProps, GroupedOrder, LineWithOrderInfo } from "./line-based/types";
import * as useLineDataHook from "./line-based/useLineData";
import { LineBasedAllocationList } from "./LineBasedAllocationList";

// Mock dependencies
vi.mock("@tanstack/react-virtual", () => ({
  useWindowVirtualizer: vi.fn(() => ({
    getTotalSize: () => 1000,
    getVirtualItems: () => [
      { key: 0, index: 0, start: 0, size: 100, measureElement: vi.fn() },
      { key: 1, index: 1, start: 100, size: 100, measureElement: vi.fn() },
    ],
    measureElement: vi.fn(),
  })),
}));

vi.mock("./line-based/LineItem", () => ({
  LineItem: ({
    item,
    onCheckChange,
  }: {
    item: { id: number; product_name: string };
    onCheckChange: (lineId: number, checked: boolean) => void;
  }) => (
    <div data-testid="line-item">
      {item.product_name}
      <input
        type="checkbox"
        data-testid={`checkbox-${item.id}`}
        checked={false} // Simplification for mock
        onChange={(e) => onCheckChange(item.id, e.target.checked)}
      />
    </div>
  ),
}));

vi.mock("./line-based/OrderGroup", () => ({
  OrderGroup: ({ group }: { group: { order_id: number } }) => (
    <div data-testid="order-group">{group.order_id}</div>
  ),
}));

vi.mock("./line-based/BulkActionsHeader", () => ({
  BulkActionsHeader: ({
    onSelectAll,
    onBulkSave,
  }: {
    onSelectAll: () => void;
    onBulkSave: () => void;
  }) => (
    <div data-testid="bulk-actions">
      <button onClick={onSelectAll}>Select All</button>
      <button onClick={onBulkSave}>Bulk Save</button>
    </div>
  ),
}));

vi.mock("./line-based/FilterBar", () => ({
  FilterBar: ({ onViewModeToggle }: { onViewModeToggle: () => void }) => (
    <div data-testid="filter-bar">
      <button onClick={onViewModeToggle}>Toggle View</button>
    </div>
  ),
}));

vi.mock("./line-based/JumpButtons", () => ({
  JumpButtons: () => <div data-testid="jump-buttons">Jump</div>,
}));

describe("LineBasedAllocationList", () => {
  const mockProps: AllocationListProps = {
    orders: [{ id: 1, lines: [] }] as unknown as AllocationListProps["orders"],
    isLoading: false,
    onSaveAllocations: vi.fn(),
    customerMap: {},
    productMap: {},
    getLineAllocations: vi.fn(),
    getCandidateLots: vi.fn(),
    isOverAllocated: vi.fn(),
    onLotAllocationChange: vi.fn(),
    onAutoAllocate: vi.fn(),
    onClearAllocations: vi.fn(),
    lineStatuses: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useLineData
    vi.spyOn(useLineDataHook, "useLineData").mockReturnValue({
      allFlatLines: [
        { id: 1, product_name: "Product A" },
        { id: 2, product_name: "Product B" },
      ] as unknown as LineWithOrderInfo[],
      sortedLines: [
        { id: 1, product_name: "Product A" },
        { id: 2, product_name: "Product B" },
      ] as unknown as LineWithOrderInfo[],
      groupedOrders: [
        { order_id: 101, lines: [] },
        { order_id: 102, lines: [] },
      ] as unknown as GroupedOrder[],
      firstCheckedIndex: -1,
    });
  });

  it("renders loading state", () => {
    render(<LineBasedAllocationList {...mockProps} isLoading={true} />);
    expect(screen.getByText("データを読み込み中...")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<LineBasedAllocationList {...mockProps} orders={[]} />);
    expect(screen.getByText("表示対象の受注がありません")).toBeInTheDocument();
  });

  it("renders list items in Line mode", () => {
    render(<LineBasedAllocationList {...mockProps} />);
    expect(screen.getAllByTestId("line-item")).toHaveLength(2);
    expect(screen.getByText("Product A")).toBeInTheDocument();
  });

  it("switches to Order mode", () => {
    render(<LineBasedAllocationList {...mockProps} />);

    const toggleButton = screen.getByText("Toggle View");
    fireEvent.click(toggleButton);

    // Since viewMode state is internal, we check if OrderGroup is rendered
    // Note: In a real integration test, we'd expect the mock hook to return different data or the component to use different data.
    // However, since we mocked useLineData to return static data, and the component selects data based on viewMode state,
    // we need to ensure the component re-renders with the new viewMode.
    // The component logic is: const data = viewMode === "line" ? sortedLines : groupedOrders;
    // So if viewMode changes, data changes, and the virtualizer maps over the new data.

    // Because we mocked the virtualizer to return fixed items, this test might be tricky without a more sophisticated virtualizer mock.
    // Let's rely on the fact that the component passes the toggle handler to FilterBar.
    // And we can check if the component attempts to render OrderGroup when viewMode is 'order'.

    // Actually, since we mocked useLineData, we can't easily change the returned 'sortedLines' vs 'groupedOrders' based on internal state without a more complex mock.
    // But the component logic `const data = viewMode === "line" ? sortedLines : groupedOrders;` happens inside the component.
    // So if we click toggle, `viewMode` becomes 'order', `data` becomes `groupedOrders`.
    // Our mocked virtualizer returns 2 items. So it will map over the first 2 items of `groupedOrders`.
    // `groupedOrders` has items. So it should render `OrderGroup`.

    expect(screen.getAllByTestId("order-group")).toHaveLength(2);
  });

  it("handles Select All action", () => {
    render(<LineBasedAllocationList {...mockProps} />);

    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);

    // This updates internal state `selectedLineIds`.
    // We can't directly assert internal state.
    // But we can check if Bulk Save calls the prop with the selected IDs.

    const bulkSaveButton = screen.getByText("Bulk Save");
    fireEvent.click(bulkSaveButton);

    expect(mockProps.onSaveAllocations).toHaveBeenCalledTimes(2);
    expect(mockProps.onSaveAllocations).toHaveBeenCalledWith(1);
    expect(mockProps.onSaveAllocations).toHaveBeenCalledWith(2);
  });
});
