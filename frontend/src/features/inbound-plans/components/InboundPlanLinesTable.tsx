/**
 * InboundPlanLinesTable - Lines table for inbound plan.
 * Refactored to use DataTable component.
 */
import { FileBarChart, MoreHorizontal, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";

interface InboundPlanLine {
  inbound_plan_line_id: number;
  supplier_item_id: number;
  product_name?: string;
  product_code?: string;
  planned_quantity: string;
  warehouse_id?: number;
  warehouse_name?: string;
  notes?: string;
  line_number?: number;
}

interface InboundPlanLinesTableProps {
  lines: InboundPlanLine[];
}

const INBOUND_PLAN_COLUMNS: Column<InboundPlanLine>[] = [
  {
    id: "line_number",
    header: "行番号",
    accessor: (row) => row.line_number || row.inbound_plan_line_id,
    width: 100,
    sortable: true,
  },
  {
    id: "product",
    header: "製品",
    accessor: (row) => row.product_name || row.product_code || `ID: ${row.supplier_item_id}`,
    width: 200,
    sortable: true,
  },
  {
    id: "planned_quantity",
    header: "数量",
    accessor: (row) => row.planned_quantity,
    cell: (row) => <span className="font-medium">{row.planned_quantity}</span>,
    width: 100,
    sortable: true,
  },
  {
    id: "warehouse",
    header: "倉庫",
    accessor: (row) => row.warehouse_name || (row.warehouse_id ? `ID: ${row.warehouse_id}` : "-"),
    width: 150,
    sortable: true,
  },
  {
    id: "notes",
    header: "備考",
    accessor: (row) => row.notes || "",
    cell: (row) => <span className="text-gray-600">{row.notes || "-"}</span>,
    width: 200,
  },
];

function InboundPlanRowActions({
  line,
  onOpenForecast,
  onOpenInventory,
}: {
  line: InboundPlanLine;
  onOpenForecast: (supplierItemId: number) => void;
  onOpenInventory: (supplierItemId: number, warehouseId: number) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">メニューを開く</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onOpenForecast(line.supplier_item_id)}>
          <FileBarChart className="mr-2 h-4 w-4" />
          需要予測を確認
        </DropdownMenuItem>
        {line.warehouse_id !== undefined && line.warehouse_id !== null && (
          <DropdownMenuItem
            onClick={() => onOpenInventory(line.supplier_item_id, line.warehouse_id as number)}
          >
            <Package className="mr-2 h-4 w-4" />
            在庫を確認
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InboundPlanLinesTable({ lines }: InboundPlanLinesTableProps) {
  const navigate = useNavigate();
  const openForecast = (supplierItemId: number) =>
    navigate(`${ROUTES.FORECASTS.LIST}?supplier_item_id=${supplierItemId}`);
  const openInventory = (supplierItemId: number, warehouseId: number) =>
    navigate(ROUTES.INVENTORY.ITEMS.DETAIL(supplierItemId, warehouseId));

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">明細一覧</h3>
        <div className="text-sm text-gray-600">{lines.length} 件の明細</div>
      </div>

      <DataTable
        data={lines}
        columns={INBOUND_PLAN_COLUMNS}
        getRowId={(row) => row.inbound_plan_line_id}
        rowActions={(line) => (
          <InboundPlanRowActions
            line={line}
            onOpenForecast={openForecast}
            onOpenInventory={openInventory}
          />
        )}
        emptyMessage="明細がありません"
      />
    </div>
  );
}
