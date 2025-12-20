/**
 * Step1Page - 進度実績ダウンロード
 * Power Automateフローを呼び出して進度実績をダウンロード
 */

/* eslint-disable max-lines-per-function, complexity */
import { AlertCircle, Clock, Download, Play, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useCloudFlowQueueStatus, useCreateCloudFlowJob } from "../hooks/useCloudFlow";

import { Button, Input } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/AuthContext";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function Step1Page() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 日付入力
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // API hooks
  const { data: queueStatus, isLoading: isLoadingQueue } =
    useCloudFlowQueueStatus("progress_download");
  const createJobMutation = useCreateCloudFlowJob();

  const handleExecute = async () => {
    if (!startDate || !endDate) {
      toast.error("開始日と終了日を入力してください");
      return;
    }

    if (user?.roles?.includes("guest")) {
      toast.error("ゲストユーザーは実行できません");
      return;
    }

    try {
      await createJobMutation.mutateAsync({
        job_type: "progress_download",
        start_date: startDate,
        end_date: endDate,
      });
      toast.success("実行を予約しました");
    } catch {
      // エラーはhooksでハンドリング済み
    }
  };

  const isRunning = !!queueStatus?.current_job;
  const runningUser = queueStatus?.current_job?.requested_by;
  const yourPosition = queueStatus?.your_position;

  return (
    <PageContainer>
      <PageHeader
        title="Step1: 進度実績ダウンロード"
        subtitle="Power Automateフローを呼び出して進度実績データをダウンロードします。"
      />

      <div className="mx-auto max-w-2xl space-y-6">
        {/* メインセクション */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            <Download className="mr-2 inline-block h-5 w-5" />
            進度実績ダウンロード
          </h2>

          <div className="space-y-4">
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

            {/* 実行中ステータス表示 */}
            {!isLoadingQueue && isRunning && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">
                      <User className="mr-1 inline-block h-4 w-4" />
                      {runningUser}さんが実行中です
                    </p>
                    {yourPosition && (
                      <p className="mt-1 text-sm text-amber-700">
                        <Clock className="mr-1 inline-block h-4 w-4" />
                        あなたは待ち順番 {yourPosition}番目です。終わり次第実行します。
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ゲストユーザー警告 */}
            {user?.roles?.includes("guest") && (
              <div className="rounded-md border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">
                  ⚠️ ゲストユーザーは実行できません。ログインしてください。
                </p>
              </div>
            )}

            {/* 実行ボタン */}
            <Button
              onClick={handleExecute}
              disabled={
                !startDate ||
                !endDate ||
                createJobMutation.isPending ||
                user?.roles?.includes("guest")
              }
              className="w-full"
            >
              {createJobMutation.isPending ? (
                "予約中..."
              ) : isRunning ? (
                <>
                  <Clock className="mr-2 h-4 w-4" /> 実行予約
                </>
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
              <li>日付範囲を指定して実行ボタンを押してください</li>
              <li>他のユーザーが実行中の場合はキューに追加されます</li>
              <li>実行結果は履歴ページで確認できます</li>
            </ul>
          </div>
        </div>

        {/* 戻るボタン */}
        <Button variant="outline" onClick={() => navigate(ROUTES.RPA.MATERIAL_DELIVERY_NOTE.ROOT)}>
          ← RPAメニューへ戻る
        </Button>
      </div>
    </PageContainer>
  );
}
