/**
 * UserDetailDialog
 * ユーザー詳細・編集ダイアログ
 */
import { Edit, Trash2 } from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { toast } from "sonner";

import type { UpdateUserRequest } from "../api";
import { useUser, useUpdateUser, useDeleteUser, useAssignUserRoles } from "../hooks";

import { UserEditForm } from "./UserEditForm";

import { PermanentDeleteDialog } from "@/components/common";
import { Button } from "@/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs";
import {
  UserSupplierAssignmentDialog,
  UserSupplierAssignmentList,
} from "@/features/assignments/components";
import { useRoles } from "@/features/roles/hooks";

interface UserDetailDialogProps {
  userId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailDialog({ userId, open, onOpenChange }: UserDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingRoles, setIsEditingRoles] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  const { data: user, isLoading } = useUser(userId || 0);
  const { data: roles } = useRoles();

  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const assignRolesMutation = useAssignUserRoles();

  // Reset states when dialog opens/closes or user changes
  useEffect(() => {
    if (open) {
      setIsEditing(false);
      setIsEditingRoles(false);
    }
  }, [open, userId]);

  // Initialize selectedRoleIds based on user's current roles
  useEffect(() => {
    if (isEditingRoles && user && roles) {
      const currentRoleIds = roles
        .filter((role) => user.role_codes.includes(role.role_code))
        .map((role) => role.id);
      setSelectedRoleIds(currentRoleIds);
    }
  }, [isEditingRoles, user, roles]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleUpdate = async (data: UpdateUserRequest) => {
    if (!userId) return;
    try {
      await updateMutation.mutateAsync({ userId, data });
      toast.success("ユーザー情報を更新しました");
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update user:", error);
      toast.error("ユーザー情報の更新に失敗しました");
    }
  };

  const handleAssignRoles = async () => {
    if (!userId) return;
    try {
      await assignRolesMutation.mutateAsync({
        userId,
        data: { role_ids: selectedRoleIds },
      });
      toast.success("ロールを割り当てました");
      setIsEditingRoles(false);
    } catch (error) {
      console.error("Failed to assign roles:", error);
      toast.error("ロール割り当てに失敗しました");
    }
  };

  const handleConfirmDelete = async () => {
    if (!userId) return;
    try {
      await deleteMutation.mutateAsync(userId);
      toast.success("ユーザーを削除しました");
      setIsDeleteDialogOpen(false);
      handleClose();
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("削除に失敗しました");
    }
  };

  if (!userId && !open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              ユーザー詳細
              {user && (
                <span className="ml-4 text-sm font-normal text-muted-foreground">
                  {user.username}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {isLoading || !user ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
            </div>
          ) : (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">基本情報</TabsTrigger>
                <TabsTrigger value="roles">ロール</TabsTrigger>
                <TabsTrigger value="suppliers">担当仕入先</TabsTrigger>
              </TabsList>

              {/* 基本情報タブ */}
              <TabsContent value="basic" className="space-y-6 pt-4">
                {isEditing ? (
                  <UserEditForm
                    user={user}
                    onSubmit={handleUpdate}
                    onCancel={() => setIsEditing(false)}
                    isSubmitting={updateMutation.isPending}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">ユーザー名</span>
                        <p className="font-mono text-lg font-medium">{user.username}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">表示名</span>
                        <p className="text-lg font-medium">{user.display_name}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">メールアドレス</span>
                      <p className="text-lg">{user.email}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">ステータス</span>
                        <p className="text-sm font-medium">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                          >
                            {user.is_active ? "有効" : "無効"}
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">最終ログイン</span>
                        <p className="text-sm text-gray-600">
                          {user.last_login_at
                            ? new Date(user.last_login_at).toLocaleString("ja-JP")
                            : "未ログイン"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">作成日時</span>
                        <p className="text-sm text-gray-600">
                          {new Date(user.created_at).toLocaleString("ja-JP")}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">更新日時</span>
                        <p className="text-sm text-gray-600">
                          {new Date(user.updated_at).toLocaleString("ja-JP")}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t pt-4">
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        編集
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setIsDeleteDialogOpen(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        削除
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ロールタブ */}
              <TabsContent value="roles" className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">割り当てられたロール</h3>
                    <Button
                      variant={isEditingRoles ? "outline" : "default"}
                      size="sm"
                      onClick={() => setIsEditingRoles(!isEditingRoles)}
                    >
                      {isEditingRoles ? "キャンセル" : "ロールを編集"}
                    </Button>
                  </div>

                  {!isEditingRoles ? (
                    <div className="flex flex-wrap gap-2">
                      {user.role_codes.length > 0 ? (
                        user.role_codes.map((code) => (
                          <span
                            key={code}
                            className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10"
                          >
                            {code}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">ロールが割り当てられていません</p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-md border p-4">
                      <p className="mb-4 text-sm font-medium">ロールを選択</p>
                      <div className="space-y-2">
                        {roles?.map((role) => (
                          <div key={role.id} className="flex items-start">
                            <input
                              type="checkbox"
                              id={`role-${role.id}`}
                              checked={selectedRoleIds.includes(role.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRoleIds([...selectedRoleIds, role.id]);
                                } else {
                                  setSelectedRoleIds(
                                    selectedRoleIds.filter((id) => id !== role.id),
                                  );
                                }
                              }}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label
                              htmlFor={`role-${role.id}`}
                              className="ml-2 cursor-pointer text-sm"
                            >
                              <span className="font-medium text-gray-900">
                                {role.role_name} ({role.role_code})
                              </span>
                              {role.description && (
                                <p className="text-xs text-gray-500">{role.description}</p>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          size="sm"
                          onClick={handleAssignRoles}
                          disabled={assignRolesMutation.isPending}
                        >
                          {assignRolesMutation.isPending ? "割り当て中..." : "保存"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* 担当仕入先タブ */}
              <TabsContent value="suppliers" className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <UserSupplierAssignmentDialog userId={user.user_id} />
                  </div>
                  <UserSupplierAssignmentList userId={user.user_id} />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {user && (
        <PermanentDeleteDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          isPending={deleteMutation.isPending}
          title="ユーザーを削除しますか？"
          description={`${user.display_name}（${user.username}）を削除します。この操作は取り消せません。`}
          confirmationPhrase={user.username}
        />
      )}
    </>
  );
}
