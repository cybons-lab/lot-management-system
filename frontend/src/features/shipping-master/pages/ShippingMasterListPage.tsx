/**
 * 出荷用マスタデータ一覧ページ
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { Plus, Download, Trash2, RefreshCw } from "lucide-react";
import { useState } from "react";

import { shippingMasterApi } from "../api";
import { ShippingMasterEditDialog } from "../components/ShippingMasterEditDialog";
import { ShippingMasterFilters } from "../components/ShippingMasterFilters";
import { ShippingMasterImportDialog } from "../components/ShippingMasterImportDialog";
import { ShippingMasterSyncDialog } from "../components/ShippingMasterSyncDialog";
import { ShippingMasterTable } from "../components/ShippingMasterTable";

import { Button, Card, CardContent } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";
import httpClient from "@/shared/api/http-client";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { type components } from "@/types/api";

/* eslint-disable max-lines-per-function */
export function ShippingMasterListPage() {
  const [customerCode, setCustomerCode] = useState("");
  const [materialCode, setMaterialCode] = useState("");
  const [jikuCode, setJikuCode] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<
    components["schemas"]["ShippingMasterCuratedResponse"] | null
  >(null);

  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("admin") ?? false;
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["shipping-masters", { customerCode, materialCode, jikuCode }],
    queryFn: () =>
      shippingMasterApi.list({
        customer_code: customerCode || undefined,
        material_code: materialCode || undefined,
        jiku_code: jikuCode || undefined,
      }),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      await httpClient.delete("shipping-masters/admin/reset");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-masters"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, version }: { id: number; version: number }) => {
      await shippingMasterApi.delete(id, version);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-masters"] });
    },
    onError: (error: Error) => {
      const isConflict = error instanceof HTTPError && error.response?.status === 409;
      if (isConflict) {
        alert("他のユーザーが更新しました。最新データを取得して再度お試しください。");
        queryClient.invalidateQueries({ queryKey: ["shipping-masters"] });
      }
    },
  });

  const handleReset = () => {
    if (window.confirm("全ての出荷用マスタデータを削除します。よろしいですか？")) {
      resetMutation.mutate();
    }
  };

  const handleEdit = (row: components["schemas"]["ShippingMasterCuratedResponse"]) => {
    setSelectedItem(row);
    setEditDialogOpen(true);
  };

  const handleDelete = (row: components["schemas"]["ShippingMasterCuratedResponse"]) => {
    if (window.confirm(`出荷用マスタデータ (ID: ${row.id}) を削除します。よろしいですか？`)) {
      deleteMutation.mutate({ id: row.id, version: row.version });
    }
  };

  const handleCreateNew = () => {
    setSelectedItem(null);
    setEditDialogOpen(true);
  };

  const handleDialogClose = () => {
    setEditDialogOpen(false);
    setSelectedItem(null);
  };

  const handleExport = async () => {
    try {
      await shippingMasterApi.export();
    } catch (err) {
      console.error("Export failed:", err);
      alert("エクスポートに失敗しました。");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="出荷用マスタデータ" subtitle="OCR受注登録で使用する出荷ルールを管理" />

      <ShippingMasterFilters
        customerCode={customerCode}
        materialCode={materialCode}
        jikuCode={jikuCode}
        onCustomerCodeChange={setCustomerCode}
        onMaterialCodeChange={setMaterialCode}
        onJikuCodeChange={setJikuCode}
      />

      {/* アクション */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">{data && `${data.total}件のデータ`}</div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={resetMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              全削除
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Excelエクスポート
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSyncDialogOpen(true)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            マスタ同期
          </Button>
          <ShippingMasterImportDialog />
          <Button size="sm" onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Button>
        </div>
      </div>

      {/* テーブル */}
      <Card>
        <CardContent className="p-0">
          <ShippingMasterTable
            items={data?.items || []}
            isLoading={isLoading}
            error={error}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      {/* 編集・新規作成ダイアログ */}
      <ShippingMasterEditDialog
        open={editDialogOpen}
        onOpenChange={handleDialogClose}
        item={selectedItem}
      />

      {/* マスタ同期ダイアログ */}
      <ShippingMasterSyncDialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen} />
    </div>
  );
}
