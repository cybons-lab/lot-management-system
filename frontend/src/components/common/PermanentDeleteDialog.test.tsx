/**
 * PermanentDeleteDialog Component Tests
 *
 * Tests for permanent delete confirmation dialog:
 * - Confirmation phrase validation
 * - Button enable/disable states
 * - Loading state
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { PermanentDeleteDialog } from "./PermanentDeleteDialog";

describe("PermanentDeleteDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: "完全削除の確認",
    description: "このアイテムを完全に削除しますか？",
    confirmationPhrase: "削除する",
    onConfirm: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog when open is true", () => {
    render(<PermanentDeleteDialog {...defaultProps} />);

    expect(screen.getByText("完全削除の確認")).toBeInTheDocument();
    expect(screen.getByText("このアイテムを完全に削除しますか？")).toBeInTheDocument();
  });

  it("does not render dialog when open is false", () => {
    render(<PermanentDeleteDialog {...defaultProps} open={false} />);

    expect(screen.queryByText("完全削除の確認")).not.toBeInTheDocument();
  });

  it("shows warning message about irreversible action", () => {
    render(<PermanentDeleteDialog {...defaultProps} />);

    expect(
      screen.getByText(/この操作は取り消せません。データベースから完全に削除されます/),
    ).toBeInTheDocument();
  });

  it("disables confirm button when input does not match confirmation phrase", () => {
    render(<PermanentDeleteDialog {...defaultProps} />);

    const confirmButton = screen.getByRole("button", { name: "完全に削除" });
    expect(confirmButton).toBeDisabled();

    const input = screen.getByPlaceholderText("削除する");
    fireEvent.change(input, { target: { value: "wrong phrase" } });

    expect(confirmButton).toBeDisabled();
  });

  it("enables confirm button when input matches confirmation phrase", () => {
    render(<PermanentDeleteDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText("削除する");
    fireEvent.change(input, { target: { value: "削除する" } });

    const confirmButton = screen.getByRole("button", { name: "完全に削除" });
    expect(confirmButton).not.toBeDisabled();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    render(<PermanentDeleteDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText("削除する");
    fireEvent.change(input, { target: { value: "削除する" } });

    const confirmButton = screen.getByRole("button", { name: "完全に削除" });
    fireEvent.click(confirmButton);

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders cancel button", () => {
    render(<PermanentDeleteDialog {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: "キャンセル" });
    expect(cancelButton).toBeInTheDocument();
  });

  it("displays confirmation phrase hint", () => {
    render(<PermanentDeleteDialog {...defaultProps} />);

    expect(screen.getByText(/確認のため/)).toBeInTheDocument();
    expect(screen.getByText(/削除する/)).toBeInTheDocument();
  });

  it("shows loading state when isPending is true", () => {
    render(<PermanentDeleteDialog {...defaultProps} isPending={true} />);

    expect(screen.getByRole("button", { name: "削除中..." })).toBeInTheDocument();
  });

  it("disables confirm button when isPending is true even with correct phrase", () => {
    render(<PermanentDeleteDialog {...defaultProps} isPending={true} />);

    const input = screen.getByPlaceholderText("削除する");
    fireEvent.change(input, { target: { value: "削除する" } });

    const confirmButton = screen.getByRole("button", { name: "削除中..." });
    expect(confirmButton).toBeDisabled();
  });
});
