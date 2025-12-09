/**
 * UserDetailPage (v2.2 - Phase G-2)
 * User detail page with role assignment
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useUser, useAssignUserRoles } from "../hooks";

import * as styles from "./styles";

import { Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import {
  UserSupplierAssignmentDialog,
  UserSupplierAssignmentList,
} from "@/features/assignments/components";
import { useRoles } from "@/features/roles/hooks";

// eslint-disable-next-line max-lines-per-function
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

  // Initialize selectedRoleIds when opening the form
  useEffect(() => {
    if (showRoleForm && user && roles) {
      // Map role_codes to role_ids
      const currentRoleIds = roles
        .filter((role) => user.role_codes.includes(role.role_code))
        .map((role) => role.role_id);
      setSelectedRoleIds(currentRoleIds);
    }
  }, [showRoleForm, user, roles]);

  const handleAssignRoles = async () => {
    try {
      await assignRolesMutation.mutateAsync({
        userId,
        data: { role_ids: selectedRoleIds },
      });
      toast.success("ロールを割り当てました");
      setShowRoleForm(false);
    } catch (error) {
      console.error("Failed to assign roles:", error);
      toast.error("ロール割り当てに失敗しました");
    }
  };

  const handleBack = () => {
    navigate(ROUTES.SETTINGS.USERS);
  };

  if (isLoading) {
    return (
      <div className={styles.root}>
        <div className={styles.loadingState}>読み込み中...</div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className={styles.root}>
        <div className={styles.errorState}>ユーザー情報の取得に失敗しました</div>
        <Button onClick={handleBack}>戻る</Button>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header.root}>
        <div className={styles.header.titleGroup}>
          <h2 className={styles.header.title}>ユーザー詳細</h2>
          <p className={styles.header.description}>{user.username}</p>
        </div>
        <Button variant="outline" onClick={handleBack}>
          一覧に戻る
        </Button>
      </div>

      {/* User Information */}
      <div className={styles.card.root}>
        <h3 className={styles.card.title}>ユーザー情報</h3>
        <div className={styles.detailGrid.root}>
          <div className={styles.detailGrid.item}>
            <span className={styles.detailGrid.label}>ユーザーID</span>
            <p className={styles.detailGrid.value}>{user.user_id}</p>
          </div>
          <div className={styles.detailGrid.item}>
            <span className={styles.detailGrid.label}>ユーザー名</span>
            <p className={styles.detailGrid.value}>{user.username}</p>
          </div>
          <div className={styles.detailGrid.item}>
            <span className={styles.detailGrid.label}>メールアドレス</span>
            <p className={styles.detailGrid.value}>{user.email}</p>
          </div>
          <div className={styles.detailGrid.item}>
            <span className={styles.detailGrid.label}>表示名</span>
            <p className={styles.detailGrid.value}>{user.display_name}</p>
          </div>
          <div className={styles.detailGrid.item}>
            <span className={styles.detailGrid.label}>状態</span>
            <p className={styles.detailGrid.value}>
              <span className={styles.statusBadge({ isActive: user.is_active })}>
                {user.is_active ? "有効" : "無効"}
              </span>
            </p>
          </div>
          <div className={styles.detailGrid.item}>
            <span className={styles.detailGrid.label}>最終ログイン</span>
            <p className={styles.detailGrid.value}>
              {user.last_login_at
                ? new Date(user.last_login_at).toLocaleString("ja-JP")
                : "未ログイン"}
            </p>
          </div>
          <div className={styles.detailGrid.item}>
            <span className={styles.detailGrid.label}>作成日時</span>
            <p className={styles.detailGrid.value}>
              {new Date(user.created_at).toLocaleString("ja-JP")}
            </p>
          </div>
          <div className={styles.detailGrid.item}>
            <span className={styles.detailGrid.label}>更新日時</span>
            <p className={styles.detailGrid.value}>
              {new Date(user.updated_at).toLocaleString("ja-JP")}
            </p>
          </div>
        </div>
      </div>

      {/* Assigned Roles */}
      <div className={styles.card.root}>
        <div className={styles.card.header}>
          <h3 className="text-lg font-semibold">割り当てられたロール</h3>
          <Button onClick={() => setShowRoleForm(!showRoleForm)}>
            {showRoleForm ? "キャンセル" : "ロールを編集"}
          </Button>
        </div>

        {!showRoleForm ? (
          <div className="flex flex-wrap gap-2">
            {user.role_codes.length > 0 ? (
              user.role_codes.map((code) => (
                <span key={code} className={styles.roleBadge}>
                  {code}
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-500">ロールが割り当てられていません</p>
            )}
          </div>
        ) : (
          <div className={styles.roleForm.root}>
            <div>
              <p className={styles.roleForm.label}>ロールを選択</p>
              <div className={styles.roleForm.checkboxGroup}>
                {roles?.map((role) => (
                  <div key={role.role_id} className={styles.roleForm.checkboxItem}>
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
                      className={styles.roleForm.checkbox}
                    />
                    <label
                      htmlFor={`role-${role.role_id}`}
                      className={styles.roleForm.checkboxLabel}
                    >
                      {role.role_name} ({role.role_code})
                      {role.description && (
                        <span className={styles.roleForm.description}>- {role.description}</span>
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

      {/* Assigned Suppliers */}
      <div className={styles.card.root}>
        <div className={styles.card.header}>
          <h3 className="text-lg font-semibold">担当仕入先 (改修中)</h3>
          <UserSupplierAssignmentDialog userId={userId} />
        </div>
        <UserSupplierAssignmentList userId={userId} />
      </div>
    </div>
  );
}
