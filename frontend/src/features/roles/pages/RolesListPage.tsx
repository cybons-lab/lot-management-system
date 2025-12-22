/**
 * RolesListPage (v2.2 - Phase G-2)
 * Roles list page with inline create form
 */

import { useState } from "react";
import { toast } from "sonner";

import type { CreateRoleRequest } from "../api";
import { RoleForm } from "../components/RoleForm";
import { useRoles, useCreateRole, useDeleteRole } from "../hooks";

import { createRoleColumns } from "./columns";

import { Button } from "@/components/ui";
import { TanstackTable } from "@/shared/components";
import { PageContainer, PageHeader } from "@/shared/components/layout";

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

  const columns = createRoleColumns({
    onDelete: handleDelete,
    isDeleting: deleteMutation.isPending,
  });

  return (
    <PageContainer>
      <PageHeader
        title="ロール管理"
        subtitle="ロールの作成・削除"
        actions={!showForm && <Button onClick={handleCreateNew}>新規ロール作成</Button>}
        className="pb-0"
      />

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
        <TanstackTable
          data={roles}
          columns={columns}
          initialPageSize={25}
          isLoading={isLoading}
          pageSizeOptions={[10, 25, 50, 100]}
          className="overflow-hidden"
        />
      )}
    </PageContainer>
  );
}
