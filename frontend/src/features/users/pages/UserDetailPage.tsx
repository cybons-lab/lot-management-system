/**
 * UserDetailPage (v2.2 - Phase G-2)
 * User detail page with role assignment
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser, useAssignUserRoles } from "../hooks";
import { useRoles } from "@/features/roles/hooks";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = Number(id);

  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [showRoleForm, setShowRoleForm] = useState(false);

  // Fetch user detail
  const { data: user, isLoading, isError } = useUser(userId);

  // Fetch all roles
  const { data: roles } = useRoles();

  // Role assignment mutation
  const assignRolesMutation = useAssignUserRoles();

  const handleAssignRoles = async () => {
    try {
      await assignRolesMutation.mutateAsync({
        userId,
        data: { role_ids: selectedRoleIds },
      });
      alert("ロールを割り当てました");
      setShowRoleForm(false);
    } catch (error) {
      console.error("Failed to assign roles:", error);
      alert("ロール割り当てに失敗しました");
    }
  };

  const handleBack = () => {
    navigate(ROUTES.SETTINGS.USERS);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          読み込み中...
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="space-y-6 p-6">
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          ユーザー情報の取得に失敗しました
        </div>
        <Button onClick={handleBack}>戻る</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ユーザー詳細</h2>
          <p className="mt-1 text-gray-600">{user.username}</p>
        </div>
        <Button variant="outline" onClick={handleBack}>
          一覧に戻る
        </Button>
      </div>

      {/* User Information */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">ユーザー情報</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">ユーザーID</label>
            <p className="mt-1 text-sm">{user.user_id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">ユーザー名</label>
            <p className="mt-1 text-sm">{user.username}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">メールアドレス</label>
            <p className="mt-1 text-sm">{user.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">表示名</label>
            <p className="mt-1 text-sm">{user.display_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">状態</label>
            <p className="mt-1 text-sm">
              {user.is_active ? (
                <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                  有効
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                  無効
                </span>
              )}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">最終ログイン</label>
            <p className="mt-1 text-sm">
              {user.last_login_at
                ? new Date(user.last_login_at).toLocaleString("ja-JP")
                : "未ログイン"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">作成日時</label>
            <p className="mt-1 text-sm">{new Date(user.created_at).toLocaleString("ja-JP")}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">更新日時</label>
            <p className="mt-1 text-sm">{new Date(user.updated_at).toLocaleString("ja-JP")}</p>
          </div>
        </div>
      </div>

      {/* Assigned Roles */}
      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">割り当てられたロール</h3>
          <Button onClick={() => setShowRoleForm(!showRoleForm)}>
            {showRoleForm ? "キャンセル" : "ロールを編集"}
          </Button>
        </div>

        {!showRoleForm ? (
          <div className="flex flex-wrap gap-2">
            {user.role_codes.length > 0 ? (
              user.role_codes.map((code) => (
                <span
                  key={code}
                  className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800"
                >
                  {code}
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-500">ロールが割り当てられていません</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">ロールを選択</label>
              <div className="space-y-2">
                {roles?.map((role) => (
                  <div key={role.role_id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`role-${role.role_id}`}
                      checked={selectedRoleIds.includes(role.role_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRoleIds([...selectedRoleIds, role.role_id]);
                        } else {
                          setSelectedRoleIds(selectedRoleIds.filter((id) => id !== role.role_id));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor={`role-${role.role_id}`} className="text-sm">
                      {role.role_name} ({role.role_code})
                      {role.description && (
                        <span className="ml-2 text-gray-500">- {role.description}</span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={handleAssignRoles} disabled={assignRolesMutation.isPending}>
              {assignRolesMutation.isPending ? "割り当て中..." : "ロールを割り当て"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
