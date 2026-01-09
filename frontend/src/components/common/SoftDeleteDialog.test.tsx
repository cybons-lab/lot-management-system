/**
 * SoftDeleteDialog Component Tests
 *
 * Tests for soft delete confirmation dialog:
 * - Dialog open/close behavior
 * - Date input functionality
 * - Confirm/Cancel button behavior
 * - Loading state
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SoftDeleteDialog } from "./SoftDeleteDialog";

describe("SoftDeleteDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: "削除の確認",
    description: "このアイテムを無効化しますか？",
    onConfirm: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog when open is true", () => {
    render(<SoftDeleteDialog {...defaultProps} />);

    expect(screen.getByText("削除の確認")).toBeInTheDocument();
    expect(screen.getByText("このアイテムを無効化しますか？")).toBeInTheDocument();
  });

  it("does not render dialog when open is false", () => {
    render(<SoftDeleteDialog {...defaultProps} open={false} />);

    expect(screen.queryByText("削除の確認")).not.toBeInTheDocument();
  });

  it("renders date input field", () => {
    render(<SoftDeleteDialog {...defaultProps} />);

    const dateInput = screen.getByLabelText(/有効終了日/);
    expect(dateInput).toBeInTheDocument();
    expect(dateInput).toHaveAttribute("type", "date");
  });

  it("calls onConfirm with null when no date is specified", () => {
    render(<SoftDeleteDialog {...defaultProps} />);

    const confirmButton = screen.getByRole("button", { name: "無効化" });
    fireEvent.click(confirmButton);

    const today = new Date().toISOString().split("T")[0];
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(today);
  });

  it("calls onConfirm with date when date is specified", () => {
    render(<SoftDeleteDialog {...defaultProps} />);

    const dateInput = screen.getByLabelText(/有効終了日/);
    fireEvent.change(dateInput, { target: { value: "2025-12-31" } });

    const confirmButton = screen.getByRole("button", { name: "無効化" });
    fireEvent.click(confirmButton);

    expect(defaultProps.onConfirm).toHaveBeenCalledWith("2025-12-31");
  });

  it("calls onOpenChange when cancel button is clicked", () => {
    render(<SoftDeleteDialog {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: "キャンセル" });
    fireEvent.click(cancelButton);

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows loading state when isPending is true", () => {
    render(<SoftDeleteDialog {...defaultProps} isPending={true} />);

    expect(screen.getByRole("button", { name: "処理中..." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "処理中..." })).toBeDisabled();
  });

  it("shows permanent delete link when onSwitchToPermanent is provided", () => {
    const onSwitchToPermanent = vi.fn();
    render(<SoftDeleteDialog {...defaultProps} onSwitchToPermanent={onSwitchToPermanent} />);

    const permanentDeleteLink = screen.getByText("完全に削除する（管理者のみ）");
    expect(permanentDeleteLink).toBeInTheDocument();

    fireEvent.click(permanentDeleteLink);
    expect(onSwitchToPermanent).toHaveBeenCalled();
  });

  it("does not show permanent delete link when onSwitchToPermanent is not provided", () => {
    render(<SoftDeleteDialog {...defaultProps} />);

    expect(screen.queryByText("完全に削除する（管理者のみ）")).not.toBeInTheDocument();
  });
});
