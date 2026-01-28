/**
 * WarehouseInfoCard - Unified display of warehouse inventory and incoming goods
 */

import { Link } from "react-router-dom";

import { useWarehouseData } from "./useWarehouseData";
import * as styles from "./WarehouseInfoCard.styles";
import { WarehouseItem } from "./WarehouseItem";

import { Card, CardContent, Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";

interface WarehouseInfoCardProps {
  productId: number;
}

export function WarehouseInfoCard({ productId }: WarehouseInfoCardProps) {
  const { warehouseData, isLoading } = useWarehouseData(productId);

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
              <WarehouseItem key={warehouse.name} warehouse={warehouse} />
            ))}

            <Button size="sm" variant="outline" className={styles.detailButton} asChild>
              <Link to={`${ROUTES.INVENTORY.SUMMARY}?product_group_id=${productId}`}>
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
