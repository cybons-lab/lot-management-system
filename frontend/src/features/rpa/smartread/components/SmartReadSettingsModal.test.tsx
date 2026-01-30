import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import * as hooks from "../hooks";

import { SmartReadSettingsModal } from "./SmartReadSettingsModal";

// Mock the hooks
vi.mock("../hooks", () => ({
  useSmartReadConfigs: vi.fn(),
  useCreateSmartReadConfig: vi.fn(),
  useUpdateSmartReadConfig: vi.fn(),
  useDeleteSmartReadConfig: vi.fn(),
}));

// Mock Select components for easier testing
vi.mock("@/components/ui", async () => {
  const actual = await vi.importActual("@/components/ui");
  return {
    ...actual,
    Select: ({ children, onValueChange, value }: any) => {
      return (
        <div data-testid="select-root">
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as any, { onValueChange, value });
            }
            return child;
          })}
        </div>
      );
    },
    SelectTrigger: ({ children, onValueChange, value, ...props }: any) => (
      <select {...props} value={value || ""} onChange={(e) => onValueChange?.(e.target.value)}>
        {children}
      </select>
    ),
    SelectValue: ({ placeholder }: any) => (
      <option value="" disabled>
        {placeholder}
      </option>
    ),
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
    // Removed FormControl mock to allow shadcn's FormControl to add id to Select
  };
});

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserver;

describe("SmartReadSettingsModal", () => {
  const mockOnOpenChange = vi.fn();
  const mockConfigs = [
    {
      id: 1,
      name: "Test Config 1",
      endpoint: "https://api.test.com",
      api_key: "key1",
      export_type: "json",
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ];

  const mockCreateMutate = vi.fn();
  const mockUpdateMutate = vi.fn();
  const mockDeleteMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (hooks.useSmartReadConfigs as any).mockReturnValue({
      data: mockConfigs,
      isLoading: false,
    });

    (hooks.useCreateSmartReadConfig as any).mockReturnValue({
      mutateAsync: mockCreateMutate,
      isPending: false,
    });

    (hooks.useUpdateSmartReadConfig as any).mockReturnValue({
      mutateAsync: mockUpdateMutate,
      isPending: false,
    });

    (hooks.useDeleteSmartReadConfig as any).mockReturnValue({
      mutateAsync: mockDeleteMutate,
      isPending: false,
    });
  });

  it("renders the modal and list of configs", () => {
    render(<SmartReadSettingsModal open={true} onOpenChange={mockOnOpenChange} />);

    expect(screen.getByText("AI-OCR設定")).toBeInTheDocument();
    expect(screen.getByText("Test Config 1")).toBeInTheDocument();
  });

  it("opens create form when '新規作成' is clicked", () => {
    render(<SmartReadSettingsModal open={true} onOpenChange={mockOnOpenChange} />);

    fireEvent.click(screen.getByText("新規作成"));

    expect(screen.getByLabelText(/設定名/)).toBeInTheDocument();
    expect(screen.getByLabelText(/APIエンドポイント/)).toBeInTheDocument();
    expect(screen.getByLabelText(/監視フォルダ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/出力先フォルダ/)).toBeInTheDocument();
    expect(screen.getByText("作成")).toBeInTheDocument();
  });

  // Note: Form submission tests (create/update) are better suited for E2E tests with Playwright
  // due to complex shadcn/ui Select component mocking requirements.
  // See: docs/project/BACKLOG.md - "SmartRead設定フォーム送信のE2Eテスト"

  it("deletes a config", async () => {
    render(<SmartReadSettingsModal open={true} onOpenChange={mockOnOpenChange} />);

    const row = screen.getByText("Test Config 1").closest("tr");
    if (!row) return;

    // Second button is Delete
    const deleteButton = row.querySelectorAll("button")[1];
    fireEvent.click(deleteButton);

    // Should open alert dialog
    expect(screen.getByText("設定を削除しますか？")).toBeInTheDocument();

    // Click confirm in alert dialog
    fireEvent.click(screen.getByText("削除"));

    await waitFor(() => {
      expect(mockDeleteMutate).toHaveBeenCalledWith(1);
    });
  });
});
