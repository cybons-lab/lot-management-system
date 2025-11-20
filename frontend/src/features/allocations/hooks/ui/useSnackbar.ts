/**
 * Custom hook for managing snackbar notifications
 */

import { useEffect, useState } from "react";

interface SnackbarState {
  message: string;
  variant?: "success" | "error";
}

export function useSnackbar() {
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);

  // Snackbarの自動非表示
  useEffect(() => {
    if (!snackbar) return;
    const timer = setTimeout(() => {
      setSnackbar(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [snackbar]);

  const showSuccess = (message: string) => {
    setSnackbar({ message, variant: "success" });
  };

  const showError = (message: string) => {
    setSnackbar({ message, variant: "error" });
  };

  return {
    snackbar,
    showSuccess,
    showError,
  };
}
