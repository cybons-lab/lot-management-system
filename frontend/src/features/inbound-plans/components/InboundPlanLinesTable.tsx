/**
 * InboundPlanLinesTable - Lines table for inbound plan.
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

interface InboundPlanLine {
  inbound_plan_line_id: number;
  product_id: number;
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

function TableRow({ line }: { line: InboundPlanLine }) {
  const navigate = useNavigate();

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm">{line.line_number || line.inbound_plan_line_id}</td>
      <td className="px-4 py-3 text-sm">
        {line.product_name || line.product_code || `ID: ${line.product_id}`}
      </td>
      <td className="px-4 py-3 text-sm font-medium">{line.planned_quantity}</td>
      <td className="px-4 py-3 text-sm">
        {line.warehouse_name || (line.warehouse_id ? `ID: ${line.warehouse_id}` : "-")}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{line.notes || "-"}</td>
      <td className="px-4 py-3 text-right text-sm">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">メニューを開く</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => navigate(`${ROUTES.FORECASTS.LIST}?product_id=${line.product_id}`)}
            >
              <FileBarChart className="mr-2 h-4 w-4" />
              需要予測を確認
            </DropdownMenuItem>
            {line.warehouse_id && (
              <DropdownMenuItem
                onClick={() =>
                  navigate(ROUTES.INVENTORY.ITEMS.DETAIL(line.product_id, line.warehouse_id!))
                }
              >
                <Package className="mr-2 h-4 w-4" />
                在庫を確認
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

export function InboundPlanLinesTable({ lines }: InboundPlanLinesTableProps) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">明細一覧</h3>
        <div className="text-sm text-gray-600">{lines.length} 件の明細</div>
      </div>

      {lines.length === 0 ? (
        <div className="py-8 text-center text-gray-500">明細がありません</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">行番号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">製品</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">数量</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">倉庫</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">備考</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  アクション
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lines.map((line) => (
                <TableRow key={line.inbound_plan_line_id} line={line} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
