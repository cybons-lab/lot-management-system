/**
 * RolesListPage (v2.2 - Phase G-2)
 * Roles list page with inline create form
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { CreateRoleRequest, Role } from "../api";
import { RoleForm } from "../components/RoleForm";
import { useRoles, useCreateRole, useDeleteRole } from "../hooks";

import { createRoleColumns } from "./columns";

import { PermanentDeleteDialog } from "@/components/common";
import { Button, Input } from "@/components/ui";
import { useTable } from "@/hooks/ui";
import { DataTable, type SortConfig } from "@/shared/components/data/DataTable";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { PageContainer, PageHeader } from "@/shared/components/layout";

export function RolesListPage() {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "id", direction: "asc" });
  const table = useTable({ initialPageSize: 25 });

  // 削除ダイアログの状態
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

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

  const handleDeleteClick = (roleId: number) => {
    const role = roles?.find((r) => r.id === roleId);
    if (role) {
      setDeletingRole(role);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingRole) return;

    try {
      await deleteMutation.mutateAsync(deletingRole.id);
      toast.success("ロールを削除しました");
      setDeletingRole(null);
    } catch (error) {
      console.error("Failed to delete role:", error);
      toast.error("削除に失敗しました。ロールが使用中の可能性があります。");
    }
  };

  const columns = createRoleColumns({
    onDelete: handleDeleteClick,
    isDeleting: deleteMutation.isPending,
  });

  const filteredRoles = useMemo(() => {
    if (!roles) return [];
    if (!searchQuery.trim()) return roles;
    const query = searchQuery.toLowerCase();
    return roles.filter(
      (role) =>
        role.role_code.toLowerCase().includes(query) ||
        role.role_name.toLowerCase().includes(query) ||
        (role.description ?? "").toLowerCase().includes(query),
    );
  }, [roles, searchQuery]);

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

      <div className="rounded-lg border bg-white p-4">
        <Input
          type="search"
          placeholder="ロールコード・名称・説明で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
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
      ) : !roles || roles.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          ロールが登録されていません
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          検索条件に一致するロールがありません
        </div>
      ) : (
        <>
          <DataTable
            data={table.paginateData(filteredRoles)}
            columns={columns}
            sort={sort}
            onSortChange={setSort}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            emptyMessage="ロールが登録されていません"
          />
          {filteredRoles.length > 0 && (
            <TablePagination
              currentPage={table.calculatePagination(filteredRoles.length).page ?? 1}
              pageSize={table.calculatePagination(filteredRoles.length).pageSize ?? 25}
              totalCount={filteredRoles.length}
              onPageChange={table.setPage}
              onPageSizeChange={table.setPageSize}
              pageSizeOptions={[25, 50, 75, 100]}
            />
          )}
        </>
      )}

      <PermanentDeleteDialog
        open={!!deletingRole}
        onOpenChange={(open) => !open && setDeletingRole(null)}
        onConfirm={handleConfirmDelete}
        isPending={deleteMutation.isPending}
        title="ロールを削除しますか？"
        description={`${deletingRole?.role_name}（${deletingRole?.role_code}）を削除します。この操作は取り消せません。`}
        confirmationPhrase={deletingRole?.role_code || "delete"}
      />
    </PageContainer>
  );
}
