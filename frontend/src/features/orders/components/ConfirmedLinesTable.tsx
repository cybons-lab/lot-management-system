/**
 * ConfirmedLinesTable - Table component for confirmed order lines.
 * Refactored to use DataTable component.
 */
import type { ConfirmedOrderLine } from "@/hooks/useConfirmedOrderLines";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";
import { formatDate } from "@/shared/utils/date";

interface ConfirmedLinesTableProps {
  lines: ConfirmedOrderLine[];
  selectedIds: number[];
  onToggle: (lineId: number) => void;
  onToggleAll: () => void;
}

const CONFIRMED_LINES_COLUMNS: Column<ConfirmedOrderLine>[] = [
  {
    id: "order_code",
    header: "受注番号",
    accessor: (row) => row.order_code,
    cell: (row) => (
      <span className="font-medium whitespace-nowrap text-slate-900">{row.order_code}</span>
    ),
    width: 150,
    sortable: true,
  },
  {
    id: "customer_name",
    header: "顧客名",
    accessor: (row) => row.customer_name,
    cell: (row) => (
      <span className="text-sm whitespace-nowrap text-slate-600">{row.customer_name}</span>
    ),
    width: 180,
    sortable: true,
  },
  {
    id: "product_code",
    header: "先方品番",
    accessor: (row) => row.product_code,
    cell: (row) => (
      <span className="font-mono text-sm whitespace-nowrap text-slate-900">{row.product_code}</span>
    ),
    width: 140,
    sortable: true,
  },
  {
    id: "product_name",
    header: "商品名",
    accessor: (row) => row.product_name,
    cell: (row) => (
      <span className="text-sm whitespace-nowrap text-slate-600">{row.product_name}</span>
    ),
    width: 200,
    sortable: true,
  },
  {
    id: "quantity",
    header: "数量",
    accessor: (row) => row.order_quantity,
    cell: (row) => (
      <span className="font-medium text-slate-900">
        {row.order_quantity} {row.unit}
      </span>
    ),
    width: 100,
    align: "right",
    sortable: true,
  },
  {
    id: "delivery_date",
    header: "納期",
    accessor: (row) => row.delivery_date,
    cell: (row) => <span className="text-sm text-slate-600">{formatDate(row.delivery_date)}</span>,
    width: 120,
    sortable: true,
  },
];

function handleLineSelectionChange({
  ids,
  selectedIds,
  lineCount,
  onToggle,
  onToggleAll,
}: {
  ids: (string | number)[];
  selectedIds: number[];
  lineCount: number;
  onToggle: (lineId: number) => void;
  onToggleAll: () => void;
}) {
  if (ids.length === 0 && selectedIds.length > 0) {
    onToggleAll();
    return;
  }
  if (ids.length === lineCount && selectedIds.length < lineCount) {
    onToggleAll();
    return;
  }

  const numericIds = ids.map((id) => Number(id));
  const added = numericIds.find((id) => !selectedIds.includes(id));
  const removed = selectedIds.find((id) => !numericIds.includes(id));
  if (added !== undefined) onToggle(added);
  else if (removed !== undefined) onToggle(removed);
}

export function ConfirmedLinesTable({
  lines,
  selectedIds,
  onToggle,
  onToggleAll,
}: ConfirmedLinesTableProps) {
  const handleSelectionChange = (ids: (string | number)[]) =>
    handleLineSelectionChange({
      ids,
      selectedIds,
      lineCount: lines.length,
      onToggle,
      onToggleAll,
    });

  return (
    <DataTable
      data={lines}
      columns={CONFIRMED_LINES_COLUMNS}
      selectable
      selectedIds={selectedIds}
      onSelectionChange={handleSelectionChange}
      getRowId={(row) => row.line_id}
      emptyMessage="確定済の受注明細がありません"
    />
  );
}
