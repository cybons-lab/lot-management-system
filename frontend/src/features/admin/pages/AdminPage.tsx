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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from "@/components/ui";
import { ROUTES } from "@/constants/routes";
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
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isInventorySyncing, setIsInventorySyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<InventorySyncResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  // Test Data Generation State
  const [presets, setPresets] = useState<
    Array<{
      id: string;
      description: string;
      options: object;
    }>
  >([]);
  const [selectedPresetId, setSelectedPresetId] = useState("quick");

  // Load presets when dialog opens
  const loadPresets = async () => {
    try {
      const data = await http.get<
        Array<{
          id: string;
          description: string;
          options: object;
        }>
      >("admin/test-data/presets");
      setPresets(data);
    } catch (e) {
      console.error("Failed to load presets", e);
      // Fallback
      setPresets([
        { id: "quick", description: "開発中の素早い確認 (Small, Strict)", options: {} },
        { id: "full_coverage", description: "網羅的テスト (Medium, Strict)", options: {} },
      ]);
    }
  };

  const handleOpenGenerateDialog = () => {
    setShowGenerateConfirm(true);
    loadPresets();
  };

  const handleGenerateTestData = async () => {
    setIsGenerating(true);
    setProgress(0);
    setProgressMessage("リクエスト送信中...");

    try {
      const res = await http.post<{ job_id: string }>("admin/test-data/generate", {
        preset_id: selectedPresetId,
      });

      const jobId = res.job_id;

      const poll = async () => {
        try {
          const job = await http.get<{
            status: string;
            progress: number;
            message: string;
            error?: string;
          }>(`admin/test-data/progress/${jobId}`);
          setProgress(job.progress);
          setProgressMessage(job.message || "処理中...");

          if (job.status === "completed") {
            toast.success("テストデータを生成しました");
            setIsGenerating(false);
            setShowGenerateConfirm(false);
          } else if (job.status === "failed") {
            toast.error(`生成に失敗しました: ${job.error}`);
            setIsGenerating(false);
          } else {
            // Continue polling
            setTimeout(poll, 1000);
          }
        } catch (e) {
          console.error("Polling failed", e);
          toast.error("進捗確認に失敗しました");
          setIsGenerating(false);
        }
      };

      // Start polling
      poll();
    } catch (e) {
      toast.error("データ生成の開始に失敗しました");
      console.error(e);
      setIsGenerating(false);
    }
  };

  const handleResetDatabase = async () => {
    setIsResetting(true);
    try {
      await http.post("admin/reset-database");
      toast.success("データベースをリセットしました");
    } catch (e) {
      toast.error("データベースリセットに失敗しました");
      console.error(e);
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  const handleInventorySync = async () => {
    setIsInventorySyncing(true);
    setSyncResult(null);
    try {
      const result = await http.post<InventorySyncResult>(
        "admin/batch-jobs/inventory-sync/execute",
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
              onClick={() => handleOpenGenerateDialog()}
            >
              テストデータ生成（開発用）
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => setShowResetConfirm(true)}
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
              <Link to={ROUTES.ADMIN.CLIENT_LOGS}>クライアントログ表示</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/operation-logs">操作ログ（監査ログ）</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to={ROUTES.ADMIN.DEPLOY}>システムデプロイ</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to={ROUTES.ADMIN.SYSTEM_SETTINGS}>システム設定</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Generate Confirm Dialog */}
      <AlertDialog
        open={showGenerateConfirm}
        onOpenChange={(open) => {
          if (!open) {
            // Reset state when dialog is closed
            setIsGenerating(false);
            setProgress(0);
            setProgressMessage("");
          }
          setShowGenerateConfirm(open);
        }}
      >
        <AlertDialogContent
          onEscapeKeyDown={(e) => {
            if (isGenerating) {
              // Allow closing even during generation
              e.preventDefault();
              setIsGenerating(false);
              setProgress(0);
              setProgressMessage("");
              setShowGenerateConfirm(false);
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>テストデータを生成しますか？</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 py-4">
                {isGenerating ? (
                  <div className="space-y-2">
                    <Label>
                      生成中... {progress}% ({progressMessage})
                    </Label>
                    <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-2.5 rounded-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      この処理には数分かかる場合があります。画面を閉じないでください。
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>生成プリセット</Label>
                      <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
                        <SelectTrigger>
                          <SelectValue placeholder="プリセットを選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {presets.map((preset) => (
                            <SelectItem key={preset.id} value={preset.id}>
                              {preset.id} - {preset.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p>
                      既存のデータ（マスタ・在庫・受注など）は全て削除され、新しいテストデータで上書きされます。
                      この操作は取り消せません。
                    </p>
                  </>
                )}
              </div>
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

      {/* Reset Confirm Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>データベースをリセットしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              テーブル構造は維持したまま、全てのデータが削除されます。 この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                handleResetDatabase();
              }}
              disabled={isResetting}
            >
              {isResetting ? "リセット中..." : "実行する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
