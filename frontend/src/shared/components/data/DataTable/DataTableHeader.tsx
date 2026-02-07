import * as React from "react";
import { type Table, flexRender } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/shared/libs/utils";

interface DataTableHeaderProps<T> {
    table: Table<T>;
    dense?: boolean;
    enableVirtualization?: boolean;
}

const SortIcon = ({ isSorted }: { isSorted: false | "asc" | "desc" }) => {
    if (!isSorted) return <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" aria-hidden="true" />;
    return isSorted === "asc" ? (
        <ArrowUp className="ml-1 h-4 w-4" aria-hidden="true" />
    ) : (
        <ArrowDown className="ml-1 h-4 w-4" aria-hidden="true" />
    );
};

export function DataTableHeader<T>({ table, dense, enableVirtualization }: DataTableHeaderProps<T>) {
    return (
        <thead className={cn("border-b-2 border-slate-300 bg-gray-50", enableVirtualization && "sticky top-0 z-10")}>
            {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                        const meta = header.column.columnDef.meta as { align?: string; className?: string; sticky?: string } | undefined;
                        const isSticky = meta?.sticky === "left";
                        const startOffset = isSticky ? header.column.getStart() : 0;

                        return (
                            <th
                                key={header.id}
                                role={header.column.getCanSort() ? "button" : "columnheader"}
                                className={cn(
                                    "relative bg-gray-50 text-left text-sm font-semibold text-slate-600 border-r border-slate-200/50 last:border-r-0",
                                    dense ? "px-2 py-1.5" : "px-6 py-4",
                                    "first:pl-4",
                                    meta?.align === "center" && "text-center",
                                    meta?.align === "right" && "text-right",
                                    header.column.getCanSort() && "cursor-pointer transition-colors select-none hover:bg-slate-100/70",
                                    isSticky && "sticky z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
                                    meta?.className
                                )}
                                style={{ width: header.getSize(), left: isSticky ? `${startOffset}px` : undefined }}
                                onClick={header.column.getToggleSortingHandler()}
                            >
                                <div className={cn("flex items-center gap-1 whitespace-nowrap", meta?.align === "right" && "justify-end", meta?.align === "center" && "justify-center")}>
                                    {flexRender(header.column.columnDef.header, header.getContext()) as React.ReactNode}
                                    {header.column.getCanSort() && <SortIcon isSorted={header.column.getIsSorted()} />}
                                </div>
                                {header.column.getCanResize() && (
                                    <div
                                        onMouseDown={(e) => { e.stopPropagation(); header.getResizeHandler()(e); }}
                                        onTouchStart={(e) => { e.stopPropagation(); header.getResizeHandler()(e); }}
                                        className={cn("absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none transition-all duration-200 select-none bg-transparent hover:w-2 hover:bg-blue-500", header.column.getIsResizing() && "w-2 bg-blue-600 shadow-lg")}
                                    />
                                )}
                            </th>
                        );
                    })}
                </tr>
            ))}
        </thead>
    );
}
