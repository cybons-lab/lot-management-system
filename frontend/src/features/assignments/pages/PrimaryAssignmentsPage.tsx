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

import { UserCheck } from "lucide-react";
import { useState } from "react";

import { AddAssignmentDialog } from "../components/AddAssignmentDialog";
import { PrimaryAssignmentSummary } from "../components/PrimaryAssignmentSummary";
import { PrimaryAssignmentTable } from "../components/PrimaryAssignmentTable";
import { SupplierAssignmentEditDialog } from "../components/SupplierAssignmentEditDialog";
import { usePrimaryAssignments } from "../hooks/usePrimaryAssignments";
import type { SupplierGroup } from "../types";

import { PageHeader } from "@/shared/components/layout/PageHeader";

export function PrimaryAssignmentsPage() {
  const { isLoading, error, supplierGroups, sortedGroups, handleRefresh } = usePrimaryAssignments();
  const [editGroup, setEditGroup] = useState<SupplierGroup | null>(null);

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
          <PageHeader title="主担当設定" subtitle="仕入先ごとの主担当者を確認・設定します" />
        </div>
        <AddAssignmentDialog onSuccess={handleRefresh} />
      </div>

      {/* サマリーカード */}
      <PrimaryAssignmentSummary supplierGroups={supplierGroups} />

      {/* 担当者リスト */}
      <PrimaryAssignmentTable sortedGroups={sortedGroups} onEdit={setEditGroup} />

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
