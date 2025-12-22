/**
 * useGlobalErrorHandlers Hook Tests
 *
 * Tests for global error handling:
 * - Window error event handling
 * - Unhandled rejection handling
 * - Event listener cleanup
 */

import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useGlobalErrorHandlers } from "./useGlobalErrorHandlers";

// Mock the error logger
vi.mock("@/services/error-logger", () => ({
  logError: vi.fn(),
}));

describe("useGlobalErrorHandlers", () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    addEventListenerSpy = vi.spyOn(window, "addEventListener");
    removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it("registers error event listener on mount", () => {
    renderHook(() => useGlobalErrorHandlers());

    expect(addEventListenerSpy).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("registers unhandledrejection event listener on mount", () => {
    renderHook(() => useGlobalErrorHandlers());

    expect(addEventListenerSpy).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
  });

  it("removes event listeners on unmount", () => {
    const { unmount } = renderHook(() => useGlobalErrorHandlers());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("error", expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
  });

  it("logs error when window error event is fired", async () => {
    const { logError } = await import("@/services/error-logger");

    renderHook(() => useGlobalErrorHandlers());

    // Get the error handler that was registered
    const errorHandler = addEventListenerSpy.mock.calls.find(
      (call: [string, EventListenerOrEventListenerObject]) => call[0] === "error",
    )?.[1] as EventListener;

    // Simulate an error event
    const mockError = new Error("Test window error");
    const mockEvent = {
      error: mockError,
      message: "Test window error",
      filename: "test.js",
      lineno: 10,
      colno: 5,
    } as ErrorEvent;

    errorHandler(mockEvent);

    expect(logError).toHaveBeenCalledWith("Global", mockError, {
      filename: "test.js",
      lineno: 10,
      colno: 5,
    });
  });

  it("logs error when unhandled rejection event is fired", async () => {
    const { logError } = await import("@/services/error-logger");

    renderHook(() => useGlobalErrorHandlers());

    // Get the rejection handler that was registered
    const rejectionHandler = addEventListenerSpy.mock.calls.find(
      (call: [string, EventListenerOrEventListenerObject]) => call[0] === "unhandledrejection",
    )?.[1] as EventListener;

    // Simulate an unhandled rejection event
    const mockReason = new Error("Unhandled promise rejection");
    const mockEvent = {
      reason: mockReason,
    } as PromiseRejectionEvent;

    rejectionHandler(mockEvent);

    expect(logError).toHaveBeenCalledWith("UnhandledRejection", mockReason);
  });

  it("handles error event without error object (falls back to message)", async () => {
    const { logError } = await import("@/services/error-logger");

    renderHook(() => useGlobalErrorHandlers());

    const errorHandler = addEventListenerSpy.mock.calls.find(
      (call: [string, EventListenerOrEventListenerObject]) => call[0] === "error",
    )?.[1] as EventListener;

    // Simulate an error event without error object
    const mockEvent = {
      error: null,
      message: "Fallback error message",
      filename: "script.js",
      lineno: 20,
      colno: 10,
    } as ErrorEvent;

    errorHandler(mockEvent);

    expect(logError).toHaveBeenCalledWith("Global", "Fallback error message", {
      filename: "script.js",
      lineno: 20,
      colno: 10,
    });
  });
});
