/**
 * UsersListPage (v2.2 - Phase G-2)
 * Users list page with inline create form
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import type { CreateUserRequest } from "../api";
import { UserForm } from "../components/UserForm";
import { useUsers, useCreateUser, useDeleteUser } from "../hooks";

import { createUserColumns } from "./columns";

import { ROUTES } from "@/constants/routes";
import { MasterImportDialog } from "@/features/masters/components/MasterImportDialog";
import { TanstackTable } from "@/shared/components";
import { PageContainer, PageHeader } from "@/shared/components/layout";
import { MasterPageActions } from "@/shared/components/layout/MasterPageActions";



// eslint-disable-next-line max-lines-per-function
export function UsersListPage() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

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

  const handleDelete = async (userId: number) => {
    if (!confirm("このユーザーを削除してもよろしいですか？")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(userId);
      toast.success("ユーザーを削除しました");
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("削除に失敗しました");
    }
  };

  const handleViewDetail = (userId: number) => {
    navigate(ROUTES.SETTINGS.USERS + `/${userId}`);
  };

  const columns = createUserColumns({
    onViewDetail: handleViewDetail,
    onDelete: handleDelete,
    isDeleting: deleteMutation.isPending,
  });

  return (
    <PageContainer>
      <PageHeader
        title="ユーザー管理"
        subtitle="ユーザーの作成・編集・削除"
        actions={
          !showForm && (
            <MasterPageActions
              exportApiPath="/users/export/download"
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
        <div className="flex items-center gap-4">
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
        </div>
      </div>

      {/* Data display area */}
      {isLoading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">読み込み中...</div>
      ) : isError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          データの取得に失敗しました
        </div>
      ) : !users || users.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          ユーザーが登録されていません
        </div>
      ) : (
        <TanstackTable
          data={users}
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
