import { Edit, User } from "lucide-react";
import { useMemo } from "react";

import type { SupplierGroup } from "../types";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";

interface SupplierAssignmentTableProps {
  sortedGroups: SupplierGroup[];
  onEdit: (group: SupplierGroup) => void;
}

export function SupplierAssignmentTable({ sortedGroups, onEdit }: SupplierAssignmentTableProps) {
  const { user: currentUser } = useAuth();

  // 列定義
  const columns = useMemo<Column<SupplierGroup>[]>(
    () => [
      {
        id: "supplier_code",
        header: "仕入先コード",
        accessor: (row) => row.supplier_code,
        cell: (row) => <span className="font-mono text-sm">{row.supplier_code}</span>,
        width: 120,
        sortable: true,
      },
      {
        id: "supplier_name",
        header: "仕入先名",
        accessor: (row) => row.supplier_name,
        width: 250,
        sortable: true,
      },
      {
        id: "assigned_users",
        header: "担当者",
        accessor: (row) => row.assignments.map((a) => a.display_name).join(", "),
        cell: (row) => (
          <div className="flex flex-wrap gap-1">
            {row.assignments.map((a) => (
              <Badge
                key={a.id}
                variant={a.user_id === currentUser?.id ? "secondary" : "outline"}
                className="text-xs"
              >
                <User className="mr-1 h-3 w-3" />
                {a.display_name}
                {a.user_id === currentUser?.id && " (あなた)"}
              </Badge>
            ))}
            {row.assignments.length === 0 && (
              <span className="font-medium text-amber-600">⚠ 未設定</span>
            )}
          </div>
        ),
        width: 400,
      },
    ],
    [currentUser?.id],
  );

  // アクションボタン
  const renderRowActions = (group: SupplierGroup) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        onEdit(group);
      }}
    >
      <Edit className="mr-1 h-4 w-4" />
      編集
    </Button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>仕入先別担当者一覧</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          data={sortedGroups}
          columns={columns}
          getRowId={(row) => row.supplier_id}
          rowActions={renderRowActions}
          emptyMessage="担当設定はありません"
        />
      </CardContent>
    </Card>
  );
}
