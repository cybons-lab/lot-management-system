import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { ProductForm } from "./ProductForm";

describe("ProductForm", () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  it("renders all input fields correctly", () => {
    render(<ProductForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/製品コード/)).toBeInTheDocument();
    expect(screen.getByLabelText(/商品名/)).toBeInTheDocument();
    expect(screen.getByLabelText(/社内単位/)).toBeInTheDocument();
    expect(screen.getByLabelText(/外部単位/)).toBeInTheDocument();
    expect(screen.getByLabelText(/内部単位あたりの数量/)).toBeInTheDocument();
    expect(screen.getByLabelText(/得意先品番/)).toBeInTheDocument();
    expect(screen.getByLabelText(/メーカー品番/)).toBeInTheDocument();
    expect(screen.getByLabelText(/有効/)).toBeInTheDocument();
  });

  it("displays validation errors for required fields", async () => {
    render(<ProductForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const submitButton = screen.getByRole("button", { name: /登録/ });
    const form = submitButton.closest("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText("製品コードは必須です")).toBeInTheDocument();
      expect(screen.getByText("商品名は必須です")).toBeInTheDocument();
    });
  });

  it("displays validation error for invalid quantity", async () => {
    render(<ProductForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Fill other required fields to isolate quantity error
    fireEvent.change(screen.getByLabelText(/製品コード/), { target: { value: "TEST-QTY" } });
    fireEvent.change(screen.getByLabelText(/商品名/), { target: { value: "Qty Test" } });
    fireEvent.change(screen.getByLabelText(/社内単位/), { target: { value: "EA" } });
    fireEvent.change(screen.getByLabelText(/外部単位/), { target: { value: "EA" } });

    const qtyInput = screen.getByLabelText(/内部単位あたりの数量/);
    fireEvent.change(qtyInput, { target: { value: "0" } });

    const submitButton = screen.getByRole("button", { name: /登録/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("数量は1以上で入力してください")).toBeInTheDocument();
    });
  });

  it("calls onSubmit with valid data", async () => {
    render(<ProductForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/製品コード/), { target: { value: "TEST-001" } });
    fireEvent.change(screen.getByLabelText(/商品名/), { target: { value: "Test Product" } });
    fireEvent.change(screen.getByLabelText(/社内単位/), { target: { value: "BOX" } });
    fireEvent.change(screen.getByLabelText(/外部単位/), { target: { value: "KG" } });

    const qtyInput = screen.getByLabelText(/内部単位あたりの数量/);
    fireEvent.change(qtyInput, { target: { value: "10" } });

    const submitButton = screen.getByRole("button", { name: /登録/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Check if any error message is displayed
      const errors = screen.queryAllByText(/必須です|入力してください/);
      if (errors.length > 0) {
        console.log(
          "Validation errors found:",
          errors.map((e) => e.textContent),
        );
      }
      expect(errors).toHaveLength(0);

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          product_code: "TEST-001",
          product_name: "Test Product",
          internal_unit: "BOX",
          external_unit: "KG",
          qty_per_internal_unit: 10,
          is_active: true,
        }),
      );
    });
  });

  it("populates fields with initial values in edit mode", () => {
    const product = {
      id: 1,
      product_code: "EDIT-001",
      product_name: "Edit Product",
      internal_unit: "EA",
      external_unit: "CS",
      qty_per_internal_unit: 12,
      is_active: false,
      created_at: "2023-01-01",
      updated_at: "2023-01-01",
      supplier_ids: [],
      customer_part_no: "CP-123",
      maker_item_code: "MK-456",
      valid_to: "9999-12-31",
    };

    render(<ProductForm product={product} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/製品コード/)).toHaveValue("EDIT-001");
    expect(screen.getByLabelText(/商品名/)).toHaveValue("Edit Product");
    expect(screen.getByLabelText(/社内単位/)).toHaveValue("EA");
    expect(screen.getByLabelText(/外部単位/)).toHaveValue("CS");
    expect(screen.getByLabelText(/内部単位あたりの数量/)).toHaveValue(12);
    expect(screen.getByLabelText(/得意先品番/)).toHaveValue("CP-123");
    expect(screen.getByLabelText(/メーカー品番/)).toHaveValue("MK-456");
    expect(screen.getByLabelText(/有効/)).not.toBeChecked();

    expect(screen.getByRole("button", { name: /更新/ })).toBeInTheDocument();
  });

  it("calls onCancel when cancel button is clicked", () => {
    render(<ProductForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByRole("button", { name: /キャンセル/ });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});
