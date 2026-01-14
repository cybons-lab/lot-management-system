import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
      request_type: "sync",
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

  it("submits the create form", async () => {
    render(<SmartReadSettingsModal open={true} onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByText("新規作成"));

    fireEvent.change(screen.getByLabelText(/設定名/), { target: { value: "New Config" } });
    fireEvent.change(screen.getByLabelText(/APIエンドポイント/), {
      target: { value: "https://new.api.com" },
    });
    fireEvent.change(screen.getByLabelText(/APIキー/), { target: { value: "secret" } });

    fireEvent.click(screen.getByText("作成"));

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Config",
          endpoint: "https://new.api.com",
          api_key: "secret",
        }),
      );
    });
  });

  it("opens edit form and submits updates", async () => {
    render(<SmartReadSettingsModal open={true} onOpenChange={mockOnOpenChange} />);

    const row = screen.getByText("Test Config 1").closest("tr");
    expect(row).toBeInTheDocument();
    if (!row) return;

    // First button in the actions cell is Edit (based on component code)
    // <Button onClick={() => handleEdit(config)}><Edit /></Button>
    const editButton = row.querySelectorAll("button")[0];
    fireEvent.click(editButton);

    expect(screen.getByLabelText(/設定名/)).toHaveValue("Test Config 1");

    fireEvent.change(screen.getByLabelText(/設定名/), { target: { value: "Updated Config" } });
    fireEvent.click(screen.getByText("更新"));

    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          configId: 1,
          data: expect.objectContaining({ name: "Updated Config" }),
        }),
      );
    });
  });

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
