import * as React from "react";
import { useMemo, useState } from "react";
import {
    type ColumnDef,
    type ExpandedState,
    type SortingState,
    type VisibilityState,
    getCoreRowModel,
    getExpandedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Checkbox } from "@/components/ui";
import { ChevronDown, ChevronRight } from "lucide-react";
import { type Column, type SortConfig } from "../DataTable";

export interface UseDataTableProps<T> {
    data: T[]; columns: Column<T>[]; sort?: SortConfig; onSortChange?: (sort: SortConfig) => void;
    selectable?: boolean; selectedIds?: (string | number)[]; onSelectionChange?: (selectedIds: (string | number)[]) => void;
    getRowId?: (row: T) => string | number; rowActions?: (row: T) => React.ReactNode;
    expandable?: boolean; expandMode?: "single" | "multi"; expandedRowIds?: (string | number)[];
    onExpandedRowsChange?: (ids: (string | number)[]) => void; renderExpandedRow?: (row: T) => React.ReactNode;
    isRowSelectable?: (row: T) => boolean; enableVirtualization?: boolean; dense?: boolean; parentRef: React.RefObject<HTMLDivElement | null>;
}

const parseWidth = (w: any): number => typeof w === "number" ? w : parseInt(String(w)) || 150;

function createTableColumns<T>(props: any): ColumnDef<T>[] {
    const { selectable, expandable, columns, rowActions } = props;
    const defs: ColumnDef<T>[] = [];

    if (selectable) {
        defs.push({
            id: "__select",
            header: (({ table }: any) => React.createElement(Checkbox, { checked: table.getIsAllRowsSelected(), indeterminate: table.getIsSomeRowsSelected(), onCheckedChange: (v: any) => table.toggleAllRowsSelected(!!v), "aria-label": "すべて選択" })) as any,
            cell: (({ row }: any) => React.createElement(Checkbox, { checked: row.getIsSelected(), onCheckedChange: (v: any) => row.toggleSelected(!!v), onClick: (e: any) => e.stopPropagation(), disabled: !row.getCanSelect(), "aria-label": "行を選択" })) as any,
            size: 48, enableResizing: false, enableHiding: false, meta: { sticky: "left" },
        });
    }

    if (expandable) {
        defs.push({
            id: "__expander",
            header: () => null,
            cell: (({ row }: any) => row.getCanExpand() ? React.createElement("button", { type: "button", onClick: (e: any) => { e.stopPropagation(); row.toggleExpanded(); }, className: "flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-slate-100", "aria-label": row.getIsExpanded() ? "折りたたむ" : "展開する" }, row.getIsExpanded() ? React.createElement(ChevronDown, { className: "h-4 w-4 text-slate-600" }) : React.createElement(ChevronRight, { className: "h-4 w-4 text-slate-600" })) : null) as any,
            size: 40, enableResizing: false, enableHiding: false, meta: { sticky: "left" },
        });
    }

    columns.forEach((col: any) => {
        defs.push({
            id: col.id, header: col.header as any,
            ...(col.accessor ? { accessorFn: (row: T) => col.accessor!(row) } : {}),
            cell: (info) => (col.cell ? col.cell(info.row.original) : (info.getValue() as React.ReactNode)),
            size: parseWidth(col.width), minSize: col.minWidth ? parseWidth(col.minWidth) : undefined,
            enableSorting: col.sortable, enableHiding: col.enableHiding ?? true,
            meta: { align: col.align, className: col.className, sticky: col.sticky },
        });
    });

    if (rowActions) {
        defs.push({
            id: "__actions", header: "アクション",
            cell: (({ row }: any) => React.createElement("div", { onClickCapture: (e: any) => e.stopPropagation() }, rowActions(row.original))) as any,
            size: 180, enableResizing: false, enableHiding: false, meta: { align: "right" },
        });
    }

    return defs;
}

export function useDataTable<T>(props: UseDataTableProps<T>) {
    const { data, sort, onSortChange, selectedIds = [], onSelectionChange, getRowId = (row: T) => (row as any)["id"], expandable, expandMode, expandedRowIds = [], onExpandedRowsChange, renderExpandedRow, isRowSelectable, enableVirtualization, dense, parentRef } = props;
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const tableColumns = useMemo(() => createTableColumns<T>(props), [props.columns, props.selectable, props.expandable, props.rowActions]);
    const sorting = useMemo<SortingState>(() => (sort ? [{ id: sort.column, desc: sort.direction === "desc" }] : []), [sort]);
    const rowSelection = useMemo(() => {
        const s: Record<string, boolean> = {};
        selectedIds.forEach((id) => { s[String(id)] = true; });
        return s;
    }, [selectedIds]);
    const expandedState = useMemo<ExpandedState>(() => {
        const s: Record<string, boolean> = {};
        expandedRowIds.forEach((id) => { s[String(id)] = true; });
        return s;
    }, [expandedRowIds]);

    const table = useReactTable({
        data, columns: tableColumns, state: { sorting, rowSelection, expanded: expandedState, columnVisibility },
        columnResizeMode: "onChange", onColumnVisibilityChange: setColumnVisibility,
        enableRowSelection: isRowSelectable ? (row) => isRowSelectable(row.original) : true,
        getRowId: (row) => String(getRowId(row)), getRowCanExpand: () => !!expandable && !!renderExpandedRow,
        onSortingChange: (updater) => {
            if (!onSortChange) return;
            const next = typeof updater === "function" ? updater(sorting) : updater;
            if (next.length > 0) onSortChange({ column: next[0].id, direction: next[0].desc ? "desc" : "asc" });
        },
        onRowSelectionChange: (up) => {
            if (!onSelectionChange) return;
            const next = typeof up === "function" ? up(rowSelection) : up;
            onSelectionChange(Object.keys(next).filter((id) => (next as any)[id]));
        },
        onExpandedChange: (up) => {
            if (!onExpandedRowsChange) return;
            const next = typeof up === "function" ? up(expandedState) : up;
            if (typeof next === "boolean") onExpandedRowsChange([]);
            else {
                const ids = Object.keys(next).filter((id) => (next as any)[id]);
                if (expandMode === "single" && ids.length > 1) {
                    const added = ids.find((id) => !new Set(expandedRowIds.map(String)).has(id));
                    onExpandedRowsChange(added ? [added] : [ids[0]]);
                } else onExpandedRowsChange(ids);
            }
        },
        getCoreRowModel: getCoreRowModel(), getExpandedRowModel: getExpandedRowModel(), manualSorting: true,
    });

    const rowVirtualizer = useVirtualizer({ count: table.getRowModel().rows.length, getScrollElement: () => parentRef.current, estimateSize: () => (dense ? 40 : 72), overscan: 10, enabled: !!enableVirtualization });
    return { table, rowVirtualizer };
}
