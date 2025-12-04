/**
 * ConfirmedLinesTable - Table component for confirmed order lines.
 */
import type { ConfirmedOrderLine } from "@/hooks/useConfirmedOrderLines";
import { formatDate } from "@/shared/utils/date";

interface TableHeaderProps {
  lines: ConfirmedOrderLine[];
  selectedIds: number[];
  onToggleAll: () => void;
}

function TableHeader({ lines, selectedIds, onToggleAll }: TableHeaderProps) {
  return (
    <thead className="bg-slate-50">
      <tr>
        <th className="w-12 px-4 py-3 text-left">
          <input
            type="checkbox"
            checked={lines.length > 0 && selectedIds.length === lines.length}
            onChange={onToggleAll}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-slate-700 uppercase">
          受注番号
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-slate-700 uppercase">
          顧客名
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-slate-700 uppercase">
          製品コード
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-slate-700 uppercase">
          製品名
        </th>
        <th className="px-4 py-3 text-right text-xs font-medium tracking-wide text-slate-700 uppercase">
          数量
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-slate-700 uppercase">
          納期
        </th>
      </tr>
    </thead>
  );
}

interface TableRowProps {
  line: ConfirmedOrderLine;
  isSelected: boolean;
  onToggle: (lineId: number) => void;
}

function TableRow({ line, isSelected, onToggle }: TableRowProps) {
  return (
    <tr className={`transition-colors hover:bg-slate-50 ${isSelected ? "bg-blue-50" : ""}`}>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(line.line_id)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
        />
      </td>
      <td className="px-4 py-3">
        <span className="font-medium text-slate-900">{line.order_number}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-600">{line.customer_name}</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-slate-900">{line.product_code}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-600">{line.product_name}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-medium text-slate-900">
          {line.order_quantity} {line.unit}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-600">{formatDate(line.delivery_date)}</span>
      </td>
    </tr>
  );
}

interface ConfirmedLinesTableProps {
  lines: ConfirmedOrderLine[];
  selectedIds: number[];
  onToggle: (lineId: number) => void;
  onToggleAll: () => void;
}

export function ConfirmedLinesTable({
  lines,
  selectedIds,
  onToggle,
  onToggleAll,
}: ConfirmedLinesTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full">
        <TableHeader lines={lines} selectedIds={selectedIds} onToggleAll={onToggleAll} />
        <tbody className="divide-y divide-slate-200">
          {lines.map((line) => (
            <TableRow
              key={line.line_id}
              line={line}
              isSelected={selectedIds.includes(line.line_id)}
              onToggle={onToggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
