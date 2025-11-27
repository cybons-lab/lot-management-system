import * as styles from "./WarehouseInfoCard.styles";
import { type WarehouseData } from "./useWarehouseData";

interface WarehouseItemProps {
    warehouse: WarehouseData;
}

export function WarehouseItem({ warehouse }: WarehouseItemProps) {
    return (
        <div className={styles.warehouseSection}>
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
                        <span className={styles.lotCount}>({warehouse.inventory.lotCount}ロット)</span>
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
    );
}
