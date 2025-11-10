import { AlertCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SeedDataPage } from "@/features/admin/pages/SeedDataPage";

export function AdminPage() {
  const [showSeedData, setShowSeedData] = useState(false);

  if (showSeedData) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => setShowSeedData(false)} className="mb-4">
          ← 管理画面に戻る
        </Button>
        <SeedDataPage />
      </div>
    );
  }

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
              onClick={() => setShowSeedData(true)}
            >
              テストデータ投入（開発用）
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
    </div>
  );
}
