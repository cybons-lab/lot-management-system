import { cva } from "class-variance-authority";

export const container = "space-y-6";

export const header = {
  root: "space-y-6",
  title: "text-3xl font-bold tracking-tight",
  description: "text-muted-foreground",
};

export const grid = "grid gap-4 md:grid-cols-2 lg:grid-cols-3";

export const errorState = {
  root: "border-destructive bg-destructive/10 rounded-lg border p-4",
  text: "text-destructive",
};

export const statCard = {
  root: cva("bg-card text-card-foreground rounded-lg border-l-4 p-6 shadow-sm", {
    variants: {
      color: {
        blue: "border-blue-500",
        green: "border-green-500",
        amber: "border-amber-500",
        purple: "border-purple-500",
        gray: "border-gray-300",
      },
    },
    defaultVariants: {
      color: "gray",
    },
  }),
  content: "flex flex-col space-y-1.5",
  title: "text-muted-foreground text-sm font-medium",
  value: "text-2xl font-bold",
  description: "text-muted-foreground text-xs",
};

export const skeleton = {
  root: "bg-card text-card-foreground animate-pulse rounded-lg border border-l-4 border-gray-300 p-6 shadow-sm",
  content: "flex flex-col space-y-1.5",
  title: "bg-muted h-4 w-24 rounded",
  value: "bg-muted h-8 w-16 rounded",
};

export const activity = {
  root: "bg-card rounded-lg border p-6",
  title: "mb-4 text-lg font-semibold",
  text: "text-muted-foreground text-sm",
};
