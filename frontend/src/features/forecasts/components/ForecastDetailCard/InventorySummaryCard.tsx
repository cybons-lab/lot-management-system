/**
 * InventorySummaryCard - Display warehouse inventory summary
 */

import { Link } from "react-router-dom";

import { Card, CardHeader, CardContent, Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";

interface InventorySummaryCardProps {
    productId: number;
}

export function InventorySummaryCard({ productId }: InventorySummaryCardProps) {
    // TODO: 実際のAPIフックに置き換え
    // const { data: inventories, isLoading } = useInventoriesByProduct(productId);

    // ダミーデータ（実装時に削除）
    const warehouseSummary = {
        "倉庫A": { total: 150, lotCount: 3 },
        "倉庫B": { total: 80, lotCount: 2 },
        "倉庫C": { total: 0, lotCount: 0 },
    };

    return (
        <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
                <h4 className="text-sm font-semibold text-blue-800">📦 在庫状況</h4>
            </CardHeader>
            <CardContent className="space-y-2">
                {Object.entries(warehouseSummary).map(([warehouse, data]) => (
                    <div key={warehouse} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{warehouse}</span>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold tabular-nums">{data.total.toLocaleString()} ML</span>
                            <span className="text-xs text-gray-600">({data.lotCount}ロット)</span>
                        </div>
                    </div>
                ))}
                <div className="flex justify-end pt-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 bg-white text-xs hover:bg-blue-100"
                        asChild
                    >
                        <Link to={`${ROUTES.INVENTORY.SUMMARY}?product_id=${productId}`}>
                            詳細を確認
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
