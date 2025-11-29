import type { InventoryByProductResponse } from "../types/InventoryAggregationTypes";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmt } from "@/shared/utils/number";

interface InventoryByProductTableProps {
  data: InventoryByProductResponse[];
  onRowClick: (productCode: string) => void;
}

export function InventoryByProductTable({ data, onRowClick }: InventoryByProductTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>製品コード</TableHead>
            <TableHead>製品名</TableHead>
            <TableHead className="text-right">総在庫数</TableHead>
            <TableHead className="text-right">引当済</TableHead>
            <TableHead className="text-right">有効在庫</TableHead>
            <TableHead className="text-right">倉庫数</TableHead>
            <TableHead className="text-right">ロット数</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.product_id}
              className="hover:bg-muted/50 cursor-pointer"
              onClick={() => onRowClick(row.product_code)}
            >
              <TableCell className="font-medium">{row.product_code}</TableCell>
              <TableCell>{row.product_name}</TableCell>
              <TableCell className="text-right font-mono">{fmt(row.total_quantity)}</TableCell>
              <TableCell className="text-right font-mono">{fmt(row.allocated_quantity)}</TableCell>
              <TableCell className="text-right font-mono">{fmt(row.available_quantity)}</TableCell>
              <TableCell className="text-right font-mono">{row.warehouse_count}</TableCell>
              <TableCell className="text-right font-mono">{row.lot_count}</TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                データがありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
