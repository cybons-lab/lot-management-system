import { cva } from "class-variance-authority";

export const root = "space-y-6";

export const actionBar = "flex items-center justify-end gap-2";

export const statsGrid = "grid grid-cols-2 gap-4 sm:grid-cols-4";

export const statsCard = cva(
  "group rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm transition-all duration-200 hover:shadow-md",
  {
    variants: {
      variant: {
        default: "",
        active: "border-blue-200/80 ring-2 ring-inset ring-blue-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export const statsLabel = "text-sm font-semibold text-slate-600";

export const statsValue = cva("mt-2 text-3xl font-bold", {
  variants: {
    color: {
      default: "text-slate-900",
      blue: "text-blue-600",
    },
  },
  defaultVariants: {
    color: "default",
  },
});

export const errorState = {
  root: "rounded-lg border border-red-100 bg-red-50/70 p-6 text-center shadow-sm",
  title: "text-sm font-semibold text-red-900",
  message: "mt-2 text-xs text-red-700",
  retryButton: "mt-4 border-red-300 text-red-700 hover:bg-red-100",
};

export const filterGrid = "grid grid-cols-1 gap-4 md:grid-cols-3";

export const checkboxGroup = "flex items-center space-x-2 rounded-md bg-slate-50 px-3 py-2";
export const checkbox = "h-4 w-4 rounded border-slate-300 text-blue-600";
export const checkboxLabel = "text-sm font-medium text-slate-700";

export const detailGrid = {
  root: "grid gap-4 md:grid-cols-2",
  item: "",
  label: "text-sm font-medium text-gray-500",
  value: "mt-1 text-base",
};

export const table = {
  container: "overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm",
  root: "w-full",
  thead: "border-b bg-slate-50",
  th: "px-4 py-3 text-left text-sm font-semibold text-slate-700",
  thRight: "px-4 py-3 text-right text-sm font-semibold text-slate-700",
  tbody: "divide-y divide-slate-200",
  tr: "hover:bg-slate-50",
  td: "px-4 py-3 text-sm",
  tdRight: "px-4 py-3 text-right text-sm font-semibold",
  tdRightYellow: "px-4 py-3 text-right text-sm text-amber-600",
  tdRightGreen: "px-4 py-3 text-right text-sm font-semibold text-green-600",
  tdGray: "px-4 py-3 text-sm text-slate-600",
};

export const filterCard = "rounded-lg border border-slate-200 bg-white/90 p-4 shadow-sm";
