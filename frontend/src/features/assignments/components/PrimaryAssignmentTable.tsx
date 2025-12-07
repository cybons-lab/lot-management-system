import { Crown, Edit, User } from "lucide-react";

import type { SupplierGroup } from "../types";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";

interface PrimaryAssignmentTableProps {
  sortedGroups: SupplierGroup[];
  onEdit: (group: SupplierGroup) => void;
}

export function PrimaryAssignmentTable({ sortedGroups, onEdit }: PrimaryAssignmentTableProps) {
  const { user: currentUser } = useAuth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>仕入先別担当者一覧</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">仕入先コード</TableHead>
              <TableHead>仕入先名</TableHead>
              <TableHead>主担当者</TableHead>
              <TableHead>副担当者</TableHead>
              <TableHead className="w-[100px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">
                  担当設定はありません
                </TableCell>
              </TableRow>
            ) : (
              sortedGroups.map((group) => (
                <TableRow key={group.supplier_id}>
                  <TableCell className="font-mono text-sm">{group.supplier_code}</TableCell>
                  <TableCell>{group.supplier_name}</TableCell>
                  <TableCell>
                    {group.primaryUser ? (
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500" />
                        <span className="font-medium">{group.primaryUser.display_name}</span>
                        {group.primaryUser.user_id === currentUser?.id && (
                          <Badge variant="secondary" className="text-xs">
                            あなた
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="font-medium text-amber-600">⚠ 未設定</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {group.assignments
                        .filter((a) => !a.is_primary)
                        .map((a) => (
                          <Badge key={a.id} variant="outline" className="text-xs">
                            <User className="mr-1 h-3 w-3" />
                            {a.display_name}
                          </Badge>
                        ))}
                      {group.assignments.filter((a) => !a.is_primary).length === 0 && (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(group)}>
                      <Edit className="mr-1 h-4 w-4" />
                      編集
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
