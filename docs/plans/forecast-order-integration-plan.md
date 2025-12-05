# Forecast/Order 統合リファクタリング計画

**作成日:** 2025-12-05  
**ステータス:** 計画段階  
**ブランチ:** `feature/forecast-order-integration`

---

## 概要

「Forecast and order.md」の仕様に基づき、需要管理（Forecast/Order/Kanban）と引当機能を統合リファクタリングする。

### 目的
- 需要の3分類（FORECAST_LINKED / KANBAN / SPOT）を明確化
- Soft/Hard引当の自動解除ルールを実装
- 画面構成の簡素化（ロット引当ページの廃止）

---

## 破壊的変更の分析

### ⚠️ 削除予定

| 対象 | 理由 | 影響範囲 |
|------|------|----------|
| `/allocations` (LotAllocationPage) | 受注ページに統合 | App.tsx, ナビゲーション |
| `/allocations/suggestions` (AllocationSuggestionsPage) | 受注詳細に統合 | App.tsx, ナビゲーション |
| `features/allocations/pages/*` | ページ削除 | 2ファイル |

### 🔄 大幅変更

| 対象 | 変更内容 |
|------|----------|
| **OrdersListPage** | order_typeフィルタ追加、引当状況表示強化 |
| **OrderDetailPage** | 引当操作UI統合（現allocationsページの機能を移行） |
| **OrderLine型** | `order_type`, `forecast_id` 追加 |
| **Allocationモデル** | 変更なし（既にsoft/hard対応済み） |

### ✅ 維持（変更なし）

| 対象 | 備考 |
|------|------|
| **ForecastListPage** | 既存維持、Soft引当表示 |
| **ForecastDetailPage** | 既存維持、紐づくOrderへのリンク追加 |
| **引当API** | 既存API維持（confirm_hard_allocation等） |
| `features/allocations/` の hooks, api, components | 再利用（ページのみ削除） |

---

## 実装フェーズ

### Phase 1: データモデル拡張（所要: 2時間）

**マイグレーション:**
```sql
ALTER TABLE order_lines ADD COLUMN order_type VARCHAR(20) NOT NULL DEFAULT 'ORDER';
ALTER TABLE order_lines ADD COLUMN forecast_id BIGINT REFERENCES forecast_current(id) ON DELETE SET NULL;
CREATE INDEX idx_order_lines_order_type ON order_lines(order_type);
CREATE INDEX idx_order_lines_forecast_id ON order_lines(forecast_id);
```

**影響ファイル:**
- `backend/app/models/orders_models.py` - OrderLine拡張
- `backend/app/schemas/orders/` - スキーマ更新
- `alembic/versions/` - 新規マイグレーション

---

### Phase 2: Soft引当自動解除ロジック（所要: 3時間）

**新規関数:**
```python
# backend/app/services/allocations/actions.py
def preempt_soft_allocations_for_hard(
    db: Session,
    lot_id: int,
    required_qty: Decimal,
    hard_demand_id: int,  # 新しいHard需要のorder_line_id
) -> list[dict]:
    """
    Hard引当時に同ロットのSoft引当を自動解除.
    
    優先度: KANBAN > ORDER > FORECAST
    
    Returns:
        解除された引当情報のリスト
        [{"allocation_id": 1, "order_line_id": 2, "released_qty": 100}]
    """
```

**呼び出し箇所:**
- `confirm_hard_allocation()` 内で呼び出し
- 解除されたSoftはログ記録

---

### Phase 3: 受注ページUI強化（所要: 4時間）

**OrdersListPage 変更:**
```tsx
// 新規フィルタ
<Select value={orderTypeFilter}>
  <SelectItem value="all">すべて</SelectItem>
  <SelectItem value="FORECAST_LINKED">FC連携</SelectItem>
  <SelectItem value="KANBAN">かんばん</SelectItem>
  <SelectItem value="SPOT">スポット</SelectItem>
</Select>

// 新規カラム
- order_type バッジ（FC / KB / SP）
- allocation_type（Soft / Hard / 未引当）
- forecast_monthリンク（FORECAST_LINKEDの場合）
```

**OrderDetailPage 変更:**
- 引当操作パネル追加（現LotAllocationPageの機能を移行）
- ロット候補表示
- Hard確定ボタン

---

### Phase 4: ページ削除とルーティング整理（所要: 1時間）

**削除:**
- `features/allocations/pages/LotAllocationPage.tsx`
- `features/allocations/pages/AllocationSuggestionsPage.tsx`

**App.tsx 変更:**
```tsx
// 削除
// <Route path={ROUTES.ALLOCATIONS.INDEX} element={<LotAllocationPage />} />
// <Route path={ROUTES.ALLOCATIONS.SUGGESTIONS} element={<AllocationSuggestionsPage />} />

// リダイレクト追加（後方互換性）
<Route path="/allocations" element={<Navigate to="/orders" replace />} />
<Route path="/allocations/suggestions" element={<Navigate to="/orders" replace />} />
```

**ナビゲーション更新:**
- 「ロット引当」メニュー削除
- 「受注管理」を強調

---

## 新しい画面構成

```
/orders                    → 全受注一覧（order_typeでフィルタ可能）
/orders/:orderId           → 受注詳細（引当操作を含む）
/forecasts                 → 予測一覧（Soft引当状況表示）
/forecasts/:id             → 予測詳細（紐づくOrderへリンク）
/allocations/*             → /orders にリダイレクト（後方互換）
```

---

## データフロー

```
[Forecast入力]
    ↓
[Soft引当作成] ← ForecastページでFEFO自動引当
    ↓
[受注発生] ← SAPまたは手動入力
    ↓ forecast_id でリンク
[Hard引当確定] ← 受注詳細ページで確定操作
    ↓
[Soft引当解除] ← 自動（preempt_soft_allocations_for_hard）
    ↓
[出荷]
```

---

## マイルストーン

| Phase | 期間 | 成果物 |
|-------|------|--------|
| 1 | Day 1 | データモデル拡張完了、マイグレーション適用 |
| 2 | Day 1-2 | Soft引当自動解除ロジック実装・テスト |
| 3 | Day 2-3 | 受注ページUI強化、引当操作統合 |
| 4 | Day 3 | ページ削除、ルーティング整理、動作確認 |

**総工数:** 約10時間（2-3日）

---

## リスクと対策

| リスク | 対策 |
|--------|------|
| 既存データとの互換性 | マイグレーションでDEFAULT値設定 |
| 既存UIの急な変更 | リダイレクトで後方互換性維持 |
| テスト不足 | 各Phase完了時に手動検証 |

---

## 次のアクション

1. ✅ この計画書をコミット
2. 🔜 新ブランチ `feature/forecast-order-integration` 作成
3. 🔜 Phase 1 開始（データモデル拡張）
