// @vitest-environment jsdom
/**
 * WithdrawalCancelDialog.test.tsx
 *
 * Tests for WithdrawalCancelDialog component
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { WithdrawalCancelDialog } from "./WithdrawalCancelDialog";
import type { WithdrawalResponse } from "../api";

// Mock hooks
const mockCancelMutation = {
  mutateAsync: vi.fn(),
  isPending: false,
};

vi.mock("../hooks", () => ({
  useWithdrawals: () => ({
    useCancel: () => mockCancelMutation,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock UI components
vi.mock("@/components/ui", () => {
  return {
    Button: (props: any) => <button {...props} />,
    Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
    DialogContent: ({ children }: any) => <div>{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <div>{children}</div>,
    DialogDescription: ({ children }: any) => <div>{children}</div>,
    DialogFooter: ({ children }: any) => <div>{children}</div>,
    Label: (props: any) => <label {...props} />,
    Textarea: (props: any) => <textarea {...props} />,
    Select: (props: any) => <div>{props.children}</div>,
    SelectTrigger: (props: any) => <button>{props.children}</button>,
    SelectValue: () => <span>Select Value</span>,
    SelectContent: (props: any) => <div>{props.children}</div>,
    SelectItem: (props: any) => (
      <div onClick={() => props.onSelect && props.onSelect(props.value)}>{props.children}</div>
    ),
  };
});

// Mock lucide icons
vi.mock("lucide-react", () => ({
  Loader2: () => <span>Loading...</span>,
  XCircle: () => <span>Icon</span>,
}));

describe("WithdrawalCancelDialog", () => {
  let queryClient: QueryClient;

  const mockWithdrawal: WithdrawalResponse = {
    withdrawal_id: 1,
    lot_id: 101,
    lot_number: "LOT-001",
    product_id: 201,
    product_name: "Test Product",
    product_code: "PROD-001",
    quantity: "10.00",
    withdrawal_type: "order_manual",
    withdrawal_type_label: "受注",
    customer_id: 301,
    customer_name: "Test Customer",
    customer_code: "CUST-001",
    delivery_place_id: 401,
    delivery_place_name: "Test Place",
    delivery_place_code: "DP-001",
    ship_date: "2024-01-01",
    reason: null,
    reference_number: null,
    withdrawn_by: 501,
    withdrawn_by_name: "User",
    withdrawn_at: "2024-01-01T10:00:00Z",
    created_at: "2024-01-01T10:00:00Z",
    is_cancelled: false, // Added required field
  };

  const defaultProps = {
    withdrawal: mockWithdrawal,
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockCancelMutation.isPending = false;
  });

  const renderDialog = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <WithdrawalCancelDialog {...defaultProps} {...props} />
      </QueryClientProvider>,
    );
  };

  it("renders with withdrawal details", () => {
    renderDialog();

    expect(screen.getByText("LOT-001")).toBeInTheDocument();
    expect(screen.getByText("10.00")).toBeInTheDocument();
    expect(screen.getByText("Test Product")).toBeInTheDocument();
    expect(screen.getByText("受注")).toBeInTheDocument();
  });

  it("calls cancel mutation on submit", async () => {
    renderDialog();
    const user = userEvent.setup();

    // Fill note
    const noteInput = screen.getByLabelText("メモ（任意）");
    await user.type(noteInput, "Cancel reason note");

    // Click submit
    const submitButton = screen.getByText("取り消す");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCancelMutation.mutateAsync).toHaveBeenCalledWith({
        withdrawalId: 1,
        data: {
          reason: "input_error", // Default value
          note: "Cancel reason note",
        },
      });
    });
  });

  it("closes dialog on cancel button click", async () => {
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });
    const user = userEvent.setup();

    const cancelButton = screen.getByText("キャンセル");
    await user.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows loading state during mutation", () => {
    mockCancelMutation.isPending = true;
    renderDialog();

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.getByText("処理中...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /処理中/ })).toBeDisabled();
  });

  it("does not render when open is false", () => {
    renderDialog({ open: false });
    expect(screen.queryByText("LOT-001")).not.toBeInTheDocument();
  });
});
