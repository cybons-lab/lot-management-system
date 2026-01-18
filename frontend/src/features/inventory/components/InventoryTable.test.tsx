import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { InventoryTable } from "./InventoryTable";

import { type InventoryItem } from "@/features/inventory/api";

// Mock dependencies
vi.mock("@/features/inventory/hooks/useInventoryTableLogic", () => ({
  useInventoryTableLogic: () => ({
    selectedLot: null,
    editDialog: { isOpen: false, open: vi.fn(), close: vi.fn() },
    lockDialog: { isOpen: false, open: vi.fn(), close: vi.fn() },
    updateLotMutation: { mutateAsync: vi.fn(), isPending: false },
    lockLotMutation: { mutateAsync: vi.fn(), isPending: false },
    handleEditLot: vi.fn(),
    handleLockLot: vi.fn(),
    handleUnlockLot: vi.fn(),
    toggleRow: vi.fn(),
    isRowExpanded: () => false,
    getLotsForItem: () => [],
    handleViewDetail: vi.fn(),
    handleCloseEdit: vi.fn(),
    handleCloseLock: vi.fn(),
    refetchLots: vi.fn(),
  }),
}));

vi.mock("@/features/inventory/components/InventoryTableComponents", () => ({
  LoadingState: () => <div>Loading...</div>,
  EmptyState: () => <div>Empty</div>,
  InventoryRow: ({ columnWidths }: { columnWidths: any }) => (
    <tr>
      <td data-testid="product-cell" style={{ width: columnWidths?.product }}>
        Product
      </td>
    </tr>
  ),
}));

vi.mock("@/features/inventory/components/LotEditForm", () => ({
  LotEditForm: () => <div>LotEditForm</div>,
}));

vi.mock("@/features/inventory/components/LotLockDialog", () => ({
  LotLockDialog: () => <div>LotLockDialog</div>,
}));

vi.mock("@/features/inventory/components/QuickLotIntakeDialog", () => ({
  QuickLotIntakeDialog: () => <div>QuickLotIntakeDialog</div>,
}));

vi.mock("@/features/withdrawals/components", () => ({
  QuickWithdrawalDialog: () => <div>QuickWithdrawalDialog</div>,
  WithdrawalHistoryDialog: () => <div>WithdrawalHistoryDialog</div>,
}));

vi.mock("@/shared/components/form", () => ({
  FormDialog: ({ children }: any) => <div>{children}</div>,
}));

const mockData: InventoryItem[] = [
  {
    inventory_item_id: 1,
    product_id: 1,
    warehouse_id: 1,
    product_code: "P001",
    product_name: "Test Product",
    warehouse_code: "W001",
    warehouse_name: "Test Warehouse",
    total_quantity: "100",
    allocated_quantity: "0",
    soft_allocated_quantity: "0",
    hard_allocated_quantity: "0",
    available_quantity: "100",
    active_lot_count: 1,
    inventory_state: "in_stock",
    last_updated: "2023-01-01",
  },
];

describe("InventoryTable", () => {
  it("renders resize handles in headers", () => {
    const { container } = render(
      <MemoryRouter>
        <InventoryTable data={mockData} isLoading={false} />
      </MemoryRouter>,
    );

    // Initial widths should be applied to headers
    const headers = screen.getAllByRole("columnheader");
    // 11 columns: expander, product, supplier, warehouse, lots, total, soft, hard, available, updated, actions
    expect(headers).toHaveLength(11);

    // Check product header width (default 200)
    // We need to match the exact text or use index.
    // "製品" is the 2nd header (index 1)
    expect(headers[1]).toHaveTextContent("製品");
    expect(headers[1]).toHaveStyle({ width: "250px" });

    // Check for resize handles
    const resizers = container.querySelectorAll(".cursor-col-resize");
    expect(resizers.length).toBeGreaterThan(0);
  });
});
