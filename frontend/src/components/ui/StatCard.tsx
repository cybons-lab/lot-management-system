import { type LucideIcon } from "lucide-react";

import { cn } from "@/shared/libs/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorClass?: string; // Tailwindの色クラス (e.g., "border-green-500")
}

export function StatCard({
  title,
  value,
  icon: Icon,
  colorClass = "border-blue-500",
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground rounded-lg border shadow-sm",
        "border-l-4",
        colorClass,
      )}
    >
      <div className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <h3 className="text-muted-foreground text-sm font-medium tracking-tight">{title}</h3>
        <Icon className="text-muted-foreground h-4 w-4" />
      </div>
      <div className="p-4 pt-0">
        <div className="text-3xl font-bold">{value}</div>
      </div>
    </div>
  );
}
