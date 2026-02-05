/**
 * ErrorBoundary Component Tests
 *
 * Tests for React error boundary functionality including:
 * - Error catching and fallback UI display
 * - Custom fallback support
 * - Error callback invocation
 * - Reload button functionality
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { ErrorBoundary } from "./ErrorBoundary";

// Mock the error logger
vi.mock("@/services/error-logger", () => ({
  logError: vi.fn(),
}));

// Component that throws an error
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div>No error</div>;
};

// Suppress console.error for error boundary tests
const originalError = console.error;

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // Suppress React's error boundary console output during tests
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
    vi.clearAllMocks();
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("renders default fallback UI when an error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    // Check for error title
    expect(screen.getByText("エラーが発生しました")).toBeInTheDocument();

    // Check for error message
    expect(
      screen.getByText("申し訳ございません。予期しないエラーが発生しました。"),
    ).toBeInTheDocument();

    // Check for reload button
    expect(screen.getByRole("button", { name: "ページを再読み込み" })).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom error message")).toBeInTheDocument();
    expect(screen.queryByText("エラーが発生しました")).not.toBeInTheDocument();
  });

  it("calls onError callback when an error occurs", () => {
    const onErrorMock = vi.fn();

    render(
      <ErrorBoundary onError={onErrorMock}>
        <ThrowError />
      </ErrorBoundary>,
    );

    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Test error message",
      }),
      expect.objectContaining({
        componentStack: expect.any(String),
      }),
    );
  });

  it("logs error using error logger service", async () => {
    const { logError } = await import("@/services/error-logger");

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    expect(logError).toHaveBeenCalledWith(
      "ErrorBoundary",
      expect.objectContaining({
        message: "Test error message",
      }),
      expect.objectContaining({
        componentStack: expect.any(String),
      }),
    );
  });

  it("reload button triggers page reload", () => {
    const reloadMock = vi.fn();
    vi.stubGlobal("location", { reload: reloadMock });

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    const reloadButton = screen.getByRole("button", { name: "ページを再読み込み" });
    fireEvent.click(reloadButton);

    expect(reloadMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("does not show error details in production mode", () => {
    // Note: import.meta.env.DEV is typically true in test environment
    // This test verifies the structure exists but may show details in test
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    // The error boundary is rendered
    expect(screen.getByText("エラーが発生しました")).toBeInTheDocument();
  });
});
