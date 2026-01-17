# Phase 1 Remaining Fixes

## 概要

Phase 1のスキーマ変更（`lots` → `lot_receipts`、`current_quantity`の計算フィールド化）に伴い、まだ修正が必要な箇所があります。

## 問題1: alert_service.pyでのAttributeError

### 症状
```
AttributeError: type object 'LotReceipt' has no attribute 'current_quantity'
```

**影響を受けるエンドポイント:**
- `/api/admin/stats` (ダッシュボード統計)
- `/api/alerts` (アラート取得)

### 原因
`backend/app/application/services/alerts/alert_service.py:110` で `LotReceipt.current_quantity` に直接アクセスしようとしている。Phase 1の変更で `current_quantity` は計算フィールドになり、モデルクラスの属性ではなくなった。

### 修正方針

#### 1. alert_service.pyの修正
**ファイル:** `backend/app/application/services/alerts/alert_service.py`

**現在のコード (推定):**
```python
def collect_lot_alerts(db: Session) -> List[Alert]:
    # ...
    lots = db.query(LotReceipt).filter(
        LotReceipt.current_quantity > 0,  # ← エラー発生箇所
        # ...
    ).all()
```

**修正案A: Viewを使用**
```python
from app.infrastructure.persistence.models.views_models import LotStatusView

def collect_lot_alerts(db: Session) -> List[Alert]:
    # LotStatusView を使用して現在数量を取得
    lot_statuses = db.query(LotStatusView).filter(
        LotStatusView.current_quantity > 0,
        # ...
    ).all()
```

**修正案B: 計算ロジックを使用**
```python
from sqlalchemy import func
from app.infrastructure.persistence.models.inventory_models import StockHistory

def collect_lot_alerts(db: Session) -> List[Alert]:
    # received_quantity から stock_history の変動を引いて計算
    subq = (
        db.query(
            StockHistory.lot_id,
            func.sum(StockHistory.quantity_change).label("total_change")
        )
        .group_by(StockHistory.lot_id)
        .subquery()
    )

    lots = db.query(LotReceipt).outerjoin(
        subq, LotReceipt.id == subq.c.lot_id
    ).filter(
        LotReceipt.received_quantity + func.coalesce(subq.c.total_change, 0) > 0
    ).all()
```

**推奨:** 修正案A（Viewを使用）がシンプルで、既存のビュー定義を活用できる。

#### 2. 他の類似箇所の確認

以下のファイルでも同様の問題がないか確認が必要:

```bash
# current_quantityへの直接アクセスを検索
grep -r "LotReceipt.current_quantity" backend/app/
grep -r "lot.current_quantity" backend/app/ --include="*.py"
```

特に以下のファイルを重点的にチェック:
- `backend/app/presentation/api/routes/admin/admin_router.py`
- `backend/app/application/services/inventory/*.py`
- `backend/app/application/services/allocations/*.py`

## 問題2: テストデータ生成の失敗

### 症状
テストデータ生成時にエラーが発生し、データが正しく生成されない。

### 原因（推定）
1. `test_data/utils.py`での`lots`→`lot_receipts`のテーブル名変更は完了
2. しかし、テストデータ生成スクリプト自体が`current_quantity`を直接設定しようとしている可能性
3. または、外部キー制約の順序問題

### 調査が必要なファイル
- `backend/app/application/services/test_data/*.py` (全ファイル)
- `backend/app/application/services/test_data_generator.py`

### 修正方針
1. テストデータ生成時は `received_quantity` のみ設定
2. `current_quantity` は設定しない（Viewで計算される）
3. 必要に応じて `stock_history` にイベントを記録

## 問題3: データが存在しない場合のエラーハンドリング改善

### 現状
データが存在しないテーブルを読むと500エラーが発生し、ユーザーに「サーバー内部でエラーが発生しました」と表示される。

### 改善方針

#### 1. サービス層での空配列返却
データが存在しない場合は例外を投げずに空の配列を返す。

**例: alert_service.py**
```python
def collect_lot_alerts(db: Session) -> List[Alert]:
    try:
        lot_statuses = db.query(LotStatusView).filter(
            LotStatusView.current_quantity > 0,
            # ...
        ).all()

        if not lot_statuses:
            logger.info("No lot data found for alerts")
            return []

        # アラート生成処理
        # ...
    except Exception as e:
        logger.error(f"Error collecting lot alerts: {e}")
        # 空の配列を返してUIが正常に表示されるようにする
        return []
```

#### 2. フロントエンドでの空状態の適切な表示
データが空の場合は「データが存在しません」などのメッセージを表示。

**例: DashboardStats.tsx**
```tsx
if (!data || data.length === 0) {
  return (
    <div className="text-muted-foreground text-center py-8">
      データが存在しません
    </div>
  );
}
```

#### 3. ログメッセージの改善
- ERROR レベル: 実際のエラー（DB接続失敗など）
- INFO/WARN レベル: データ不足（「データが存在しません」）

## 実装優先順位

1. **最優先:** alert_service.pyの修正（現在500エラーでダッシュボードが使えない）
2. **高:** 他のサービスでの同様の問題の修正
3. **中:** テストデータ生成の修正
4. **低:** エラーハンドリング・UX改善

## 関連ファイル

### バックエンド
- `backend/app/application/services/alerts/alert_service.py`
- `backend/app/application/services/test_data/*.py`
- `backend/app/presentation/api/routes/admin/admin_router.py`
- `backend/app/infrastructure/persistence/models/views_models.py`

### フロントエンド
- `frontend/src/features/dashboard/components/TopProductsChart.tsx`
- `frontend/src/features/dashboard/components/WarehouseDistributionChart.tsx`
- `frontend/src/features/dashboard/pages/DashboardPage.tsx`

## 検証手順

修正後、以下を確認:

1. **ダッシュボードの動作確認**
   ```bash
   # ブラウザで http://localhost:5173/dashboard にアクセス
   # データがない場合も500エラーが出ないこと
   ```

2. **テストデータ生成の確認**
   ```bash
   curl -X POST http://localhost:8000/api/admin/init-sample-data
   # エラーなく完了すること
   ```

3. **アラート取得の確認**
   ```bash
   curl http://localhost:8000/api/alerts?only_open=true&limit=10
   # 空配列またはデータが返ること（500エラーが出ないこと）
   ```

4. **統計情報の確認**
   ```bash
   curl http://localhost:8000/api/admin/stats
   # 統計情報が返ること（500エラーが出ないこと）
   ```

## 関連するGitHubIssue/PR

- PR #415: Phase 1 Schema Changes (lot_receipts rename, service layer cleanup)
- 次回PR: Phase 1 Remaining Fixes (このドキュメントの内容)

## メモ

- `current_quantity` はもはやモデルの属性ではなく、Viewまたは計算で取得する
- B-Plan設計: `received_quantity` は不変、`current_quantity` は計算フィールド
- `stock_history` がSingle Source of Truth
