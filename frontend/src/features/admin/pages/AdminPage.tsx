import { AlertCircle } from "lucide-react";
import { useState } from "react";
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
import { http } from "@/shared/libs/http";

export function AdminPage() {
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateTestData = async () => {
    setIsGenerating(true);
    try {
      await http.post("/admin/test-data/generate");
      toast.success("テストデータを生成しました");
    } catch (e) {
      toast.error("テストデータ生成に失敗しました");
      console.error(e);
    } finally {
      setIsGenerating(false);
      setShowGenerateConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-destructive text-3xl font-bold tracking-tight">管理機能</h2>
        <p className="text-muted-foreground">システム管理と危険な操作を実行できます</p>
      </div>

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
            <Button variant="outline" className="w-full justify-start">
              データベースバックアップ
            </Button>
            <Button variant="outline" className="w-full justify-start">
              データインポート/エクスポート
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowGenerateConfirm(true)}
            >
              テストデータ生成（開発用）
            </Button>
            <Button variant="destructive" className="w-full justify-start">
              データベースリセット（開発用）
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <h3 className="mb-4 text-lg font-semibold">システム設定</h3>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              マスタデータ管理
            </Button>
            <Button variant="outline" className="w-full justify-start">
              ユーザー管理
            </Button>
            <Button variant="outline" className="w-full justify-start">
              システムログ表示
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
    </div>
  );
}
