/**
 * PrimaryAssignmentsPage.tsx
 *
 * 主担当設定ページ
 * 仕入先ごとの主担当者を一覧表示・管理する
 *
 * 将来的な拡張:
 * - 主担当者がログインしていない場合のアラート表示
 * - 受注時の主担当者確認
 */

import { UserCheck, Crown, User, Edit } from "lucide-react";
import { useEffect, useState } from "react";

import { AddAssignmentDialog } from "../components/AddAssignmentDialog";
import { SupplierAssignmentEditDialog } from "../components/SupplierAssignmentEditDialog";
import type { SupplierGroup, SupplierAssignment } from "../types";

import {
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
  Badge,
} from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";
import { http } from "@/shared/api/http-client";

// ページのUIとデータ処理を一箇所にまとめるため分割しない
// eslint-disable-next-line max-lines-per-function
export function PrimaryAssignmentsPage() {
  const { user: currentUser } = useAuth();
  const [assignments, setAssignments] = useState<SupplierAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editGroup, setEditGroup] = useState<SupplierGroup | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setIsLoading(true);
        const data = await http.get<SupplierAssignment[]>("assignments");
        setAssignments(data);
      } catch (err) {
        console.error("Failed to fetch assignments", err);
        setError("データの取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssignments();
  }, [refreshKey]);

  // 仕入先ごとにグループ化
  const supplierGroups: SupplierGroup[] = Object.values(
    assignments.reduce(
      (acc, assignment) => {
        const key = assignment.supplier_id;
        if (!acc[key]) {
          acc[key] = {
            supplier_id: assignment.supplier_id,
            supplier_code: assignment.supplier_code,
            supplier_name: assignment.supplier_name,
            assignments: [],
            primaryUser: null,
          };
        }
        acc[key].assignments.push(assignment);
        if (assignment.is_primary) {
          acc[key].primaryUser = assignment;
        }
        return acc;
      },
      {} as Record<number, SupplierGroup>,
    ),
  );

  // 主担当がいない仕入先を上に表示
  const sortedGroups = supplierGroups.sort((a, b) => {
    if (!a.primaryUser && b.primaryUser) return -1;
    if (a.primaryUser && !b.primaryUser) return 1;
    return a.supplier_code.localeCompare(b.supplier_code);
  });

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
            <UserCheck className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">主担当設定</h1>
            <p className="text-sm text-slate-600">仕入先ごとの主担当者を確認・設定します</p>
          </div>
        </div>
        <AddAssignmentDialog onSuccess={handleRefresh} />
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">総仕入先数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supplierGroups.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">主担当設定済み</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {supplierGroups.filter((g) => g.primaryUser).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">主担当未設定</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {supplierGroups.filter((g) => !g.primaryUser).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 担当者リスト */}
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
                      <Button variant="ghost" size="sm" onClick={() => setEditGroup(group)}>
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

      {/* 編集ダイアログ */}
      {editGroup && (
        <SupplierAssignmentEditDialog
          group={editGroup}
          open={!!editGroup}
          onOpenChange={(open) => {
            if (!open) {
              setEditGroup(null);
              handleRefresh();
            }
          }}
        />
      )}
    </div>
  );
}
