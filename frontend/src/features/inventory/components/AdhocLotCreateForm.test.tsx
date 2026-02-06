import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { describe, expect, it, vi } from "vitest";

import { AdhocLotCreateForm } from "./AdhocLotCreateForm";

// Mock data
const mockProducts = [
  { id: 1, product_code: "P001", product_name: "Product 1", supplier_ids: [1] },
  { id: 2, product_code: "P002", product_name: "Product 2", supplier_ids: [2] },
];

const mockWarehouses = [
  { id: 1, warehouse_code: "WH1", warehouse_name: "Warehouse 1" },
  { id: 2, warehouse_code: "WH2", warehouse_name: "Warehouse 2" },
];

const mockSuppliers = [
  { id: 1, supplier_code: "S001", supplier_name: "Supplier 1" },
  { id: 2, supplier_code: "S002", supplier_name: "Supplier 2" },
];

// Mock pointer capture and layout methods for Radix UI (still good to have)
Object.assign(window.HTMLElement.prototype, {
  hasPointerCapture: () => false,
  setPointerCapture: () => {},
  releasePointerCapture: () => {},
  scrollIntoView: () => {},
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Radix Select to bypass JSDOM interaction issues
// We hardcode options needed for the test to ensure we can simulate selection
type MockSelectProps = {
  onValueChange?: (value: string) => void;
  value?: string;
  children?: React.ReactNode;
};

type ChildrenProps = {
  children?: React.ReactNode;
};

type SelectValueProps = {
  placeholder?: string;
};

vi.mock("@/components/ui/form/select", () => ({
  Select: ({ onValueChange, value, children }: MockSelectProps) => (
    <div data-testid="mock-select-container">
      <select
        data-testid="mock-select"
        value={value || ""}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        <option value="">Select...</option>
        {/* Warehouse Options */}
        <option value="1">WH1 - Warehouse 1</option>
        <option value="2">WH2 - Warehouse 2</option>
        {/* Origin Type Options */}
        <option value="adhoc">その他</option>
        <option value="sample">サンプル</option>
        <option value="safety_stock">安全在庫</option>
      </select>
      <div style={{ display: "none" }}>{children}</div>
    </div>
  ),
  SelectTrigger: ({ children }: ChildrenProps) => (
    <div data-testid="mock-select-trigger">{children}</div>
  ),
  SelectValue: ({ placeholder }: SelectValueProps) => <span>{placeholder}</span>,
  SelectContent: () => null,
  SelectItem: () => null,
}));

describe("AdhocLotCreateForm", () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
    products: mockProducts,
    warehouses: mockWarehouses,
    suppliers: mockSuppliers,
  };

  it("renders all fields correctly", () => {
    render(<AdhocLotCreateForm {...defaultProps} />);

    expect(screen.getByLabelText(/ロット番号/)).toBeInTheDocument();
    // With mock, accessibility labels for Select might be detached from the hidden original trigger
    // But we render Trigger text in the mock for visibility?
    // Wait, SelectTrigger children are rendered.
    // Origin Type default is "adhoc". Label "その他" is in SelectValue?
    // In AdhocLotCreateForm, SelectValue displays option label.
    // Our mock SelectValue renders placeholder/props.
    // So "その他" might not be visible in Trigger if it comes from internal logic of Radix Select.
    // We should check labels mainly.
    // Also "ロット種別" label exists.
    expect(screen.getByText("ロット種別 *")).toBeInTheDocument();
    expect(screen.getByText(/仕入先/)).toBeInTheDocument();
    expect(screen.getByText("製品 *")).toBeInTheDocument();
    expect(screen.getByText("倉庫 *")).toBeInTheDocument();
    expect(screen.getByLabelText(/数量/)).toBeInTheDocument();
    expect(screen.getByLabelText(/単位/)).toBeInTheDocument();
    expect(screen.getByLabelText(/入荷日/)).toBeInTheDocument();
    expect(screen.getByLabelText("出荷予定日")).toBeInTheDocument();
  });

  it("shows validation errors for empty required fields on submit", async () => {
    render(<AdhocLotCreateForm {...defaultProps} />);
    const submitButton = screen.getByRole("button", { name: "入庫登録" });
    expect(submitButton).toBeDisabled();
  });

  it("validates inputs and submits valid data", async () => {
    render(<AdhocLotCreateForm {...defaultProps} />);
    const user = userEvent.setup();

    // 1. Fill Lot Number
    await user.type(screen.getByLabelText(/ロット番号/), "LOT-TEST-001");

    // 2. Select Product (SearchableSelect - Works fine)
    const productTrigger = screen.getByText("製品を検索...");
    await user.click(productTrigger);
    const productOption = await screen.findByText("P001 - Product 1");
    fireEvent.click(productOption);

    // 3. Select Warehouse (Mock Select)
    // Find the mock select for Warehouse.
    // Order: Origin (1st), Warehouse (2nd).
    // Let's verify by checking value or surrounding?
    // Or just robustly select "1" on all mock-selects? No.
    // Warehouse select has value "". Origin has "adhoc".
    const selects = screen.getAllByTestId("mock-select");
    const warehouseSelect = selects[1];

    fireEvent.change(warehouseSelect, { target: { value: "1" } });

    // 4. Fill Quantity
    await user.type(screen.getByLabelText(/数量/), "100");

    // 5. Fill Unit
    const unitInput = screen.getByLabelText(/単位/);
    await user.clear(unitInput);
    await user.type(unitInput, "EA");

    // 6. Fill Received Date
    const receivedDateInput = screen.getByLabelText(/入荷日/);
    fireEvent.change(receivedDateInput, { target: { value: "2025-01-01" } });

    const originSelect = selects[0];
    expect(originSelect).toHaveValue("adhoc");

    const shippingDateInput = screen.getByLabelText("出荷予定日");
    fireEvent.change(shippingDateInput, { target: { value: "2025-02-01" } });

    // Check submit button enabled
    const submitButton = screen.getByRole("button", { name: "入庫登録" });
    expect(submitButton).toBeEnabled();

    // Submit
    await user.click(submitButton);

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          lot_number: "LOT-TEST-001",
          supplier_item_id: 1,
          warehouse_id: 1,
          current_quantity: 100,
          unit: "EA",
          received_date: "2025-01-01",
          origin_type: "adhoc",
          shipping_date: "2025-02-01",
        }),
      );
    });
  });

  it("filters products by supplier", async () => {
    render(<AdhocLotCreateForm {...defaultProps} />);
    const user = userEvent.setup();

    // Select Supplier 1
    const supplierTrigger = screen.getByText("指定なし（全製品表示）");
    await user.click(supplierTrigger); // SearchableSelect is fine

    // SearchableSelect options list
    const supplierOption = await screen.findByText("S001 - Supplier 1");
    await user.click(supplierOption);

    // Open Product Dropdown
    const productTrigger = screen.getByText("製品を検索...");
    await user.click(productTrigger);

    // Should see Product 1 (linked to Supplier 1)
    expect(await screen.findByText("P001 - Product 1")).toBeInTheDocument();

    // Should NOT see Product 2 (linked to Supplier 2)
    expect(screen.queryByText("P002 - Product 2")).not.toBeInTheDocument();
  });
});
