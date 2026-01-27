import { Info } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CloudFlowHelp() {
  const schemaJson = `{
    "start_date": "2024-02-01",
    "end_date": "2024-02-29",
    "executed_by": "kazuya",
    "job_id": 105
}`;

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          <CardTitle className="text-lg">Power Automate設定ガイド</CardTitle>
        </div>
        <CardDescription>
          クラウドフローを作成する際は、以下の設定を参考にしてください。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <details className="group rounded-lg border px-4 py-2 [&_summary]:cursor-pointer">
          <summary className="flex items-center justify-between font-medium text-sm group-open:mb-2">
            1. HTTP要求の受信（トリガー）設定
            <span className="text-muted-foreground transition-transform group-open:rotate-180">
              ▼
            </span>
          </summary>
          <div className="text-sm space-y-2 mt-2">
            <p>
              「HTTP
              要求の受信時」トリガーを追加し、以下のJSONを使用してスキーマを生成してください。
            </p>
            <pre className="bg-muted p-2 rounded overflow-x-auto text-xs font-mono">
              {schemaJson}
            </pre>
            <ul className="list-disc list-inside text-muted-foreground text-xs ml-2 space-y-1">
              <li>日付形式: YYYY-MM-DD</li>
              <li>executed_by: 実行ユーザー名</li>
              <li>job_id: ログ用ID</li>
            </ul>
          </div>
        </details>

        <details className="group rounded-lg border px-4 py-2 [&_summary]:cursor-pointer">
          <summary className="flex items-center justify-between font-medium text-sm group-open:mb-2">
            2. 応答（Response）設定
            <span className="text-muted-foreground transition-transform group-open:rotate-180">
              ▼
            </span>
          </summary>
          <div className="text-sm space-y-2 mt-2">
            <p>
              「応答」アクションを追加し、ステータスコード <strong>200</strong> または{" "}
              <strong>202</strong> を返してください。
            </p>
            <ul className="list-disc list-inside text-muted-foreground text-xs ml-2 space-y-1">
              <li>本文: 空のJSON {"{}"} でOK</li>
              <li>
                <strong>重要:</strong> バックエンドのタイムアウトは
                <span className="font-bold text-red-500">30秒</span>です。
                処理が長引く場合は、フローの先頭でレスポンスを返してから処理を続けてください。
              </li>
            </ul>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
