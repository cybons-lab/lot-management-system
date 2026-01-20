/**
 * 出荷用マスタデータ一覧ページ
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Download, Trash2 } from "lucide-react";
import { useState } from "react";

import { shippingMasterApi } from "../api";
import { ShippingMasterFilters } from "../components/ShippingMasterFilters";
import { ShippingMasterImportDialog } from "../components/ShippingMasterImportDialog";
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
    mutationFn: async (id: number) => {
      await shippingMasterApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-masters"] });
    },
  });

  const handleReset = () => {
    if (window.confirm("全ての出荷用マスタデータを削除します。よろしいですか？")) {
      resetMutation.mutate();
    }
  };

  const handleEdit = (row: components["schemas"]["ShippingMasterCuratedResponse"]) => {
    // TODO: 編集モーダルまたは編集ページへの遷移を実装
    console.log("Edit shipping master:", row.id);
  };

  const handleDelete = (row: components["schemas"]["ShippingMasterCuratedResponse"]) => {
    if (window.confirm(`出荷用マスタデータ (ID: ${row.id}) を削除します。よろしいですか？`)) {
      deleteMutation.mutate(row.id);
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
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Excelエクスポート
          </Button>
          <ShippingMasterImportDialog />
          <Button size="sm">
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
    </div>
  );
}
