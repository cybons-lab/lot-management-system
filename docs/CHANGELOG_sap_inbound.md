# CHANGELOG - 入荷予定管理SAP連携フロー

**日付**: 2025-11-27  
**機能**: 入荷予定管理のSAP連携フロー実装  
**ブランチ**: `feature/sap-inbound-integration`

---

## 設計判断（ユーザー承認済み）

### 1. SAP連携の実装スコープ: **モック実装**

**決定内容**:
- SAP APIを模擬する「発注データ取得」ボタンを実装
- 実際にはダミーデータを生成して InboundPlan を作成
- レート制限（10分間に○回まで）は後回し
- 実際のSAP API連携は将来のフェーズで実装

**理由**: UI/UXとデータフローを先に固めることを優先

---

### 2. 仮在庫の扱い: **ビューで計算**

**決定内容**:
- `v_product_stock` などのビューに「仮在庫」列を追加
- 実在庫 + 仮在庫 = 利用可能在庫として表示
- 引当計算時に仮在庫も考慮

**SQL変更例**:
```sql
CREATE OR REPLACE VIEW v_product_stock AS
SELECT
    p.id AS product_id,
    p.product_code,
    COALESCE(SUM(l.current_quantity), 0) AS current_stock,
    COALESCE(SUM(ipl.planned_quantity), 0) AS provisional_stock,
    COALESCE(SUM(l.current_quantity), 0) + COALESCE(SUM(ipl.planned_quantity), 0) AS available_stock_with_provisional
FROM products p
LEFT JOIN lots l ON p.id = l.product_id AND l.status = 'active'
LEFT JOIN inbound_plan_lines ipl ON p.id = ipl.product_id
LEFT JOIN inbound_plans ip ON ipl.inbound_plan_id = ip.id AND ip.status = 'planned'
GROUP BY p.id, p.product_code;
```

**理由**: データの整合性が保たれる、ロールバックが容易

---

### 3. 仮引当のデータ構造: **既存 allocations テーブルを拡張**

**決定内容**:
新規テーブルを作成せず、既存の `allocations` テーブルを拡張する

**現在の構造**:
```python
class Allocation(Base):
    id: Mapped[int]
    order_line_id: Mapped[int]
    lot_id: Mapped[int]  # NOT NULL
    allocated_quantity: Mapped[Decimal]
    status: Mapped[str]  # 'allocated' | 'shipped' | 'cancelled'
```

**変更内容**:
1. `status` に `'provisional'`（仮引当）を追加
2. `lot_id`: nullable に変更（仮引当時は null）
3. `inbound_plan_line_id`: 新規追加（仮引当時のみ使用）
4. CheckConstraint を更新

**変更後の構造**:
```python
class Allocation(Base):
    id: Mapped[int]
    order_line_id: Mapped[int]
    lot_id: Mapped[int | None]  # nullable に変更
    inbound_plan_line_id: Mapped[int | None]  # 新規追加
    allocated_quantity: Mapped[Decimal]
    status: Mapped[str]  # 'allocated' | 'provisional' | 'shipped' | 'cancelled'
    
    __table_args__ = (
        CheckConstraint(
            "status IN ('allocated', 'provisional', 'shipped', 'cancelled')",
            name="chk_allocations_status",
        ),
        # ...
    )
```

**仮引当時のレコード例**:
```python
Allocation(
    order_line_id=123,
    lot_id=None,  # 仮引当時は null
    inbound_plan_line_id=456,  # 入荷予定明細を参照
    allocated_quantity=100,
    status='provisional'
)
```

**入庫確定時の変換**:
```python
# ロット作成後
allocation.lot_id = created_lot.id
allocation.inbound_plan_line_id = None
allocation.status = 'allocated'
```

**理由**: 
- 新規テーブル作成を避ける（ユーザー要望）
- 引当ロジックの一貫性を保つ
- 既存の `status` フィールドを活用

---

### 4. 入庫確定時のロット番号入力

**決定内容**:

**本番運用**: ロット番号入力は**必須**
- 入庫確定ダイアログで各 `ExpectedLot` に対してロット番号入力フィールドを表示
- すべての入力フィールドが埋まっていることを確認してから確定
- バリデーション: 空欄の場合はエラー

**テスト環境**: ロット番号は**自動生成可**
- 入力フィールドは表示するが、空欄の場合は自動生成
- 現在の `_generate_lot_number` を使用
- 環境変数 `ENVIRONMENT` で切り替え

**実装方針**:
```python
# inbound_service.py
def receive_inbound_plan(self, plan_id: int, request: InboundPlanReceiveRequest):
    is_production = os.getenv("ENVIRONMENT") == "production"
    
    for expected_lot in line.expected_lots:
        lot_number = request.lot_numbers.get(expected_lot.id)
        
        if not lot_number:
            if is_production:
                raise ValueError(f"ロット番号の入力は必須です (ExpectedLot ID: {expected_lot.id})")
            else:
                # テスト環境では自動生成
                lot_number = self._generate_lot_number(plan.plan_number, line.product_id)
        
        # ロット作成処理...
```

**理由**: 
- 本番運用では正確なロット番号管理が必要
- テスト環境では開発効率を優先

---

## 影響範囲

### データベース

**新規マイグレーション**: 
- `allocations` テーブル構造変更
  - `lot_id` を nullable に変更
  - `inbound_plan_line_id` カラム追加
  - `status` CheckConstraint 更新
  - インデックス追加: `idx_allocations_inbound_plan_line`

**ビュー更新**:
- `v_product_stock` に仮在庫列追加

### バックエンド

**新規ファイル**:
- `app/services/sap/sap_service.py`

**変更ファイル**:
- `app/models/orders_models.py` (Allocation)
- `app/schemas/inventory/inbound_schema.py`
- `app/services/inventory/inbound_service.py`
- `app/services/allocations/allocation_service.py`
- `app/api/routes/inventory/inbound_plans_router.py`

### フロントエンド

**新規コンポーネント**:
- `InboundReceiveDialog.tsx`

**変更コンポーネント**:
- `InboundPlansListPage.tsx`
- `InboundPlanDetailPage.tsx`
- `LotListCard.tsx`

---

## 実装フェーズ

### Phase 1: SAP連携モック + 仮在庫表示（基盤）
- SAP連携モック実装
- 仮在庫計算ビューの追加
- フロントエンドの仮在庫表示

### Phase 2: 仮在庫計算とビューの拡張
- `v_product_stock` ビュー更新
- ProductResponse に仮在庫フィールド追加

### Phase 3: 仮引当機能の実装
- Allocation モデル変更（マイグレーション作成）
- 引当計算ロジックの拡張
- 仮引当→正式引当の変換ロジック

### Phase 4: 入庫確定時のロット番号入力
- 入庫確定ダイアログUI
- ロット番号バリデーション（環境別）
- 環境変数の設定

---

## レビュー履歴

**2025-11-27 16:59**:
- ユーザーから設計方針の承認を得る
- モック実装、ビュー管理、Allocationテーブル拡張で確定
- Allocationテーブルの既存status拡張を確認
- ロット番号入力の環境別仕様を確認

**2025-11-27 17:05**:
- ユーザーから追加要件のフィードバック
- 将来的にSAPへの受注登録機能も必要（引当完了後にSAPへ送信）
- SAPServiceを受発注両用に拡張できるよう設計に配慮

---

## 将来の拡張予定

### SAP受注登録機能（Phase 5以降）

**要件**:
- 受注のロット引当が完了したら、その受注をSAPへ登録
- SAP側で受注（Sales Order）として記録

**実装方針**:
```python
class SAPService:
    # 既存: 発注データ取得
    def fetch_purchase_orders_from_sap(self) -> list[dict]:
        ...
    
    # 追加予定: 受注データ送信
    def send_sales_order_to_sap(self, order_id: int) -> bool:
        """Send allocated order to SAP as Sales Order"""
        # TODO: 実際のSAP API連携で実装
        pass
```

**APIエンドポイント（予定）**:
```python
@router.post("/orders/{order_id}/send-to-sap")
def send_order_to_sap(order_id: int, db: Session = Depends(get_db)):
    """引当完了した受注をSAPへ送信"""
    ...
```

---

## 次のステップ

1. 新規ブランチ `feature/sap-inbound-integration` を作成
2. Phase 1 から順次実装
3. 各フェーズ完了後にコミット・プッシュ
4. 全フェーズ完了後にPR作成
