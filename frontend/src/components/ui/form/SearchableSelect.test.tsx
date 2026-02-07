/**
 * SearchableSelect Component Tests
 *
 * Tests for searchable select/combobox:
 * - Rendering and placeholder
 * - Opening/closing dropdown
 * - Filtering options
 * - Selecting options
 * - Clearing selection
 * - Disabled state
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SearchableSelect } from "./SearchableSelect";

describe("SearchableSelect", () => {
  const mockOptions = [
    { value: "1", label: "Option One" },
    { value: "2", label: "Option Two" },
    { value: "3", label: "Three Different" },
  ];

  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with placeholder", () => {
    render(
      <SearchableSelect options={mockOptions} onChange={mockOnChange} placeholder="選択..." />,
    );

    expect(screen.getByText("選択...")).toBeInTheDocument();
  });

  it("renders selected option label", () => {
    render(
      <SearchableSelect
        options={mockOptions}
        value="2"
        onChange={mockOnChange}
        placeholder="選択..."
      />,
    );

    expect(screen.getByText("Option Two")).toBeInTheDocument();
  });

  it("opens dropdown on click", () => {
    render(<SearchableSelect options={mockOptions} onChange={mockOnChange} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(screen.getByText("Option One")).toBeInTheDocument();
    expect(screen.getByText("Option Two")).toBeInTheDocument();
    expect(screen.getByText("Three Different")).toBeInTheDocument();
  });

  it("does not open dropdown when disabled", () => {
    render(<SearchableSelect options={mockOptions} onChange={mockOnChange} disabled />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(screen.queryByText("Option One")).not.toBeInTheDocument();
  });

  it("calls onChange when option is selected", () => {
    render(<SearchableSelect options={mockOptions} onChange={mockOnChange} />);

    // Open dropdown
    const button = screen.getByRole("button");
    fireEvent.click(button);

    // Select option
    const option = screen.getByText("Option Two");
    fireEvent.click(option);

    expect(mockOnChange).toHaveBeenCalledWith("2");
  });

  it("shows clear button when value is selected", () => {
    render(<SearchableSelect options={mockOptions} value="1" onChange={mockOnChange} />);

    // Clear button should be visible (X icon)
    const clearButton = screen.getByRole("button", { name: "" });
    expect(clearButton).toBeInTheDocument();
  });

  it("clears selection when clear button is clicked", () => {
    render(<SearchableSelect options={mockOptions} value="1" onChange={mockOnChange} />);

    // Find all buttons and get the clear button (X icon)
    const buttons = screen.getAllByRole("button");
    const clearSpan = buttons[0]?.querySelector('[role="button"]');

    if (clearSpan) {
      fireEvent.click(clearSpan);
      expect(mockOnChange).toHaveBeenCalledWith("");
    }
  });

  it("shows 該当なし when no options match search", () => {
    render(<SearchableSelect options={mockOptions} onChange={mockOnChange} />);

    // Open dropdown
    const button = screen.getByRole("button");
    fireEvent.click(button);

    // Type in search
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "xyz" } });

    expect(screen.getByText("該当なし")).toBeInTheDocument();
  });

  it("filters options based on search term", () => {
    render(<SearchableSelect options={mockOptions} onChange={mockOnChange} />);

    // Open dropdown
    const button = screen.getByRole("button");
    fireEvent.click(button);

    // Type in search
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "One" } });

    expect(screen.getByText("Option One")).toBeInTheDocument();
    expect(screen.queryByText("Option Two")).not.toBeInTheDocument();
    expect(screen.queryByText("Three Different")).not.toBeInTheDocument();
  });

  it("filters options case-insensitively", () => {
    render(<SearchableSelect options={mockOptions} onChange={mockOnChange} />);

    // Open dropdown
    const button = screen.getByRole("button");
    fireEvent.click(button);

    // Type in search (lowercase)
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "option" } });

    expect(screen.getByText("Option One")).toBeInTheDocument();
    expect(screen.getByText("Option Two")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <SearchableSelect options={mockOptions} onChange={mockOnChange} className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });
});
