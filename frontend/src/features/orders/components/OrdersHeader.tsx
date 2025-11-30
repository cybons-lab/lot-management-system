import { Plus, RefreshCw, Send } from "lucide-react";

import { Badge, Button } from "@/components/ui";

interface OrdersHeaderProps {
    confirmedLinesCount: number;
    isLoading: boolean;
    onRefresh: () => void;
    onCreateClick: () => void;
    onNavigateToConfirmed: () => void;
}

/**
 * 受注管理画面のヘッダー
 */
export function OrdersHeader({
    confirmedLinesCount,
    isLoading,
    onRefresh,
    onCreateClick,
    onNavigateToConfirmed,
}: OrdersHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">受注管理</h1>
                <p className="mt-1 text-sm text-slate-600">受注明細一覧と引当状況を管理します</p>
            </div>
            <div className="flex items-center gap-2">
                {confirmedLinesCount > 0 && (
                    <Button variant="outline" size="sm" onClick={onNavigateToConfirmed}>
                        <Send className="mr-2 h-4 w-4" />
                        SAP登録
                        <Badge variant="secondary" className="ml-2">
                            {confirmedLinesCount}
                        </Badge>
                    </Button>
                )}
                <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    更新
                </Button>
                <Button size="sm" onClick={onCreateClick}>
                    <Plus className="mr-2 h-4 w-4" />
                    新規登録
                </Button>
            </div>
        </div>
    );
}
