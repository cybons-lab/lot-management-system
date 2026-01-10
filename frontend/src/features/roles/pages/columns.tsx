import { createColumnHelper } from "@tanstack/react-table";

import type { Role } from "../api";

import { Badge, Button } from "@/components/ui";

const columnHelper = createColumnHelper<Role>();

interface RoleColumnsOptions {
  onDelete: (roleId: number) => void;
  isDeleting?: boolean;
}

export function createRoleColumns({ onDelete, isDeleting = false }: RoleColumnsOptions) {
  return [
    columnHelper.accessor("id", {
      header: "ロールID",
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor("role_code", {
      header: "ロールコード",
      cell: (info) => (
        <Badge variant="secondary" className="font-semibold uppercase">
          {info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor("role_name", {
      header: "ロール名",
      cell: (info) => <span className="whitespace-nowrap">{info.getValue()}</span>,
    }),
    columnHelper.accessor("description", {
      header: "説明",
      cell: (info) =>
        info.getValue() ? (
          <span className="whitespace-nowrap">{info.getValue()}</span>
        ) : (
          <span className="text-slate-400">-</span>
        ),
    }),
    columnHelper.accessor("created_at", {
      header: "作成日時",
      cell: (info) => (
        <span className="text-slate-600">{new Date(info.getValue()).toLocaleString("ja-JP")}</span>
      ),
      enableSorting: true,
    }),
    columnHelper.display({
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(row.original.id)}
          disabled={isDeleting}
        >
          削除
        </Button>
      ),
    }),
  ];
}
