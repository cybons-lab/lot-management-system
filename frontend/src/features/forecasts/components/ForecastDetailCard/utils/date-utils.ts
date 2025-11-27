/**
 * Date utility functions for ForecastDetailCard
 */

/**
 * Get all dates for a given month
 * @param targetMonth - The target month (any date within the month)
 * @returns Array of Date objects representing each day in the month
 */
export function getDatesForMonth(targetMonth: Date): Date[] {
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => new Date(year, month, index + 1));
}

/**
 * Format date as YYYY-MM-DD for comparison and map keys
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Check if two dates are the same day (ignoring time)
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if date is in the past compared to reference date
 * @param date - Date to check
 * @param referenceDate - Reference date (defaults to today at midnight)
 * @returns True if date is before reference date
 */
export function isPastDate(date: Date, referenceDate: Date): boolean {
  return date < referenceDate;
}

/**
 * Get the start of a month (first day at midnight)
 * @param date - Any date within the target month
 * @returns Date object representing the first day of the month
 */
export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get today at midnight (for comparison purposes)
 * @returns Date object representing today at 00:00:00
 */
export function getTodayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
