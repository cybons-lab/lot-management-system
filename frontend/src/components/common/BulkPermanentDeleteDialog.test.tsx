/**
 * BulkPermanentDeleteDialog Component Tests
 *
 * Tests for bulk permanent delete confirmation dialog:
 * - DELETE phrase validation
 * - Button enable/disable states
 * - Selected count display
 * - Loading state
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { BulkPermanentDeleteDialog } from "./BulkPermanentDeleteDialog";

describe("BulkPermanentDeleteDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    selectedCount: 5,
    onConfirm: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog when open is true", () => {
    render(<BulkPermanentDeleteDialog {...defaultProps} />);

    expect(screen.getByText("選択項目を完全に削除しますか？")).toBeInTheDocument();
    expect(screen.getByText(/選択された 5 件のデータを完全に削除します/)).toBeInTheDocument();
  });

  it("does not render dialog when open is false", () => {
    render(<BulkPermanentDeleteDialog {...defaultProps} open={false} />);

    expect(screen.queryByText("選択項目を完全に削除しますか？")).not.toBeInTheDocument();
  });

  it("shows selected count in the dialog", () => {
    render(<BulkPermanentDeleteDialog {...defaultProps} selectedCount={10} />);

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText(/10 件を完全に削除/)).toBeInTheDocument();
  });

  it("shows warning message about irreversible action", () => {
    render(<BulkPermanentDeleteDialog {...defaultProps} />);

    expect(
      screen.getByText(/この操作は取り消せません。データベースから完全に削除されます/),
    ).toBeInTheDocument();
  });

  it("disables confirm button when DELETE phrase is not entered", () => {
    render(<BulkPermanentDeleteDialog {...defaultProps} />);

    const confirmButton = screen.getByRole("button", { name: /件を完全に削除/ });
    expect(confirmButton).toBeDisabled();
  });

  it("disables confirm button when input does not match DELETE", () => {
    render(<BulkPermanentDeleteDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText("DELETE");
    fireEvent.change(input, { target: { value: "wrong" } });

    const confirmButton = screen.getByRole("button", { name: /件を完全に削除/ });
    expect(confirmButton).toBeDisabled();
  });

  it("enables confirm button when DELETE is entered correctly", () => {
    render(<BulkPermanentDeleteDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText("DELETE");
    fireEvent.change(input, { target: { value: "DELETE" } });

    const confirmButton = screen.getByRole("button", { name: /件を完全に削除/ });
    expect(confirmButton).not.toBeDisabled();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    render(<BulkPermanentDeleteDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText("DELETE");
    fireEvent.change(input, { target: { value: "DELETE" } });

    const confirmButton = screen.getByRole("button", { name: /件を完全に削除/ });
    fireEvent.click(confirmButton);

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders cancel button", () => {
    render(<BulkPermanentDeleteDialog {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: "キャンセル" });
    expect(cancelButton).toBeInTheDocument();
  });

  it("displays confirmation phrase hint", () => {
    render(<BulkPermanentDeleteDialog {...defaultProps} />);

    expect(screen.getByText(/確認のため/)).toBeInTheDocument();
    expect(screen.getByText(/DELETE/)).toBeInTheDocument();
  });

  it("shows loading state when isPending is true", () => {
    render(<BulkPermanentDeleteDialog {...defaultProps} isPending={true} />);

    expect(screen.getByRole("button", { name: "削除中..." })).toBeInTheDocument();
  });

  it("disables confirm button when isPending is true even with correct phrase", () => {
    render(<BulkPermanentDeleteDialog {...defaultProps} isPending={true} />);

    const input = screen.getByPlaceholderText("DELETE");
    fireEvent.change(input, { target: { value: "DELETE" } });

    const confirmButton = screen.getByRole("button", { name: "削除中..." });
    expect(confirmButton).toBeDisabled();
  });

  it("disables confirm button when selectedCount is 0", () => {
    render(<BulkPermanentDeleteDialog {...defaultProps} selectedCount={0} />);

    const input = screen.getByPlaceholderText("DELETE");
    fireEvent.change(input, { target: { value: "DELETE" } });

    const confirmButton = screen.getByRole("button", { name: /件を完全に削除/ });
    expect(confirmButton).toBeDisabled();
  });

  it("supports custom title and description", () => {
    render(
      <BulkPermanentDeleteDialog
        {...defaultProps}
        title="カスタムタイトル"
        description="カスタム説明文"
      />,
    );

    expect(screen.getByText("カスタムタイトル")).toBeInTheDocument();
    expect(screen.getByText("カスタム説明文")).toBeInTheDocument();
  });
});
