// @vitest-environment jsdom
/**
 * ReservationCancelDialog.test.tsx
 *
 * Tests for ReservationCancelDialog component
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { type ReservationInfo } from "../types";

import { ReservationCancelDialog } from "./ReservationCancelDialog";

// Mock hooks
const mockCancelMutation = {
  mutate: vi.fn(),
  isPending: false,
};

vi.mock("../hooks/mutations", () => ({
  useCancelReservationMutation: (options: any) => {
    // Determine if we need to call callbacks immediately for testing
    // or just return the mock mutation object
    // Since useCancelReservationMutation returns an object with mutate, we mock that.
    // But the component uses options.onSuccess/onError.
    // To test callbacks, we might need a more sophisticated mock or spy on the options passed.
    // For now, let's mock the return value.
    if (options?.onSuccess) {
      mockCancelMutation.mutate.mockImplementation((_args: any) => {
        options.onSuccess({ lot_number: "LOT-001" });
      });
    }
    return mockCancelMutation;
  },
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
    Button: (props: any) => <button {...props} />,
    Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
    DialogContent: ({ children }: any) => <div>{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <div>{children}</div>,
    DialogDescription: ({ children }: any) => <div>{children}</div>,
    DialogFooter: ({ children }: any) => <div>{children}</div>,
    // eslint-disable-next-line jsx-a11y/label-has-associated-control -- テスト用マークアップのため
    Label: (props: any) => <label {...props} />,
    Textarea: (props: any) => <textarea {...props} />,
    Select: (props: any) => <div>{props.children}</div>,
    SelectTrigger: (props: any) => <button>{props.children}</button>,
    SelectValue: () => <span>Select Value</span>,
    SelectContent: (props: any) => <div>{props.children}</div>,
    SelectItem: (props: any) => (
      <div
        role="option"
        onClick={() => props.onSelect && props.onSelect(props.value)}
        onKeyDown={(e) => e.key === "Enter" && props.onSelect && props.onSelect(props.value)}
        tabIndex={0}
        aria-selected={false}
      >
        {props.children}
      </div>
    ),
  };
});

// Mock lucide icons
vi.mock("lucide-react", () => ({
  Loader2: () => <span>Loading...</span>,
  XCircle: () => <span>Icon</span>,
}));

describe("ReservationCancelDialog", () => {
  let queryClient: QueryClient;

  const mockReservation: ReservationInfo = {
    id: 1,
    lot_id: 101,
    lot_number: "LOT-001",
    reserved_qty: "10.00",
    product_name: "Test Product",
    product_code: "PROD-001",
    order_number: "ORD-001",
    status: "confirmed",
  };

  const defaultProps = {
    reservation: mockReservation,
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
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
    mockCancelMutation.mutate.mockClear();
  });

  const renderDialog = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ReservationCancelDialog {...defaultProps} {...props} />
      </QueryClientProvider>,
    );
  };

  it("renders with reservation details", () => {
    renderDialog();

    expect(screen.getByText("LOT-001")).toBeInTheDocument();
    expect(screen.getByText("10.00")).toBeInTheDocument();
    expect(screen.getByText("Test Product")).toBeInTheDocument();
    expect(screen.getByText("ORD-001")).toBeInTheDocument();
  });

  it("calls cancel mutation on submit", async () => {
    renderDialog();
    const user = userEvent.setup();

    // Fill note
    const noteInput = screen.getByLabelText("メモ（任意）");
    await user.type(noteInput, "Cancel reservation note");

    // Click submit
    const submitButton = screen.getByText("取り消す");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCancelMutation.mutate).toHaveBeenCalledWith({
        allocationId: 1,
        data: {
          reason: "input_error",
          note: "Cancel reservation note",
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
  });

  it("does not render when open is false", () => {
    renderDialog({ open: false });
    expect(screen.queryByText("LOT-001")).not.toBeInTheDocument();
  });
});
