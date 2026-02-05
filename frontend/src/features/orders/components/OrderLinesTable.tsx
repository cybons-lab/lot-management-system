import { Button } from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusBadge } from "@/shared/components/data/StatusBadge";
import type { OrderLine, OrderWithLinesResponse } from "@/shared/types/aliases";
import { formatDate } from "@/shared/utils/date";
import { formatQuantity } from "@/shared/utils/formatQuantity";

interface OrderLinesTableProps {
  order: OrderWithLinesResponse;
  onSelectLine: (line: OrderLine) => void;
}

function OrderLineRow({
  line,
  index,
  onSelectLine,
}: {
  line: OrderLine;
  index: number;
  onSelectLine: (line: OrderLine) => void;
}) {
  return (
    <TableRow key={line.id}>
      <TableCell>{index + 1}</TableCell>
      <TableCell>
        <div className="font-medium">{line.product_name}</div>
        <div className="text-xs text-slate-500">{line.product_code}</div>
        {line.shipping_document_text && (
          <div className="mt-1 text-xs text-slate-600">
            <span className="font-medium">出荷表:</span> {line.shipping_document_text}
          </div>
        )}
      </TableCell>
      <TableCell>{line.delivery_place_name}</TableCell>
      <TableCell>
        {line.customer_order_no ? (
          <div>
            <span className="font-medium">{line.customer_order_no}</span>
            {line.customer_order_line_no && (
              <span className="text-xs text-slate-500">-{line.customer_order_line_no}</span>
            )}
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </TableCell>
      <TableCell>
        {line.sap_order_no ? (
          <div>
            <span className="font-medium">{line.sap_order_no}</span>
            {line.sap_order_item_no && (
              <span className="text-xs text-slate-500">/{line.sap_order_item_no}</span>
            )}
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </TableCell>
      <TableCell>
        {formatQuantity(Number(line.order_quantity), line.unit)} {line.unit}
      </TableCell>
      <TableCell>{formatDate(line.delivery_date)}</TableCell>
      <TableCell>
        <OrderStatusBadge status={line.status} />
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatQuantity(Number(line.allocated_quantity ?? 0), line.unit)}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="outline" size="sm" onClick={() => onSelectLine(line)}>
          引当操作
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function OrderLinesTable({ order, onSelectLine }: OrderLinesTableProps) {
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold text-slate-900">受注明細</h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>行No</TableHead>
            <TableHead>商品</TableHead>
            <TableHead>納入先</TableHead>
            <TableHead>得意先受注No</TableHead>
            <TableHead>SAP受注No</TableHead>
            <TableHead>数量</TableHead>
            <TableHead>納期</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead className="text-right">引当済</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.lines?.map((line, index) => (
            <OrderLineRow key={line.id} line={line} index={index} onSelectLine={onSelectLine} />
          ))}
          {(!order.lines || order.lines.length === 0) && (
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center text-slate-500">
                明細がありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
