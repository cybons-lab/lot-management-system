import type { InventoryByWarehouseResponse } from "../types/InventoryAggregationTypes";

import { Button } from "@/components/ui";
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
  onRowClick?: (warehouseCode: string) => void;
  onViewDetail?: (warehouseId: number) => void;
}

export function InventoryByWarehouseTable({
  data,
  onRowClick,
  onViewDetail,
}: InventoryByWarehouseTableProps) {
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
            <TableHead className="text-right">アクション</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.warehouse_id}
              className={onRowClick ? "hover:bg-muted/50 cursor-pointer" : ""}
              onClick={onRowClick ? () => onRowClick(row.warehouse_code) : undefined}
            >
              <TableCell className="font-medium">
                <div className="max-w-[120px] truncate" title={row.warehouse_code}>
                  {row.warehouse_code}
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-[200px] truncate" title={row.warehouse_name}>
                  {row.warehouse_name}
                </div>
              </TableCell>
              <TableCell className="text-right font-mono">{fmt(row.total_quantity)}</TableCell>
              <TableCell className="text-right font-mono">{row.product_count}</TableCell>
              <TableCell className="text-right font-mono">{row.lot_count}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetail?.(row.warehouse_id);
                  }}
                >
                  詳細
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                データがありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
