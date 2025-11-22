import { cva } from "class-variance-authority";

export const panelRoot = cva(
  "flex flex-col rounded-lg transition-all duration-300 ease-out border bg-white",
  {
    variants: {
      state: {
        inactive: "border-gray-200 bg-gray-50 opacity-60 grayscale-[0.3] hover:opacity-80",
        active:
          "border-blue-200 bg-white shadow-xl opacity-100 grayscale-0 scale-[1.01] z-10 ring-1 ring-blue-100",
        complete: "border-green-200 bg-white shadow-md opacity-90 hover:opacity-100",
        error: "border-red-200 bg-white shadow-md bg-red-50/10",
      },
    },
    defaultVariants: {
      state: "inactive",
    },
  },
);

export const panelHeader = "overflow-hidden rounded-t-lg";

export const panelBody = "flex-1 p-2 transition-colors duration-300";

export const panelWrapper = "relative outline-none";
