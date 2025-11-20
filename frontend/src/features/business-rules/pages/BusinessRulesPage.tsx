/**
 * BusinessRulesPage (v2.2 - Phase H-2)
 * Business rules management page
 */

import { useState } from "react";
import { useBusinessRules, useToggleBusinessRuleActive, useDeleteBusinessRule } from "../hooks";
import { Button } from "@/components/ui";

export function BusinessRulesPage() {
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);

  // Fetch business rules
  const { data: response, isLoading, isError } = useBusinessRules({ is_active: isActiveFilter });

  // Toggle active mutation
  const toggleActiveMutation = useToggleBusinessRuleActive();

  // Delete mutation
  const deleteMutation = useDeleteBusinessRule();

  const handleToggleActive = async (ruleId: number) => {
    try {
      await toggleActiveMutation.mutateAsync(ruleId);
      alert("業務ルールの有効/無効を切り替えました");
    } catch (error) {
      console.error("Failed to toggle business rule:", error);
      alert("切り替えに失敗しました");
    }
  };

  const handleDelete = async (ruleId: number) => {
    if (!confirm("この業務ルールを削除してもよろしいですか？")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(ruleId);
      alert("業務ルールを削除しました");
    } catch (error) {
      console.error("Failed to delete business rule:", error);
      alert("削除に失敗しました");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">業務ルール</h2>
        <p className="mt-1 text-gray-600">システムの業務ルールを管理</p>
      </div>

      {/* Filter */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">状態フィルタ:</label>
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
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    ルールID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    ルールコード
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    ルール名
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    ルール種別
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状態</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {response.rules.map((rule) => (
                  <tr key={rule.rule_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{rule.rule_id}</td>
                    <td className="px-4 py-3 text-sm font-medium">{rule.rule_code}</td>
                    <td className="px-4 py-3 text-sm">{rule.rule_name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
                        {rule.rule_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {rule.is_active ? (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                          有効
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                          無効
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(rule.rule_id)}
                          disabled={toggleActiveMutation.isPending}
                        >
                          {rule.is_active ? "無効化" : "有効化"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(rule.rule_id)}
                          disabled={deleteMutation.isPending}
                        >
                          削除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
