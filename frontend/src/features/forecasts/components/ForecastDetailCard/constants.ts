/**
 * Constants for ForecastDetailCard components
 */

/**
 * Dekad (旬) boundaries
 * - First dekad (上旬): 1-10
 * - Second dekad (中旬): 11-20
 * - Third dekad (下旬): 21-end of month
 */
export const DEKAD_BOUNDARIES = {
  FIRST: 10,
  SECOND: 20,
} as const;

/**
 * Grid configuration for daily forecast display
 */
export const GRID_CONFIG = {
  COLUMNS: 10,
  CELL_SIZE: "text-[11px]",
  GAP: "gap-1",
} as const;
