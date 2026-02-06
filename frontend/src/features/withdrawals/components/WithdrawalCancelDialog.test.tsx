// @vitest-environment jsdom
/**
 * WithdrawalCancelDialog.test.tsx
 *
 * Tests for WithdrawalCancelDialog component
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { type WithdrawalResponse } from "../api";

import { WithdrawalCancelDialog } from "./WithdrawalCancelDialog";

// Mock hooks
const mockCancelMutation = {
  mutateAsync: vi.fn(),
  isPending: false,
};

type DialogProps = {
  open?: boolean;
  children?: React.ReactNode;
};

type ChildrenProps = {
  children?: React.ReactNode;
};

type SelectItemProps = {
  children?: React.ReactNode;
  value?: string;
  onSelect?: (value: string) => void;
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
    warning: vi.fn(),
  },
}));

// Mock UI components
vi.mock("@/components/ui", () => {
  return {
    Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
    Dialog: ({ children, open }: DialogProps) => (open ? <div>{children}</div> : null),
    DialogContent: ({ children }: ChildrenProps) => <div>{children}</div>,
    DialogHeader: ({ children }: ChildrenProps) => <div>{children}</div>,
    DialogTitle: ({ children }: ChildrenProps) => <div>{children}</div>,
    DialogDescription: ({ children }: ChildrenProps) => <div>{children}</div>,
    DialogFooter: ({ children }: ChildrenProps) => <div>{children}</div>,
    Label: (props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />,
    Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
    Select: ({ children }: ChildrenProps) => <div>{children}</div>,
    SelectTrigger: ({ children }: ChildrenProps) => <button>{children}</button>,
    SelectValue: () => <span>Select Value</span>,
    SelectContent: ({ children }: ChildrenProps) => <div>{children}</div>,
    SelectItem: ({ children, onSelect, value }: SelectItemProps) => (
      <div
        role="option"
        onClick={() => onSelect?.(value ?? "")}
        onKeyDown={(event) => event.key === "Enter" && onSelect?.(value ?? "")}
        tabIndex={0}
        aria-selected={false}
      >
        {children}
      </div>
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
    supplier_item_id: 201,
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
