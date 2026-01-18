# Lot Management System 総合レビューレポート

## 1. 定義：システムの責務・境界・重要不変条件

### 1.1 本システムの責務

本システム（Lot Management System）は、**材料在庫をロット単位で一元管理**し、以下の機能を提供する：

1. **ロット在庫管理**: 製品×倉庫×ロット番号の3次元で在庫を追跡
2. **FEFO引当**: 有効期限優先先出しによる自動引当推奨
3. **フォーキャスト連携**: 需要予測に基づく在庫計画
4. **RPA連携**: OCR読み取りデータの取り込みとSAP連携
5. **受注管理**: 受注明細の引当状況追跡

### 1.2 アーキテクチャ境界

```
┌─────────────────────────────────────────────────────┐
│ Presentation (API/Schemas)                          │
│ - FastAPI routers                                   │
│ - Pydantic schemas (入出力バリデーション)            │
├─────────────────────────────────────────────────────┤
│ Application (Services)                              │
│ - トランザクション境界                               │
│ - ユースケースオーケストレーション                   │
├─────────────────────────────────────────────────────┤
│ Domain (Pure Logic)                                 │
│ - FEFO計算 (calculator.py)                          │
│ - ビジネスルール (policies.py)                       │
│ - ドメインイベント (events/)                         │
├─────────────────────────────────────────────────────┤
│ Infrastructure (Persistence/Clients)                │
│ - SQLAlchemy Models                                 │
│ - Repositories                                      │
│ - 外部クライアント                                   │
└─────────────────────────────────────────────────────┘
```

### 1.3 重要不変条件（Invariants）

| 不変条件 | 実装場所 | 現状 |
|:---|:---|:---|
| **在庫はマイナスにならない** | `stock_calculation.py`, DB CHECK制約 | ✅ 実装済み |
| **確定(Confirmed)予約のみがAvailable Qtyに影響** | `get_confirmed_reserved_quantity()` | ✅ 実装済み（仮引当オーバーブッキング許容） |
| **ロット一意性**: (lot_number, product_id, warehouse_id) | DB UNIQUE制約 | ✅ 実装済み |
| **ステートマシン遷移ルール** | `ReservationStateMachine` | ✅ 実装済み |
| **FEFO順での引当** | `_sort_by_fefo()`, `calculate_allocation()` | ✅ 実装済み |

---

## 2. 要点：全体所見

### 2.1 良い点 ✅

1. **Clean Architecture意識の明確な層分離**
   - `domain/allocation/calculator.py`は純粋関数として実装され、DBに依存しない
   - ビジネスロジックがテストしやすい形で分離されている
   - 根拠: [calculator.py](file:///Users/kazuya/dev/projects/lot-management-system/backend/app/domain/allocation/calculator.py) L1-4

2. **予約システムの適切な設計（P3移行完了）**
   - `lot_reservations`テーブルへの統合完了
   - `ReservationStateMachine`による状態遷移の明示的管理
   - 仮引当（Active）とConfirmedの明確な区別
   - 根拠: [lot_reservations_model.py](file:///Users/kazuya/dev/projects/lot-management-system/backend/app/infrastructure/persistence/models/lot_reservations_model.py)

3. **充実したドキュメント**
   - `docs/domain/rules.md`: ビジネスルールの明文化
   - `docs/domain/glossary.md`: 用語の統一定義
   - `docs/domain/state_machines.md`: 状態遷移図
   - DBスキーマドキュメント（ER図付き）

### 2.2 最大リスク ⚠️

1. **CIでバックエンドテストがスキップされている（Critical）**
   - `ci.yml` L83: `if: false # Temporary skip to allow merge`
   - **影響**: リグレッションを検出できない状態でマージ可能
   - 根拠: [ci.yml](file:///Users/kazuya/dev/projects/lot-management-system/.github/workflows/ci.yml#L83)

2. **在庫不足時の仮発注起票が未実装**
   - READMEにあるコア機能だが、コードベースに該当実装が見つからない
   - `AllocationSuggestion`のガップ検出はあるが、自動発注トリガーがない
   - **影響**: 要件との乖離、ユーザー期待との不整合

3. **同時引当時の競合制御が不十分**
   - `SELECT FOR UPDATE`やOptimistic Lockingの明示的使用がない
   - `suggestion.py`の`regenerate_for_periods()`でトランザクションコミットが複数回発生
   - **影響**: 同時実行時の二重引当リスク
   - 根拠: [suggestion.py](file:///Users/kazuya/dev/projects/lot-management-system/backend/app/application/services/allocations/suggestion.py#L166-167)

---

## 3. 比較：現状アーキテクチャ vs 望ましい形

| 観点 | 現状 | 望ましい形 | 根拠・対応案 |
|:---|:---|:---|:---|
| **トランザクション境界** | サービス内で複数commit | 1ユースケース=1トランザクション | `suggestion.py` L167でcommit後に続行 |
| **ロック戦略** | 明示的ロックなし | Pessimistic/Optimistic Lock | 同時引当でRace Condition発生の可能性 |
| **テスト実行** | CI無効化中 | 全テスト必須化 | `ci.yml` L83のスキップ削除必要 |
| **エラーハンドリング** | 例外→HTTPは一部実装 | 統一的なエラーマッピング | `domain/errors.py`存在するが網羅性不十分 |
| **監査ログ** | 一部実装（operation_logs） | 引当・予約変更の完全追跡 | lot_reservationsの変更履歴が不十分 |
| **冪等性** | 部分的 | 全更新系エンドポイント | `regenerate_for_periods`は冪等、他は未確認 |

---

## 4. 問題点リスト

### 4.1 High Severity 🔴

| # | 問題 | 影響範囲 | 再現シナリオ | 修正方針 | 工数 |
|:---|:---|:---|:---|:---|:---|
| **H-1** | CIバックエンドテストスキップ | 全体品質 | PRマージ時にテスト未実行 | `ci.yml`の`if: false`削除、テスト修正 | M |
| **H-2** | 同時引当の競合制御不在 | 引当精度 | 2ユーザー同時引当で二重割当 | `SELECT FOR UPDATE`追加、またはOptimistic Lock | L |
| **H-3** | 仮発注自動起票未実装 | コア機能 | 在庫不足時に手動対応必要 | 仮発注サービス新規実装 | L |
| **H-4** | `suggestion.py`が472行で肥大化 | 保守性 | 変更時の影響範囲が広い | 責務分割（Period/Group/Order別） | M |
| **H-5** | `lot_service.py`が684行で肥大化 | 保守性 | 同上 | リポジトリ分離完了、さらにサービス分割 | M |

### 4.2 Medium Severity 🟡

| # | 問題 | 影響範囲 | 再現シナリオ | 修正方針 | 工数 |
|:---|:---|:---|:---|:---|:---|
| **M-1** | `quality.yml`でESLint違反許容 | フロント品質 | PRでlintエラー無視可能 | `continue-on-error: true`削除 | S |
| **M-2** | Schema Sync Checkがコメントアウト | 型整合性 | OpenAPI/TypeScript不整合 | L117-120のコメント解除 | S |
| **M-3** | テストカバレッジ閾値未設定 | テスト品質 | カバレッジ低下を検知不可 | `pytest-cov`に`--cov-fail-under=80`追加 | S |
| **M-4** | `material_delivery_note_service`が819行 | 保守性 | RPAフローの変更困難 | Step別にサービス分割 | M |
| **M-5** | VIEWがテスト時に手動作成 | 再現性 | `conftest.py`に150行のSQL | Alembicマイグレーションに統合 | M |
| **M-6** | `allocated_quantity`カラムの二重管理痕跡 | データ整合性 | `LotResponse`で固定値`Decimal("0")`返却 | 不要カラム削除、スキーマ統一 | S |

### 4.3 Low Severity 🟢

| # | 問題 | 影響範囲 | 再現シナリオ | 修正方針 | 工数 |
|:---|:---|:---|:---|:---|:---|
| **L-1** | CORS設定がハードコード | 運用 | 本番デプロイ時に変更必要 | 環境変数からの動的取得徹底 | S |
| **L-2** | `test.db`がルートに残存 | 開発環境 | 混乱の原因 | `.gitignore`確認、削除 | S |
| **L-3** | フロントエンドhooksが29ファイル | 可読性 | 新規開発者の学習コスト | README追加、責務整理 | S |
| **L-4** | ドメインイベント発行があるが消費者不在 | 拡張性 | `StockChangedEvent`が未使用 | イベントハンドラ実装またはTODOコメント | S |
| **L-5** | `check_*.py`スクリプトが`app/`直下に散在 | 構成 | 本番コードと混在 | `scripts/`または`tools/`に移動 | S |

---

## 5. 優先順位付きロードマップ

### 今週（緊急対応）

1. **H-1修正**: CIテスト有効化
   - `ci.yml`の`if: false`削除
   - 失敗するテストの修正（必要に応じて`@pytest.mark.skip`で一時回避）
   
2. **M-2修正**: Schema Sync Check有効化
   - `quality.yml` L117-120のコメント解除

### 今月（品質改善）

3. **H-2対応**: 同時引当の競合制御
   - `allocator.py`に`SELECT FOR UPDATE`追加
   - 統合テスト追加

4. **H-4/H-5対応**: ファイル分割
   - `suggestion.py` → `period_suggestion.py`, `group_suggestion.py`, `order_suggestion.py`
   - `lot_service.py` → すでにリポジトリ分離済み、サービス責務確認

5. **M-5対応**: VIEWのマイグレーション統合
   - `conftest.py`のSQL → Alembic migrationへ

### 四半期（機能完成）

6. **H-3対応**: 仮発注自動起票
   - 設計ドキュメント作成
   - 発注サービス実装
   - SAPインテグレーション設計

7. **監査ログ強化**
   - `lot_reservations`変更履歴テーブル追加
   - ドメインイベント消費者実装

---

## 6. 最初の3コミット提案

### Commit 1: CI テスト有効化
```
fix(ci): enable backend tests in CI pipeline

- Remove temporary skip condition (if: false) from ci.yml
- Ensure all backend tests run on PR and push to main/develop
- This fixes critical quality gap where regressions could go undetected

Affected files:
- .github/workflows/ci.yml
```

### Commit 2: Quality Check強化
```
chore(ci): enable schema sync check and strict linting

- Uncomment schema sync diff check in quality.yml
- Remove continue-on-error for ESLint in frontend quality check
- Add coverage threshold (80%) to pytest configuration

Affected files:
- .github/workflows/quality.yml
- backend/pyproject.toml (or pytest.ini)
```

### Commit 3: 開発環境クリーンアップ
```
chore: cleanup root directory and move check scripts

- Remove test.db from repository root
- Move check_*.py scripts from app/ to tools/
- Update .gitignore to prevent test.db commits

Affected files:
- backend/test.db (DELETE)
- backend/app/check_*.py → tools/check_*.py
- .gitignore
```

---

## 7. 追加質問（レビューに必要な不明点）

以下の情報がコードベースから読み取れなかったため、確認が必要です：

1. **SAP連携の詳細仕様**
   - SAPへの発注起票のトリガー条件は？（在庫何日分不足で？）
   - SAP Document Numberの形式や返却タイミングは？

2. **同時実行の想定規模**
   - ピーク時の同時ユーザー数は？
   - 引当処理のバッチ実行頻度は？

3. **データ量の想定**
   - 管理対象ロット数（現状/将来想定）
   - 1日の受注明細数

4. **業務ルールの例外ケース**
   - FEFOを無視して特定ロットを優先する場合はあるか？
   - 返品・キャンセル時のロット戻し入れルールは？

5. **オーバーブッキング許容の運用詳細**
   - 仮引当（Active）の有効期限は設定されているか？
   - 確定時に在庫不足だった場合の業務フローは？
