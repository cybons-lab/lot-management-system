/**
 * AdminGuard Component Tests
 *
 * Tests for admin authorization guard:
 * - Shows loading state
 * - Redirects non-admin users
 * - Renders children for admin users
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { AdminGuard } from "./AdminGuard";

// Mock useAuth hook
vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("AdminGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing while loading", async () => {
    const { useAuth } = await import("@/features/auth/AuthContext");
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isLoading: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const { container } = render(
      <MemoryRouter>
        <AdminGuard>
          <div>Protected Content</div>
        </AdminGuard>
      </MemoryRouter>,
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects to dashboard when user is not logged in", async () => {
    const { useAuth } = await import("@/features/auth/AuthContext");
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <div>Admin Content</div>
              </AdminGuard>
            }
          />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("redirects to dashboard when user does not have admin role", async () => {
    const { useAuth } = await import("@/features/auth/AuthContext");
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 1,
        username: "user",
        display_name: "Regular User",
        roles: ["user"],
        assignments: [],
      },
      token: "test-token",
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <div>Admin Content</div>
              </AdminGuard>
            }
          />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("renders children when user has admin role", async () => {
    const { useAuth } = await import("@/features/auth/AuthContext");
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 1,
        username: "admin",
        display_name: "Admin User",
        roles: ["admin", "user"],
        assignments: [],
      },
      token: "test-token",
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      </MemoryRouter>,
    );

    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });

  it("handles user with empty roles array", async () => {
    const { useAuth } = await import("@/features/auth/AuthContext");
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 1,
        username: "user",
        display_name: "User",
        roles: [],
        assignments: [],
      },
      token: "test-token",
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <div>Admin Content</div>
              </AdminGuard>
            }
          />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
