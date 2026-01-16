# 在庫・ロット管理ページ レビューレポート

**作成日**: 2026-01-16
**対象**: `frontend/src/features/inventory/`, `backend/app/application/services/inventory/`, `backend/app/infrastructure/persistence/models/`

---

## 概要

在庫・ロット管理機能を UI/UX、設計、DB構成、コード品質の観点から徹底的にレビューした結果をまとめる。

---

## 1. UI/UX の問題点

### 1.1 コンポーネント肥大化

| ファイル | 行数 | 制限 | 問題 |
|---------|------|------|------|
| `InventoryTable.tsx` | 571行 | 300行 | **規約違反** |
| `AdhocLotCreateForm.tsx` | 330行 | 300行 | やや超過 |

**影響**:
- 1つのファイルに複数の責務（テーブル表示、ダイアログ管理、行展開ロジック）
- `eslint-disable max-lines` で警告を無視している
- テストの書きにくさ、保守性の低下

**改善案**:
```
InventoryTable.tsx → 分割
├── InventoryTableCore.tsx      # テーブル本体
├── InventoryTableActions.tsx   # アクションボタン
├── InventoryExpandedRow.tsx    # 展開行コンテンツ
└── InventoryDialogs.tsx        # ダイアログ群
```

### 1.2 ダイアログの多重管理

`InventoryTable.tsx` で管理しているダイアログ状態:

```typescript
// 5つの独立したダイアログ状態
const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
const [selectedWithdrawalLot, setSelectedWithdrawalLot] = useState<LotUI | null>(null);
const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
const [selectedHistoryLot, setSelectedHistoryLot] = useState<LotUI | null>(null);
const [quickIntakeDialogOpen, setQuickIntakeDialogOpen] = useState(false);
const [quickIntakeItem, setQuickIntakeItem] = useState<InventoryItem | null>(null);
// + useInventoryTableLogic からの editDialog, lockDialog
```

**問題点**:
- ダイアログごとに `open` と `selected*` の2つの状態を管理
- 状態の増加に伴い、管理が複雑化
- 同時に複数のダイアログが開く可能性（排他制御なし）

**改善案**:
```typescript
// 単一のダイアログ状態管理
type DialogState =
  | { type: 'none' }
  | { type: 'withdrawal'; lot: LotUI }
  | { type: 'history'; lot: LotUI }
  | { type: 'quickIntake'; item: InventoryItem }
  | { type: 'edit'; lot: LotUI }
  | { type: 'lock'; lot: LotUI };

const [dialog, setDialog] = useState<DialogState>({ type: 'none' });
```

### 1.3 展開行の処理が複雑

`handleExpandedRowsChange` (L107-131):

```typescript
const handleExpandedRowsChange = (ids: (string | number)[]) => {
  const idsSet = new Set(ids.map(String));
  const currentSet = new Set(expandedRowIds);

  // 新しく展開された行を検出
  const added = [...idsSet].find((id) => !currentSet.has(id));
  if (added) { /* ... */ }

  // 折りたたまれた行を検出
  const removed = [...currentSet].find((id) => !idsSet.has(id));
  if (removed) { /* ... */ }
};
```

**問題点**:
- `DataTable` の `onExpandedRowsChange` に渡す全IDリストから差分を検出
- `find` で最初の1件しか検出できない（複数同時展開/折りたたみ時にバグ）
- ロジックが複雑で理解しにくい

**改善案**:
- `DataTable` に `onRowExpand(id)` / `onRowCollapse(id)` のイベントを追加
- または、差分検出を正しく実装（`filter` で全差分を取得）

### 1.4 フィルターがビュー依存

`InventoryPage.tsx` で `overviewMode === "items"` の場合のみフィルターを表示:

```tsx
{overviewMode === "items" && (
  <Section>
    {/* フィルターUI */}
  </Section>
)}
```

**問題点**:
- 「仕入先別」「倉庫別」「製品別」ビューではフィルターが使えない
- ユーザーは表示を絞り込みたい場合、一度「アイテム一覧」に切り替える必要がある

**改善案**:
- 各ビューで適切なフィルターを提供（例: 仕入先別ビューでは倉庫フィルター）
- または、フィルターを適用した状態で集計ビューを表示

### 1.5 クライアントサイドフィルタリングの限界

`useLotFilters.ts` のコメント:

```typescript
// 3. サーバーサイドフィルタリングとの使い分け
//    使い分け基準:
//    - データ量が少ない（数百件程度）: クライアントサイド
//    - データ量が多い（数千件以上）: サーバーサイド + ページネーション
//    現状: ロット数は数百件程度を想定 → クライアントサイドが適切
```

**問題点**:
- 「数百件程度を想定」という前提がビジネス成長で崩れる可能性
- `limit: 100` がハードコードされている箇所あり
- ページネーションが実装されていない（`LotTable.tsx` には `TablePagination` があるが、`InventoryTable` にはない）

**破綻シナリオ**:
1. ロット数が1000件を超える
2. APIレスポンスが遅くなる
3. クライアントサイドフィルタリングも重くなる
4. UIがフリーズする

**改善案**:
- サーバーサイドページネーションを早期に導入
- バーチャルスクロールの検討
- `limit` パラメータの適切な管理

### 1.6 入力フォームの項目数

`AdhocLotCreateForm.tsx` では9個のフィールド:

1. ロット番号
2. ロット種別
3. 仕入先
4. 製品
5. 倉庫
6. 数量
7. 単位
8. 入荷日
9. 有効期限
10. 備考

**問題点**:
- 入力項目が多く、ユーザーの認知負荷が高い
- 必須項目と任意項目の区別が視覚的に弱い（`*` マークのみ）
- バリデーションエラー時のスクロール位置が考慮されていない

**改善案**:
- ステップフォーム（ウィザード形式）の検討
- 入力項目のグループ化（基本情報、数量情報、日付情報）
- 任意項目の折りたたみ（アコーディオン）

---

## 2. 設計上の問題点

### 2.1 モデル名の混在

コード内で `Lot` と `LotReceipt` が混在:

```python
# lot_service.py
from app.infrastructure.persistence.models import (
    Lot,  # エイリアス
    LotMaster,
    ...
)
```

```python
# models/__init__.py
from .lot_receipt_models import LotReceipt as Lot  # エイリアス定義
```

**問題点**:
- B-Plan で `lots` → `lot_receipts` にリネームしたが、コード内では `Lot` エイリアスを使用
- 新規開発者がどちらが正しいのか混乱する
- IDE の補完や検索で `Lot` と `LotReceipt` が両方ヒットする

**改善案**:
- エイリアスを段階的に廃止し、`LotReceipt` に統一
- または、ドキュメントで明確に「`Lot` は `LotReceipt` のエイリアス」と記載

### 2.2 lot_number の冗長性

```python
class LotMaster(Base):
    lot_number: Mapped[str]  # 正式なロット番号

class LotReceipt(Base):
    lot_master_id: Mapped[int]  # FK
    lot_number: Mapped[str]  # Legacy: 重複データ
```

**問題点**:
- `lot_number` が `LotMaster` と `LotReceipt` の両方に存在
- コメントで「lot_master.lot_number is canonical」とあるが、実際には両方更新される
- データ不整合のリスク（2つの `lot_number` が異なる値になる可能性）

**改善案**:
- `LotReceipt.lot_number` を非推奨にし、`lot_master.lot_number` を参照
- または、`LotReceipt.lot_number` を完全に削除（マイグレーション必要）

### 2.3 current_quantity vs received_quantity

```python
class LotReceipt(Base):
    received_quantity: Mapped[Decimal]  # 入荷数量（不変）
    current_quantity: Mapped[Decimal] = synonym("received_quantity")  # 後方互換
```

**問題点**:
- `current_quantity` は `received_quantity` の synonym だが、意味が異なる
  - `received_quantity`: 入荷時の数量（不変）
  - `current_quantity`: 現在の在庫数（出庫により減少するはず）
- しかし、`received_quantity` は出庫しても減らない設計
- 「残量」は `received_quantity - 出庫済み数量` で計算するが、これは動的計算

**破綻シナリオ**:
```
1. 入荷: received_quantity = 100
2. 出庫: withdrawal_lines に 30 個記録
3. 残量 = 100 - 30 = 70（動的計算）
4. しかし、Lot.current_quantity = 100（不変）
5. UI で「現在在庫: 100」と表示される（誤り）
```

**現状の対応**:
- `v_lot_details` ビューで `available_quantity` を計算
- サービス層で `get_available_quantity()` を呼び出し
- 問題は、どこで計算するかが統一されていない点

**改善案**:
- `current_quantity` synonym を廃止
- 「残量」は常に動的計算で取得することを明確化
- フロントエンドでも `available_quantity` を使用するよう統一

### 2.4 allocated_quantity の計算方法の不統一

**ビュー側 (`v_lot_details`)**:
```sql
-- マテリアライズされた静的値？ または動的計算？
allocated_quantity: Mapped[Decimal]
```

**サービス側 (`stock_calculation.py`)**:
```python
def get_confirmed_reserved_quantity(db: Session, lot_id: int) -> Decimal:
    # lot_reservations から CONFIRMED ステータスのみを合計
    result = db.query(func.sum(LotReservation.reserved_qty))
        .filter(LotReservation.status == ReservationStatus.CONFIRMED)
        .scalar()
```

**問題点**:
- ビューの `allocated_quantity` とサービスの `get_confirmed_reserved_quantity()` が同じ値を返すか不明
- ACTIVE（仮予約）を含めるかどうかの判断が場所によって異なる可能性
- データの「真の情報源（SSOT）」が複数存在

**改善案**:
- ビューの `allocated_quantity` の定義を明確化（どのステータスを含めるか）
- サービス層とビューで同じ計算ロジックを使用することを保証
- ドキュメントで計算式を明記

### 2.5 StockHistory と StockMovement の並存

```python
# StockHistory（inventory_models.py）
class StockHistory(Base):
    __tablename__ = "stock_history"
    transaction_type: Mapped[str]  # 'inbound' | 'allocation' | 'shipment' | ...
    quantity_change: Mapped[Decimal]
    quantity_after: Mapped[Decimal]

# StockMovement（別モデル？）
from app.infrastructure.persistence.models import StockMovement
```

**問題点**:
- `StockHistory` と `StockMovement` の違いが不明
- `lot_service.py` では `StockMovement` を使用
- モデル定義の場所も分散している可能性

**改善案**:
- どちらか一方に統一（おそらく `StockHistory` が正式）
- 不要なモデルを削除
- 命名を明確化（`StockHistory` = イミュータブルな監査ログ）

### 2.6 状態管理パターンの混在

フロントエンド:

```typescript
// Jotai atom（sessionStorage 永続化）
const { overviewMode, filters, ... } = useInventoryPageState();

// useState（ローカル）
const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);

// カスタムフック内の状態
const { selectedLot, editDialog, ... } = useInventoryTableLogic();
```

**問題点**:
- どの状態がどこで管理されているか把握しにくい
- sessionStorage 永続化される状態とされない状態が混在
- リロード時に一部の状態のみ復元される

**改善案**:
- 状態管理の責務を明確化
  - ページレベル: Jotai atom（永続化）
  - コンポーネントレベル: useState（一時的）
- 状態管理ガイドラインの策定

---

## 3. DB構成の問題点

### 3.1 ビューの更新タイミング

```sql
-- v_lot_details, v_inventory_summary は通常のビュー（マテリアライズドビューではない）
```

**メリット**:
- 常に最新データを返す

**デメリット**:
- 大量データ時のパフォーマンス問題
- 複雑な JOIN が毎回実行される

**検討事項**:
- ロット数が数万件を超える場合、マテリアライズドビューの検討
- または、キャッシュ層の導入

### 3.2 FEFO インデックスの最適化

```python
Index(
    "idx_lot_receipts_fifo_allocation",
    "product_id", "warehouse_id", "status", "received_date", "id",
    postgresql_where=text(
        "status = 'active' AND inspection_status IN ('not_required', 'passed')"
    ),
)
```

**問題点**:
- インデックス名が `fifo_allocation` だが、FEFO（First Expiry First Out）には `expiry_date` が必要
- `expiry_date` がインデックスに含まれていない

**改善案**:
```python
Index(
    "idx_lot_receipts_fefo_allocation",  # 名前修正
    "product_id", "warehouse_id", "expiry_date", "received_date", "id",  # expiry_date 追加
    postgresql_where=text(
        "status = 'active' AND inspection_status IN ('not_required', 'passed')"
    ),
)
```

### 3.3 withdrawal_lines による残量計算のコスト

残量計算:
```python
残量 = received_quantity - SUM(withdrawal_lines.quantity)
```

**問題点**:
- ロットごとに `withdrawal_lines` の合計を計算する必要がある
- 大量の出庫履歴がある場合、計算コストが高い
- N+1 問題のリスク

**改善案**:
- `LotReceipt` に `consumed_quantity` カラムを追加（出庫時に更新）
- または、定期的な集計バッチで残量をキャッシュ

### 3.4 lot_master の集計値の同期

```python
class LotMaster(Base):
    first_receipt_date: Mapped[date | None]  # キャッシュ値
    latest_expiry_date: Mapped[date | None]  # キャッシュ値

    def update_aggregate_dates(self) -> None:
        # 手動で呼び出す必要がある
        ...
```

**問題点**:
- `update_aggregate_dates()` が自動的に呼ばれない
- `LotReceipt` の追加/削除時に呼び忘れるとデータ不整合
- DBトリガーではなくアプリケーション層で管理

**改善案**:
- DBトリガーで自動更新
- または、イベントドリブンで更新（`LotReceipt` 作成時にイベント発行）

---

## 4. コード品質の問題点

### 4.1 eslint-disable の多用

```typescript
// InventoryTable.tsx
/* eslint-disable max-lines */
// eslint-disable-next-line max-lines-per-function
```

**問題点**:
- リンターの警告を無視することで、コード品質の低下を許容
- 技術的負債の蓄積

**改善案**:
- コンポーネントを分割してリンター警告を解消
- どうしても必要な場合は、理由をコメントで明記

### 4.2 型キャストの使用

```typescript
// useLotFilters.ts
const lotDeliveryCode = (lot as unknown as { delivery_place_code?: string })
  .delivery_place_code;
```

**問題点**:
- `as unknown as` は型安全性を完全に破壊
- 実行時エラーのリスク

**改善案**:
- `LotUI` 型に `delivery_place_code` を追加
- または、オプショナルチェーン `lot?.delivery_place_code` を使用

### 4.3 Decimal と number の混在

```typescript
// フロントエンド
const qty = Number(lot.current_quantity);  // Decimal → number
```

```python
# バックエンド
lot.current_quantity = Decimal(str(projected_quantity))  # float → Decimal
```

**問題点**:
- バックエンドは `Decimal` で精度を保証
- フロントエンドで `Number()` 変換により精度が失われる可能性
- 特に小数点以下3桁の数量で問題になりうる

**改善案**:
- フロントエンドでも `decimal.js` などのライブラリを使用
- または、整数化（1000倍して保存など）

### 4.4 コメントとドキュメントの品質

**良い例**（`stock_calculation.py`）:
```python
"""
【設計意図】在庫計算サービスの設計判断:

1. なぜ利用可能数量を動的に計算するのか
   理由: 予約状態の変化をリアルタイムに反映
   ...
"""
```

**悪い例**（一部のコンポーネント）:
```typescript
// ステータスアイコンは省略 - 必要に応じて追加
```

**改善案**:
- 複雑なビジネスロジックには必ず設計意図を記載
- 「TODO」「FIXME」には期限と担当者を明記

---

## 5. 総合評価

### 5.1 リスク評価

| カテゴリ | リスクレベル | 主な問題 |
|---------|-------------|---------|
| スケーラビリティ | **高** | クライアントサイドフィルタリング、ページネーション未実装 |
| データ整合性 | **中** | lot_number の冗長性、allocated_quantity の計算方法不統一 |
| 保守性 | **中** | コンポーネント肥大化、モデル名の混在 |
| パフォーマンス | **中** | ビューの JOIN コスト、N+1 リスク |
| UX | **低〜中** | ダイアログ管理、フィルターの制限 |

### 5.2 優先度別 改善提案

#### 優先度: 高（早期対応推奨）

1. **サーバーサイドページネーション導入**
   - 影響: ロット一覧 API、在庫一覧 API
   - 工数目安: 2-3日

2. **allocated_quantity 計算の統一**
   - 影響: ビュー定義、サービス層
   - 工数目安: 1-2日

3. **InventoryTable.tsx の分割**
   - 影響: フロントエンドのみ
   - 工数目安: 1-2日

#### 優先度: 中（計画的に対応）

4. **lot_number の冗長性解消**
   - 影響: マイグレーション、サービス層
   - 工数目安: 3-5日

5. **current_quantity synonym の廃止**
   - 影響: バックエンド全体
   - 工数目安: 2-3日

6. **FEFO インデックスの最適化**
   - 影響: DB
   - 工数目安: 0.5日

#### 優先度: 低（長期的に対応）

7. **Lot → LotReceipt エイリアス廃止**
   - 影響: バックエンド全体
   - 工数目安: 5-7日

8. **フロントエンド Decimal ライブラリ導入**
   - 影響: フロントエンド全体
   - 工数目安: 2-3日

---

## 6. 参考資料

- `CLAUDE.md` - プロジェクト規約
- `docs/standards/` - 詳細なコーディング規約
- `docs/architecture/system_invariants.md` - システム不変条件

---

## 付録: 調査対象ファイル一覧

### フロントエンド
- `frontend/src/features/inventory/pages/InventoryPage.tsx`
- `frontend/src/features/inventory/components/InventoryTable.tsx`
- `frontend/src/features/inventory/components/LotTable.tsx`
- `frontend/src/features/inventory/components/AdhocLotCreateForm.tsx`
- `frontend/src/features/inventory/hooks/useLotFilters.ts`
- `frontend/src/features/inventory/api.ts`
- `frontend/src/features/inventory/state.ts`

### バックエンド
- `backend/app/application/services/inventory/lot_service.py`
- `backend/app/application/services/inventory/stock_calculation.py`
- `backend/app/infrastructure/persistence/models/lot_receipt_models.py`
- `backend/app/infrastructure/persistence/models/lot_master_model.py`
- `backend/app/infrastructure/persistence/models/lot_reservations_model.py`
- `backend/app/infrastructure/persistence/models/views_models.py`
