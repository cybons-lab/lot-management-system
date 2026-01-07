/**
 * QuickWithdrawalDialog.test.tsx
 *
 * QuickWithdrawalDialogコンポーネントのテスト
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

import * as withdrawalApi from "../api";

import { QuickWithdrawalDialog } from "./QuickWithdrawalDialog";

import * as mastersHook from "@/hooks/api/useMastersQuery";
import type { LotUI } from "@/shared/libs/normalize";

// Mock API
vi.mock("../api", () => ({
  createWithdrawal: vi.fn(),
}));

// Mock Hooks
vi.mock("@/hooks/api/useMastersQuery", () => ({
  useCustomersQuery: vi.fn(),
}));

// Mock AuthContext
vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1, username: "testuser" } }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("QuickWithdrawalDialog", () => {
  let queryClient: QueryClient;

  const mockLot: LotUI = {
    lot_id: 1,
    lot_number: "LOT-2026-001",
    product_id: 100,
    product_name: "Test Product",
    product_code: "PROD-001",
    warehouse_id: 1,
    warehouse_name: "Main Warehouse",
    current_quantity: "500",
    allocated_quantity: "100",
    locked_quantity: "50",
    unit: "個",
    status: "active",
    receipt_date: "2026-01-01",
    expiry_date: "2027-01-01",
    supplier_id: 1,
    supplier_name: "Test Supplier",
  };

  const mockCustomers = [
    { id: 1, customer_code: "CUST-001", customer_name: "顧客A" },
    { id: 2, customer_code: "CUST-002", customer_name: "顧客B" },
  ];

  const defaultProps = {
    lot: mockLot,
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Setup default mocks
    vi.mocked(mastersHook.useCustomersQuery).mockReturnValue({
      data: mockCustomers,
      isLoading: false,
    } as ReturnType<typeof mastersHook.useCustomersQuery>);

    vi.mocked(withdrawalApi.createWithdrawal).mockResolvedValue({
      withdrawal_id: 1,
      lot_id: 1,
      lot_number: "LOT-2026-001",
      product_id: 100,
      product_name: "Test Product",
      product_code: "PROD-001",
      quantity: "100",
      withdrawal_type: "order_manual",
      withdrawal_type_label: "受注（手動）",
      customer_id: 1,
      customer_name: "顧客A",
      customer_code: "CUST-001",
      delivery_place_id: 0,
      delivery_place_name: "",
      delivery_place_code: "",
      ship_date: "2026-01-07",
      reason: null,
      reference_number: null,
      withdrawn_by: 1,
      withdrawn_by_name: "testuser",
      withdrawn_at: "2026-01-07T12:00:00Z",
      created_at: "2026-01-07T12:00:00Z",
    });
  });

  const renderDialog = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <QuickWithdrawalDialog {...defaultProps} {...props} />
      </QueryClientProvider>,
    );
  };

  it("renders dialog with lot information", () => {
    renderDialog();

    expect(screen.getByText("簡易出庫")).toBeInTheDocument();
    expect(screen.getByText(/LOT-2026-001/)).toBeInTheDocument();
    expect(screen.getByText(/Test Product/)).toBeInTheDocument();
    expect(screen.getByText(/500 個/)).toBeInTheDocument();
    // 利用可能数量 = 500 - 100 - 50 = 350
    expect(screen.getByText(/350 個/)).toBeInTheDocument();
  });

  it("shows customer select with options", () => {
    renderDialog();

    expect(screen.getByText("得意先を選択")).toBeInTheDocument();
  });

  it("validates required fields on submit", async () => {
    renderDialog();
    const user = userEvent.setup();

    // Click submit without filling form
    const submitButton = screen.getByRole("button", { name: "出庫登録" });
    await user.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText("得意先を選択してください")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("出庫数量を入力してください")).toBeInTheDocument();
    });

    // API should not be called
    expect(withdrawalApi.createWithdrawal).not.toHaveBeenCalled();
  });

  it("validates quantity does not exceed available", async () => {
    renderDialog();
    const user = userEvent.setup();

    // Enter quantity exceeding available (350)
    const quantityInput = screen.getByPlaceholderText(/最大/);
    await user.type(quantityInput, "400");

    const submitButton = screen.getByRole("button", { name: "出庫登録" });
    await user.click(submitButton);

    // Should show over quantity error
    await waitFor(() => {
      expect(screen.getByText(/利用可能数量.*を超えています/)).toBeInTheDocument();
    });

    expect(withdrawalApi.createWithdrawal).not.toHaveBeenCalled();
  });

  it("closes dialog on cancel", async () => {
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });
    const user = userEvent.setup();

    const cancelButton = screen.getByRole("button", { name: "キャンセル" });
    await user.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables submit when available quantity is 0", () => {
    const lotWithNoAvailable: LotUI = {
      ...mockLot,
      current_quantity: "100",
      allocated_quantity: "100",
      locked_quantity: "0",
    };

    renderDialog({ lot: lotWithNoAvailable });

    const submitButton = screen.getByRole("button", { name: "出庫登録" });
    expect(submitButton).toBeDisabled();
  });

  it("does not render when open is false", () => {
    renderDialog({ open: false });

    expect(screen.queryByText("簡易出庫")).not.toBeInTheDocument();
  });
});
