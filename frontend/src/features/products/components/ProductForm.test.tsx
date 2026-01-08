// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { ProductForm } from "./ProductForm";

describe("ProductForm", () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  vi.mock("@/components/ui", () => ({
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    Input: (props: any) => <input {...props} />,
    Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
  }));

  it("renders all input fields correctly in create mode", () => {
    render(<ProductForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // 製品コードは新規作成時は表示されない
    expect(screen.queryByLabelText(/製品コード/)).not.toBeInTheDocument();

    expect(screen.getByLabelText(/商品名/)).toBeInTheDocument();
    expect(screen.getByLabelText(/社内単位/)).toBeInTheDocument();
    expect(screen.getByLabelText(/外部単位/)).toBeInTheDocument();
    expect(screen.getByLabelText(/内部単位あたりの数量/)).toBeInTheDocument();
    expect(screen.getByLabelText(/先方品番/)).toBeInTheDocument();

    // メーカー品目コードは「メーカー品番」というラベルになった
    expect(screen.getByLabelText(/^メーカー品番/)).toBeInTheDocument();

    expect(screen.getByLabelText(/有効/)).toBeInTheDocument();
  });

  it("displays validation errors for required fields", async () => {
    render(<ProductForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const submitButton = screen.getByRole("button", { name: /登録/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("商品名は必須です")).toBeInTheDocument();
      expect(screen.getByText("先方品番は必須です")).toBeInTheDocument();
      expect(screen.getByText("メーカー品番は必須です")).toBeInTheDocument();
    });
  });

  it("calls onSubmit with valid data", async () => {
    render(<ProductForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/商品名/), { target: { value: "Test Product" } });
    fireEvent.change(screen.getByLabelText(/社内単位/), { target: { value: "BOX" } });
    fireEvent.change(screen.getByLabelText(/外部単位/), { target: { value: "KG" } });
    fireEvent.change(screen.getByLabelText(/先方品番/), { target: { value: "CUST-001" } });
    fireEvent.change(screen.getByLabelText(/^メーカー品番/), { target: { value: "MAKER-001" } });

    const qtyInput = screen.getByLabelText(/内部単位あたりの数量/);
    fireEvent.change(qtyInput, { target: { value: "10" } });

    const submitButton = screen.getByRole("button", { name: /登録/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const errors = screen.queryAllByText(/必須です|入力してください/);
      expect(errors).toHaveLength(0);

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          product_code: undefined, // 自動採番のため
          product_name: "Test Product",
          internal_unit: "BOX",
          external_unit: "KG",
          qty_per_internal_unit: 10,
          customer_part_no: "CUST-001",
          maker_item_code: "MAKER-001",
          is_active: true,
        }),
      );
    });
  });

  it("populates fields with initial values in edit mode", () => {
    const product = {
      id: 1,
      product_code: "EDIT-001", // 編集時は表示
      product_name: "Edit Product",
      internal_unit: "EA",
      external_unit: "CS",
      qty_per_internal_unit: 12,
      is_active: false,
      created_at: "2023-01-01",
      updated_at: "2023-01-01",
      supplier_ids: [],
      customer_part_no: "CP-123",
      maker_part_code: "P20230101", // システム上のメーカー品番（製品コードと同じ）
      maker_item_code: "MK-456", // 画面上のメーカー品番
      valid_to: "9999-12-31",
      base_unit: "EA",
      consumption_limit_days: 90,
    };

    render(<ProductForm product={product} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/製品コード/)).toHaveValue("EDIT-001"); // 編集モードでのみ表示
    expect(screen.getByLabelText(/商品名/)).toHaveValue("Edit Product");
    expect(screen.getByLabelText(/社内単位/)).toHaveValue("EA");
    expect(screen.getByLabelText(/外部単位/)).toHaveValue("CS");
    expect(screen.getByLabelText(/内部単位あたりの数量/)).toHaveValue(12);
    expect(screen.getByLabelText(/先方品番/)).toHaveValue("CP-123");
    expect(screen.getByLabelText(/^メーカー品番/)).toHaveValue("MK-456"); // maker_item_code
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
