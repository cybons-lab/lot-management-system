import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

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
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        "border-l-4",
        colorClass
      )}>
      <div className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium tracking-tight text-muted-foreground">
          {title}
        </h3>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="p-4 pt-0">
        <div className="text-3xl font-bold">{value}</div>
      </div>
    </div>
  );
}
