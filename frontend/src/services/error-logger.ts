/**
 * Error Logger Service
 *
 * Provides centralized error logging for the frontend application.
 * Logs errors to console in development and optionally sends to backend.
 */

export interface ErrorLogEntry {
  timestamp: string;
  level: "error" | "warning" | "info";
  source: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  userAgent?: string;
  url?: string;
}

class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private readonly maxLogs = 100;

  /**
   * Log an error with specified level
   */
  log(
    level: ErrorLogEntry["level"],
    source: string,
    error: Error | string,
    context?: Record<string, unknown>,
  ): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      source,
      message: typeof error === "string" ? error : error.message,
      stack: error instanceof Error ? error.stack : undefined,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.logs.push(entry);

    // Limit log size
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output in development
    if (import.meta.env.DEV) {
      const logMethod =
        level === "error" ? console.error : level === "warning" ? console.warn : console.log;
      logMethod(`[${level.toUpperCase()}] ${source}:`, error, context);
    }

    // Optional: Send to backend (disabled by default)
    // To enable backend logging, uncomment the following code:
    // if (level === "error") {
    //   fetch("/api/frontend-errors", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify(entry),
    //   }).catch(err => console.warn("Failed to send error to backend:", err));
    // }
  }

  /**
   * Log an error
   */
  error(source: string, error: Error | string, context?: Record<string, unknown>): void {
    this.log("error", source, error, context);
  }

  /**
   * Log a warning
   */
  warning(source: string, error: Error | string, context?: Record<string, unknown>): void {
    this.log("warning", source, error, context);
  }

  /**
   * Log an info message
   */
  info(source: string, message: string, context?: Record<string, unknown>): void {
    this.log("info", source, message, context);
  }

  /**
   * Get all logs
   */
  getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }
}

// Singleton instance
export const errorLogger = new ErrorLogger();

// Convenience functions
export const logError = (
  source: string,
  error: Error | string,
  context?: Record<string, unknown>,
) => {
  errorLogger.error(source, error, context);
};

export const logWarning = (
  source: string,
  error: Error | string,
  context?: Record<string, unknown>,
) => {
  errorLogger.warning(source, error, context);
};

export const logInfo = (source: string, message: string, context?: Record<string, unknown>) => {
  errorLogger.info(source, message, context);
};
