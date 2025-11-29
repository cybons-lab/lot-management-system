/**
 * ConfirmedLinesPage.tsx
 *
 * 引当確定済み明細一覧 - SAP登録専用ページ
 * - 引当が完了した明細のみを表示
 * - チェックボックスで複数選択
 * - SAP一括登録機能
 */

import { ArrowLeft, RefreshCw, Send } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import type { ConfirmedOrderLine } from "@/hooks/useConfirmedOrderLines";
import { useConfirmedOrderLines } from "@/hooks/useConfirmedOrderLines";
import { useSAPBatchRegistration } from "@/hooks/useSAPBatchRegistration";
import { formatDate } from "@/shared/utils/date";

export function ConfirmedLinesPage() {
    const navigate = useNavigate();
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const { data: confirmedLines = [], isLoading, refetch } = useConfirmedOrderLines();
    const { registerToSAP, isRegistering } = useSAPBatchRegistration();

    const handleToggle = (lineId: number) => {
        setSelectedIds((prev) =>
            prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId],
        );
    };

    const handleToggleAll = () => {
        if (selectedIds.length === confirmedLines.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(confirmedLines.map((line) => line.line_id));
        }
    };

    const handleRegister = () => {
        if (selectedIds.length === 0) {
            toast.error("登録する明細を選択してください");
            return;
        }

        registerToSAP(selectedIds, {
            onSuccess: (data) => {
                toast.success(`SAP登録完了: ${data.registered_count}件`);
                setSelectedIds([]);
                refetch();
            },
        });
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                    <p className="mt-2 text-sm text-slate-600">読み込み中...</p>
                </div>
            </div>
        );
    }

    if (confirmedLines.length === 0) {
        return (
            <div className="flex min-h-screen items-center justify-center px-6">
                <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                        <Send className="h-8 w-8 text-slate-400" />
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-slate-900">
                        引当確定済みの明細がありません
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                        受注管理ページでロット引当を完了してください
                    </p>
                    <Button variant="outline" className="mt-6" onClick={() => navigate("/orders")}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        受注管理へ戻る
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 px-6 py-6 md:px-8">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate("/orders")}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-2xl font-bold text-slate-900">引当確定済み明細 - SAP登録</h1>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                        引当が完了している明細を選択してSAPに登録します
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        更新
                    </Button>
                </div>
            </div>

            {/* コントロールバー */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-6 py-3 shadow-sm">
                <div className="text-sm text-slate-600">全{confirmedLines.length}件</div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleToggleAll}>
                        {selectedIds.length === confirmedLines.length ? "全解除" : "全選択"}
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleRegister}
                        disabled={selectedIds.length === 0 || isRegistering}
                    >
                        <Send className="mr-2 h-4 w-4" />
                        {isRegistering ? "登録中..." : `SAP一括登録 (${selectedIds.length}件)`}
                    </Button>
                </div>
            </div>

            {/* テーブル */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="w-12 px-4 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={
                                        confirmedLines.length > 0 && selectedIds.length === confirmedLines.length
                                    }
                                    onChange={handleToggleAll}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-700">
                                受注番号
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-700">
                                顧客名
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-700">
                                製品コード
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-700">
                                製品名
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-700">
                                数量
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-700">
                                納期
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {confirmedLines.map((line: ConfirmedOrderLine) => (
                            <tr
                                key={line.line_id}
                                className={`transition-colors hover:bg-slate-50 ${selectedIds.includes(line.line_id) ? "bg-blue-50" : ""
                                    }`}
                            >
                                <td className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(line.line_id)}
                                        onChange={() => handleToggle(line.line_id)}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <span className="font-medium text-slate-900">{line.order_number}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-slate-600">{line.customer_name}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="font-mono text-sm text-slate-900">{line.product_code}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-slate-600">{line.product_name}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className="font-medium text-slate-900">
                                        {line.order_quantity} {line.unit}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-slate-600">{formatDate(line.delivery_date)}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* フッター */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-6 py-3 shadow-sm">
                <div className="text-sm text-slate-600">選択: {selectedIds.length}件</div>
                <Button
                    onClick={handleRegister}
                    disabled={selectedIds.length === 0 || isRegistering}
                >
                    <Send className="mr-2 h-4 w-4" />
                    {isRegistering ? "登録中..." : "SAP一括登録"}
                </Button>
            </div>
        </div>
    );
}
