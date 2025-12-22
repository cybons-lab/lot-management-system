/**
 * RestoreDialog Component Tests
 *
 * Tests for restore confirmation dialog:
 * - Dialog display
 * - Confirm/Cancel behavior
 * - Loading state
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { RestoreDialog } from "./RestoreDialog";

describe("RestoreDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isPending: false,
    description: "このアイテムを復元しますか？",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog when open is true", () => {
    render(<RestoreDialog {...defaultProps} />);

    expect(screen.getByText("復元しますか？")).toBeInTheDocument();
    expect(screen.getByText("このアイテムを復元しますか？")).toBeInTheDocument();
  });

  it("does not render dialog when open is false", () => {
    render(<RestoreDialog {...defaultProps} open={false} />);

    expect(screen.queryByText("復元しますか？")).not.toBeInTheDocument();
  });

  it("renders custom title when provided", () => {
    render(<RestoreDialog {...defaultProps} title="カスタムタイトル" />);

    expect(screen.getByText("カスタムタイトル")).toBeInTheDocument();
  });

  it("calls onConfirm when restore button is clicked", () => {
    render(<RestoreDialog {...defaultProps} />);

    const restoreButton = screen.getByRole("button", { name: "復元" });
    fireEvent.click(restoreButton);

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders cancel button", () => {
    render(<RestoreDialog {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: "キャンセル" });
    expect(cancelButton).toBeInTheDocument();
  });

  it("shows loading state when isPending is true", () => {
    render(<RestoreDialog {...defaultProps} isPending={true} />);

    expect(screen.getByRole("button", { name: "復元中..." })).toBeInTheDocument();
  });

  it("disables restore button when isPending is true", () => {
    render(<RestoreDialog {...defaultProps} isPending={true} />);

    const restoreButton = screen.getByRole("button", { name: "復元中..." });
    expect(restoreButton).toBeDisabled();
  });
});
