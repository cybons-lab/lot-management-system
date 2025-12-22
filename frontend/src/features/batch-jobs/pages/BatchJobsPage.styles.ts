import { cva } from "class-variance-authority";

export const header = {
  root: "",
  title: "text-3xl font-bold tracking-tight",
  description: "mt-1 text-gray-600",
};

export const filter = {
  root: "rounded-lg border bg-white p-4",
  container: "flex items-center gap-4",
  label: "text-sm font-medium",
  select: "rounded-md border px-3 py-2 text-sm",
};

export const loadingState = "rounded-lg border bg-white p-8 text-center text-gray-500";

export const errorState = "rounded-lg border border-red-300 bg-red-50 p-4 text-red-600";

export const emptyState = "rounded-lg border bg-white p-8 text-center text-gray-500";

export const content = {
  root: "space-y-4",
  info: "text-sm text-gray-600",
};

export const table = {
  container: "overflow-x-auto rounded-lg border bg-white",
  root: "w-full",
  thead: "border-b bg-gray-50",
  th: "px-4 py-3 text-left text-sm font-medium text-gray-700",
  tbody: "divide-y",
  tr: "hover:bg-gray-50",
  td: "px-4 py-3 text-sm",
  tdMedium: "px-4 py-3 text-sm font-medium",
  tdGray: "px-4 py-3 text-sm text-gray-600",
};

export const jobTypeBadge =
  "inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800";

export const statusBadge = cva("inline-flex rounded-full px-2 py-1 text-xs font-semibold", {
  variants: {
    status: {
      pending: "bg-yellow-100 text-yellow-800",
      running: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      unknown: "bg-gray-100 text-gray-800",
    },
  },
  defaultVariants: {
    status: "unknown",
  },
});

export const actionButtons = "flex gap-2";
