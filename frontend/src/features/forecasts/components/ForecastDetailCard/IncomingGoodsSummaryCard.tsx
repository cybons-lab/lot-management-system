/**
 * IncomingGoodsSummaryCard - Display upcoming inbound plans
 */

import { Link } from "react-router-dom";

import { useInboundPlans } from "@/features/inbound-plans/hooks";
import { Card, CardHeader, CardContent, Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";

interface IncomingGoodsSummaryCardProps {
    productId: number;
}

export function IncomingGoodsSummaryCard({ productId }: IncomingGoodsSummaryCardProps) {
    const { data: inboundPlans, isLoading } = useInboundPlans({ product_id: productId });

    // 直近3件のみ、未来の日付のみフィルタ
    const today = new Date();
    const upcomingPlans = Array.isArray(inboundPlans)
        ? inboundPlans
            .filter((plan) => new Date(plan.planned_arrival_date) >= today)
            .slice(0, 3)
        : [];

    return (
        <Card className="border-green-200 bg-green-50/30">
            <CardHeader>
                <h4 className="text-sm font-semibold text-green-800">📥 入荷予定</h4>
            </CardHeader>
            <CardContent className="space-y-2">
                {isLoading ? (
                    <p className="text-xs text-gray-500">読み込み中...</p>
                ) : upcomingPlans.length > 0 ? (
                    <>
                        {upcomingPlans.map((plan) => (
                            <div key={plan.id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">
                                    {new Date(plan.planned_arrival_date).toLocaleDateString('ja-JP', {
                                        month: 'numeric',
                                        day: 'numeric'
                                    })}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600">予定あり</span>
                                </div>
                            </div>
                        ))}
                        <div className="flex justify-end pt-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 bg-white text-xs hover:bg-green-100"
                                asChild
                            >
                                <Link to={`${ROUTES.INBOUND_PLANS.LIST}?product_id=${productId}`}>
                                    詳細を確認
                                </Link>
                            </Button>
                        </div>
                    </>
                ) : (
                    <p className="text-xs text-gray-600">入荷予定なし</p>
                )}
            </CardContent>
        </Card>
    );
}
