// @vitest-environment jsdom
/**
 * CustomerDetailPage.test.tsx
 *
 * Tests for CustomerDetailPage component - verifies master code update functionality
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { CustomerDetailPage } from "./CustomerDetailPage";

import { http } from "@/shared/api/http-client";

// Mock http client
vi.mock("@/shared/api/http-client", () => ({
  http: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    deleteVoid: vi.fn(),
  },
}));

// Mock UI Components
vi.mock("@/components/ui", () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: (props: React.LabelHTMLAttributes<HTMLLabelElement>) => <span {...props} />,
}));

vi.mock("@/components/ui/display/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} />
  ),
  AlertDialogAction: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} />
  ),
}));

vi.mock("@/shared/components/layout/PageHeader", () => ({
  PageHeader: ({
    title,
    subtitle,
    actions,
  }: {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {actions}
    </div>
  ),
}));

// Helper to create a wrapper with router and query client
function createTestWrapper(initialRoute: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("CustomerDetailPage", () => {
  const mockCustomer = {
    id: 1,
    customer_code: "CUST-001",
    customer_name: "Test Customer",
    address: null,
    contact_name: null,
    phone: null,
    email: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    valid_to: "9999-12-31",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(http.get).mockResolvedValue(mockCustomer);
  });

  it("should include customer_code in update request when code is changed", async () => {
    const user = userEvent.setup();

    const updatedCustomer = {
      ...mockCustomer,
      customer_code: "CUST-NEW",
      customer_name: "Updated Customer",
    };
    vi.mocked(http.put).mockResolvedValue(updatedCustomer);

    render(
      <Routes>
        <Route path="/customers/:customerCode" element={<CustomerDetailPage />} />
      </Routes>,
      { wrapper: createTestWrapper("/customers/CUST-001") },
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText("得意先詳細")).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getByRole("button", { name: /編集/i });
    await user.click(editButton);

    // Find and update the customer code input
    const codeInput = screen.getByDisplayValue("CUST-001");
    await user.clear(codeInput);
    await user.type(codeInput, "CUST-NEW");

    // Find and update the customer name input
    const nameInput = screen.getByDisplayValue("Test Customer");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Customer");

    // Submit the form
    const submitButton = screen.getByRole("button", { name: /更新/i });
    await user.click(submitButton);

    // Verify that http.put was called with the correct data including customer_code
    await waitFor(() => {
      expect(http.put).toHaveBeenCalledWith(
        "masters/customers/CUST-001",
        expect.objectContaining({
          customer_code: "CUST-NEW",
          customer_name: "Updated Customer",
        }),
      );
    });
  });

  it("should include customer_code in update request even when only name is changed", async () => {
    const user = userEvent.setup();

    const updatedCustomer = {
      ...mockCustomer,
      customer_name: "Updated Name Only",
    };
    vi.mocked(http.put).mockResolvedValue(updatedCustomer);

    render(
      <Routes>
        <Route path="/customers/:customerCode" element={<CustomerDetailPage />} />
      </Routes>,
      { wrapper: createTestWrapper("/customers/CUST-001") },
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText("得意先詳細")).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getByRole("button", { name: /編集/i });
    await user.click(editButton);

    // Only update the customer name
    const nameInput = screen.getByDisplayValue("Test Customer");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Name Only");

    // Submit the form
    const submitButton = screen.getByRole("button", { name: /更新/i });
    await user.click(submitButton);

    // Verify that http.put was called with customer_code included
    await waitFor(() => {
      expect(http.put).toHaveBeenCalledWith(
        "masters/customers/CUST-001",
        expect.objectContaining({
          customer_code: "CUST-001", // Original code should still be included
          customer_name: "Updated Name Only",
        }),
      );
    });
  });
});
