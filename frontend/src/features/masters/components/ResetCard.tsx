/**
 * ResetCard.tsx
 * データベース初期化用カードコンポーネント
 */

import { AlertTriangle, Trash2 } from "lucide-react";

import { useDatabaseReset } from "../hooks/useDatabaseReset";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui";

export function ResetCard() {
  const { isResetting, handleReset } = useDatabaseReset();

  return (
    <Card className="border-red-200 bg-red-50/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-red-600" />
          <CardTitle className="text-red-900">データベース初期化</CardTitle>
        </div>
        <CardDescription>システム内の全データを削除し、初期状態に戻します。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>注意</AlertTitle>
          <AlertDescription>
            この操作は取り消せません。以下のデータが全て完全に削除されます：
            <ul className="mt-2 list-inside list-disc">
              <li>全ての受注データ・引当情報</li>
              <li>全ての在庫情報・移動履歴</li>
              <li>入荷予定・需要予測データ</li>
              <li>自動生成されたマスタデータ</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isResetting}>
                {isResetting ? "初期化中..." : "データベースを初期化する"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>本当に実行しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  この操作は取り消せません。データベース内の全データが永久に削除されます。
                  バックアップが必要な場合は、事前にエクスポートを行ってください。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset} className="bg-red-600 hover:bg-red-700">
                  実行する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
