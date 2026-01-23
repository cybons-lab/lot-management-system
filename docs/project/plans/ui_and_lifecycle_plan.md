# UI実装とデータライフサイクル管理計画

**区分:** 実行計画  
**最終更新:** 記載なし

## 概要
ユーザーからの要望に基づき、データ視覚化（需要予測）、ロットのライフサイクル管理（アーカイブ）、および完了データの取り扱いに関する実装計画を策定する。

## 対応状況

### 未対応
- 本計画の全項目

### 対応済み
- なし

## 1. 需要予測の可視化 (Demand Forecast UI)

### 現状 (As-Is)
- **Backend**: `GET /api/admin/demand/forecast` エンドポイント実装済み。
    - パラメータ: `product_id`, `method` (moving_average, etc.)
    - レスポンス: 期間ごとの予測値リスト
- **Frontend**: `features/forecasts` 配下にコンポーネント群 (`ForecastDetailCard` 等) は存在するが、上記APIとは未連携（またはモック状態）。

### 実装計画 (To-Be)
1.  **APIクライアントの実装**:
    - `frontend/src/shared/api/demandApi.ts` を作成し、`/api/admin/demand/forecast` へのコールを実装。
2.  **UIコンポーネントの改修**:
    - `ForecastDetailCard` または新規 `DemandForecastChart` コンポーネントを作成。
    - [Recharts](https://recharts.org/) を使用して、実績値（過去の出庫）と予測値（未来の需要）を折れ線グラフで表示。
3.  **画面への統合**:
    - 在庫詳細画面 (`InventoryDetailPage`) または専用の「需要予測確認画面」にグラフを配置。

## 2. ロットのアーカイブ処理 (Lot Archiving)

### 課題
- 「もう使わない（残量ゼロ、期限切れ）」ロットが一覧に残り続け、業務の妨げになる。
- 物理削除はトレーサビリティ（履歴）の観点からNG。

### 実装計画
1.  **データモデル拡張**:
    - `LotReceipt` モデルの `status` Enum に `archived` を追加。
    - (または `is_archived` フラグを追加し、statusとは独立管理する案もあるが、ステータス遷移の一部として `active` -> `depleted` -> `archived` が自然)
    - **決定**: `LotStatus` に `archived` を追加。
2.  **API更新**:
    - `PATCH /api/inventory/lots/{lot_id}/archive` エンドポイントを追加。
    - 実行条件: `current_quantity == 0` かつ `status` が `depleted` または `expired` であること。
3.  **UI実装**:
    - ロット一覧画面: デフォルトで `status != 'archived'` のフィルターを適用。
    - 「アーカイブ済みを表示」トグルスイッチを追加。
    - ロット詳細画面: 「アーカイブする」ボタンを追加（条件満たす場合のみ活性化）。

## 3. 完了データの取り扱い (Data Lifecycle Policy)

### 課題
- 受注 (`Order`) やフォーキャスト (`Forecast`) の完了データが蓄積し、検索パフォーマンスや視認性が低下する懸念。

### 実装計画

#### A. 受注 (Orders)
1.  **アーカイブフラグの導入**:
    - `orders` テーブルに `is_archived` (boolean, default=false) カラムを追加。
    - インデックス: `idx_orders_active` (where is_archived = false) を作成し、通常検索を高速化。
2.  **アーカイブ条件**:
    - ステータスが `closed` (完了) または `cancelled` (取消)。
    - かつ、更新日 (`updated_at`) から一定期間（例: 1年）経過。
3.  **自動化 (Phase 2以降)**:
    - 定期バッチで上記条件のレコードを `is_archived = true` に更新。
    - 今回はまず「手動」または「一括処理API」の実装までをスコープとする。

#### B. フォーキャスト (Forecasts)
1.  **現状の確認**:
    - 既に `ForecastCurrent` (最新) と `ForecastHistory` (履歴) に分かれている。
    - `ForecastCurrent` は常に「最新のスナップショット」のみ保持するため、肥大化は抑制されている。
2.  **UI対応**:
    - 通常画面は `ForecastCurrent` のみ表示。
    - 履歴参照が必要な場合のみ `ForecastHistory` を検索するUIフローを徹底する。

## 工程表 (Implementation Phases)

### Phase 8: UI & Lifecycle
1.  **ロットアーカイブ機能**
    - [ ] Backend: `LotStatus.ARCHIVED` 追加 & Migration
    - [ ] Backend: Archive API 実装
    - [ ] Frontend: ロット一覧のデフォルトフィルタ修正 & アーカイブボタン実装
2.  **需要予測 UI**
    - [ ] Client: `demandApi.ts` 実装
    - [ ] Frontend: 予測グラフコンポーネント実装
    - [ ] Frontend: 画面組み込み
3.  **受注アーカイブ基盤 (次回以降)**
    - [ ] DB: `is_archived` カラム追加
    - このフェーズでは設計のみとし、実装はロットアーカイブを優先する。
