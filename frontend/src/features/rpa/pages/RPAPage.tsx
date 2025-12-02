/**
 * RPAPage
 * RPA実行ページ - 素材納品書発行
 */

import { FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { useExecuteMaterialDeliveryDocument } from "../hooks";

import { Button, Input } from "@/components/ui";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function RPAPage() {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isExecuting, setIsExecuting] = useState(false);
    const [progress, setProgress] = useState(0);

    const executeMutation = useExecuteMaterialDeliveryDocument();

    // プログレスバーのアニメーション
    useEffect(() => {
        if (!isExecuting) {
            setProgress(0);
            return;
        }

        const startTime = Date.now();
        const duration = 60000; // 60秒

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / duration) * 100, 100);
            setProgress(newProgress);

            if (newProgress >= 100) {
                setIsExecuting(false);
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isExecuting]);

    const canExecute = startDate && endDate && !isExecuting;

    const handleExecute = async () => {
        if (!startDate || !endDate) {
            toast.error("開始日と終了日を両方入力してください");
            return;
        }

        try {
            const result = await executeMutation.mutateAsync({
                start_date: startDate,
                end_date: endDate,
            });

            toast.success(result.message);
            setIsExecuting(true);
        } catch (error: unknown) {
            // HTTPエラーのチェック
            if (error && typeof error === "object" && "response" in error) {
                const httpError = error as { response?: { status?: number } };
                if (httpError.response?.status === 409) {
                    toast.error("他のユーザーが実行中です。時間をおいて実施してください");
                    return;
                }
            }
            toast.error("実行に失敗しました");
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="RPA" subtitle="素材納品書発行などのRPA処理を実行" />

            {/* メインコンテンツ */}
            <div className="mx-auto max-w-2xl">
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-6 text-lg font-semibold text-gray-900">素材納品書発行</h2>

                    {/* 日付範囲入力 */}
                    <div className="mb-6 space-y-4">
                        <div>
                            <label htmlFor="start-date" className="mb-2 block text-sm font-medium text-gray-700">
                                開始日
                            </label>
                            <Input
                                id="start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                disabled={isExecuting}
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
                                disabled={isExecuting}
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* 実行ボタン */}
                    <Button
                        onClick={handleExecute}
                        disabled={!canExecute}
                        className="w-full"
                        size="lg"
                        variant={isExecuting ? "outline" : "default"}
                    >
                        <FileText className="mr-2 h-5 w-5" />
                        {isExecuting ? "実行中..." : "素材納品書発行"}
                    </Button>

                    {/* プログレスバー */}
                    {isExecuting && (
                        <div className="mt-6">
                            <div className="mb-2 flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-700">処理中</span>
                                <span className="text-gray-600">{Math.round(progress)}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                <div
                                    className="h-full bg-indigo-600 transition-all duration-100 ease-linear"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="mt-3 text-sm text-gray-600">
                                他のユーザーが実行中です。時間をおいて実施してください（残り約
                                {Math.round((100 - progress) * 0.6)}秒）
                            </p>
                        </div>
                    )}

                    {/* 説明 */}
                    <div className="mt-6 rounded-md bg-blue-50 p-4">
                        <p className="text-sm text-blue-900">
                            <strong>ℹ️ 注意事項</strong>
                        </p>
                        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-800">
                            <li>処理には約1分かかります</li>
                            <li>実行中は他のユーザーによる実行はできません</li>
                            <li>日付範囲を指定して実行してください</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
