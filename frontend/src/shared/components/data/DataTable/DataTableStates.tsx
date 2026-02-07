import { Skeleton } from "@/components/ui";
import { cn } from "@/shared/libs/utils";

interface DataTableLoadingProps {
    columnCount: number;
    dense?: boolean;
    className?: string;
}

export function DataTableLoading({ columnCount, dense, className }: DataTableLoadingProps) {
    return (
        <div className={cn("relative flex flex-col gap-2", className)} role="status" aria-live="polite">
            <div className="flex items-center justify-end"><Skeleton className="h-8 w-24 rounded-md" /></div>
            <div className="relative overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] shadow-[var(--shadow-soft)]">
                <table className="w-full" style={{ tableLayout: "fixed" }}>
                    <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-2))]">
                        <tr>
                            {Array.from({ length: columnCount }).map((_, i) => (
                                <th key={i} className={cn("px-6 py-4", dense && "px-2 py-2")}><Skeleton className="h-4 w-20 bg-slate-200" /></th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="border-b border-[hsl(var(--border))]/60 last:border-0">
                                {Array.from({ length: columnCount }).map((_, j) => (
                                    <td key={j} className={cn("px-6 py-4", dense && "px-2 py-2")}><Skeleton className="h-4 w-full" /></td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function DataTableEmpty({ message }: { message: string }) {
    return (
        <div className="flex items-center justify-center py-12" role="status">
            <p className="text-sm text-gray-500">{message}</p>
        </div>
    );
}
