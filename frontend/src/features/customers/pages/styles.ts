/**
 * Customers Page Styles
 * CVA + Tailwind クラス定義
 */

import { cva } from "class-variance-authority";

// ============================================
// Layout
// ============================================

export const root = "space-y-6";

export const actionBar = "flex items-center justify-end gap-2";

export const statsGrid = "mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4";

// ============================================
// Stats Card
// ============================================

export const statsCard = cva(
  "group rounded-xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md",
  {
    variants: {
      variant: {
        default: "border-gray-200 hover:border-gray-300",
        blue: "border-t border-r border-b border-l-4 border-gray-200 border-l-blue-500",
        green: "border-t border-r border-b border-l-4 border-gray-200 border-l-green-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export const statsLabel = "text-sm font-medium text-gray-600";

export const statsValue = cva("mt-2 text-3xl font-bold", {
  variants: {
    color: {
      default: "text-gray-900",
      blue: "text-blue-600",
      green: "text-green-600",
    },
  },
  defaultVariants: {
    color: "default",
  },
});

// ============================================
// Table Container
// ============================================

export const tableContainer = "rounded-lg border bg-white shadow-sm";

export const tableHeader = "flex items-center justify-between border-b px-4 py-3";

export const tableTitle = "text-lg font-semibold text-gray-900";

export const tableActions = "flex items-center gap-2";

// ============================================
// Filter
// ============================================

export const filterGrid = "grid grid-cols-2 gap-3";

export const searchInput = "w-64";

// ============================================
// Dialog
// ============================================

export const dialog = {
  content: "sm:max-w-lg",
  header: "space-y-1",
  title: "text-lg font-semibold",
  description: "text-sm text-gray-500",
  body: "space-y-4",
  footer: "flex justify-end gap-2",
};

// ============================================
// Form
// ============================================

export const form = {
  grid: "grid gap-4",
  field: "space-y-2",
  label: "text-sm font-medium text-gray-700",
  input: "w-full",
  error: "text-sm text-red-600",
};

// ============================================
// Bulk Import
// ============================================

export const bulkImport = {
  dropzone:
    "rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-gray-400",
  dropzoneActive: "border-blue-500 bg-blue-50",
  icon: "mx-auto h-12 w-12 text-gray-400",
  fileInfo: "mt-4 flex items-center justify-center gap-2 text-sm text-gray-600",
  results: "mt-4 rounded-lg border bg-gray-50 p-4",
  resultItem: cva("flex items-center gap-2 text-sm", {
    variants: {
      status: {
        success: "text-green-600",
        error: "text-red-600",
      },
    },
  }),
  summary: "grid grid-cols-2 gap-2 text-sm",
  summaryLabel: "text-gray-600",
  summaryValue: "font-medium text-gray-900",
};

// ============================================
// Empty State
// ============================================

export const emptyState = {
  container: "flex flex-col items-center justify-center py-12",
  icon: "h-12 w-12 text-gray-400",
  title: "mt-4 text-lg font-medium text-gray-900",
  description: "mt-2 text-sm text-gray-500",
  action: "mt-4",
};

// ============================================
// Badge
// ============================================

export const badge = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-800",
        success: "bg-green-100 text-green-800",
        warning: "bg-yellow-100 text-yellow-800",
        error: "bg-red-100 text-red-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
