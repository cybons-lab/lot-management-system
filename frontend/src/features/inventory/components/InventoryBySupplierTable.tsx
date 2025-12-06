import { Crown } from "lucide-react";

import type { InventoryBySupplierResponse } from "../types/InventoryAggregationTypes";

import { Badge } from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmt } from "@/shared/utils/number";

interface InventoryBySupplierTableProps {
  data: InventoryBySupplierResponse[];
  onRowClick?: (supplierCode: string) => void;
}

export function InventoryBySupplierTable({ data, onRowClick }: InventoryBySupplierTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>仕入先コード</TableHead>
            <TableHead>仕入先名</TableHead>
            <TableHead className="text-right">総在庫数</TableHead>
            <TableHead className="text-right">製品数</TableHead>
            <TableHead className="text-right">ロット数</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.supplier_id}
              className={onRowClick ? "hover:bg-muted/50 cursor-pointer" : ""}
              onClick={onRowClick ? () => onRowClick(row.supplier_code) : undefined}
            >
              <TableCell className="font-medium">
                <div className="max-w-[120px] truncate" title={row.supplier_code}>
                  {row.supplier_code}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="max-w-[200px] truncate" title={row.supplier_name}>
                    {row.supplier_name}
                  </span>
                  {row.is_primary_supplier && (
                    <Badge
                      variant="outline"
                      className="shrink-0 gap-1 border-amber-300 bg-amber-50 px-1 py-0 text-[10px] text-amber-600"
                    >
                      <Crown className="h-3 w-3" />
                      主担当
                    </Badge>
                  )}
                </div>
              </TableCell>
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
