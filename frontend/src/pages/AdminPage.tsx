import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-destructive">管理機能</h2>
        <p className="text-muted-foreground">システム管理と危険な操作を実行できます</p>
      </div>

      <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-destructive mb-2">警告</h3>
            <p className="text-sm text-muted-foreground">
              この画面の操作は取り消すことができません。慎重に操作してください。
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">データベース操作</h3>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              データベースバックアップ
            </Button>
            <Button variant="outline" className="w-full justify-start">
              データインポート/エクスポート
            </Button>
            <Button variant="destructive" className="w-full justify-start">
              データベースリセット（開発用）
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">システム設定</h3>
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
    </div>
  );
}
