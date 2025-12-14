import type { InventoryByProductResponse } from "../types/InventoryAggregationTypes";

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

interface InventoryByProductTableProps {
  data: InventoryByProductResponse[];
  onRowClick?: (productCode: string) => void;
  onViewDetail?: (productId: number) => void;
}

export function InventoryByProductTable({
  data,
  onRowClick,
  onViewDetail,
}: InventoryByProductTableProps) {
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
            <TableHead className="text-right">アクション</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.product_id}
              className={onRowClick ? "hover:bg-muted/50 cursor-pointer" : ""}
              onClick={onRowClick ? () => onRowClick(row.product_code) : undefined}
            >
              <TableCell className="font-medium">
                <div className="max-w-[150px] truncate" title={row.product_code}>
                  {row.product_code}
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-[200px] truncate" title={row.product_name}>
                  {row.product_name}
                </div>
              </TableCell>
              <TableCell className="text-right font-mono">{fmt(row.total_quantity)}</TableCell>
              <TableCell className="text-right font-mono">{fmt(row.allocated_quantity)}</TableCell>
              <TableCell className="text-right font-mono">{fmt(row.available_quantity)}</TableCell>
              <TableCell className="text-right font-mono">{row.warehouse_count}</TableCell>
              <TableCell className="text-right font-mono">{row.lot_count}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetail?.(row.product_id);
                  }}
                >
                  詳細
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                データがありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
