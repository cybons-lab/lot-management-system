/**
 * CustomerDetailPage
 * 得意先詳細/編集ページ
 */

import { ArrowLeft, Trash2, Edit } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { CustomerUpdate } from "../api/customers-api";
import { CustomerForm } from "../components/CustomerForm";
import { useUpdateCustomer, useDeleteCustomer } from "../hooks/useCustomerMutations";
import { useCustomerQuery } from "../hooks/useCustomerQuery";

import * as styles from "./styles";

import { Button } from "@/components/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/display/alert-dialog";
import { PageHeader } from "@/shared/components/layout/PageHeader";

// ============================================
// Component
// ============================================

export function CustomerDetailPage() {
  const navigate = useNavigate();
  const { customerCode } = useParams<{ customerCode: string }>();

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Data
  const { data: customer, isLoading, error } = useCustomerQuery(customerCode);
  const { mutate: updateCustomer, isPending: isUpdating } = useUpdateCustomer();
  const { mutate: deleteCustomer, isPending: isDeleting } = useDeleteCustomer();

  // 戻る
  const handleBack = useCallback(() => {
    navigate("/customers");
  }, [navigate]);

  // 更新
  const handleUpdate = useCallback(
    (data: { customer_code: string; customer_name: string }) => {
      if (!customerCode) return;

      const updateData: CustomerUpdate = {
        customer_name: data.customer_name,
      };

      updateCustomer(
        { customerCode, data: updateData },
        {
          onSuccess: () => {
            setIsEditing(false);
          },
        },
      );
    },
    [customerCode, updateCustomer],
  );

  // 削除
  const handleDelete = useCallback(() => {
    if (!customerCode) return;

    deleteCustomer(customerCode, {
      onSuccess: () => {
        navigate("/customers");
      },
    });
  }, [customerCode, deleteCustomer, navigate]);

  // ローディング
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  // エラー
  if (error || !customer) {
    return (
      <div className={styles.root}>
        <div className={styles.emptyState.container}>
          <p className={styles.emptyState.title}>得意先が見つかりません</p>
          <p className={styles.emptyState.description}>
            指定された得意先コード「{customerCode}」は存在しないか、削除されています。
          </p>
          <Button className={styles.emptyState.action} onClick={handleBack}>
            一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <PageHeader
        title={isEditing ? "得意先編集" : "得意先詳細"}
        subtitle={customer.customer_code}
        actions={
          <div className={styles.actionBar}>
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              一覧に戻る
            </Button>
            {!isEditing && (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  編集
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  削除
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* コンテンツ */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        {isEditing ? (
          <CustomerForm
            customer={customer}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
            isSubmitting={isUpdating}
          />
        ) : (
          <div className="space-y-4">
            <div className={styles.form.field}>
              <div className={styles.form.label}>得意先コード</div>
              <p className="font-mono text-lg font-medium">{customer.customer_code}</p>
            </div>
            <div className={styles.form.field}>
              <div className={styles.form.label}>得意先名</div>
              <p className="text-lg">{customer.customer_name}</p>
            </div>
            <div className={styles.form.field}>
              <div className={styles.form.label}>作成日時</div>
              <p className="text-gray-600">
                {new Date(customer.created_at).toLocaleString("ja-JP")}
              </p>
            </div>
            <div className={styles.form.field}>
              <div className={styles.form.label}>更新日時</div>
              <p className="text-gray-600">
                {new Date(customer.updated_at).toLocaleString("ja-JP")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>得意先を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              得意先「{customer.customer_name}」（{customer.customer_code}
              ）を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
