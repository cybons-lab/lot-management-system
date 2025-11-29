/**
 * RolesListPage (v2.2 - Phase G-2)
 * Roles list page with inline create form
 */

import { useState } from "react";
import { toast } from "sonner";

import type { CreateRoleRequest } from "../api";
import { RoleForm } from "../components/RoleForm";
import { useRoles, useCreateRole, useDeleteRole } from "../hooks";

import { Button } from "@/components/ui";

export function RolesListPage() {
  const [showForm, setShowForm] = useState(false);

  // Fetch roles
  const { data: roles, isLoading, isError } = useRoles();

  // Create mutation
  const createMutation = useCreateRole();

  // Delete mutation
  const deleteMutation = useDeleteRole();

  const handleCreateNew = () => {
    setShowForm(true);
  };

  const handleCancelCreate = () => {
    setShowForm(false);
  };

  const handleSubmitCreate = async (data: CreateRoleRequest) => {
    try {
      await createMutation.mutateAsync(data);
      setShowForm(false);
      toast.success("ロールを作成しました");
    } catch (error) {
      console.error("Failed to create role:", error);
      toast.error("作成に失敗しました。ロールコードが既に存在する可能性があります。");
    }
  };

  const handleDelete = async (roleId: number) => {
    if (!confirm("このロールを削除してもよろしいですか？")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(roleId);
      toast.success("ロールを削除しました");
    } catch (error) {
      console.error("Failed to delete role:", error);
      toast.error("削除に失敗しました。ロールが使用中の可能性があります。");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ロール管理</h2>
          <p className="mt-1 text-gray-600">ロールの作成・削除</p>
        </div>
        {!showForm && <Button onClick={handleCreateNew}>新規ロール作成</Button>}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">ロール作成</h3>
          <RoleForm
            onSubmit={handleSubmitCreate}
            onCancel={handleCancelCreate}
            isSubmitting={createMutation.isPending}
          />
        </div>
      )}

      {/* Data display area */}
      {isLoading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          読み込み中...
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          データの取得に失敗しました
        </div>
      ) : !roles || roles.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          ロールが登録されていません
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">{roles.length} 個のロール</div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    ロールID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    ロールコード
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    ロール名
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">説明</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    作成日時
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {roles.map((role) => (
                  <tr key={role.role_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{role.role_id}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                        {role.role_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{role.role_name}</td>
                    <td className="px-4 py-3 text-sm">
                      {role.description ? (
                        <span className="line-clamp-2" title={role.description}>
                          {role.description}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(role.created_at).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(role.role_id)}
                        disabled={deleteMutation.isPending}
                      >
                        削除
                      </Button>
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
