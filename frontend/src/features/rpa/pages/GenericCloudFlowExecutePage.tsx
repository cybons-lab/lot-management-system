/**
 * CloudFlowExecutePage
 * 汎用クラウドフロー実行画面（デバッグ・運用回避用）
 */

/* eslint-disable max-lines-per-function */
import { FileText, Play } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useExecuteGenericCloudFlow } from "../hooks";

import { Button, Input } from "@/components/ui";
import { Textarea } from "@/components/ui/form/textarea";
import { ROUTES } from "@/constants/routes";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function GenericCloudFlowExecutePage() {
  const navigate = useNavigate();

  // Power Automateフロー呼び出し
  const [flowUrl, setFlowUrl] = useState("");
  const [jsonPayload, setJsonPayload] = useState("{}");
  const executeMutation = useExecuteGenericCloudFlow();

  const handleExecuteFlow = async () => {
    if (!flowUrl) {
      toast.error("Flow URLを入力してください");
      return;
    }

    // JSONペイロードの検証とパース
    let parsedPayload: Record<string, unknown> = {};
    try {
      if (jsonPayload.trim()) {
        parsedPayload = JSON.parse(jsonPayload);
      }
    } catch {
      toast.error("JSONペイロードの形式が不正です");
      return;
    }

    await executeMutation.mutateAsync({
      flow_url: flowUrl,
      json_payload: parsedPayload,
    });

    toast.success("フロー実行リクエストを送信しました");
  };

  return (
    <PageContainer>
      <PageHeader
        title="クラウドフロー実行 (汎用)"
        subtitle="Runデータに依存せず、直接Power Automateフローを実行します。"
      />

      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            <FileText className="mr-2 inline-block h-5 w-5" />
            Power Automateフロー実行
          </h2>

          <div className="space-y-4">
            {/* Flow URL */}
            <div>
              <label htmlFor="flow-url" className="mb-2 block text-sm font-medium text-gray-700">
                Flow URL（HTTP Trigger）
              </label>
              <Input
                id="flow-url"
                type="url"
                value={flowUrl}
                onChange={(e) => setFlowUrl(e.target.value)}
                placeholder="https://prod-xx.westus.logic.azure.com/..."
                className="w-full"
              />
            </div>

            {/* JSON Payload */}
            <div>
              <label
                htmlFor="json-payload"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                JSONペイロード
              </label>
              <Textarea
                id="json-payload"
                value={jsonPayload}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setJsonPayload(e.target.value)
                }
                placeholder='{"key": "value"}'
                className="min-h-[100px] w-full font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleExecuteFlow}
              disabled={!flowUrl || executeMutation.isPending}
              className="w-full"
            >
              {executeMutation.isPending ? (
                "実行中..."
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" /> フロー実行
                </>
              )}
            </Button>
          </div>

          {/* 説明 */}
          <div className="mt-4 rounded-md bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              <strong>ℹ️ 使用方法</strong>
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-800">
              <li>Power AutomateのHTTP TriggerのURLを入力してください</li>
              <li>必要に応じてJSONペイロードを編集してください</li>
              <li>フロー実行ボタンを押してください</li>
            </ul>
          </div>
        </div>

        {/* 戻るボタン */}
        <Button variant="outline" onClick={() => navigate(ROUTES.RPA.ROOT)}>
          ← RPAトップへ戻る
        </Button>
      </div>
    </PageContainer>
  );
}
