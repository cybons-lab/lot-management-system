# system_invariants.md

## 1. トランザクションと整合性

1-1. 引当確定時のトランザクション境界
- 引当確定 API（例: POST /allocations/confirm）は、以下を **1つのDBトランザクション内で** 実行すること:
  - lot（または lot_movements）の残量更新
  - lot_reservations の確定状態への更新（status変更 or 新規作成）
  - allocations テーブル（確定引当）の更新
- 上記のいずれかが失敗した場合、トランザクション全体をロールバックすること。

1-2. 予約と実出庫の関係
- 予約は即時作成する（引当確定時点で lot_reservations が存在する）。
- 実出庫は別処理（別API/バッチ）で行う。
- 実出庫時も lot の残量更新と lot_reservations の状態更新は同一トランザクションで行う。

## 2. 在庫計算方式

2-1. 動的計算
- 在庫はスナップショットテーブルを持たず、以下のような「動的計算」で求める:
  - lot.total_qty
  - − 出庫実績（出庫 movements または shipped_qty）
  - − 有効な lot_reservations の合計（status が active/confirmed のもの）
- 在庫サマリ API は、この動的計算に基づいて数量を返すこと。

## 3. データ移行とロールバック方針

3-1. v2 への移行
- 現時点では既存データは全削除してよい（2025-12-10 時点）。
- マイグレーションでは、既存 allocation データからの lot_reservations 生成は **行わない**。
- v2移行時は、必要であればテストデータのみ投入する。

3-2. ロールバック
- v2移行後も、スキーママイグレーションはロールバック可能な形で定義する。
- ただし業務データは「まだ消せる」前提のため、ロールバック時にデータ保全は考慮しない。

## 4. 並行更新・レースコンディション

4-1. 同一ロットへの同時引当要求
- 複数ユーザーが同じ lot に対して同時に引当要求を送る可能性がある。
- この場合は「早い者勝ち」とし、DBトランザクションの整合性により整合性を担保する。
- アプリケーション側で複雑なロック機構は導入しない。

4-2. ロット残量の非負制約
- ロット残量は 0 未満になってはならない。
- DB側で可能な範囲で制約を張る:
  - 例:
    - `lot_available_qty >= 0` に対する CHECK 制約
    - または lot_update / reservation_update 時に、残量が負になった場合エラーにするトリガー or 関数。
- アプリケーション側では「負になったらエラーを返す」程度に留め、ロジック側での二重チェックは極力増やさない。

## 5. ロット予約モデル

5-1. lot_reservations の基本ルール
- すべての「ロットの押さえ」は lot_reservations テーブルで表現する。
- 予測・受注・手動のいずれも、ロットを抑える場合は lot_reservations を通す。
- 直接 lot テーブルの数量を手でいじるような実装を新たに追加してはならない。

5-2. source_type と参照
- lot_reservations には source_type を持たせる:
  - 'forecast' | 'order' | 'manual' など。
- 各 source_type に応じて、以下の参照を持つ:
  - source_type = 'forecast': forecast_group_id / period など
  - source_type = 'order'   : order_line_id
  - source_type = 'manual'  : どこにも紐づかない（用途未定、運用で管理）

5-3. 状態遷移（status）
- lot_reservations は最低限以下の状態を持つ:
  - 'temporary'（必要なら）
  - 'active' or 'confirmed'（有効な予約）
  - 'released'（解放済み）
- 在庫計算に含めるのは 'active' or 'confirmed' のみとする。

## 6. UX に関する前提（現時点の方針）

6-1. バックエンド優先
- 現時点では UX（どの画面でどう見せるか）は確定させない。
- ただし、以下の情報は将来的に UI から見える想定で API で取得できるようにしておく:
  - lot_reservations の source_type, status, reserved_qty
  - forecast / order / manual いずれ由来かが分かる参照情報
- UX詳細（予測↔受注振替の画面フローなど）は、別ドキュメントで定義予定（WIP）。