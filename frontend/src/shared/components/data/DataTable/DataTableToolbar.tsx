import { type Table } from "@tanstack/react-table";
import { Settings2 } from "lucide-react";
import {
    Button,
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui";

interface DataTableToolbarProps<T> {
    table: Table<T>;
    headerSlot?: React.ReactNode;
}

export function DataTableToolbar<T>({ table, headerSlot }: DataTableToolbarProps<T>) {
    return (
        <div className="flex items-center justify-between py-2 mb-2">
            <div className="flex items-center gap-4">
                {headerSlot}
                <span className="text-sm text-slate-600">
                    {table.getFilteredRowModel().rows.length}件のデータ
                </span>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="ml-auto h-8 hover:bg-slate-50 bg-gray-50">
                        <Settings2 className="h-4 w-4 lg:mr-2" />
                        <span className="hidden lg:inline">表示列</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[150px]">
                    <DropdownMenuLabel>表示列を選択</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {table.getAllColumns()
                        .filter((col) => typeof col.accessorFn !== "undefined" && col.getCanHide())
                        .map((col) => (
                            <DropdownMenuCheckboxItem
                                key={col.id}
                                className="capitalize"
                                checked={col.getIsVisible()}
                                onCheckedChange={(v) => col.toggleVisibility(!!v)}
                            >
                                {col.columnDef.header as string}
                            </DropdownMenuCheckboxItem>
                        ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
