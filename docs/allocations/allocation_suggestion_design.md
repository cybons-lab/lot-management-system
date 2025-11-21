# Allocation Suggestion Design (最終版 / generated_for_month 廃止版)

## 1. 概要

本ドキュメントは、Lot Management System における **ロット引当候補 (Allocation Suggestion)** の設計を定義する。

- **目的**
  - 需要予測 (Forecast) と在庫ロットから、**自動でロット引当候補 (soft allocation)** を生成する。
  - 主に **当月 / 翌月の予測**に対して、FEFO で在庫ロットを割り当て、カバー状況 (coverage) と不足 (gaps) を可視化する。
- **スコープ**
  - Forecast インポート時に、当月 / 翌月の引当候補を一括生成する。
  - 個別オーダー行に対して、DBに保存しない preview 用の引当候補を返す。
- **非スコープ**
  - 実在庫をロックする **hard allocation の本格運用**（v3.0 で詳細設計）。
  - 画面レイアウトやコンポーネント構造（別 UI 設計書で扱う）。

> **重要:**  
> 本設計では **`generated_for_month` という列・概念は使用しない**。  
> 今後も追加しない前提とする。

---

## 2. 用語

### 2.1 Soft Allocation

- 在庫ロットに対して「こう割り当てるのが望ましい」という **候補情報**。
- 実在庫のロックは行わない（在庫数は減らさない）。
- Forecast インポート時などに自動生成され、`allocation_suggestions` テーブルに保存される。
- 複数回の再生成が可能であり、「常に最新の予測と在庫に基づいた案」を提供する。

### 2.2 Hard Allocation（将来 v3.0）

- 在庫ロットに対して **数量を確保した状態**。他のオーダーから利用できない。
- 本バージョンでは業務ロジックは扱わず、
  - `allocation_type` に `'hard'` を許容して将来拡張できるようにするに留める。

### 2.3 Forecast の粒度

- DB では日別の `forecast_date` を持つ。
- 同じ行に集計用の **期間キー** として `forecast_period`（例: `"2025-11"`）を持つ前提。
- Frontend では
  - 日別
  - 旬 (1–10, 11–20, 21–月末)
  - 月合計  
  に集約して表示する。

### 2.4 FEFO (First-Expired, First-Out)

- ロット引き当て時の基本ルール。
- 優先順位：
  1. 消費期限 (`expiration_date`) 昇順
  2. 入庫日 (`received_date`) 昇順
  3. さらに必要なら lot_id 昇順などで安定ソート

---

## 3. 業務前提と運用

### 3.1 業務前提

- 需要予測は外部システム（例: SAP）から月次で取り込まれる。
- ロット在庫は日々変動するが、**「最新の Forecast × 最新の在庫」から常に計算し直す**スタイルとする。
- 月末時点の状態を固定スナップショットとして取る必要があれば、
  - それは別の snapshot 機構で対応し、Allocation Suggestion 側では持たない。

### 3.2 運用方針（generated_for_month 不使用）

- Forecast インポートのたびに、対象期間（当月 / 翌月など）の Allocation Suggestion を **全て再生成** する。
- 再生成の単位は **forecast_period**（例: `"2025-11"`、`"2025-12"`）。
- 「いつの時点で生成したか」は
  - `allocation_suggestions.created_at` で必要に応じて追跡する。
  - それ以上の「月別バージョン管理」はこのテーブルでは行わない。

---

## 4. モードとユースケース

### 4.1 モード

1. **Forecast モード（バッチ）**
   - Forecast インポート時に、
     - 指定された `forecast_period` 群（例: 当月 / 翌月）について
     - Allocation Suggestion を一括再生成する。
   - 結果は `allocation_suggestions` テーブルに保存。

2. **Order Preview モード（オンデマンド）**
   - 個別オーダー行に対して、
     - 当時点の在庫を基に FEFO で候補を計算し、
     - DB に保存せず Response として返す。

### 4.2 Forecast モード シーケンス

1. FE が `POST /forecasts/bulk-import` を呼び出し、当月・翌月などの Forecast を送信。
2. Backend が `forecast_current` / `forecast_history` を更新。
3. Backend が `AllocationSuggestionService.regenerate_for_periods(forecast_periods)` を呼び出す：
   1. 対象 `forecast_periods`（例: `"2025-11"`, `"2025-12"`）の既存 `allocation_suggestions` を削除。
   2. 対象期間の Forecast を、key（customer, delivery_place, product, forecast_period）ごとに集計。
   3. 在庫ロットを FEFO でソートし、引当候補を生成。
   4. 生成された候補を `allocation_suggestions` に一括 INSERT。
   5. coverage / gaps を集計し、必要に応じて Forecast API のレスポンスに含める。

### 4.3 Order Preview モード シーケンス

1. FE が `POST /allocations/suggestions/preview` を呼び出し、`order_line_id` を指定。
2. Backend が対象 `order_line` を取得（customer, delivery_place, product, quantity 等）。
3. 在庫ロットを FEFO でソートし、必要数量分だけ候補を計算。
4. 生成結果を `suggestions` / `stats` / `gaps` として返す（DB には保存しない）。

---

## 5. テーブル仕様

### 5.1 allocation_suggestions

> 実際の DDL は既存スキーマに合わせて微調整すること。

```sql
CREATE TABLE allocation_suggestions (
  id                  BIGSERIAL PRIMARY KEY,

  -- 需要側キー
  order_line_id       BIGINT NULL,        -- Forecastベースの soft allocation では NULL 可
  forecast_period     VARCHAR(7) NOT NULL, -- "YYYY-MM"

  customer_id         BIGINT NOT NULL,
  delivery_place_id   BIGINT NOT NULL,
  product_id          BIGINT NOT NULL,

  -- ロット側キー
  lot_id              BIGINT NOT NULL,
  quantity            NUMERIC(18, 3) NOT NULL,

  -- 種別 / 由来
  allocation_type     VARCHAR(10) NOT NULL, -- 'soft' or 'hard'
  source              VARCHAR(32) NOT NULL, -- 'forecast_import' / 'order_preview' など

  -- 将来の拡張用 (v3.0)
  -- priority_level   INTEGER NULL,         -- 優先ロット用など

  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
````

* **generated_for_month は持たない。**
* Forecast の対象期間は `forecast_period` で識別する。
* 「いつ生成したか」は `created_at` で参照する。

---

## 6. API 仕様

### 6.1 コンセプト

* Request は「モード + 対象 (scope) + options」で表現する。
* Response は「suggestions + stats + gaps」を返す。

### 6.2 Request（論理モデル）

```ts
type AllocationScopeMode = "forecast" | "order";

interface AllocationSuggestionRequest {
  mode: AllocationScopeMode;

  // Forecast モード用
  forecast_scope?: {
    forecast_periods: string[];     // ["2025-11", "2025-12"] など
    customer_ids?: number[];
    delivery_place_ids?: number[];
    product_ids?: number[];
  };

  // Order preview 用
  order_scope?: {
    order_line_id: number;
  };

  // options
  options?: {
    allocation_type?: "soft" | "hard"; // 現状は "soft" デフォルト
    fefo?: boolean;                    // true デフォルト
    allow_cross_warehouse?: boolean;   // 倉庫跨ぎ許容フラグ
    ignore_existing_suggestions?: boolean; // Forecast モードで、既存を初期状態として見ない場合 true
  };
}
```

> Forecast インポート API からは、内部でこの Request を組み立てて
> `AllocationSuggestionService` に渡す想定でもよい。

### 6.3 Response（論理モデル）

```ts
interface AllocationSuggestionResponse {
  suggestions: AllocationSuggestionDto[];
  stats: AllocationStatsSummary;
  gaps: AllocationGap[];
}

interface AllocationSuggestionDto {
  id?: number;        // DBに保存された場合のみ
  order_line_id?: number | null;

  customer_id: number;
  delivery_place_id: number;
  product_id: number;

  forecast_period: string;  // "YYYY-MM"

  lot_id: number;
  quantity: number;

  allocation_type: "soft" | "hard";
  source: "forecast_import" | "order_preview";

  // FE 表示用補助
  lot_number?: string;
  lot_expiration_date?: string | null;
  warehouse_id?: number;
}

interface AllocationStatsSummary {
  per_period: AllocationStatsPerPeriod[]; // forecast_period ごとの集計
  total: AllocationStatsTotal;
}

interface AllocationStatsPerPeriod {
  forecast_period: string; // "YYYY-MM"
  per_key: AllocationStatsPerKey[];
}

interface AllocationStatsPerKey {
  customer_id: number;
  delivery_place_id: number;
  product_id: number;
  forecast_period: string;  // "YYYY-MM"

  forecast_quantity: number;
  allocated_quantity: number;
  shortage_quantity: number; // max(forecast - allocated, 0)
}

interface AllocationStatsTotal {
  forecast_quantity: number;
  allocated_quantity: number;
  shortage_quantity: number;
}

interface AllocationGap {
  customer_id: number;
  delivery_place_id: number;
  product_id: number;
  forecast_period: string;  // "YYYY-MM"

  shortage_quantity: number;
  related_order_line_ids?: number[];
}
```

---

## 7. 生成ロジック

### 7.1 入力

* Forecast

  * `forecast_current` から対象 `forecast_periods` の行を取得。
  * key：

    * `customer_id`
    * `delivery_place_id`
    * `product_id`
    * `forecast_period`
  * 日別 (`forecast_date`) は期間ごとに集約する。

* 在庫ロット

  * `product_id` ごとに使用可能ロットを取得。
  * 必要に応じて `warehouse_id` などでフィルタ。

### 7.2 FEFO 割り当て

1. key ごとの必要数量 `needed` を算出。
2. 在庫ロット候補を取得し FEFO ソート。
3. 各ロットに対して：

   * `alloc = min(needed, available_for_soft)` を計算。
   * `needed -= alloc`。
   * `alloc > 0` の場合、`allocation_suggestions` 用の1行として保持。
4. `needed > 0` が残れば、それが不足量として `shortage_quantity` になる。

### 7.3 保存・再生成

* **Forecast モード**

  * 対象 `forecast_periods` の既存 `allocation_suggestions` を削除。
  * 新しく計算した候補を一括 INSERT。
* **Order Preview モード**

  * 計算結果は保存せず、Response の `suggestions` として返す。

### 7.4 stats / gaps の算出

* key（customer, delivery_place, product, forecast_period）ごとに：

  * `forecast_quantity`：Forecast の合計
  * `allocated_quantity`：suggestions の合計
  * `shortage_quantity = max(forecast_quantity - allocated_quantity, 0)`
* 不足がある key のみを `gaps` として保持。

---

## 8. 例外ケースと拡張

### 8.1 緊急オーダー

* Forecast に存在しないが、Order として入ってきた需要。
* Order Preview モードで処理：

  * Forecast の有無に関係なく、在庫ロットに対して FEFO で割り当て候補を計算。
  * stats では `forecast_quantity = 0` の key として扱う。

### 8.2 在庫不足（全く割り当てられない）

* 使用可能なロットを全て割り当てても `needed > 0` の場合：

  * `suggestions` は 0件のこともある。
  * `shortage_quantity` は必ず > 0 となり、`gaps` に記録される。

### 8.3 優先ロット（v3.0）

* 将来的に、特定ロットを「優先して割り当てたい」要望に対応する。
* 拡張方針：

  * `allocation_suggestions` に `priority_level` などの列を追加。
  * FEFO ソートの前に「優先ソート」を挟むだけで導入できる設計とする。
* 本バージョンでは列は追加せず、設計上の拡張ポイントとしてのみ記載。

---

## 9. 参考：開発用サンプルデータ（任意）

> この章は実装・テストのための参考であり、業務仕様そのものではない。

* 当月・翌月それぞれについて：

  * 複数の key（customer × delivery_place × product）で Forecast を持つ。
  * 一部の key では在庫が足りず `gaps` が発生するように調整する。
  * 在庫ロットは複数の消費期限・入庫日を混在させ、FEFO の挙動が目視確認できるようにする。
* 具体的な値や seed スクリプトは、実装フェーズの責務とする。

