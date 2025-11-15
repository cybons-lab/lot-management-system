/**
 * UsersListPage (v2.2 - Phase G-2)
 * Users list page with inline create form
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUsers, useCreateUser, useDeleteUser } from "../hooks";
import { UserForm } from "../components/UserForm";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import type { CreateUserRequest } from "../api";

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
      alert("ユーザーを作成しました");
    } catch (error) {
      console.error("Failed to create user:", error);
      alert("作成に失敗しました。ユーザー名またはメールアドレスが既に存在する可能性があります。");
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm("このユーザーを削除してもよろしいですか？")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(userId);
      alert("ユーザーを削除しました");
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("削除に失敗しました");
    }
  };

  const handleViewDetail = (userId: number) => {
    navigate(ROUTES.SETTINGS.USERS + `/${userId}`);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ユーザー管理</h2>
          <p className="mt-1 text-gray-600">ユーザーの作成・編集・削除</p>
        </div>
        {!showForm && <Button onClick={handleCreateNew}>新規ユーザー作成</Button>}
      </div>

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
      ) : !users || users.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          ユーザーが登録されていません
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">{users.length} 人のユーザー</div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    ユーザーID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    ユーザー名
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    メールアドレス
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">表示名</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状態</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{user.user_id}</td>
                    <td className="px-4 py-3 text-sm font-medium">{user.username}</td>
                    <td className="px-4 py-3 text-sm">{user.email}</td>
                    <td className="px-4 py-3 text-sm">{user.display_name}</td>
                    <td className="px-4 py-3 text-sm">
                      {user.is_active ? (
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
