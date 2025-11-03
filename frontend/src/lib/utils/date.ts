// lib/utils/date.ts（新規）
export const isValidDate = (v?: unknown): boolean => {
  if (!v) return false;
  const d = new Date(String(v));
  return !Number.isNaN(d.getTime());
};
