/**
 * TanStack Query Client Configuration
 *
 * Provides global error handling for queries and mutations.
 */

import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { logError } from "@/services/error-logger";

/**
 * Extract user-friendly error message from error object.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "予期しないエラーが発生しました";
}

/**
 * Query cache with global error handling.
 *
 * - Logs all query errors
 * - Shows toast only for refetch failures (not initial loads)
 */
const queryCache = new QueryCache({
  onError: (error, query) => {
    // Only show toast for queries that already have data (refetch failures)
    // Initial load failures should be handled by component UI (isError state)
    if (query.state.data !== undefined) {
      toast.error(`データ更新に失敗しました: ${getErrorMessage(error)}`);
    }

    // Always log to error logger
    logError("QueryCache", error instanceof Error ? error : new Error(String(error)), {
      queryKey: JSON.stringify(query.queryKey),
    });
  },
});

/**
 * Mutation cache with global error handling.
 *
 * - Logs all mutation errors
 * - Shows toast for failures (can be suppressed via meta.suppressErrorToast)
 */
const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    // Show toast unless explicitly suppressed
    const suppressToast = mutation.meta?.suppressErrorToast as boolean | undefined;
    if (!suppressToast) {
      toast.error(`操作に失敗しました: ${getErrorMessage(error)}`);
    }

    // Always log to error logger
    logError("MutationCache", error instanceof Error ? error : new Error(String(error)), {
      mutationKey: mutation.options.mutationKey
        ? JSON.stringify(mutation.options.mutationKey)
        : undefined,
    });
  },
});

/**
 * Configured QueryClient instance.
 */
export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
