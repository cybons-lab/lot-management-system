// @vitest-environment jsdom
/**
 * QuickWithdrawalDialog.test.tsx
 *
 * QuickWithdrawalDialogコンポーネントのテスト
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import * as withdrawalApi from "../api";

import { QuickWithdrawalDialog } from "./QuickWithdrawalDialog";

import * as mastersHook from "@/hooks/api/useMastersQuery";
import { http } from "@/shared/api/http-client";
import type { LotUI } from "@/shared/libs/normalize";

// Mock API
vi.mock("../api", () => ({
  createWithdrawal: vi.fn(),
}));

// Mock Hooks
vi.mock("@/hooks/api/useMastersQuery", () => ({
  useCustomersQuery: vi.fn(),
}));

// Mock UI Components to bypass alias resolution issues and complex DOM structures
/* eslint-disable @typescript-eslint/no-require-imports, jsx-a11y/label-has-associated-control, jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus */
vi.mock("@/components/ui", () => {
  const React = require("react");
  return {
    Button: (props: any) => <button {...props} />,
    Input: (props: any) => <input {...props} />,
    Label: (props: any) => <label {...props} />,
    Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
    DialogContent: ({ children }: any) => <div>{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <div>{children}</div>,
    DialogDescription: ({ children }: any) => <div>{children}</div>,
    DialogFooter: ({ children }: any) => <div>{children}</div>,
    // Detailed Select Mock to simulate user interaction
    Select: ({ children, value, onValueChange, disabled }: any) => {
      const [isOpen, setIsOpen] = React.useState(false);
      return (
        <div data-testid="select">
          {/* Trigger Area */}
          <div
            role="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            data-disabled={disabled}
          >
            {/* Pass down props to children mostly for SelectValue to show placeholder */}
            {React.Children.map(children, (child: any) => {
              if (child.type.name === "SelectTrigger") {
                return React.cloneElement(child, { value });
              }
              return null;
            })}
          </div>

          {/* Content Area - only show when open */}
          {isOpen && (
            <div role="listbox">
              {React.Children.map(children, (child: any) => {
                if (child.type.name === "SelectContent") {
                  return React.cloneElement(child, {
                    onSelect: (val: string) => {
                      onValueChange(val);
                      setIsOpen(false);
                    },
                  });
                }
                return null;
              })}
            </div>
          )}
        </div>
      );
    },
    SelectTrigger: ({ children }: any) => <div>{children}</div>,
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
    SelectContent: ({ children, onSelect }: any) => (
      <div>
        {React.Children.map(children, (child: any) => React.cloneElement(child, { onSelect }))}
      </div>
    ),
    SelectItem: ({ children, value, onSelect }: any) => (
      <div
        role="option"
        onClick={() => onSelect(value)}
        onKeyDown={(e) => e.key === "Enter" && onSelect(value)}
        tabIndex={0}
        aria-selected={false}
      >
        {children}
      </div>
    ),
  };
});

// Mock number utils
vi.mock("@/shared/utils/number", () => ({
  fmt: (n: number) => String(n),
}));

// Mock http client
vi.mock("@/shared/api/http-client", () => ({
  http: {
    get: vi.fn(),
  },
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
    id: 1,
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
    received_date: "2026-01-01",
    expected_lot_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    inspection_status: "not_required",
    inspection_date: null,
    inspection_cert_number: null,
  };

  const mockCustomers = [
    { id: 1, customer_code: "CUST-001", customer_name: "顧客A" },
    { id: 2, customer_code: "CUST-002", customer_name: "顧客B" },
  ];

  const mockDeliveryPlaces = [
    {
      id: 10,
      delivery_place_code: "DP-001",
      delivery_place_name: "納入場所A",
      customer_id: 1,
      jiku_code: null,
    },
    {
      id: 11,
      delivery_place_code: "DP-002",
      delivery_place_name: "納入場所B",
      customer_id: 1,
      jiku_code: null,
    },
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

    vi.mocked(http.get).mockImplementation((url) => {
      if (typeof url === "string" && url.includes("masters/delivery-places")) {
        return Promise.resolve(mockDeliveryPlaces);
      }
      return Promise.reject(new Error("Not mocked"));
    });

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
  });

  it("shows customer select and fetches delivery places when customer is selected", async () => {
    renderDialog();
    const user = userEvent.setup();

    // Select customer
    const customerSelectTrigger = screen.getByText("得意先を選択");
    await user.click(customerSelectTrigger);

    const customerOption = screen.getByText(/顧客A/);
    await user.click(customerOption);

    // Should call API to fetch delivery places
    await waitFor(() => {
      expect(http.get).toHaveBeenCalledWith(
        expect.stringContaining("masters/delivery-places?customer_id=1"),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    // Should show delivery place select enabled
    const deliveryPlaceSelectTrigger = screen.getByText("納入場所を選択");
    expect(deliveryPlaceSelectTrigger).toBeInTheDocument();
    expect(deliveryPlaceSelectTrigger).toBeEnabled();

    // Check delivery place options
    await user.click(deliveryPlaceSelectTrigger);
    expect(screen.getByText(/納入場所A/)).toBeInTheDocument();
    expect(screen.getByText(/納入場所B/)).toBeInTheDocument();
  });

  it("submits form with delivery place selected", async () => {
    renderDialog();
    const user = userEvent.setup();

    // 1. Select Customer
    await user.click(screen.getByText("得意先を選択"));
    await user.click(screen.getByText(/顧客A/));

    // 2. Select Delivery Place
    await waitFor(() => {
      expect(screen.getByText("納入場所を選択")).toBeEnabled();
    });
    await user.click(screen.getByText("納入場所を選択"));
    await user.click(screen.getByText(/納入場所A/));

    // 3. Enter Quantity
    const quantityInput = screen.getByPlaceholderText(/最大/);
    await user.type(quantityInput, "10");

    // 4. Submit
    const submitButton = screen.getByRole("button", { name: "出庫登録" });
    await user.click(submitButton);

    // Verify API call payload
    await waitFor(() => {
      expect(withdrawalApi.createWithdrawal).toHaveBeenCalledWith(
        expect.objectContaining({
          lot_id: 1,
          customer_id: 1,
          delivery_place_id: 10,
          quantity: 10,
          withdrawal_type: "order_manual",
        }),
      );
    });
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
    // Customer not selected, so delivery place is disabled/empty.
    // If we select customer but not delivery place, we should see error.

    // Select customer to enable delivery place validation check (if dependent)
    // Actually our validation checks delivery_place_id even if customer_id is missing?
    // Code says: if (!customer_id) error; if (!delivery_place_id) error;
    // So both errors should appear.
    // But delivery place UI says "先に得意先を選択" if no customer.
    // Ideally we should select customer then submit to verify delivery place error specifically.

    await waitFor(() => {
      expect(screen.getByText("納入場所を選択してください")).toBeInTheDocument();
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
