# ロット管理システム — アプリ層 問題点 総合版 & 対応方針（Action Plan）
**作成日**: 2025-12-14（JST）  
**対象範囲**: Backend（services/routes/repos/sql views）＋ Frontend（API client/UI）  
**入力**: 4つのAIレビュー（Codex / Gemini / Claude / Local Claude）

このドキュメントは、以下を**1つに統合した唯一の正本**です。

- 何が問題か（問題点の要約）
- どう直すか（決定事項＋具体アクション）
- AI/人が勝手に解釈してはいけない点（ドメイン定義／不変条件）
- AI/エージェントに渡すための最小限の指示（このファイルに沿って実装せよ）

---

## 0. 変更不可の決定事項（Single Source of Truth）

### 0.1 Single Source of Truth
- **`allocations`（受注側）テーブルは廃止する。**
- 予約／引当の唯一の正は **`lot_reservations`（在庫側）** とする。
- 受注画面や集計に必要な参照（例：`order_line_id`、必要なら `order_id` など）は **`lot_reservations` が保持**し、`allocations` 無しで画面・APIが成立するようにする。

### 0.2 予約タイプと意味（重要）
本システムでは以下の2種類を明確に分ける。

1) **仮予約（Provisional / Soft Allocation）**（計画・候補の紐付け）
- 目的：候補ロットの計画・表示・調整を可能にする。
- **Available Qty（確定可能量）を減算しない。**
- 増減が頻繁なため、物理在庫系フィールドを頻繁に更新しない。

2) **確定（Confirmed / Hard Allocation）**（SAP連携タイミング）
- 予約が **SAPへ登録したタイミングで confirmed になる**。
- これは **物理出庫（出庫指示／現物が動く）より前**である。
- **confirmed になった時点で初めて Available Qty を減算する。**

3) **キャンセル**
- SAP連携後でも、物理出庫前にキャンセルされた場合は `lot_reservations` を開放する。
- confirmed でも、現物が押さえられる前にリリースされ得るのは仕様として許容する。

> 注意：本システムの「confirmed」は **“出庫確定”ではなく “SAP登録確定”** を意味する。

---

## 1. 在庫不変条件（必ず全体で一致させる）

### 1.1 用語定義
- **現在庫（Current Qty）**: `lots.current_quantity`
- **ロック数量（Locked Qty）**: `lots.locked_quantity`（引当不可）
- **確定予約数量（Confirmed Reserved Qty）**: confirmed の `lot_reservations.qty` 合計
- **計画数量（Planned Qty）**: provisional の `lot_reservations.qty` 合計（UI/監視用のみ）

### 1.2 Available Qty（“引当できるか”判定に使う唯一の値）
**Available Qty = Current Qty − Locked Qty − Confirmed Reserved Qty**

- provisional は **差し引かない**
- confirmed は **差し引く**
- この計算式は **必ず1箇所に定義**し、全箇所で共通利用する（§4.1参照）

### 1.3 ステータス語彙（命名揺れの禁止）
曖昧な `active/reserved/allocated` の漂流を防ぐ。
推奨：
- `provisional`
- `confirmed`
- `cancelled`（または `released`）

（DBの現状値が異なる場合は移行／互換層で対応するが、境界では必ず標準語彙に揃える。）

---

## 2. 実装戦略（全体像）

1) **止血（P0/P1の緊急修正）**
   - ロット物理削除APIの封印
   - 二重コミット／部分コミットの排除（1ユースケース=コミット1回）
   - datetimeのUTC統一（タイムゾーン事故の根絶）
   - Available Qty計算の統一（locked/confirmedの整合）

2) **モデル統一**
   - 読み書きすべてを `lot_reservations` へ集約
   - `allocations` 依存をBackend/Frontendから撤去（必要なら短期の互換層を明示的に置く）

3) **集計・参照系の再構築**
   - DB View を不変条件に合わせて修正（confirmedのみ減算＋locked控除）
   - 画面・API・サービスの見え方を一致させる

4) **同時実行と冪等性の強化**
   - confirm は冪等であること
   - 在庫争奪は confirm 時点で必ず安全に扱う（ロック／バージョンチェック）

---

## 3. 問題点一覧 → 対応（Consolidated Problem List → Action Items）

### P0 — 本番事故／方針違反レベル

#### P0-1: ロット物理削除が存在（方針違反）
**問題**: ロットを物理削除するDELETEが存在し、「lotは物理削除しない」方針に反する。  
**対応**:
- **API封印**：DELETEは **403** を返し「在庫調整を使用してください」と案内する。
- 可能ならルートを削除、または管理者専用＋明示承認の機能フラグに隔離。
**受入条件**:
- 公開APIからロット物理削除ができない。
- テストも403（または削除）前提に更新済み。

#### P0-2: 二重コミット／部分コミット（同一ユースケース内）
**問題**: 1ユースケース内で複数回commitがあり、途中失敗で不整合が起きる。  
**対応**:
- **ユースケース単位で commit は最後の1回のみ**に統一。
- 中間でIDが必要なら `flush()` を使用し、commitはしない。
**受入条件**:
- 同一ユースケースで multi-commit が残っていない。

---

### P1 — 近い将来の事故（正しさ／整合性）

#### P1-1: Available Qty計算が locked_quantity を無視
**問題**: lockedがあるのに予約が通り、実在庫の引当可能量を超える。  
**対応**:
- Available Qty は §1.2 の式に統一（locked控除必須）。
- locked無視の計算を全て置換・削除。
**受入条件**:
- 予約／確定で `Available Qty < 要求qty` は必ず拒否。
- lockedケースのユニットテストがある。

#### P1-2: ViewとServiceで confirmed の扱いが不一致
**問題**: Viewがconfirmedを除外（または条件が揺れて）在庫を水増しする。  
**対応**:
- Viewは **confirmedのみを減算**（provisionalは減算しない）＋ locked控除。
- 既存の `active` がある場合の意味を整理：
  - active=provisional なら減算しない
  - active=confirmed相当なら名称移行（マイグレーション）
**受入条件**:
- 同一ロットスナップショットで、ViewとServiceのAvailableが一致する。

#### P1-3: confirm の冪等性が壊れている（Enum/文字列比較）
**問題**: 「既にconfirmedなら何もしない」が効かず、二重更新・二重イベントの温床。  
**対応**:
- ステータス比較を統一（`.value` を使う／DB Enum化）。
- 既にconfirmedなら成功としてreturn（状態は変えない）。
**受入条件**:
- confirmを2回呼んでも2回目は無変更で成功。
- 冪等性テストがある。

#### P1-4: confirm/commit時の競合制御不足（同時実行でマイナス在庫の可能性）
**問題**: 2ユーザーが同時に確定すると oversubscribe し得る。  
**対応**:
- confirm時にロット行をロックし、ロック範囲内でAvailable再計算・検証。
- 方式例：
  - A) `SELECT ... FOR UPDATE`（lot行＋関連reservation）
  - B) 楽観ロック（version列）＋競合リトライ
**受入条件**:
- 同時confirmで Available が負にならない。
- 疑似並行テスト／統合テストがある。

#### P1-5: datetime.now() / utcnow() 混在（タイムゾーン事故）
**問題**: ローカル／UTC混在でロック期限判定等が壊れる。  
**対応**:
- `utcnow()` ヘルパーを作り `datetime.now(timezone.utc)` を返す。
- 永続化されるtimestamp生成は全てヘルパーに統一。
**受入条件**:
- DBに保存するdatetimeは全てTZ付き（UTC）で一貫。
- 期限判定のテストが安定。

---

### P2 — 技術的負債（ドリフト／運用コスト）

#### P2-1: `allocations` × `lot_reservations` の二重管理（ズレる）
**問題**: 2箇所が同じ事実を持つため、人手やバッチでズレる。  
**対応**:
- **`allocations` を廃止**し、全読み書きを `lot_reservations` へ。
- 移行中のみ必要なら **互換アダプタ（読み取り専用）** を明示的に置く。
- 一時的に **Reconciler（整合性チェック）** を用意しズレ検知。
**受入条件**:
- `allocations` を書き込む本番コードパスが存在しない。
- 受注画面・集計は `lot_reservations` から生成できる。

#### P2-2: 例外定義が二重（例：InsufficientStockError）
**問題**: 同名例外が複数に存在し、属性／取り回しが揺れる。  
**対応**:
- ドメイン例外を1箇所に集約し、全箇所はそれをimport。
**受入条件**:
- 例外は1種類に統一され、APIマッピングも一貫。

#### P2-3: APIステータスコード設計が曖昧（400多用）
**問題**: クライアントが原因判定できない（再送／復旧の自動化ができない）。  
**対応**:
- 404: Not Found
- 422: Validation
- 409: Conflict（在庫競合／既にconfirmed 等）
**受入条件**:
- FEがステータスで適切に分岐できる。

#### P2-4: フロントのエラーハンドリング不足（409/422が分かりにくい）
**問題**: ユーザーに適切な理由が出ない／何も起きない。  
**対応**:
- エラー正規化＋Toast/Inlineの方針を中央化。
- 409は「在庫が変わったのでプレビュー再実行」等、次の行動が分かる文言。
**受入条件**:
- 主要フローで 409/422 が明確に表示される。

#### P2-5: FEでAPI v1/v2が混在
**問題**: 退避コードが残り続け、回帰の温床。  
**対応**:
- v1呼び出しを全廃し、v1クライアント関数を削除。
**受入条件**:
- FEからv1エンドポイント呼び出しが0。

#### P2-6: `lot_reference` 等のレガシー識別子が残存
**問題**: 文字列識別子に依存すると将来破綻しやすい。  
**対応**:
- FEは `lot_id` と `lot_number` のみ使用。
- 可能ならlint/型で `lot_reference` 使用を禁止。
**受入条件**:
- `lot_reference` をIDとして使う箇所が存在しない。

#### P2-7: N+1／View性能の懸念
**対応**:
- ページング上限の明確化、集計のバルク化、必要ならMV化。
**受入条件**:
- ロット一覧のクエリ数が安定し、規模拡大でも致命的に遅くならない。

---

## 4. Available Qty 計算の定義場所（1箇所に寄せる）

以下のどちらかを採用し、**全体を従わせる**。

### Option A（推奨：整合性・再利用性）DB View/関数で正を提供
- 以下を返す View/関数を提供：
  - `available_qty`（§1.2）
  - `planned_qty`（provisional合計）
  - `confirmed_qty`（confirmed合計）
  - `locked_qty`
- Backend/Frontendの表示はこれを参照。
- confirm時の最終検証はトランザクションロック内で行う。

### Option B：Service層の単一モジュール + テストで契約化
- `stock_calculation.py` 等に計算を集約（唯一の実装）
- View側も一致することを統合テストで担保

**必須**:
- その場しのぎの可用量計算（重複実装）は全削除／置換する。

---

## 5. データ移行メモ（allocations → lot_reservations）

1) `lot_reservations` に受注参照列を追加
   - `order_line_id`（必須）
   - 必要なら `order_id` / `customer_id` 等（性能・検索の都合）
2) 既存データが `allocations` にしか無いなら backfill
3) View/Service/FEを `lot_reservations` 前提へ切替
4) `allocations` を撤去
   - 最終的に drop（または明示的に読み取り専用に隔離）

**受入条件**:
- `allocations` が無くても受注引当画面・集計が成立する。

---

## 6. テスト／検証チェックリスト

### ユニットテスト（必須）
- Available Qty が locked と confirmed を差し引く
- provisional は Available に影響しない
- confirm 冪等性
- cancel で confirmed が（出庫前なら）解放される

### 統合テスト（推奨）
- 同時confirmで oversubscribe しない
- APIエラーコード（404/409/422）が統一
- ViewとServiceのAvailableが一致

### 手動スモーク（最低限）
- provisional → confirm → cancel → confirm（再実行）
- SAPキャンセル相当のフロー確認
- UIで409が「次に何をすべきか」分かる表示

---

## 7. AI／自動化エージェント向け指示（最小だが厳格）

### Read-first ルール
- **このファイルを最初に全文読むこと。**
- §0 と §1 は**契約（不変条件）**として扱う。
- ドメインの意味（confirmed等）を勝手に変更しない。

### 実装優先順位
1) P0（封印・二重コミット）
2) 在庫不変条件の一致（Available式、View/Service統一）
3) confirm の冪等性＆競合制御
4) allocations廃止（移行＋掃除）
5) フロント（エラー、v1削除、レガシーID排除）

### PRの期待値
- 小さくレビューしやすいコミット（節ごとに分割）
- テストと同時に更新
- 「数値・UXの変化」を短く説明
- 追加仮定が必要なら明記し、TODO（担当者つき）を残す

### 禁止事項
- `allocations` を正として再導入しない
- provisional を Available に反映しない
- 永続化timestampに naive datetime を使わない
- ステータス追加は不変条件とテスト更新なしに行わない

---

## 8. 未確定（ただし進めながら決めてよい）
- 現DBのstatus文字列と provisional/confirmed/cancelled のマッピング
- AvailableをDB正（Option A）にするかService正（Option B）にするか
- 楽観ロック（version列）を全体に入れるか

（ただし §0 と §1 の不変条件は常に守ること。）
