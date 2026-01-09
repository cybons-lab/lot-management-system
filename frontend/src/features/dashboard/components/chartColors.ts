/**
 * ダッシュボード用カラーパレット
 *
 * Recharts グラフで使用する色定義
 */

export const CHART_COLORS = {
  primary: "#3b82f6", // blue-500
  success: "#10b981", // green-500
  warning: "#f59e0b", // amber-500
  danger: "#ef4444", // red-500
  info: "#06b6d4", // cyan-500
  purple: "#8b5cf6", // violet-500
  pink: "#ec4899", // pink-500
  gray: "#6b7280", // gray-500
} as const;

export const PIE_CHART_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.info,
  CHART_COLORS.purple,
  CHART_COLORS.pink,
] as const;
