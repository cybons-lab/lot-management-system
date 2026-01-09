import { Crown, Edit, User } from "lucide-react";
import { useMemo } from "react";

import type { SupplierGroup } from "../types";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";

interface PrimaryAssignmentTableProps {
  sortedGroups: SupplierGroup[];
  onEdit: (group: SupplierGroup) => void;
}

// eslint-disable-next-line max-lines-per-function
export function PrimaryAssignmentTable({ sortedGroups, onEdit }: PrimaryAssignmentTableProps) {
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
        width: 200,
        sortable: true,
      },
      {
        id: "primary_user",
        header: "主担当者",
        accessor: (row) => row.primaryUser?.display_name,
        cell: (row) =>
          row.primaryUser ? (
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              <span className="font-medium">{row.primaryUser.display_name}</span>
              {row.primaryUser.user_id === currentUser?.id && (
                <Badge variant="secondary" className="text-xs">
                  あなた
                </Badge>
              )}
            </div>
          ) : (
            <span className="font-medium text-amber-600">⚠ 未設定</span>
          ),
        width: 200,
        sortable: true,
      },
      {
        id: "secondary_users",
        header: "副担当者",
        accessor: (row) =>
          row.assignments
            .filter((a) => !a.is_primary)
            .map((a) => a.display_name)
            .join(", "),
        cell: (row) => (
          <div className="flex flex-wrap gap-1">
            {row.assignments
              .filter((a) => !a.is_primary)
              .map((a) => (
                <Badge key={a.id} variant="outline" className="text-xs">
                  <User className="mr-1 h-3 w-3" />
                  {a.display_name}
                </Badge>
              ))}
            {row.assignments.filter((a) => !a.is_primary).length === 0 && (
              <span className="text-sm text-gray-400">-</span>
            )}
          </div>
        ),
        width: 250,
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
