// frontend/src/components/ui/badge.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  // 必要なら拡張用（任意）
  | "success"
  | "warning"
  | "info";

type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  destructive: "bg-destructive text-destructive-foreground",
  outline: "border border-input text-foreground bg-transparent",
  // 拡張用（任意）
  success: "bg-emerald-500 text-white",
  warning: "bg-amber-500 text-white",
  info: "bg-sky-500 text-white",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs rounded",
  md: "px-2.5 py-0.5 text-sm rounded-md",
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "sm", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 font-medium whitespace-nowrap select-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";
export { Badge };
