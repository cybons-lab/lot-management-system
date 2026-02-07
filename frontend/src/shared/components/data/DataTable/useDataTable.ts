import {
  type ColumnDef,
  type ExpandedState,
  type OnChangeFn,
  type SortingState,
  type TableOptions,
  type TableState,
  type VisibilityState,
  type HeaderContext,
  type CellContext,
  type ColumnDefTemplate,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import * as React from "react";

import { type Column, type SortConfig } from "./types";

import { Checkbox } from "@/components/ui";

export interface UseDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  sort?: SortConfig;
  onSortChange?: (sort: SortConfig) => void;
  selectable?: boolean;
  selectedIds?: (string | number)[];
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  getRowId?: (row: T) => string | number;
  rowActions?: (row: T) => React.ReactNode;
  expandable?: boolean;
  expandMode?: "single" | "multi";
  expandedRowIds?: (string | number)[];
  onExpandedRowsChange?: (ids: (string | number)[]) => void;
  renderExpandedRow?: (row: T) => React.ReactNode;
  isRowSelectable?: (row: T) => boolean;
  enableVirtualization?: boolean;
  dense?: boolean;
  parentRef: React.RefObject<HTMLDivElement | null>;
}

const parseWidth = (w: string | number | undefined): number => {
  if (typeof w === "number") return w;
  if (typeof w === "string") return parseInt(w) || 150;
  return 150;
};

const createSelectColumn = <T>(): ColumnDef<T> => ({
  id: "__select",
  header: ({ table }: HeaderContext<T, unknown>) =>
    React.createElement(Checkbox, {
      checked: table.getIsAllRowsSelected(),
      indeterminate: table.getIsSomeRowsSelected(),
      onCheckedChange: (v) => table.toggleAllRowsSelected(!!v),
      "aria-label": "すべて選択",
    }),
  cell: ({ row }: CellContext<T, unknown>) =>
    React.createElement(Checkbox, {
      checked: row.getIsSelected(),
      onCheckedChange: (v) => row.toggleSelected(!!v),
      onClick: (e) => e.stopPropagation(),
      disabled: !row.getCanSelect(),
      "aria-label": "行を選択",
    }),
  size: 48,
  enableResizing: false,
  enableHiding: false,
  meta: { sticky: "left" },
});

const createExpandColumn = <T>(): ColumnDef<T> => ({
  id: "__expander",
  header: () => null,
  cell: ({ row }: CellContext<T, unknown>) =>
    React.createElement(
      row.getCanExpand() ? "button" : "div",
      row.getCanExpand()
        ? {
            type: "button",
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              row.toggleExpanded();
            },
            className:
              "flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-slate-100",
            "aria-label": row.getIsExpanded() ? "折りたたむ" : "展開する",
          }
        : { className: "w-8" },
      row.getCanExpand()
        ? React.createElement(row.getIsExpanded() ? ChevronDown : ChevronRight, {
            className: "h-4 w-4 text-slate-600",
          })
        : null,
    ),
  size: 40,
  enableResizing: false,
  enableHiding: false,
  meta: { sticky: "left" },
});

function createTableColumns<T>(
  selectable: boolean | undefined,
  expandable: boolean | undefined,
  columns: Column<T>[],
  rowActions: ((row: T) => React.ReactNode) | undefined,
): ColumnDef<T>[] {
  const defs: ColumnDef<T>[] = [];

  if (selectable) defs.push(createSelectColumn<T>());
  if (expandable) defs.push(createExpandColumn<T>());

  columns.forEach((col) => {
    let header: ColumnDefTemplate<HeaderContext<T, unknown>> | undefined;
    if (typeof col.header === "string" || typeof col.header === "function") {
      header = col.header as any;
    } else {
      header = () => col.header;
    }

    const common = {
      id: col.id,
      header,
      cell: (info: CellContext<T, unknown>) =>
        col.cell ? col.cell(info.row.original) : (info.getValue() as React.ReactNode),
      size: parseWidth(col.width),
      minSize: col.minWidth ? parseWidth(col.minWidth) : undefined,
      enableSorting: col.sortable,
      enableHiding: col.enableHiding ?? true,
      meta: { align: col.align, className: col.className, sticky: col.sticky },
    };

    if (col.accessor) {
      defs.push({
        ...common,
        accessorFn: (row: T) => col.accessor!(row),
      } as ColumnDef<T>);
    } else {
      defs.push({
        ...common,
      } as ColumnDef<T>);
    }
  });

  if (rowActions) {
    defs.push({
      id: "__actions",
      header: "アクション",
      cell: ({ row }: CellContext<T, unknown>) =>
        React.createElement(
          "div",
          { onClickCapture: (e) => e.stopPropagation() },
          rowActions(row.original),
        ),
      size: 180,
      enableResizing: false,
      enableHiding: false,
      meta: { align: "right" },
    });
  }
  return defs;
}

interface UseTableOptionsParams<T> {
  props: UseDataTableProps<T>;
  state: Partial<TableState>;
  handlers: {
    setColumnVisibility: OnChangeFn<VisibilityState>;
    onSortingChange: OnChangeFn<SortingState>;
    onRowSelectionChange: OnChangeFn<Record<string, boolean>>;
    onExpandedChange: OnChangeFn<ExpandedState>;
  };
}

function useTableOptions<T>({ props, state, handlers }: UseTableOptionsParams<T>): TableOptions<T> {
  const {
    data,
    isRowSelectable,
    getRowId,
    expandable,
    renderExpandedRow,
    columns,
    selectable,
    rowActions,
  } = props;

  const tableColumns = useMemo(
    () => createTableColumns<T>(selectable, expandable, columns, rowActions),
    [selectable, expandable, columns, rowActions],
  );

  return {
    data,
    columns: tableColumns,
    state: state as TableState,
    columnResizeMode: "onChange",
    onColumnVisibilityChange: handlers.setColumnVisibility,
    enableRowSelection: isRowSelectable ? (row) => isRowSelectable(row.original) : true,
    getRowId: (row) => String(getRowId ? getRowId(row) : (row as any)["id"]),
    getRowCanExpand: () => !!expandable && !!renderExpandedRow,
    onSortingChange: handlers.onSortingChange,
    onRowSelectionChange: handlers.onRowSelectionChange,
    onExpandedChange: handlers.onExpandedChange,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualSorting: true,
  };
}

export function useDataTable<T>(props: UseDataTableProps<T>) {
  const {
    sort,
    onSortChange,
    selectedIds = [],
    onSelectionChange,
    expandMode,
    expandedRowIds = [],
    onExpandedRowsChange,
    enableVirtualization,
    dense,
    parentRef,
    data,
  } = props;

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const sorting = useMemo<SortingState>(
    () => (sort ? [{ id: sort.column, desc: sort.direction === "desc" }] : []),
    [sort],
  );

  const rowSelection = useMemo(() => {
    const s: Record<string, boolean> = {};
    selectedIds.forEach((id) => (s[String(id)] = true));
    return s;
  }, [selectedIds]);

  const expandedState = useMemo<ExpandedState>(() => {
    const s: Record<string, boolean> = {};
    expandedRowIds.forEach((id) => (s[String(id)] = true));
    return s;
  }, [expandedRowIds]);

  const onSortingChange: OnChangeFn<SortingState> = (updater) => {
    if (!onSortChange) return;
    const next = typeof updater === "function" ? updater(sorting) : updater;
    if (next.length > 0)
      onSortChange({ column: next[0]!.id, direction: next[0]!.desc ? "desc" : "asc" });
  };

  const onRowSelectionChange: OnChangeFn<Record<string, boolean>> = (up) => {
    if (!onSelectionChange) return;
    const next = typeof up === "function" ? up(rowSelection) : up;
    onSelectionChange(Object.keys(next).filter((id) => next[id]));
  };

  const onExpandedChange: OnChangeFn<ExpandedState> = (up) => {
    if (!onExpandedRowsChange) return;
    const next = typeof up === "function" ? up(expandedState) : up;
    if (typeof next === "boolean") onExpandedRowsChange([]);
    else {
      const ids = Object.keys(next).filter((id) => next[id]);
      if (expandMode === "single" && ids.length > 1) {
        const added = ids.find((id) => !new Set(expandedRowIds.map(String)).has(id));
        onExpandedRowsChange(added ? [added] : [ids[0]!]);
      } else onExpandedRowsChange(ids);
    }
  };

  const state = {
    sorting,
    rowSelection,
    expanded: expandedState,
    columnVisibility,
    pagination: { pageIndex: 0, pageSize: data.length },
    columnFilters: [],
    globalFilter: undefined,
    columnPinning: {},
    rowPinning: {},
    columnOrder: [],
  };

  const handlers = {
    setColumnVisibility,
    onSortingChange,
    onRowSelectionChange,
    onExpandedChange,
  };
  const table = useReactTable(useTableOptions({ props, state, handlers }));

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (dense ? 40 : 72),
    overscan: 10,
    enabled: !!enableVirtualization,
  });

  return { table, rowVirtualizer };
}
