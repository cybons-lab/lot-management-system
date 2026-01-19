import type { User } from "../api";

import { Badge, Button } from "@/components/ui";
import type { Column } from "@/shared/components/data/DataTable";

interface UserColumnsOptions {
  onViewDetail: (userId: number) => void;
  onDelete: (userId: number) => void;
  isDeleting?: boolean;
}

export function createUserColumns({
  onViewDetail,
  onDelete,
  isDeleting = false,
}: UserColumnsOptions): Column<User>[] {
  return [
    {
      id: "user_id",
      header: "ユーザーID",
      cell: (row) => <span className="font-medium">{row.user_id}</span>,
      sortable: true,
      width: 100,
    },
    {
      id: "username",
      header: "ユーザー名",
      cell: (row) => <span className="font-medium text-slate-900">{row.username}</span>,
      sortable: true,
      width: 150,
    },
    {
      id: "email",
      header: "メールアドレス",
      cell: (row) => <span className="whitespace-nowrap">{row.email}</span>,
      sortable: true,
      width: 200,
    },
    {
      id: "display_name",
      header: "表示名",
      cell: (row) => <span className="whitespace-nowrap">{row.display_name}</span>,
      sortable: true,
      width: 150,
    },
    {
      id: "is_active",
      header: "状態",
      cell: (row) => (
        <Badge variant={row.is_active ? "default" : "secondary"}>
          {row.is_active ? "有効" : "無効"}
        </Badge>
      ),
      sortable: true,
      width: 80,
    },
    {
      id: "actions",
      header: "操作",
      cell: (row) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onViewDetail(row.user_id)}>
            詳細
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(row.user_id)}
            disabled={isDeleting}
          >
            削除
          </Button>
        </div>
      ),
    },
  ];
}
