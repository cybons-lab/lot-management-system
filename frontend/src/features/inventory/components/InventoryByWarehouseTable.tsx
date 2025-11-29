import type { InventoryByWarehouseResponse } from "../types/InventoryAggregationTypes";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmt } from "@/shared/utils/number";


interface InventoryByWarehouseTableProps {
  data: InventoryByWarehouseResponse[];
  onRowClick: (warehouseCode: string) => void;
}

export function InventoryByWarehouseTable({ data, onRowClick }: InventoryByWarehouseTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>倉庫コード</TableHead>
            <TableHead>倉庫名</TableHead>
            <TableHead className="text-right">総在庫数</TableHead>
            <TableHead className="text-right">製品数</TableHead>
            <TableHead className="text-right">ロット数</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.warehouse_id}
              className="hover:bg-muted/50 cursor-pointer"
              onClick={() => onRowClick(row.warehouse_code)}
            >
              <TableCell className="font-medium">{row.warehouse_code}</TableCell>
              <TableCell>{row.warehouse_name}</TableCell>
              <TableCell className="text-right font-mono">{fmt(row.total_quantity)}</TableCell>
              <TableCell className="text-right font-mono">{row.product_count}</TableCell>
              <TableCell className="text-right font-mono">{row.lot_count}</TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                データがありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
