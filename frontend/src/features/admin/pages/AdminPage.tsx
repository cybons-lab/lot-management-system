import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

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
} from "@/components/ui";
import { http } from "@/shared/api/http-client";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

interface InventorySyncResult {
  success: boolean;
  message: string;
  data?: {
    checked_products: number;
    discrepancies_found: number;
    alerts_created: number;
    details: unknown[];
  };
}

export function AdminPage() {
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInventorySyncing, setIsInventorySyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<InventorySyncResult | null>(null);

  const handleGenerateTestData = async () => {
    setIsGenerating(true);
    try {
      await http.post("admin/test-data/generate");
      toast.success("テストデータを生成しました");
    } catch (e) {
      toast.error("テストデータ生成に失敗しました");
      console.error(e);
    } finally {
      setIsGenerating(false);
      setShowGenerateConfirm(false);
    }
  };

  const handleInventorySync = async () => {
    setIsInventorySyncing(true);
    setSyncResult(null);
    try {
      const result = await http.post<InventorySyncResult>(
        "/admin/batch-jobs/inventory-sync/execute",
      );
      setSyncResult(result);

      if (result.success) {
        if (result.data && result.data.discrepancies_found > 0) {
          toast.warning(
            `SAP在庫チェック完了: ${result.data.discrepancies_found}件の差異を検出しました`,
          );
        } else {
          toast.success("SAP在庫チェック完了: 差異はありませんでした");
        }
      }
    } catch (e) {
      toast.error("SAP在庫チェックに失敗しました");
      console.error(e);
    } finally {
      setIsInventorySyncing(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader title="管理機能" subtitle="システム管理と危険な操作を実行できます" />

      <div className="border-destructive bg-destructive/10 rounded-lg border p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="text-destructive mt-0.5 h-6 w-6 flex-shrink-0" />
          <div>
            <h3 className="text-destructive mb-2 text-lg font-semibold">警告</h3>
            <p className="text-muted-foreground text-sm">
              この画面の操作は取り消すことができません。慎重に操作してください。
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-card rounded-lg border p-6">
          <h3 className="mb-4 text-lg font-semibold">データベース操作</h3>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="text-muted-foreground w-full justify-start"
              onClick={() => toast.info("この機能はまだ実装されていません")}
            >
              データベースバックアップ（未実装）
            </Button>
            <Button
              variant="outline"
              className="text-muted-foreground w-full justify-start"
              onClick={() => toast.info("この機能はまだ実装されていません")}
            >
              データインポート/エクスポート（未実装）
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => setShowGenerateConfirm(true)}
            >
              テストデータ生成（開発用）
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => toast.info("この機能はまだ実装されていません")}
            >
              データベースリセット（開発用）
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <h3 className="mb-4 text-lg font-semibold">SAP連携</h3>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleInventorySync}
              disabled={isInventorySyncing}
            >
              {isInventorySyncing ? "チェック中..." : "SAP在庫トータルチェック実行"}
            </Button>
          </div>
          {syncResult && (
            <div className="bg-muted/50 mt-4 rounded-md p-4 text-sm">
              <p className="mb-2 font-semibold">最新の実行結果:</p>
              <p className="text-muted-foreground">{syncResult.message}</p>
              {syncResult.data && (
                <div className="mt-2 space-y-1 text-xs">
                  <p>チェック商品数: {syncResult.data.checked_products}</p>
                  <p>差異検出数: {syncResult.data.discrepancies_found}</p>
                  <p>アラート作成数: {syncResult.data.alerts_created}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg border p-6">
          <h3 className="mb-4 text-lg font-semibold">システム設定</h3>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/batch-jobs">バッチジョブ管理</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/client-logs">クライアントログ表示</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Generate Confirm Dialog */}
      <AlertDialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>テストデータを生成しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              既存のデータ（マスタ・在庫・受注など）は全て削除され、新しいテストデータで上書きされます。
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isGenerating}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                handleGenerateTestData();
              }}
              disabled={isGenerating}
            >
              {isGenerating ? "生成中..." : "実行する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
