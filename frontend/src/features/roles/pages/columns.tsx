import type { Role } from "../api";

import { Badge, Button } from "@/components/ui";
import type { Column } from "@/shared/components/data/DataTable";

interface RoleColumnsOptions {
  onDelete: (roleId: number) => void;
  isDeleting?: boolean;
}

export function createRoleColumns({
  onDelete,
  isDeleting = false,
}: RoleColumnsOptions): Column<Role>[] {
  return [
    {
      id: "id",
      header: "ロールID",
      cell: (row) => <span className="font-medium">{row.id}</span>,
      sortable: true,
      width: 100,
    },
    {
      id: "role_code",
      header: "ロールコード",
      cell: (row) => (
        <Badge variant="secondary" className="font-semibold uppercase">
          {row.role_code}
        </Badge>
      ),
      sortable: true,
      width: 150,
    },
    {
      id: "role_name",
      header: "ロール名",
      cell: (row) => <span className="whitespace-nowrap">{row.role_name}</span>,
      sortable: true,
      width: 150,
    },
    {
      id: "description",
      header: "説明",
      cell: (row) =>
        row.description ? (
          <span className="whitespace-nowrap">{row.description}</span>
        ) : (
          <span className="text-slate-400">-</span>
        ),
      width: 200,
    },
    {
      id: "created_at",
      header: "作成日時",
      cell: (row) => (
        <span className="text-slate-600">{new Date(row.created_at).toLocaleString("ja-JP")}</span>
      ),
      sortable: true,
      width: 180,
    },
    {
      id: "actions",
      header: "操作",
      cell: (row) => (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(row.id)}
          disabled={isDeleting}
        >
          削除
        </Button>
      ),
    },
  ];
}
