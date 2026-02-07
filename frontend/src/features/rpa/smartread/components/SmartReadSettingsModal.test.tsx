import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import * as hooks from "../hooks";

import { SmartReadSettingsModal } from "./SmartReadSettingsModal";

import type * as UiComponents from "@/components/ui";

// Mock the hooks
vi.mock("../hooks", () => ({
  useSmartReadConfigs: vi.fn(),
  useCreateSmartReadConfig: vi.fn(),
  useUpdateSmartReadConfig: vi.fn(),
  useDeleteSmartReadConfig: vi.fn(),
}));

// Mock Select components for easier testing
vi.mock("@/components/ui", async () => {
  const actual = await vi.importActual<typeof UiComponents>("@/components/ui");

  interface SelectRootProps {
    children?: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
  }

  type SelectTriggerProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
    children?: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
  };

  interface SelectValueProps {
    placeholder?: string;
  }

  interface SelectContentProps {
    children?: React.ReactNode;
  }

  interface SelectItemProps {
    children?: React.ReactNode;
    value?: string;
  }

  return {
    ...actual,
    Select: ({ children, onValueChange, value }: SelectRootProps) => {
      return (
        <div data-testid="select-root">
          {React.Children.map(children, (child) => {
            if (React.isValidElement<SelectTriggerProps>(child)) {
              return React.cloneElement(child, {
                onValueChange,
                value,
              } as Partial<SelectTriggerProps>);
            }
            return child;
          })}
        </div>
      );
    },
    SelectTrigger: ({ children, onValueChange, value, ...props }: SelectTriggerProps) => (
      <select {...props} value={value || ""} onChange={(e) => onValueChange?.(e.target.value)}>
        {children}
      </select>
    ),
    SelectValue: ({ placeholder }: SelectValueProps) => (
      <option value="" disabled>
        {placeholder}
      </option>
    ),
    SelectContent: ({ children }: SelectContentProps) => <>{children}</>,
    SelectItem: ({ children, value }: SelectItemProps) => <option value={value}>{children}</option>,
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

    vi.mocked(hooks.useSmartReadConfigs).mockReturnValue({
      data: mockConfigs,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useSmartReadConfigs>);

    vi.mocked(hooks.useCreateSmartReadConfig).mockReturnValue({
      mutateAsync: mockCreateMutate,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useCreateSmartReadConfig>);

    vi.mocked(hooks.useUpdateSmartReadConfig).mockReturnValue({
      mutateAsync: mockUpdateMutate,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useUpdateSmartReadConfig>);

    vi.mocked(hooks.useDeleteSmartReadConfig).mockReturnValue({
      mutateAsync: mockDeleteMutate,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useDeleteSmartReadConfig>);
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
    if (deleteButton) {
      fireEvent.click(deleteButton);
    }

    // Should open alert dialog
    expect(screen.getByText("設定を削除しますか？")).toBeInTheDocument();

    // Click confirm in alert dialog
    fireEvent.click(screen.getByText("削除"));

    await waitFor(() => {
      expect(mockDeleteMutate).toHaveBeenCalledWith(1);
    });
  });
});
