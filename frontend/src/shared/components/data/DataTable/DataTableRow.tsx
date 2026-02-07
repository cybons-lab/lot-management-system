import * as React from "react";
import { type Row, flexRender } from "@tanstack/react-table";
import { cn } from "@/shared/libs/utils";

interface DataTableRowProps<T> {
    row: Row<T>;
    dense?: boolean;
    striped?: boolean;
    onRowClick?: (row: T) => void;
    renderHoverActions?: (row: T) => React.ReactNode;
    renderExpandedRow?: (row: T) => React.ReactNode;
    getRowClassName?: (row: T) => string;
    measureElement?: (el: HTMLElement | null) => void;
}

export function DataTableRow<T>({
    row,
    dense,
    striped,
    onRowClick,
    renderHoverActions,
    renderExpandedRow,
    getRowClassName,
    measureElement,
}: DataTableRowProps<T>) {
    const customClassName = getRowClassName?.(row.original);

    return (
        <React.Fragment>
            <tr
                ref={measureElement}
                className={cn(
                    "relative transition-all duration-150 border-b border-slate-300 group",
                    row.index % 2 === 0 ? "bg-[hsl(var(--surface-1))]" : striped ? "bg-slate-50/50" : "bg-[hsl(var(--surface-2))]",
                    (onRowClick || renderHoverActions) && "hover:bg-slate-100/60",
                    onRowClick && "cursor-pointer focus-visible:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500",
                    row.getIsSelected() && "bg-blue-100/60 hover:bg-blue-100/70",
                    customClassName
                )}
                onClick={() => onRowClick?.(row.original)}
            >
                {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as { align?: string; className?: string; sticky?: string } | undefined;
                    const isSticky = meta?.sticky === "left";
                    const startOffset = isSticky ? cell.column.getStart() : 0;
                    return (
                        <td
                            key={cell.id}
                            className={cn(
                                "overflow-hidden text-sm text-slate-800 border-r border-slate-200/40 last:border-r-0",
                                dense ? "px-2 py-1.5" : "px-6 py-4",
                                "first:pl-4",
                                meta?.align === "center" && "text-center",
                                meta?.align === "right" && "text-right",
                                isSticky && "sticky z-10 bg-[hsl(var(--surface-1))] group-hover:bg-slate-100/60 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
                                isSticky && row.getIsSelected() && "bg-blue-100/90 hover:bg-blue-100/90",
                                meta?.className
                            )}
                            style={{ maxWidth: 0, left: isSticky ? `${startOffset}px` : undefined }}
                        >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                    );
                })}
                {renderHoverActions && (
                    <td className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:opacity-100">
                        <div className="pointer-events-auto flex gap-1 rounded-md border border-[hsl(var(--border))] bg-white/90 p-1.5 shadow-[var(--shadow-soft)]">
                            {renderHoverActions(row.original)}
                        </div>
                    </td>
                )}
            </tr>
            {row.getIsExpanded() && renderExpandedRow && (
                <tr className="border-l-4 border-l-blue-500 bg-blue-50/50">
                    <td colSpan={row.getVisibleCells().length} className="p-0">
                        <div className="border-t border-slate-200 px-4 py-1.5">{renderExpandedRow(row.original)}</div>
                    </td>
                </tr>
            )}
        </React.Fragment>
    );
}
