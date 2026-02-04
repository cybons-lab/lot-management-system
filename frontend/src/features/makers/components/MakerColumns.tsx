import { Pencil, Trash2 } from "lucide-react";

import { type Maker } from "../api";

import { Button } from "@/components/ui";
import type { Column } from "@/shared/components/data/DataTable";
import { formatDate } from "@/shared/utils/date";

export interface MakerColumnsOptions {
  onEdit: (row: Maker) => void;
  onDelete: (row: Maker) => void;
}

export function createMakerColumns(options: MakerColumnsOptions): Column<Maker>[] {
  const { onEdit, onDelete } = options;

  return [
    {
      id: "maker_code",
      header: "メーカーコード",
      cell: (row) => (
        <span className="font-mono text-sm font-medium whitespace-nowrap text-slate-900">
          {row.maker_code}
        </span>
      ),
      sortable: true,
      width: "150px",
    },
    {
      id: "maker_name",
      header: "メーカー名",
      cell: (row) => <span className="whitespace-nowrap text-slate-900">{row.maker_name}</span>,
      sortable: true,
      width: "250px",
    },
    {
      id: "display_name",
      header: "表示名",
      cell: (row) => (
        <span className="whitespace-nowrap text-slate-600">{row.display_name || "-"}</span>
      ),
      sortable: true,
      width: "200px",
    },
    {
      id: "short_name",
      header: "略称",
      cell: (row) => (
        <span className="whitespace-nowrap text-slate-600">{row.short_name || "-"}</span>
      ),
      sortable: true,
      width: "120px",
    },
    {
      id: "updated_at",
      header: "更新日時",
      cell: (row) => (
        <span className="text-sm whitespace-nowrap text-slate-500">
          {formatDate(row.updated_at)}
        </span>
      ),
      sortable: true,
      width: "150px",
    },
    {
      id: "actions",
      header: "操作",
      cell: (row) => (
        <div
          className="flex gap-1"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <Button variant="ghost" size="sm" onClick={() => onEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(row)}>
            <Trash2 className="text-destructive h-4 w-4" />
          </Button>
        </div>
      ),
      width: "100px",
    },
  ];
}
