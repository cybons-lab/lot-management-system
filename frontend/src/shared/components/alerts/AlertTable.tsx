/**
 * AlertTable component
 *
 * Displays a table of alerts with navigation to target resources.
 */

import { AlertCircle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AlertBadge } from "./AlertBadge";

import type { AlertItem } from "@/shared/types/alerts";
import { formatDate } from "@/shared/utils/date";

interface AlertTableProps {
    alerts: AlertItem[];
    isLoading?: boolean;
    onAlertClick?: (alert: AlertItem) => void;
}

export function AlertTable({ alerts, isLoading = false, onAlertClick }: AlertTableProps) {
    const navigate = useNavigate();

    const handleAlertClick = (alert: AlertItem) => {
        if (onAlertClick) {
            onAlertClick(alert);
            return;
        }

        // Default navigation based on target type
        const { target } = alert;
        switch (target.resourceType) {
            case "order":
                navigate(`/orders/${target.id}`);
                break;
            case "lot":
                navigate(`/inventory/lots/${target.id}`);
                break;
            case "inventory_item":
                navigate(`/inventory/items/${target.id}`);
                break;
            case "forecast_daily":
                navigate(`/forecasts/${target.id}`);
                break;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
                    <p className="text-sm text-gray-500">読み込み中...</p>
                </div>
            </div>
        );
    }

    if (alerts.length === 0) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-12 w-12 text-gray-400" />
                    <p className="text-sm text-gray-500">アラートはありません</p>
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                            重要度
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                            タイトル
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                            対象
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                            発生日時
                        </th>
                        <th className="relative px-6 py-3">
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                    {alerts.map((alert) => (
                        <tr
                            key={alert.id}
                            onClick={() => handleAlertClick(alert)}
                            className="cursor-pointer transition-colors hover:bg-slate-50"
                        >
                            <td className="whitespace-nowrap px-6 py-4">
                                <AlertBadge severity={alert.severity} />
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-slate-900">{alert.title}</div>
                                {alert.message && (
                                    <div className="mt-1 text-sm text-slate-500 line-clamp-2">{alert.message}</div>
                                )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                                {alert.target.resourceType === "order" && `受注 #${alert.target.id}`}
                                {alert.target.resourceType === "lot" && `ロット #${alert.target.id}`}
                                {alert.target.resourceType === "inventory_item" && `在庫 #${alert.target.id}`}
                                {alert.target.resourceType === "forecast_daily" && `予測 #${alert.target.id}`}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                                {formatDate(alert.occurred_at)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                <ChevronRight className="inline h-5 w-5 text-slate-400" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
