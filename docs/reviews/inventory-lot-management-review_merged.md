# 在庫・ロット管理ページ レビューレポート

**作成日**: 2026-01-16
**最終更新**: 2026-01-16
**対象**: `frontend/src/features/inventory/`, `backend/app/application/services/inventory/`, `backend/app/infrastructure/persistence/models/`

---

## 概要

在庫・ロット管理機能を UI/UX、設計、DB構成、コード品質の観点から徹底的にレビューした結果をまとめる。

---

## 改善方針（決定済み）

レビュー結果を受けて、以下の方針で改善を進める。

### 決定事項一覧

| # | 問題 | 決定内容 | 備考 |
|---|------|---------|------|
| 1 | `lot_number` の冗長性 | **完全削除** | `LotReceipt.lot_number` カラムを削除し、`LotMaster.lot_number` に一本化 |
| 2 | `Lot` エイリアス | **廃止して統一** | コード内を `LotReceipt` に統一、エイリアスを削除 |
| 3 | 残量計算の方式 | **動的計算を維持** | 現状のまま。パフォーマンス問題が顕在化したら再検討 |
| 4 | `lot_master` 集計値の同期 | **DBトリガー** | 計画を念入りに立ててから実装 |
| 5 | 大量データ対応 | **両方** | サーバーサイドページネーション + バーチャルスクロール |
| 6 | フロントエンド Decimal 処理 | **decimal.js 導入** | ライブラリを使用して精度を保証 |

### 最終的なあるべき姿

#### データモデル
```
LotMaster (ロット番号の正規化)
├── lot_number: VARCHAR(100) UNIQUE  ← 唯一の情報源
├── product_id: FK
├── supplier_id: FK (nullable)
├── first_receipt_date: DATE         ← DBトリガーで自動更新
└── latest_expiry_date: DATE         ← DBトリガーで自動更新

LotReceipt (入荷実体)
├── lot_master_id: FK               ← lot_number は LotMaster から取得
├── received_quantity: NUMERIC      ← 不変
├── (lot_number カラムは削除)
└── ...
```

#### コードベース
- `Lot` エイリアスを完全廃止、すべて `LotReceipt` を使用
- フロントエンドで `decimal.js` を使用し、数量計算の精度を保証
- 残量計算は動的（`received_quantity - SUM(withdrawal_lines.quantity)`）

#### API/UI
- サーバーサイドページネーション対応
- バーチャルスクロールで大量データもスムーズに表示

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


### 1.3.1 展開行が常に1件のみ（暗黙的な制約）

**現状**:
- 展開行が「常に1件のみ」という挙動になっており（またはそう見える実装になっており）、複数倉庫の在庫を並べて比較したいケースに不向き。
- UI上は複数展開できそうに見えるため、ユーザーの期待値と挙動がズレる。

**改善案**:
- 仕様として「単一展開」にするなら、UIで明示（例: “1件ずつ展開” 表記 / 他行クリックで自動クローズ）。
- 仕様として複数展開を許容するなら、`onExpandedRowsChange` の差分検出を複数件に対応させる（`find` ではなく `filter`）。



### 1.3.2 ロット一覧の情報不足（判断材料が足りない）

**現状**:
- 展開行のロット一覧で、実質的に「現在在庫（残量）」以外の判断材料が少ない。
- 「予約（未確定）」「確定引当」「ロック」など、出庫/ロック操作の判断に必要な内訳が見えにくい。

**影響**:
- 現場が「なぜ利用可能が少ないのか」を説明できず、問い合わせと誤操作が増える。

**改善案**:
- ロット行に以下を追加表示（少なくともツールチップで）
  - 利用可能（= 残量 − ロック − 確定引当）
  - 予約（未確定）
  - 確定引当
  - ロック

### 1.3.3 ロットステータス表現が限定的

**現状**:
- ロット状態の表示が「ロック中/利用可」程度に留まり、期限切れ・枯渇・廃棄などの状態が可視化されない。

**影響**:
- 期限切れ在庫が混在しても気づきにくく、FEFO運用をUIが支援できない。

**改善案**:
- ステータスを「利用可」「ロック」「期限切れ」「在庫なし（枯渇）」「検査待ち/NG（ある場合）」などに拡張。
- 期限切れは強調表示（アイコン/色/フィルタ）し、誤出庫を抑止する。


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


### 1.5.1 詳細画面が全ロット取得 → ローカル絞り込み

**現状**:
- 詳細側で `useLotsQuery({})` のように **全ロットを取得してからローカルで絞り込む** 実装が混在。

**影響**:
- データ量が増えると **ネットワーク負荷 / メモリ負荷 / 初回表示遅延** が増大。
- さらに `limit: 100` 等の制限がある場合、該当ロットが取得されず **欠落が発生**。

**改善案**:
- 詳細画面は `product_id` / `warehouse_id` / `supplier_id` 等で **サーバー側に絞り込み条件を渡す**。
- 併せてページネーション（もしくは無限スクロール）を導入。

### 1.5.2 仕入先フィルタ時の「在庫なし」タブが機能しない

**現状**:
- 仕入先フィルタ時の在庫サマリ取得が `remaining_quantity > 0` 等の条件で固定されており、**在庫0の行自体が取得されない**。

**影響**:
- UIで「在庫なし」タブを選んでも表示されない／意図と異なる。

**改善案**:
- 取得クエリを「在庫あり/なし」で切り替える（タブ状態をAPI条件に反映）。
- もしくは、在庫0も含めて取得した上でUI側でタブフィルタする（ただし件数増加に注意）。

### 1.5.3 ロット一覧が100件上限で欠落する（表示と集計の不一致）

**現状**:
- ロット取得APIに `limit` デフォルトがあり、ページング/無限スクロールがない場合、**一覧が欠落**。
- 一方「ロット数」などの集計列は別集計のため、**表示件数と集計値が一致しない**状況が起きうる。

**改善案**:
- サーバーサイドページネーション + UI側のページング/無限スクロール（決定済み方針）を優先実装。


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


### 2.4.1 有効在庫の定義ズレ（Active/Confirmedの扱い）

**ドメイン定義（要固定）**:
- 有効在庫（利用可能） = **現在在庫 − ロック数量 − 確定引当**
- **予約（未確定 / Active）は在庫を減らさない**（ただし“予約量”として可視化する）

**問題**:
- `active` と `confirmed` が合算され、UI/サマリで **予約（未確定）まで減算**されると、運用ルールと衝突して誤認が発生する。

**対応**:
- `allocated_quantity` は **confirmed_only** に統一し、Activeは `reserved_quantity_active` 等の別列で表示。
- UI表示名は `active` を **「予約（未確定）」** に統一（内部名は互換のため維持可）。

### 2.4.2 ロック数量の二重控除リスク

**問題**:
- 出庫可否判定が `current_quantity - allocated - locked` のような式になっている一方で、
  `current_quantity` が既に locked 減算済み（ビュー定義）になっている場合、**ロックが二重で引かれる**。

**対応**:
- **ロックはSSOTで1回だけ引く**。
- `available_quantity`（利用可能）を **ビューまたはサービスのどちらかに統一**し、他レイヤはその値のみを参照。

### 2.4.3 「利用可能」の説明表示（式）と実計算の一致

**問題**:
- 画面説明が「利用可能 = 総在庫 − 引当」等になっていると、ロックを含まず実計算とズレる。

**対応**:
- UIのツールチップ/説明は必ず次の式で固定:
  - **利用可能 = 総在庫 − ロック − 確定引当**
  - **予約（未確定）は減算しない（別表示）**


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


### 2.7 v1/v2 の型定義が混在

**問題**:
- フロントが v2 のエンドポイントを叩いている一方で、型定義やフックが v1 由来のものを参照していると、
  レスポンス差異が表面化しにくく、型安全性が崩れる。

**改善案**:
- エンドポイントと型定義を1系統に統一（v2に寄せる）。
- 互換期間が必要なら `LotV1` / `LotV2` を明示的に分け、変換層を置く。

### 2.8 在庫サマリとロット詳細のデータ源不一致

**問題**:
- 在庫サマリが `product_warehouse` 起点、ロット詳細が `lot_receipts` 起点など、
  データ源が異なると **集計値と明細値が一致しない**ケースが発生しうる。
  （例: product_warehouse に存在するがロット未作成 等）

**改善案**:
- 画面で“同じ数字”として扱う指標は **同一のSSOT（同一ビュー or 同一サービス）** から出す。
- どうしても別系統になる場合は、UIに「定義の違い」を明示する（推奨しない）。


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

### 5.2 改善タスク一覧

決定事項を反映した改善タスク。スケジュールは別途計画する。

#### Phase 1: DB変更（今週末のDB空にするタイミングで実施）

| タスク | 決定 | 影響範囲 | 工数目安 |
|--------|------|---------|---------|
| `LotReceipt.lot_number` カラム削除 | ✅ 完全削除 | マイグレーション、サービス層、ビュー | 3-5日 |
| FEFO インデックス最適化 | - | DB | 0.5日 |

#### Phase 2: コードリファクタリング

| タスク | 決定 | 影響範囲 | 工数目安 |
|--------|------|---------|---------|
| `Lot` → `LotReceipt` エイリアス廃止 | ✅ 廃止して統一 | バックエンド全体 | 5-7日 |
| `current_quantity` synonym 廃止 | - | バックエンド全体 | 2-3日 |
| `allocated_quantity` 計算の統一 | - | ビュー定義、サービス層 | 1-2日 |
| `InventoryTable.tsx` の分割 | - | フロントエンドのみ | 1-2日 |

#### Phase 3: スケーラビリティ対応

| タスク | 決定 | 影響範囲 | 工数目安 |
|--------|------|---------|---------|
| サーバーサイドページネーション導入 | ✅ 両方 | ロット一覧 API、在庫一覧 API | 2-3日 |
| バーチャルスクロール導入 | ✅ 両方 | フロントエンドテーブル | 2-3日 |
| `decimal.js` 導入 | ✅ 導入 | フロントエンド全体 | 2-3日 |

#### Phase 4: DBトリガー（要計画）

| タスク | 決定 | 影響範囲 | 工数目安 |
|--------|------|---------|---------|
| `lot_master` 集計値の自動同期トリガー | ✅ DBトリガー | DB、テスト | 3-5日 |

**注意**: DBトリガーは計画を念入りに立ててから実装する。以下を事前に検討:
- トリガーの発火タイミング（INSERT/UPDATE/DELETE）
- パフォーマンス影響（大量データ時）
- テスト方法（トリガーのユニットテスト）
- ロールバック手順

---


## 最優先フィードバック（4項目）

実装の迷いを減らすため、「正しさ」を壊す可能性が高い順に4点を固定する。

1. **有効在庫（利用可能）のSSOT固定**
   - 利用可能 = **総在庫 − ロック − 確定引当**
   - 予約（未確定 / Active）は **減算しない**（別列で可視化）

2. **`current_quantity` の意味混線解消**
   - `current_quantity` synonym は廃止（または外部公開しない）
   - UI/サービスは `available_quantity` / `remaining_quantity` など **意味が正しい列のみ参照**

3. **ページング（欠落防止）を最優先で実装**
   - `limit` 固定や「全件取得→ローカル絞り込み」を撤廃
   - サーバーサイドページネーション +（必要なら）無限スクロール/バーチャルスクロール

4. **`allocated_quantity` の定義を1つに統一**
   - confirmed_only か、状態を含めるかを明文化し、ビューとサービスで一致させる
   - Activeは `reserved_quantity_active` 等で分離して表示

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
