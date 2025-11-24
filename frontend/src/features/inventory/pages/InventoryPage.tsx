/**
 * InventoryPage.tsx
 *
 * ロット管理画面（リファクタリング版）
 * - コンポーネント分離により保守性を向上
 * - 型安全性を向上
 * - クライアントサイドフィルタリング機能を実装
 */

import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { LotCreateForm, type LotCreateData } from "../components/LotCreateForm";
import { LotFilters } from "../components/LotFilters";
import { LotStatsCards } from "../components/LotStatsCards";
import { LotTable } from "../components/LotTable";
import type { LotFilterValues } from "../hooks/useLotFilters";
import { useLotFilters } from "../hooks/useLotFilters";
import { useLotStats } from "../hooks/useLotStats";

import * as styles from "./styles";

import { Button } from "@/components/ui";
import { useLotsQuery } from "@/hooks/api";
import { useCreateLot } from "@/hooks/mutations";
import { useDialog, useTable, useFilters } from "@/hooks/ui";
import { FormDialog } from "@/shared/components/form";
import { PageHeader, PageContainer, Section } from "@/shared/components/layout";

/**
 * ロット管理ページ
 */
export function InventoryPage() {
  // UI状態管理
  const createDialog = useDialog();
  const table = useTable({
    initialPageSize: 25,
    initialSort: { column: "receipt_date", direction: "desc" },
  });

  // フィルター状態管理
  const filters = useFilters<LotFilterValues>({
    search: "",
    product_code: "",
    delivery_place_code: "",
    status: "all",
    hasStock: false,
  });

  // データ取得
  const {
    data: allLots = [],
    isLoading,
    error,
    refetch,
  } = useLotsQuery({
    product_code: filters.values.product_code || undefined,
    with_stock: filters.values.hasStock,
  });

  // クライアントサイドフィルタリング
  const filteredLots = useLotFilters(allLots, filters.values);

  // 統計情報計算
  const stats = useLotStats(filteredLots);

  // ロット作成Mutation
  const createLotMutation = useCreateLot({
    onSuccess: () => {
      toast.success("ロットを作成しました");
      createDialog.close();
      refetch();
    },
    onError: (error) => {
      toast.error(`作成に失敗しました: ${error.message}`);
    },
  });

  // フォーム送信ハンドラ
  const handleCreateLot = async (data: LotCreateData) => {
    await createLotMutation.mutateAsync(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <PageContainer maxWidth="2xl" className="space-y-6">
        <PageHeader
          title="ロット管理"
          subtitle="在庫ロットの一覧と登録"
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                更新
              </Button>
              <Button size="sm" onClick={createDialog.open}>
                <Plus className="mr-2 h-4 w-4" />
                新規登録
              </Button>
            </>
          }
        />

        {/* 統計情報 */}
        <LotStatsCards stats={stats} />

        {/* フィルター */}
        <Section className="mb-6 shadow-sm">
          <LotFilters filters={filters.values} onFilterChange={filters.set} onReset={filters.reset} />
        </Section>

        {/* エラー表示 */}
        {error && (
          <Section className="shadow-sm">
            <div className={styles.errorState.root}>
              <p className={styles.errorState.title}>データの取得に失敗しました</p>
              <p className={styles.errorState.message}>
                {error instanceof Error ? error.message : "サーバーエラーが発生しました"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className={styles.errorState.retryButton}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                再試行
              </Button>
            </div>
          </Section>
        )}

        {/* テーブル */}
        <Section className="shadow-sm">
          <LotTable lots={filteredLots} table={table} isLoading={isLoading} error={error} />
        </Section>

        {/* 新規登録ダイアログ */}
        <FormDialog
          open={createDialog.isOpen}
          onClose={createDialog.close}
          title="ロット新規登録"
          description="新しいロットを登録します"
          size="lg"
        >
          <LotCreateForm
            onSubmit={handleCreateLot}
            onCancel={createDialog.close}
            isSubmitting={createLotMutation.isPending}
          />
        </FormDialog>
      </PageContainer>
    </div>
  );
}
