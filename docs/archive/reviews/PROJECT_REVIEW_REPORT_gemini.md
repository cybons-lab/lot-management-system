# Project Review Report (Gemini Analysis)

## 1. 定義 (System Definitions)

### システムの責務 (Responsibilities)
本システムは、製造業等の**材料在庫管理と受注・引当プロセスの中核**を担う。
- **在庫の正確性担保**: 物理的な在庫（Lot）と論理的な引当（Reservation）を厳密に管理し、過剰引当や在庫不足を未然に防ぐ。
- **OCR/RPA連携**: 紙・PDFベースの受注・納品フローをデジタル化し、SAP等の基幹システムと連携する「つなぎ」の役割を果たす。
- **意思決定支援**: FEFO（First Expiry First Out）等のロジックに基づき、最適なロット引当を自動提案する。

### 境界 (Boundaries)
- **Domain Layer**: 
  - 純粋なビジネスロジック（`domain/allocation/calculator.py` 等）。
  - インフラやDBに依存せず、不変条件（在庫は負にならない、期限切れは引当不可）を表現する。
- **Application Service Layer**: 
  - ユースケースの進行役（`MaterialDeliveryNoteService`, `OrderService`）。
  - トランザクション管理、リポジトリの呼び出し、外部システム（RPA/Flow）との調整。
- **Infrastructure Layer**: 
  - データの永続化（PostgreSQL/SQLAlchemy）と外部通信。
  - `LotReservation` テーブルを介した在庫操作の正規化。

### 重要不変条件 (Key Invariants)
1.  **引当の整合性**: `Lot.current_quantity >= Σ(Active/Confirmed Reservations) + Locked`
    - いかなる時点でも、実在庫を超える予約を受け入れてはならない。
2.  **不変の履歴**: `StockHistory` は追記のみで、過去の移動記録を改竄してはならない。
3.  **状態遷移の一方向性**: ロットやRPA実行（Run）のステータスは、定義されたステートマシン（例: `ReservationStateMachine`）に従ってのみ遷移する。
4.  **単一情報源**: 引当状態の正は `lot_reservations` テーブルにあり、`allocations`（旧テーブル）や `OrderLine.status` はその派生結果である（P3移行済み）。

---

## 2. 要点 (Executive Summary)

### 良い点 (Pros)
1.  **アーキテクチャの進化 (Clean Architecture & P3 Migration)**
    - 旧来の `allocations` テーブルから `lot_reservations` への移行（P3）が完了しており、在庫引当の責務が明確化されている。
    - ドメインロジック（`domain/`）とアプリケーションロジック（`services/`）の分離が意識されている。
2.  **型安全性と品質意識**
    - Backendは Pydantic v2 + SQLAlchemy 2.0、Frontendは React 19 + TypeScript Strict Mode と、最新かつ堅牢なスタック選定。
    - OpenAPIからの型生成フロー（`npm run typegen`）が確立されており、FE/BE間の乖離リスクが低い。
3.  **運用の現実解 (RPA/OAI連携)**
    - 単なるAPIサーバーに留まらず、Power Automate や CSVインポートといった「現場の現実」に即した機能（`MaterialDeliveryNoteService`）が手厚く実装されている。

### 最大リスク (Top 3 Risks)
1.  **ロジックの重複と過渡期アーティファクト**
    - `backend/app/domain/allocation/calculator.py`（純粋関数）と `backend/app/application/services/allocations/allocator.py`（Service内ロジック）で類似の引当計算が存在する。どちらが正（SSOT）か曖昧になる恐れがある。
2.  **トランザクション管理の混在**
    - `UnitOfWork` パターンを使用する箇所（`orders_router`）と、Service内で `db.commit()` を直接呼ぶ箇所（`MaterialDeliveryNoteService`）が混在しており、一貫性がない。特にRPA周りで部分的なコミットが行われる設計は、障害時のデータ不整合（原子性の欠如）を招くリスクがある。
3.  **`MaterialDeliveryNoteService` の肥大化 (God Class)**
    - 1ファイル約820行で、CSVパース、RPA実行状態管理、外部APIコール、ロック制御など多岐にわたる責務を持ちすぎている。保守性とテスト容易性が低下している。

---

## 3. 比較 (Architecture Gap Analysis)

| 観点 | 現状 (As-Is) | 望ましい形 (To-Be) | 理由・根拠 |
| :--- | :--- | :--- | :--- |
| **引当ロジック** | `services/allocations/allocator.py` と `domain/allocation/calculator.py` が並存。 | `domain/allocation/calculator.py` に統一し、Serviceはそれを利用するのみにする。 | テスト容易な純粋関数（Domain）にビジネスルールを集約すべき。現状はServiceがロジックを持ちすぎている。 |
| **トランザクション** | Serviceメソッド内で `db.commit()` が散見される（特にRPA）。 | トランザクション制御はServiceの呼び出し元（UoW/Dependency）またはデコレータで制御し、Serviceは `db.close/commit` しない。 | サービスの再利用性向上と、アトミックな操作の保証のため。テスト時にロールバックしやすくなる。 |
| **RPA状態管理** | `MaterialDeliveryNoteService` にロジックが集中。状態遷移がメソッド内にハードコード気味。 | `RpaRun` を集約ルートとしたドメインモデルまたはState Patternを導入。 | ステータス管理（Draft→Running→Done等）の不変条件をServiceではなくドメインモデルで強制するため。 |
| **フロントエンド** | Featureフォルダごとの分割はあるが、Hookの配置やAPIコールの粒度が不揃いな箇所がある。 | API hook（TanStack Query）とUI Logic hookを明確に分離（`features/{name}/api` vs `hooks`）。 | サーバー状態管理とクライアントUIロジックの関心分離を徹底し、保守性を高めるため。 |

---

## 4. 具体例 (Actionable Items)

### 問題点リスト (Issues List)

| ID | 項目 | Severity | 影響範囲 | 再現/場所 | 修正方針 | 工数 |
|:--|:---|:---:|:---|:---|:---|:---:|
| 1 | `allocator.py` と `calculator.py` の重複 | **H** | 引当ロジック | `backend/app/application/services/allocations/` | `allocator.py` のロジックを `calculator.py` に移譲し、Service等はCalculatorを使うようリファクタ。 | M |
| 2 | RPA Serviceでの直接commit | **H** | データ整合性 | `MaterialDeliveryNoteService` 全般 | UoWパターンを適用し、メソッド内での `commit()` を廃止してアトミック性を確保。 | L |
| 3 | `MaterialDeliveryNoteService` の肥大化 | M | 保守性 | `backend/app/application/services/rpa/` | CSVパース、外部API連携（Flow）、状態管理を別クラス/関数に切り出す。 | M |
| 4 | ドメインモデルの貧血 (Anemic Model) | M | 設計品質 | `RpaRun`, `RpaRunItem` | ステータス遷移ロジック（`can_transition`等）をEntityメソッドに移動する。 | S |
| 5 | テストコードの不足 (Core Logic) | **H** | 品質の信頼性 | `domain/allocation/` | `calculator.py` に対する網羅的な単体テスト（境界値・異常系）を追加/確認する。 | S |
| 6 | API例外ハンドリングの統一性 | L | DX (Dev Exp) | `orders_router` vs `rpa_router` | 全てのルーターで `try-except` + `raise HTTPException` するのではなく、ドメイン例外→Global Handlerへの変換を活用する。 | S |
| 7 | `ManualAllocationSavePayload` の型定義場所 | L | コード整理 | `orders_router.py` 内定義 | `schemas/orders/` などの適切な場所に移動し再利用可能にする。 | S |
| 8 | `check_*.py` スクリプトの散乱 | L | プロジェクト構成 | ルートディレクトリ | `scripts/` ディレクトリに移動し、管理用スクリプトとして整理する。 | S |
| 9 | `ReservationStateMachine` の活用不足 | M | 整合性 | `lot_reservations_model.py` 定義のみ | `LotReservation` の更新時に `validate_transition` を必ず通すようService/Modelで強制する。 | M |
| 10 | Docker ComposeのHealthcheck強度 | L | 開発環境 | `docker-compose.yml` | DBのヘルスチェックを強化（`pg_isready`）し、Backendの起動待ちを確実にする（現状はOKそうだが確認）。 | S |
| 11 | フロントエンド `useOrderLineAllocation` の複雑性 | M | フロント保守性 | `frontend/src/features/orders/hooks/` | 計算ロジックを `allocationCalculations.ts` (純粋関数) にさらに切り出し、Hookは状態管理に徹する。 | M |
| 12 | P3移行残骸 (`AllocationCompatAdapter`等) | L | 技術的負債 | `services/allocations/compat_adapter.py` | 完全移行済みなら削除計画を立てる。使用箇所がないかgrep確認。 | S |
| 13 | シークレット管理 (Slack通知など) | **H** | セキュリティ | コード内ハードコードの有無 | APIキーやWebhook URLがコードに含まれていないか再確認（設定ファイル/環境変数化）。 | S |
| 14 | N+1問題の懸念 (Order List) | M | パフォーマンス | `OrderService.get_orders` | `selectinload` 等で `order_lines` や `product` を適切にEager Loadingしているか確認。 | S |
| 15 | RPA ロック制御のタイムアウト | M | UX | `MaterialDeliveryNoteService.execute` | ロック解放漏れ対策が「2分後のタイムアウト回収」というバッチ的処理のみ。能動的な解放APIが必要。 | S |

### 優先順位付きロードマップ (Roadmap)

#### Phase 1: 今週 (Core Stability & Cleanup)
- **Goal**: リスクの高い「ロジック重複」と「トランザクション不安」を解消し、足場を固める。
- Tasks:
  1.  `calculator.py` へのロジック集約（Issue #1）。
  2.  `RpaRun` / `LotReservation` のステートマシンロジックをModel/Entityに移動（Issue #4, #9）。
  3.  ルートディレクトリの整理（不要ファイルの削除・移動）（Issue #8）。

#### Phase 2: 今月 (Refactoring & Feature Robustness)
- **Goal**: `MaterialDeliveryNoteService` を解体し、保守可能な形にする。
- Tasks:
  1.  `MaterialDeliveryNoteService` の責務分割（Issue #3）。CSV/API/State管理へ。
  2.  Frontend `useOrderLineAllocation` のリファクタリング（Issue #11）。
  3.  トランザクション管理のUoW化（Issue #2）。

#### Phase 3: 四半期 (Optimization & Standardization)
- **Goal**: パフォーマンスチューニングと完全なClean Architecture化。
- Tasks:
  1.  N+1問題の総点検とクエリ最適化（Issue #14）。
  2.  レガシーコード（P3移行残骸）の完全削除（Issue #12）。
  3.  ドメインイベントを活用した疎結合化（引当完了→メール通知などのイベント駆動化）。

### “最初の3コミット” 提案

**Commit 1: ドメインロジックの純粋化準備**
- Message: `refactor(domain): update allocation calculator to match fefo service logic`
- Files: `backend/app/domain/allocation/calculator.py`, `backend/app/domain/allocation/types.py`
- Objective: `allocator.py` にあるロジックを `calculator.py` に移植・適合させ、テスト可能な状態にする（既存コードはまだ壊さない）。

**Commit 2: サービス層の重複排除**
- Message: `refactor(service): use domain calculator in fefo service`
- Files: `backend/app/application/services/allocations/fefo.py`, `backend/app/application/services/allocations/allocator.py`
- Objective: Serviceから直接 `allocator.py` を呼ぶのではなく、Commit 1で整備したDomain Calculatorを使用するように変更。

**Commit 3: 不要な計算ロジックの削除**
- Message: `chore(cleanup): remove deprecated allocator service logic`
- Files: `backend/app/application/services/allocations/allocator.py`
- Objective: 移行により不要になった `allocator.py` 内のロジック（`allocate_soft_for_forecast`等）を削除またはDeprecatedにする。

---

## 5. 追加で見たいもの（質問リスト）

1.  **RPA/Flow連携の同時実行要件**: `MaterialDeliveryNote` の実行ロックは「ユーザー単位」か「全体」か？システム設定で制御されているようだが、ピーク時の想定同時実行数は？
2.  **アーカイブ戦略**: `StockHistory` や `RpaRun` は永続的に肥大化するが、パーティショニングや古いデータのアーカイブ計画はあるか？
3.  **SAP連携の冪等性**: `sap_registered` フラグで管理しているが、SAP側での二重登録防止機構（ユニークキー制約など）はあるか？（通信エラー時のリトライ安全性）
