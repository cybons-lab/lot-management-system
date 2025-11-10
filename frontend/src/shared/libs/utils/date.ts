// frontend/src/lib/utils/date.ts

/**
 * 日付が有効かどうかをチェック
 */
export const isValidDate = (v?: unknown): boolean => {
  if (!v) return false;
  const d = new Date(String(v));
  return !Number.isNaN(d.getTime());
};

/**
 * 日付をYYYY-MM-DD形式にフォーマット
 */
export const formatYmd = (value?: string | Date | null): string => {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * 2つの日付の差分を日数で計算
 */
export const diffDays = (date1: Date | string, date2: Date | string): number => {
  const d1 = typeof date1 === "string" ? new Date(date1) : date1;
  const d2 = typeof date2 === "string" ? new Date(date2) : date2;
  const diff = d1.getTime() - d2.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};
