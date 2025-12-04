/**
 * UsersListPage (v2.2 - Phase G-2)
 * Users list page with inline create form
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import type { CreateUserRequest } from "../api";
import { UserExportButton } from "../components/UserExportButton";
import { UserForm } from "../components/UserForm";
import { useUsers, useCreateUser, useDeleteUser } from "../hooks";

import * as styles from "./styles";

import { Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";

// eslint-disable-next-line max-lines-per-function
export function UsersListPage() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);

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

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header.root}>
        <div className={styles.header.titleGroup}>
          <h2 className={styles.header.title}>ユーザー管理</h2>
          <p className={styles.header.description}>ユーザーの作成・編集・削除</p>
        </div>
        <div className="flex gap-2">
          <UserExportButton size="sm" />
          {!showForm && <Button onClick={handleCreateNew}>新規ユーザー作成</Button>}
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className={styles.card.root}>
          <h3 className={styles.card.title}>ユーザー作成</h3>
          <UserForm
            onSubmit={handleSubmitCreate}
            onCancel={handleCancelCreate}
            isSubmitting={createMutation.isPending}
          />
        </div>
      )}

      {/* Filter */}
      <div className={styles.filter.root}>
        <div className={styles.filter.container}>
          <label className={styles.filter.label} htmlFor="status-filter">
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
            className={styles.filter.select}
          >
            <option value="all">すべて</option>
            <option value="active">有効のみ</option>
            <option value="inactive">無効のみ</option>
          </select>
        </div>
      </div>

      {/* Data display area */}
      {isLoading ? (
        <div className={styles.loadingState}>読み込み中...</div>
      ) : isError ? (
        <div className={styles.errorState}>データの取得に失敗しました</div>
      ) : !users || users.length === 0 ? (
        <div className={styles.emptyState}>ユーザーが登録されていません</div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">{users.length} 人のユーザー</div>

          {/* Table */}
          <div className={styles.table.container}>
            <table className={styles.table.root}>
              <thead className={styles.table.thead}>
                <tr key="header">
                  <th className={styles.table.th}>ユーザーID</th>
                  <th className={styles.table.th}>ユーザー名</th>
                  <th className={styles.table.th}>メールアドレス</th>
                  <th className={styles.table.th}>表示名</th>
                  <th className={styles.table.th}>状態</th>
                  <th className={styles.table.th}>操作</th>
                </tr>
              </thead>
              <tbody className={styles.table.tbody}>
                {users.map((user) => (
                  <tr key={user.user_id} className={styles.table.tr}>
                    <td className={styles.table.td}>{user.user_id}</td>
                    <td className={styles.table.tdMedium}>{user.username}</td>
                    <td className={styles.table.td}>
                      <span className="block max-w-[200px] truncate" title={user.email}>
                        {user.email}
                      </span>
                    </td>
                    <td className={styles.table.td}>
                      <span
                        className="block max-w-[150px] truncate"
                        title={user.display_name || ""}
                      >
                        {user.display_name}
                      </span>
                    </td>
                    <td className={styles.table.td}>
                      <span className={styles.statusBadge({ isActive: user.is_active })}>
                        {user.is_active ? "有効" : "無効"}
                      </span>
                    </td>
                    <td className={styles.table.td}>
                      <div className={styles.actionButtons}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(user.user_id)}
                        >
                          詳細
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(user.user_id)}
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
