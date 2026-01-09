/**
 * BusinessRulesPage (v2.2 - Phase H-2)
 * Business rules management page
 * Refactored to use DataTable component.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useBusinessRules, useToggleBusinessRuleActive, useDeleteBusinessRule } from "../hooks";

import { Button } from "@/components/ui";
import { PageContainer, PageHeader } from "@/shared/components/layout";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";

interface BusinessRule {
  rule_id: number;
  rule_code: string;
  rule_name: string;
  rule_type: string;
  is_active: boolean;
}

export function BusinessRulesPage() {
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [ruleTypeFilter, setRuleTypeFilter] = useState<string | undefined>(undefined);

  // Fetch business rules
  const {
    data: response,
    isLoading,
    isError,
  } = useBusinessRules({
    is_active: isActiveFilter,
    rule_type: ruleTypeFilter,
  });

  // Toggle active mutation
  const toggleActiveMutation = useToggleBusinessRuleActive();

  // Delete mutation
  const deleteMutation = useDeleteBusinessRule();

  const handleToggleActive = async (ruleId: number) => {
    try {
      await toggleActiveMutation.mutateAsync(ruleId);
      toast.success("業務ルールの有効/無効を切り替えました");
    } catch (error) {
      console.error("Failed to toggle business rule:", error);
      toast.error("切り替えに失敗しました");
    }
  };

  const handleDelete = async (ruleId: number) => {
    if (!confirm("この業務ルールを削除してもよろしいですか？")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(ruleId);
      toast.success("業務ルールを削除しました");
    } catch (error) {
      console.error("Failed to delete business rule:", error);
      toast.error("削除に失敗しました");
    }
  };

  // 列定義
  const columns = useMemo<Column<BusinessRule>[]>(
    () => [
      {
        id: "rule_id",
        header: "ルールID",
        accessor: (row) => row.rule_id,
        width: 100,
        sortable: true,
      },
      {
        id: "rule_code",
        header: "ルールコード",
        accessor: (row) => row.rule_code,
        cell: (row) => <span className="font-medium">{row.rule_code}</span>,
        width: 150,
        sortable: true,
      },
      {
        id: "rule_name",
        header: "ルール名",
        accessor: (row) => row.rule_name,
        width: 200,
        sortable: true,
      },
      {
        id: "rule_type",
        header: "ルール種別",
        accessor: (row) => row.rule_type,
        cell: (row) => (
          <span className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
            {row.rule_type}
          </span>
        ),
        width: 150,
        sortable: true,
      },
      {
        id: "is_active",
        header: "状態",
        accessor: (row) => row.is_active,
        cell: (row) =>
          row.is_active ? (
            <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
              有効
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
              無効
            </span>
          ),
        width: 100,
        sortable: true,
      },
    ],
    [],
  );

  // アクションボタン
  const renderRowActions = (rule: BusinessRule) => (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          handleToggleActive(rule.rule_id);
        }}
        disabled={toggleActiveMutation.isPending}
      >
        {rule.is_active ? "無効化" : "有効化"}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(rule.rule_id);
        }}
        disabled={deleteMutation.isPending}
      >
        削除
      </Button>
    </div>
  );

  return (
    <PageContainer>
      <PageHeader title="業務ルール" subtitle="システムの業務ルールを管理" className="pb-0" />

      {/* Filter */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            状態フィルタ:
            <select
              value={isActiveFilter === undefined ? "all" : isActiveFilter ? "active" : "inactive"}
              onChange={(e) => {
                if (e.target.value === "all") setIsActiveFilter(undefined);
                else if (e.target.value === "active") setIsActiveFilter(true);
                else setIsActiveFilter(false);
              }}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="all">すべて</option>
              <option value="active">有効のみ</option>
              <option value="inactive">無効のみ</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm font-medium">
            ルール種別:
            <select
              value={ruleTypeFilter || "all"}
              onChange={(e) => {
                setRuleTypeFilter(e.target.value === "all" ? undefined : e.target.value);
              }}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="all">すべて</option>
              <option value="allocation">引当ルール</option>
              <option value="expiry_warning">期限警告</option>
              <option value="kanban">かんばん</option>
              <option value="inventory_sync_alert">SAP在庫差異アラート</option>
              <option value="other">その他</option>
            </select>
          </label>
        </div>
      </div>

      {/* Data display area */}
      {isLoading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          読み込み中...
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          データの取得に失敗しました
        </div>
      ) : !response || response.rules.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          業務ルールが登録されていません
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">{response.total} 件のルール</div>

          {/* Table */}
          <DataTable
            data={response.rules}
            columns={columns}
            getRowId={(row) => row.rule_id}
            rowActions={renderRowActions}
            emptyMessage="業務ルールがありません"
          />
        </div>
      )}
    </PageContainer>
  );
}
