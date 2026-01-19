/**
 * UsersListPage (v2.2 - Phase G-2)
 * Users list page with inline create form
 */

import { useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom"; removed
import { toast } from "sonner";

import type { CreateUserRequest, User } from "../api";
import { UserDetailDialog } from "../components/UserDetailDialog";
import { UserForm } from "../components/UserForm";
import { useUsers, useCreateUser, useDeleteUser } from "../hooks";

import { createUserColumns } from "./columns";

import { PermanentDeleteDialog } from "@/components/common";
import { Input } from "@/components/ui";
import { MasterImportDialog } from "@/features/masters/components/MasterImportDialog";
import { useTable } from "@/hooks/ui";
import { DataTable, type SortConfig } from "@/shared/components/data/DataTable";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { PageContainer, PageHeader } from "@/shared/components/layout";
import { MasterPageActions } from "@/shared/components/layout/MasterPageActions";

// eslint-disable-next-line max-lines-per-function, complexity
export function UsersListPage() {
  // navigate removed
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "user_id", direction: "asc" });
  const table = useTable({ initialPageSize: 25 });

  // 削除ダイアログの状態
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Fetch users
  const { data: users, isLoading, isError } = useUsers({ is_active: isActiveFilter });

  // Create mutation
  const createMutation = useCreateUser();

  // Delete mutation
  const deleteMutation = useDeleteUser();

  const handleCreateNew = () => {
    setShowForm(true);
  };

  const handleCancelCreate = () => {
    setShowForm(false);
  };

  const handleSubmitCreate = async (data: CreateUserRequest) => {
    try {
      await createMutation.mutateAsync(data);
      setShowForm(false);
      toast.success("ユーザーを作成しました");
    } catch (error) {
      console.error("Failed to create user:", error);
      toast.error(
        "作成に失敗しました。ユーザー名またはメールアドレスが既に存在する可能性があります。",
      );
    }
  };

  const handleDeleteClick = (userId: number) => {
    const user = users?.find((u) => u.user_id === userId);
    if (user) {
      setDeletingUser(user);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    try {
      await deleteMutation.mutateAsync(deletingUser.user_id);
      toast.success("ユーザーを削除しました");
      setDeletingUser(null);
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("削除に失敗しました");
    }
  };

  const handleViewDetail = (userId: number) => {
    setSelectedUserId(userId);
  };

  const columns = createUserColumns({
    onViewDetail: handleViewDetail,
    onDelete: handleDeleteClick,
    isDeleting: deleteMutation.isPending,
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(query) ||
        user.display_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query),
    );
  }, [users, searchQuery]);

  return (
    <PageContainer>
      <PageHeader
        title="ユーザー管理"
        subtitle="ユーザーの作成・編集・削除"
        actions={
          !showForm && (
            <MasterPageActions
              exportApiPath="users/export/download"
              exportFilePrefix="users"
              onImportClick={() => setIsImportDialogOpen(true)}
              onCreateClick={handleCreateNew}
              createLabel="新規ユーザー作成"
            />
          )
        }
        className="pb-0"
      />

      {/* インポートダイアログ */}
      <MasterImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        title="ユーザー一括インポート"
        group="user"
      />

      {/* Create Form */}
      {showForm && (
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">ユーザー作成</h3>
          <UserForm
            onSubmit={handleSubmitCreate}
            onCancel={handleCancelCreate}
            isSubmitting={createMutation.isPending}
          />
        </div>
      )}

      {/* Filter */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium" htmlFor="status-filter">
            状態フィルタ:
          </label>
          <select
            id="status-filter"
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
          <Input
            type="search"
            placeholder="ユーザー名・表示名・メールで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-w-[240px]"
          />
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
      ) : !users || users.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          ユーザーが登録されていません
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          検索条件に一致するユーザーがいません
        </div>
      ) : (
        <>
          <DataTable
            data={table.paginateData(filteredUsers)}
            columns={columns}
            sort={sort}
            onSortChange={setSort}
            getRowId={(row) => row.user_id}
            isLoading={isLoading}
            emptyMessage="ユーザーが登録されていません"
          />
          {filteredUsers.length > 0 && (
            <TablePagination
              currentPage={table.calculatePagination(filteredUsers.length).page ?? 1}
              pageSize={table.calculatePagination(filteredUsers.length).pageSize ?? 25}
              totalCount={filteredUsers.length}
              onPageChange={table.setPage}
              onPageSizeChange={table.setPageSize}
              pageSizeOptions={[25, 50, 75, 100]}
            />
          )}
        </>
      )}

      <PermanentDeleteDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        onConfirm={handleConfirmDelete}
        isPending={deleteMutation.isPending}
        title="ユーザーを削除しますか？"
        description={`${deletingUser?.display_name}（${deletingUser?.username}）を削除します。この操作は取り消せません。`}
        confirmationPhrase={deletingUser?.username || "delete"}
      />
      <UserDetailDialog
        userId={selectedUserId}
        open={!!selectedUserId}
        onOpenChange={(open) => !open && setSelectedUserId(null)}
      />
    </PageContainer>
  );
}
