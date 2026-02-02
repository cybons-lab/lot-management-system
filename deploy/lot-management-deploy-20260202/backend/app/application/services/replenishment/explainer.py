from app.application.services.replenishment.recommendation import ReplenishmentRecommendation


class ReplenishmentExplainer:
    """発注提案の説明生成。."""

    def explain(self, rec: ReplenishmentRecommendation) -> str:
        """人が読める説明文を生成。."""
        # Constraints string
        constraints_str = ", ".join(rec.constraints_applied) if rec.constraints_applied else "なし"

        return f"""
## 発注提案の根拠

### 現在の在庫状況
- 手持在庫: {rec.current_on_hand}
- 予約済み: {rec.current_reserved}
- 利用可能: {rec.current_available}
- 入荷予定: {rec.pending_inbound}
- **有効在庫**: {rec.current_available + rec.pending_inbound}

### 需要予測
- 平均日次需要: {rec.avg_daily_demand:.2f}
- 予測期間: {rec.demand_forecast_horizon}日
- 予測需要合計: {rec.demand_forecast_total:.2f}

### 発注点計算
- リードタイム: {rec.lead_time_days}日 (標準偏差: {rec.lead_time_std:.2f})
- 安全在庫: {rec.safety_stock:.2f}
- **発注点(ROP)**: {rec.reorder_point:.2f}

### 判定
- 有効在庫 ({rec.current_available + rec.pending_inbound}) < ROP ({rec.reorder_point:.2f})
- → **発注が必要**

### 発注量計算
- 目標在庫: {rec.target_stock:.2f}
- 計算発注量: {rec.target_stock:.2f} - 有効在庫 = {rec.recommended_order_qty}
- 適用制約: {constraints_str}
"""
