/**
 * Products Page Styles (CVA)
 */
import { cva } from "class-variance-authority";

export const root = "space-y-6 px-6 py-6 md:px-8";
export const actionBar = "flex items-center gap-2";

export const statsGrid = "grid gap-4 md:grid-cols-2 lg:grid-cols-4";
export const statsCard = cva("rounded-lg border p-4", {
  variants: { variant: { blue: "border-blue-200 bg-blue-50" } },
  defaultVariants: { variant: "blue" },
});
export const statsLabel = "text-sm text-gray-500";
export const statsValue = cva("text-2xl font-bold", {
  variants: { color: { blue: "text-blue-600" } },
  defaultVariants: { color: "blue" },
});

export const tableContainer = "rounded-lg border bg-white shadow-sm";
export const tableHeader = "flex items-center justify-between border-b px-4 py-3";
export const tableTitle = "text-lg font-semibold";
export const tableActions = "flex items-center gap-2";
export const searchInput = "w-64";

export const form = {
  grid: "grid grid-cols-1 md:grid-cols-2 gap-4",
  field: "space-y-2",
  fieldFullWidth: "space-y-2 md:col-span-2",
  label: "text-sm font-medium text-gray-700",
  input: "w-full",
  error: "text-sm text-red-500",
};

export const emptyState = {
  container: "rounded-lg border bg-white p-8 text-center",
  title: "text-lg font-semibold text-gray-900",
  description: "mt-2 text-sm text-gray-500",
  action: "mt-4",
};
