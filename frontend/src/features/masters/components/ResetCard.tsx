/**
 * ResetCard - データベース初期化カード
 * 開発・検証環境用のデータベースリセット機能
 */

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
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

interface ResetCardProps {
  isResetting: boolean;
  onReset: () => Promise<boolean>;
}

export function ResetCard({ isResetting, onReset }: ResetCardProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleConfirm = async () => {
    setIsConfirmOpen(false);
    await onReset();
  };

  return (
    <>
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <Trash2 className="h-5 w-5" />
            データベース初期化
          </CardTitle>
          <CardDescription className="text-red-700">
            全てのマスタデータを削除し、クリーンな状態に戻します（開発・検証環境用）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-red-300 bg-white p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div className="text-sm">
                <p className="font-medium text-red-800">この操作は元に戻せません</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-red-700">
                  <li>全てのマスタデータが削除されます</li>
                  <li>テーブル構造とマイグレーション履歴は保持されます</li>
                  <li>本番環境では実行できません</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            variant="destructive"
            onClick={() => setIsConfirmOpen(true)}
            disabled={isResetting}
            className="w-full"
          >
            {isResetting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                リセット中...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                データベースをリセット
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              データベースをリセットしますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              全てのマスタデータが完全に削除されます。この操作は取り消すことができません。
              開発・検証環境でのテストデータ準備などの目的でのみ使用してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              リセットを実行
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
