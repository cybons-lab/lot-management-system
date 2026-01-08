/**
 * BulkSoftDeleteDialog Component Tests
 *
 * Tests for bulk soft delete (logical delete) confirmation dialog:
 * - End date input functionality
 * - Button enable/disable states
 * - Selected count display
 * - Loading state
 * - onConfirm callback with end date
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { BulkSoftDeleteDialog } from "./BulkSoftDeleteDialog";

describe("BulkSoftDeleteDialog", () => {
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
    render(<BulkSoftDeleteDialog {...defaultProps} />);

    expect(screen.getByText("選択項目を無効化しますか？")).toBeInTheDocument();
    expect(screen.getByText(/選択された 5 件のデータを無効化します/)).toBeInTheDocument();
  });

  it("does not render dialog when open is false", () => {
    render(<BulkSoftDeleteDialog {...defaultProps} open={false} />);

    expect(screen.queryByText("選択項目を無効化しますか？")).not.toBeInTheDocument();
  });

  it("shows selected count in the dialog", () => {
    render(<BulkSoftDeleteDialog {...defaultProps} selectedCount={10} />);

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText(/10 件を無効化/)).toBeInTheDocument();
  });

  it("shows message about soft delete", () => {
    render(<BulkSoftDeleteDialog {...defaultProps} />);

    expect(
      screen.getByText(/無効化されたデータは一覧から非表示になりますが、完全には削除されません/),
    ).toBeInTheDocument();
  });

  it("renders date input for end date", () => {
    render(<BulkSoftDeleteDialog {...defaultProps} />);

    const dateInput = screen.getByLabelText(/無効化日/);
    expect(dateInput).toBeInTheDocument();
    expect(dateInput).toHaveAttribute("type", "date");
  });

  it("sets default date to today", () => {
    render(<BulkSoftDeleteDialog {...defaultProps} />);

    const today = new Date().toISOString().split("T")[0];
    const dateInput = screen.getByLabelText(/無効化日/);
    expect(dateInput).toHaveValue(today);
  });

  it("confirm button is enabled by default (no DELETE phrase required)", () => {
    render(<BulkSoftDeleteDialog {...defaultProps} />);

    const confirmButton = screen.getByRole("button", { name: /件を無効化/ });
    expect(confirmButton).not.toBeDisabled();
  });

  it("calls onConfirm with end date when confirm button is clicked", () => {
    render(<BulkSoftDeleteDialog {...defaultProps} />);

    const dateInput = screen.getByLabelText(/無効化日/);
    fireEvent.change(dateInput, { target: { value: "2024-12-31" } });

    const confirmButton = screen.getByRole("button", { name: /件を無効化/ });
    fireEvent.click(confirmButton);

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).toHaveBeenCalledWith("2024-12-31");
  });

  it("calls onConfirm with null when date is empty", () => {
    render(<BulkSoftDeleteDialog {...defaultProps} />);

    const dateInput = screen.getByLabelText(/無効化日/);
    fireEvent.change(dateInput, { target: { value: "" } });

    const confirmButton = screen.getByRole("button", { name: /件を無効化/ });
    fireEvent.click(confirmButton);

    expect(defaultProps.onConfirm).toHaveBeenCalledWith(null);
  });

  it("renders cancel button", () => {
    render(<BulkSoftDeleteDialog {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: "キャンセル" });
    expect(cancelButton).toBeInTheDocument();
  });

  it("shows loading state when isPending is true", () => {
    render(<BulkSoftDeleteDialog {...defaultProps} isPending={true} />);

    expect(screen.getByRole("button", { name: "処理中..." })).toBeInTheDocument();
  });

  it("disables confirm button when isPending is true", () => {
    render(<BulkSoftDeleteDialog {...defaultProps} isPending={true} />);

    const confirmButton = screen.getByRole("button", { name: "処理中..." });
    expect(confirmButton).toBeDisabled();
  });

  it("disables confirm button when selectedCount is 0", () => {
    render(<BulkSoftDeleteDialog {...defaultProps} selectedCount={0} />);

    const confirmButton = screen.getByRole("button", { name: /件を無効化/ });
    expect(confirmButton).toBeDisabled();
  });

  it("supports custom title and description", () => {
    render(
      <BulkSoftDeleteDialog
        {...defaultProps}
        title="カスタムタイトル"
        description="カスタム説明文"
      />,
    );

    expect(screen.getByText("カスタムタイトル")).toBeInTheDocument();
    expect(screen.getByText("カスタム説明文")).toBeInTheDocument();
  });

  it("shows instruction text about end date", () => {
    render(<BulkSoftDeleteDialog {...defaultProps} />);

    expect(screen.getByText(/この日付以降、対象データは無効として扱われます/)).toBeInTheDocument();
  });
});
