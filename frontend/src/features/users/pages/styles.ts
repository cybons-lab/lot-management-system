/**
 * Users Page Styles
 * CVA + Tailwind クラス定義
 */

import { cva } from "class-variance-authority";

// ============================================
// Layout
// ============================================

export const root = "space-y-6 px-6 py-6 md:px-8";

export const loadingState = "flex items-center justify-center py-12 text-gray-500";

export const errorState = "mb-4 text-center text-red-600";

// ============================================
// Header
// ============================================

export const header = {
  root: "flex items-center justify-between",
  titleGroup: "space-y-1",
  title: "text-2xl font-bold text-gray-900",
  description: "text-sm text-gray-500",
};

// ============================================
// Card
// ============================================

export const card = {
  root: "rounded-lg border bg-white p-6 shadow-sm",
  title: "mb-4 text-lg font-semibold text-gray-900",
  header: "mb-4 flex items-center justify-between",
};

// ============================================
// Detail Grid
// ============================================

export const detailGrid = {
  root: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
  item: "space-y-1",
  label: "text-sm font-medium text-gray-500",
  value: "text-sm text-gray-900",
};

// ============================================
// Status Badge
// ============================================

export const statusBadge = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      isActive: {
        true: "bg-green-100 text-green-800",
        false: "bg-gray-100 text-gray-800",
      },
    },
    defaultVariants: {
      isActive: true,
    },
  },
);

// ============================================
// Role Badge
// ============================================

export const roleBadge =
  "inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800";

// ============================================
// Role Form
// ============================================

export const roleForm = {
  root: "space-y-4",
  label: "text-sm font-medium text-gray-700",
  checkboxGroup: "mt-2 space-y-2",
  checkboxItem: "flex items-start gap-2",
  checkbox: "mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500",
  checkboxLabel: "text-sm text-gray-700",
  description: "ml-1 text-gray-500",
};

// ============================================
// Form
// ============================================

export const form = {
  grid: "grid grid-cols-1 gap-6 md:grid-cols-2",
  field: "space-y-2",
  label: "block text-sm font-medium text-gray-900",
  input:
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  error: "text-sm text-red-500",
};
