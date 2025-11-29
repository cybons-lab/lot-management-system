import { format, parseISO } from "date-fns";

/**
 * Format a date string or Date object to "YYYY/MM/DD".
 * @param date - The date to format (ISO string or Date object)
 * @param formatStr - Optional format string (default: "yyyy/MM/dd")
 * @returns Formatted date string, or empty string if date is invalid/null
 */
export type FormatDateOptions = {
  format?: string;
  fallback?: string;
};

export function formatDate(
  date: string | Date | null | undefined,
  optionsOrFormat: string | FormatDateOptions = "yyyy/MM/dd",
): string {
  const formatStr =
    typeof optionsOrFormat === "string"
      ? optionsOrFormat
      : (optionsOrFormat.format ?? "yyyy/MM/dd");
  const fallback = typeof optionsOrFormat === "object" ? (optionsOrFormat.fallback ?? "") : "";

  if (!date) return fallback;

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    console.warn("Invalid date passed to formatDate:", date, error);
    return fallback;
  }
}

/**
 * Format a date string or Date object to "YYYY/MM/DD HH:mm".
 * @param date - The date to format
 * @returns Formatted date time string
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, "yyyy/MM/dd HH:mm");
}

/**
 * Format a date for HTML input[type="date"] (YYYY-MM-DD).
 * @param date - The date to format
 * @returns Date string formatted for input
 */
export function formatDateForInput(date: string | Date | null | undefined): string {
  return formatDate(date, "yyyy-MM-dd");
}
