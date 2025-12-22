import { createColumnHelper } from "@tanstack/react-table";

import type { User } from "../api";

import { Badge, Button } from "@/components/ui";

const columnHelper = createColumnHelper<User>();

interface UserColumnsOptions {
  onViewDetail: (userId: number) => void;
  onDelete: (userId: number) => void;
  isDeleting?: boolean;
}

export function createUserColumns({
  onViewDetail,
  onDelete,
  isDeleting = false,
}: UserColumnsOptions) {
  return [
    columnHelper.accessor("user_id", {
      header: "ユーザーID",
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor("username", {
      header: "ユーザー名",
      cell: (info) => <span className="font-medium text-slate-900">{info.getValue()}</span>,
    }),
    columnHelper.accessor("email", {
      header: "メールアドレス",
      cell: (info) => (
        <span className="block max-w-[220px] truncate" title={info.getValue()}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("display_name", {
      header: "表示名",
      cell: (info) => (
        <span className="block max-w-[180px] truncate" title={info.getValue()}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("is_active", {
      header: "状態",
      cell: (info) => (
        <Badge variant={info.getValue() ? "default" : "secondary"}>
          {info.getValue() ? "有効" : "無効"}
        </Badge>
      ),
      enableSorting: true,
    }),
    columnHelper.display({
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onViewDetail(row.original.user_id)}>
            詳細
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(row.original.user_id)}
            disabled={isDeleting}
          >
            削除
          </Button>
        </div>
      ),
    }),
  ];
}
