/**
 * WarehouseInfoCard - Unified display of warehouse inventory and incoming goods
 */

import { Link } from "react-router-dom";

import { useInboundPlans } from "@/features/inbound-plans/hooks";
import { Card, CardContent, Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { useLotsQuery } from "@/hooks/api";
import * as styles from "./WarehouseInfoCard.styles";

interface WarehouseInfoCardProps {
    productId: number;
}

interface WarehouseData {
    name: string;
    inventory: {
        total: number;
        lotCount: number;
        unit: string;
    };
    upcomingInbounds: Array<{
        date: string;
        quantity: number;
    }>;
}

export function WarehouseInfoCard({ productId }: WarehouseInfoCardProps) {
    const { data: inboundPlans, isLoading: isLoadingInbound } = useInboundPlans({ product_id: productId });
    const { data: lots = [], isLoading: isLoadingLots } = useLotsQuery({ product_id: productId });

    const isLoading = isLoadingInbound || isLoadingLots;

    // ロットデータから倉庫別に集約
    const warehouseMap = new Map<string, WarehouseData>();

    lots.forEach((lot) => {
        const warehouseName = String(lot.delivery_place_name || lot.delivery_place_code || "不明");
        const quantity = Number(lot.current_quantity || 0);
        const unit = String(lot.unit || "EA");

        if (!warehouseMap.has(warehouseName)) {
            warehouseMap.set(warehouseName, {
                name: warehouseName,
                inventory: { total: 0, lotCount: 0, unit },
                upcomingInbounds: [],
            });
        }

        const warehouse = warehouseMap.get(warehouseName)!;
        warehouse.inventory.total += quantity;
        warehouse.inventory.lotCount += 1;
    });

    const warehouseData: WarehouseData[] = Array.from(warehouseMap.values());

    // 直近の入荷予定を取得（未来の日付のみ）
    const today = new Date();
    const upcomingPlans = Array.isArray(inboundPlans)
        ? inboundPlans.filter((plan) => new Date(plan.planned_arrival_date) >= today)
        : [];

    // TODO: 入荷予定を倉庫別に集約する処理を実装
    // 現在は入荷予定が倉庫情報を持っていないため、最初の倉庫に表示
    if (upcomingPlans.length > 0 && warehouseData.length > 0) {
        warehouseData[0].upcomingInbounds = upcomingPlans.slice(0, 3).map((plan) => ({
            date: plan.planned_arrival_date,
            quantity: 0, // TODO: 入荷予定の数量を取得
        }));
    }

    return (
        <Card className={styles.cardRoot}>
            <CardContent className="p-0">
                <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>📦 倉庫・入荷情報</span>
                </div>

                {isLoading ? (
                    <p className={styles.noData}>読み込み中...</p>
                ) : warehouseData.length > 0 ? (
                    <>
                        {warehouseData.map((warehouse) => (
                            <div key={warehouse.name} className={styles.warehouseSection}>
                                <div className={styles.warehouseName}>▼ {warehouse.name}</div>

                                {/* 2列グリッド: 在庫と入荷 */}
                                <div className={styles.infoGrid}>
                                    {/* 在庫情報（左列） */}
                                    <div className={styles.infoRow}>
                                        <span className={styles.infoLabel}>在庫:</span>
                                        <div>
                                            <span
                                                className={styles.infoValue({
                                                    type: warehouse.inventory.total > 0 ? "inventory" : "zero",
                                                })}
                                            >
                                                {warehouse.inventory.total.toLocaleString()} {warehouse.inventory.unit}
                                            </span>
                                            <span className={styles.lotCount}>
                                                ({warehouse.inventory.lotCount}ロット)
                                            </span>
                                        </div>
                                    </div>

                                    {/* 入荷予定（右列） */}
                                    <div className={styles.infoRow}>
                                        <span className={styles.infoLabel}>入荷:</span>
                                        {warehouse.upcomingInbounds.length > 0 ? (
                                            <div className={styles.inboundList}>
                                                {warehouse.upcomingInbounds.map((inbound, idx) => (
                                                    <div key={idx} className={styles.inboundItem}>
                                                        <span className={styles.inboundDate}>
                                                            {new Date(inbound.date).toLocaleDateString("ja-JP", {
                                                                month: "numeric",
                                                                day: "numeric",
                                                            })}
                                                        </span>
                                                        <span className={styles.inboundQuantity}>予定あり</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className={styles.noData}>予定なし</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <Button
                            size="sm"
                            variant="outline"
                            className={styles.detailButton}
                            asChild
                        >
                            <Link to={`${ROUTES.INVENTORY.SUMMARY}?product_id=${productId}`}>
                                詳細を確認
                            </Link>
                        </Button>
                    </>
                ) : (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📦</div>
                        <p className={styles.emptyText}>倉庫情報がありません</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
