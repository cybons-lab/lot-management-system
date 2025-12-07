import { useEffect } from "react";

import { logError } from "@/services/error-logger";

export function useGlobalErrorHandlers() {
  useEffect(() => {
    // Handle uncaught errors
    const handleError = (event: ErrorEvent) => {
      logError("Global", event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logError("UnhandledRejection", event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);
}
