/**
 * Step3ExecutePage
 * 素材納品書発行 Step3 実行画面
 */

/* eslint-disable max-lines-per-function */
import { format } from "date-fns";
import { FileText, Play } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";

import { useExecuteStep2, useRun } from "../hooks";

import { Button, Input } from "@/components/ui";
import { Textarea } from "@/components/ui/form/textarea";
import { ROUTES } from "@/constants/routes";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function Step3ExecutePage() {
  const { runId } = useParams();
  const id = parseInt(runId || "0", 10);
  const navigate = useNavigate();

  const { data: run, isLoading: isRunLoading } = useRun(id);
  const executeMutation = useExecuteStep2(id);

  const [flowUrl, setFlowUrl] = useState("");
  const [jsonPayload, setJsonPayload] = useState("{}");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  if (isRunLoading) return <div>Loading...</div>;
  if (!run) return <div>Run not found.</div>;

  const handleExecuteFlow = async () => {
    if (!flowUrl) {
      toast.error("Flow URLを入力してください");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("開始日と終了日を入力してください");
      return;
    }

    // JSONペイロードの検証
    try {
      JSON.parse(jsonPayload);
    } catch {
      toast.error("JSONペイロードの形式が不正です");
      return;
    }

    try {
      await executeMutation.mutateAsync({
        flow_url: flowUrl,
        json_payload: jsonPayload,
        start_date: startDate,
        end_date: endDate,
      });
      // 成功したら完了メッセージと共に一覧か詳細に戻る
      // ユーザーの要望的に「Step3結果」を見せる場所が必要かもしれないが、
      // 一旦実行完了したらステータスが変わるので一覧に戻るか、詳細に戻るか。
      // 詳細ページは「Step2確認」の位置づけでもあるが、「実行履歴」詳細として引き続き機能する。
      navigate(ROUTES.RPA.MATERIAL_DELIVERY_NOTE.RUN_DETAIL(id));
    } catch {
      // エラーハンドリングはHooks内で行われる
    }
  };

  return (
    <PageContainer>
      <div className="mb-4">
        <Link
          to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.RUN_DETAIL(id)}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Run詳細へ戻る
        </Link>
      </div>

      <PageHeader
        title={`Step3: 実行設定 (Run #${run.id})`}
        subtitle={`取込日時: ${format(new Date(run.created_at), "yyyy/MM/dd HH:mm")} のデータを使用して処理を実行します。`}
      />

      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            <FileText className="mr-2 inline-block h-5 w-5" />
            Power Automateフロー実行設定
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
              <p className="mt-1 text-xs text-gray-500">
                ※ "run_id", "executed_by", "start_date", "end_date" は自動的に付与されます。
              </p>
            </div>

            {/* 日付範囲 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="start-date"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  開始日
                </label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="end-date" className="mb-2 block text-sm font-medium text-gray-700">
                  終了日
                </label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <Button
              onClick={handleExecuteFlow}
              disabled={!flowUrl || !startDate || !endDate || executeMutation.isPending}
              className="w-full"
            >
              {executeMutation.isPending ? (
                "実行中..."
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" /> Step3を実行（Power Automate呼び出し）
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
