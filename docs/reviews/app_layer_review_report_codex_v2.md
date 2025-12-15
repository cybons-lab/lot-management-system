# アプリ層 あら探しレポート

## 指摘一覧

### 1. 予約可用量計算がロック数量を無視して過大評価 (P1)
- **症状**: ロックされた在庫 (`locked_quantity`) を持つロットでも予約作成が通り、実際に引き当て可能な数量を超えて予約できる。後続の出庫・引当で不足エラーやマイナス残が発生し得る。
- **再現/条件**: `lots.locked_quantity > 0` のロットに対し `LotReservationService.reserve` を呼び出すと、`locked_quantity` を差し引かずに可用量判定を行うため、ロック分を食い込んだ予約が作成される。【F:backend/app/application/services/inventory/lot_reservation_service.py†L329-L368】
- **原因**: `_calculate_available_qty` が `current_quantity - reserved_qty` しか見ておらず、同じサービス内の他のヘルパー(`stock_calculation.get_available_quantity`)が採用するロック控除ルールと乖離している。【F:backend/app/application/services/inventory/lot_reservation_service.py†L329-L368】【F:backend/app/application/services/inventory/stock_calculation.py†L35-L55】
- **影響範囲**: 予約系API/サービス全般（フォーキャスト・受注・手動予約）。ロック在庫を尊重する設計前提が破られ、在庫二重配分の温床になる。
- **修正案**:
  - *最小*: `_calculate_available_qty` を `current_quantity - reserved - locked_quantity` に置き換え、`get_available_quantity` と同一ロジックにする。
  - *理想*: 在庫可用量ロジックを1カ所に集約（例えば `stock_calculation.get_available_quantity_by_id` を利用）し、サービス/ビュー/フロントで共通化。
- **修正時の注意**: 可用量が減るため既存テストデータで予約失敗が増える可能性あり。予約作成・更新系のE2Eテストを調整すること。

### 2. ビューの引当集計が confirmed を除外し在庫を過大表示 (P1)
- **症状**: `v_lot_available_qty` や `v_inventory_summary` が confirmed 予約を無視した可用量を返し、フロントの在庫表示や候補ロット選定が実在庫より多く見積もられる。
- **再現/条件**: 予約ステータスが `confirmed` の行が存在するロットを `v_lot_available_qty` 経由で参照すると、`allocated_quantity` が0として扱われ可用量が水増しされる。【F:backend/sql/views/create_views.sql†L29-L127】
- **原因**: `v_lot_allocations` の定義が `status = 'active'` のみをSUMしており、ドメイン不変条件「active/confirmedが可用量を減算」に反している。【F:backend/sql/views/create_views.sql†L34-L127】【F:backend/app/application/services/inventory/lot_reservation_service.py†L300-L368】
- **影響範囲**: 在庫関連ビューを利用する全API/フロント（在庫一覧、候補ロット提示、在庫サマリ）。実在庫より多い数量で引当・出庫意思決定が行われる危険。
- **修正案**:
  - *最小*: `v_lot_allocations` の WHERE を `status IN ('active','confirmed')` に変更し、依存ビューの可用量算出を正す。
  - *理想*: ドメインの可用量ロジックをビュー/サービスで共通モジュール化し、ステータス追加時の抜け漏れをテストで防止。
- **修正時の注意**: confirmed分を加味すると可用量が減るため既存UIの数値が変わる。キャッシュや集計ジョブが旧ビューを前提にしていないか確認すること。

### 3. 予約確定の冪等チェックが機能せず二重確定を許容 (P2)
- **症状**: `LotReservationService.confirm` を同じ予約に対して複数回呼んでも常に更新処理が走り、冪等性が担保されない。外部からのリトライ時に不要な更新・イベント発火が起こり得る。
- **再現/条件**: `reservation.status` がDB上は文字列だが、メソッドは `ReservationStatus.CONFIRMED`（Enumオブジェクト）と比較するため一致判定に失敗し、毎回更新ブロックを通過する。【F:backend/app/application/services/inventory/lot_reservation_service.py†L189-L204】【F:backend/app/infrastructure/persistence/models/lot_reservations_model.py†L51-L112】
- **原因**: Enum型と文字列の比較ミスにより「既にconfirmedなら早期return」というガードが効いていない。
- **影響範囲**: 予約確定API/バッチ。無用なUPDATEによる行ロック延長・監査ログ汚染、将来イベント連携時の二重通知リスク。
- **修正案**:
  - *最小*: 比較と代入を文字列ベースに統一（例: `if reservation.status == ReservationStatus.CONFIRMED.value`）。
  - *理想*: `status` カラムをEnum型に変更し、Pydantic/DB双方でEnumを扱うよう型安全化。
- **修正時の注意**: モデルの型変更時はマイグレーションが必要。Enum化すると未知値の投入が弾かれる点をテストで確認。

### 4. 出庫APIがリソース未存在を400で返しクライアント再送を困難にする (P2)
- **症状**: ロット/得意先/納入先が存在しない場合でもHTTP 400を返すため、クライアントが「入力誤り」と「対象未存在」を区別できず、再送やデータ同期の自動リトライができない。
- **再現/条件**: `/withdrawals` に存在しない `lot_id` でPOSTすると `ValueError` がHTTP 400に変換される。【F:backend/app/presentation/api/routes/inventory/withdrawals_router.py†L82-L110】【F:backend/app/application/services/inventory/withdrawal_service.py†L43-L114】
- **原因**: `WithdrawalService` が未存在を `ValueError` で投げ、ルーターで一律400にマッピングしている。404/409など状態に応じたエラー設計が無い。
- **影響範囲**: 出庫作成API。クライアント側のエラーハンドリングが曖昧になり、同期バッチやRPAの再実行判定を誤らせる。
- **修正案**:
  - *最小*: 未存在系は専用例外を投げ、ルーターで404にマップ。可用量不足は409(Conflict)など意味のあるステータスを返す。
  - *理想*: ドメイン例外を整理しレスポンスコード/エラーメッセージを統一、テーブル駆動のエラー変換層を導入。
- **修正時の注意**: ステータスコード変更に伴いフロント/テストの期待値更新が必要。

### 5. ビューとサービスで「予約可用量」の定義が二重化し検証不能 (P2)
- **症状**: サービス側とビュー側で可用量算出ロジックが異なり、どちらが正か判別しづらい。例: サービスはロック控除を想定（`stock_calculation.get_available_quantity`）、ビューはロック控除を含むがReservationステータス条件が異なるなど、利用箇所によって可用量が変動する。
- **再現/条件**: 同一ロットを `LotReservationService.get_available_quantity` と `v_lot_available_qty` の両方で参照すると、予約ステータスやロック考慮有無により異なる結果を返す。【F:backend/app/application/services/inventory/lot_reservation_service.py†L326-L368】【F:backend/app/application/services/inventory/stock_calculation.py†L35-L55】【F:backend/sql/views/create_views.sql†L113-L170】
- **原因**: 可用量計算が各所にコピーされ、ドメイン不変条件を一元的にテストできていない。
- **影響範囲**: 在庫表示・予約作成・候補ロット提示の整合性。環境や呼び出し経路によって可用量が変わるため、バグ再現や回帰試験が困難。
- **修正案**:
  - *最小*: サービス/ビューで可用量の定義を揃える（ロック控除 + active/confirmed減算）。共通関数を起点にユニットテストを追加。
  - *理想*: 可用量をDB側はマテリアライズドビュー/関数で一元化し、サービス/フロントはそれを参照。ドメイン不変条件を契約テストで担保。
- **修正時の注意**: ロジック統一により値が変わるため、依存するレポートやフロント表示の期待値を更新すること。

## 上位5件のまとめ
1. 予約可用量計算がロック無視で過大評価（P1）
2. ビューがconfirmed予約を除外し可用量を水増し（P1）
3. 予約確定の冪等チェック不全で二重更新リスク（P2）
4. 出庫APIのエラーコードが曖昧で復旧不能（P2）
5. 可用量ロジックが多重定義で整合性検証ができない（P2）

## 推奨実行順
1. **(P1)** ビューとサービスの可用量ロジックを統一（ロック・confirmed考慮）。
2. **(P1)** ビューの集計条件修正に合わせてフロント/レポートの期待値を更新。
3. **(P2)** 予約確定の冪等性ガード修正（Enum比較の是正）。
4. **(P2)** 出庫APIの例外→HTTPステータスマッピングを整理。
5. **(P2)** 可用量計算の共通化・テスト整備（ドメイン不変条件の契約化）。

## Implementation Status Verification (2025-12-15)

The following verification was performed against the codebase on branch `fix/vulnerability-audit-fixes`.

### 1. 予約可用量計算がロック数量を無視して過大評価
- **Status: Unresolved**
- **Verification**: `LotReservationService._calculate_available_qty` subtracts `reserved_quantity` from `current_quantity` but does NOT subtract `locked_quantity`.
  ```python
  # backend/app/application/services/inventory/lot_reservation_service.py
  return current - reserved  # Missing locked_quantity subtraction
  ```

### 2. ビューの引当集計が confirmed を除外し在庫を過大表示
- **Status: Unresolved / Incorrect**
- **Verification**: `v_lot_allocations` now filters `WHERE status = 'confirmed'`. This implies it **excludes 'active'** reservations, which is also incorrect (should include both).
  ```sql
  -- backend/sql/views/create_views.sql
  CREATE VIEW public.v_lot_allocations AS
  ...
  WHERE status = 'confirmed' -- Excludes 'active'
  ```

### 3. 予約確定の冪等チェックが機能せず二重確定を許容
- **Status: Unresolved**
- **Verification**: `confirm` method compares `reservation.status` (likely string or value) directly with `ReservationStatus.CONFIRMED` (Enum object) without `.value`.
  ```python
  # backend/app/application/services/inventory/lot_reservation_service.py
  if reservation.status == ReservationStatus.CONFIRMED: # Comparison likely fails
  ```

### 4. 出庫APIがリソース未存在を400で返しクライアント再送を困難にする
- **Status: Unresolved**
- **Verification**: `create_withdrawal` catches `ValueError` and raises `HTTP_400_BAD_REQUEST`, masking "Not Found" or "Conflict" distinctions.

### 5. ビューとサービスで「予約可用量」の定義が二重化し検証不能
- **Status: Unresolved**
- **Verification**: 
  - Service: `current - (active + confirmed)` (via `get_reserved_quantity`) (ignores lock)
  - View: `current - (confirmed only) - lock` (via `v_lot_available_qty` + `v_lot_allocations`)
  - Logic is inconsistent between the two.
