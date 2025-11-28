/**
 * Constants for lot allocation operations
 */

/**
 * Allocation-related constants
 */
export const ALLOCATION_CONSTANTS = {
  /**
   * Default limit for fetching candidate lots
   */
  CANDIDATE_LOTS_LIMIT: 200,

  /**
   * Line status values
   */
  LINE_STATUS: {
    CLEAN: "clean" as const,
    DRAFT: "draft" as const,
    COMMITTED: "committed" as const,
  },

  /**
   * User-facing messages
   */
  MESSAGES: {
    SAVE_SUCCESS: "引当を登録しました",
    SAVE_ERROR: "引当の登録に失敗しました",
    OVER_ALLOCATED: "必要数量を超えて引当されています",
  },

  /**
   * Query keys for allocation candidates
   */
  QUERY_STRATEGY: {
    FEFO: "fefo" as const,
    FIFO: "fifo" as const,
    CUSTOM: "custom" as const,
  },
} as const;
