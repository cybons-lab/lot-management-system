# 主担当機能 設計書

**作成日:** 2025-12-06  
**作成日:** 2025-12-06  
**ステータス:** 実装済み（一部機能拡張待ち）

---

## 1. 概要

### 1.1 目的
ユーザーが担当する仕入先のデータを優先的に表示し、業務効率を向上させる。
他の担当者が休暇などで不在の場合でも、全データにアクセス可能な状態を維持しつつ、主担当者のデータを目立たせる。

### 1.2 基本方針
- **表示制限はしない** - 全ユーザーが全データを閲覧可能
- **優先度で差別化** - 主担当のデータはソート順位が上がる、またはハイライト表示
- **柔軟な運用** - 主担当は1仕入先につき1人、副担当は複数可

---

## 2. ユースケース

### UC-1: 日常業務での優先表示
```
アクター: 一般ユーザー（operator）
シナリオ:
1. ユーザーAがログイン
2. 受注一覧を表示
3. ユーザーAが主担当の仕入先に関連する受注が上位に表示される
4. 他の担当者の受注も下部に表示される
```

### UC-2: 担当者不在時のカバー
```
アクター: 一般ユーザー（operator）
シナリオ:
1. ユーザーBが休暇中
2. ユーザーAがログイン
3. ユーザーBが主担当の受注も表示される（ただし優先度は低め）
4. ヘッダーにアラート表示:「主担当者 [User B] が未ログインの受注があります」
```

### UC-3: 主担当の設定
```
アクター: 管理者（admin）または担当者本人
シナリオ:
1. マスタ → 主担当設定を開く
2. 仕入先を選択
3. 主担当者を割り当て
4. 必要に応じて副担当者も追加
```

---

## 3. データ構造

### 3.1 既存テーブル: `user_supplier_assignments`

```sql
CREATE TABLE user_supplier_assignments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, supplier_id)
);

-- 制約: 1仕入先につき主担当は1人まで
CREATE UNIQUE INDEX uq_user_supplier_primary_per_supplier 
    ON user_supplier_assignments(supplier_id) WHERE is_primary = true;
```

### 3.2 関連テーブル

| テーブル | 仕入先との関連 |
|----------|----------------|
| `orders` | `order_lines.supplier_id` 経由 |
| `lots` | `lots.supplier_id` 直接 |
| `inbound_plans` | `inbound_plans.supplier_id` 直接 |
| `forecasts` | `forecast_items.supplier_id` 経由（将来） |

---

## 4. 影響を受けるページ

### 4.1 優先度: 高（Phase 1）

| ページ | 現状 | 変更内容 |
|--------|------|----------|
| **受注一覧** | 日付順 | 主担当の受注を上位に、ハイライト表示 |
| **ロット一覧** | 作成日順 | 主担当の仕入先のロットを上位に |
| **入荷予定一覧** | 入荷予定日順 | 主担当の入荷予定を上位に |

### 4.2 優先度: 中（Phase 2）

| ページ | 現状 | 変更内容 |
|--------|------|----------|
| **ダッシュボード** | 全体統計 | 主担当の統計をハイライト |
| **需要予測** | 日付順 | 主担当の仕入先のデータを上位に |

### 4.3 優先度: 低（Phase 3）

| ページ | 変更内容 |
|--------|----------|
| **ヘッダー/通知エリア** | 主担当未ログインアラート表示 |

---

## 5. API設計

### 5.1 共通パラメータ

既存のリスト取得APIに以下のクエリパラメータを追加：

```
GET /api/orders?prioritize_primary=true&current_user_id=1
GET /api/lots?prioritize_primary=true&current_user_id=1
GET /api/inbound-plans?prioritize_primary=true&current_user_id=1
```

### 5.2 サーバーサイドソート実装例

```python
def get_orders_with_primary_priority(db: Session, user_id: int):
    # 現在のユーザーが主担当の仕入先IDを取得
    primary_supplier_ids = db.query(UserSupplierAssignment.supplier_id).filter(
        UserSupplierAssignment.user_id == user_id,
        UserSupplierAssignment.is_primary == True
    ).subquery()
    
    # 主担当フラグを付与してソート
    return db.query(
        Order,
        case(
            (OrderLine.supplier_id.in_(primary_supplier_ids), 1),
            else_=0
        ).label('is_primary_order')
    ).join(OrderLine).order_by(
        desc('is_primary_order'),
        desc(Order.created_at)
    ).all()
```

### 5.3 新規API

```
GET /api/assignments/my-suppliers
  → 現在のユーザーが担当する仕入先一覧

GET /api/users/online
  → 現在ログイン中のユーザー一覧（アラート用）
```

---

## 6. UI/UX設計

### 6.1 優先表示の視覚化

```
┌──────────────────────────────────────────────────────────┐
│ 受注一覧                                    [フィルター] │
├──────────────────────────────────────────────────────────┤
│ ★ あなたの担当 (3件)                                     │
│ ├─ [ORD-001] ○○商事 - 製品A x 100 ........................ │
│ ├─ [ORD-002] ○○商事 - 製品B x 50 ......................... │
│ └─ [ORD-003] △△物産 - 製品C x 200 ........................ │
├──────────────────────────────────────────────────────────┤
│ その他 (12件)                                            │
│ ├─ [ORD-004] □□工業 - 製品D x 80 ......................... │
│ └─ ...                                                   │
└──────────────────────────────────────────────────────────┘
```

### 6.2 アラートバナー（Phase 3）

```
┌──────────────────────────────────────────────────────────┐
│ ⚠️ 主担当者 [田中太郎] が未ログインです（担当受注: 5件）   │
│                                        [詳細を見る] [×]  │
└──────────────────────────────────────────────────────────┘
```

### 6.3 主担当バッジ

```tsx
// 仕入先名の横に表示
<Badge variant="outline" className="text-amber-600 border-amber-300">
  <Crown className="h-3 w-3 mr-1" />
  主担当
</Badge>
```

---

## 7. 実装フェーズ

### Phase 1: 基盤整備（完了）
- [x] `user_supplier_assignments` テーブル（既存）
- [x] `product_suppliers` テーブル及び関連モデル
- [x] 主担当設定ページ（一覧表示のみ）
- [ ] 主担当設定ページ（追加・編集機能）
- [ ] `GET /api/assignments/my-suppliers` API（既存APIで代用可能につきスキップ）

### Phase 2: 各ページへの適用（完了）
- [x] 受注一覧への優先表示適用（バックエンドソート）
- [x] ロット一覧への優先表示適用
  - バックエンドソート実装済み
  - APIレスポンス (`LotResponse`) に `is_primary_supplier` フラグ追加
  - フロントエンドでのバッジ表示確認済み（API動作確認済み）
- [x] 入荷予定一覧への優先表示適用
  - APIレスポンスに `is_primary_supplier` フラグ追加
  - `InboundPlansList` コンポーネントに主担当バッジ追加
- [x] 在庫一覧（仕入先別）への優先表示適用
  - `InventoryBySupplierTable` に主担当バッジ追加

### Phase 3: 通知機能（未着手）
- [ ] ログイン状態追跡（`last_login_at` 活用）
- [ ] 主担当未ログインアラート表示

---

## 8. 考慮事項

### 8.1 パフォーマンス
- 主担当チェックは頻繁に行われるため、インデックスを活用
- フロントエンドでのキャッシュ（React Query）を利用

### 8.2 権限
- 主担当の設定変更は管理者または本人のみ
- 閲覧は全ユーザー可能

### 8.3 エッジケース
- 主担当が未設定の仕入先 → 通常のソート順
- ユーザーが複数の仕入先の主担当 → 全て優先表示
- 全員が主担当 → 効果なし（全員優先 = 優先なし）

---

## 9. 参照

- [user_supplier_assignments モデル](../backend/app/models/assignments/assignment_models.py)
- [主担当設定ページ](../frontend/src/features/assignments/pages/PrimaryAssignmentsPage.tsx)
- [タスクリスト](./tasks/ACTIVE_TASKS.md)
