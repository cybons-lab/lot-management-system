# ロット管理システム 総合レビューレポート

**レビュー実施日**: 2025-12-21
**レビュー担当**: シニアアーキテクト / テックリード
**対象リポジトリ**: cybons-lab/lot-management-system

---

## 1. 定義：システムの責務・境界・重要不変条件

### 1.1 システムの責務

本システムは**材料在庫をロット単位で一元管理**し、以下の責務を担う：

| 責務 | 概要 | 根拠 |
|------|------|------|
| ロット在庫管理 | 入荷・検品・出荷時のロット単位在庫追跡 | `backend/app/infrastructure/persistence/models/inventory_models.py` |
| FEFO引当 | 賞味期限順（First Expiry First Out）で自動引当 | `backend/app/application/services/allocations/fefo.py` |
| 受注処理 | OCR取込→受注データ化→引当→出荷 | `backend/app/application/services/rpa/material_delivery_note_service.py` |
| 仮発注起票 | 在庫不足時の自動発注リクエスト生成 | `inbound_plans`テーブル、`allocation_suggestions`テーブル |
| マスタ管理 | 得意先・製品・仕入先・倉庫等のマスタ維持 | `backend/app/presentation/api/routes/masters/` |

### 1.2 レイヤー境界

```
┌─────────────────────────────────────────────────────┐
│ Presentation Layer (API Routes)                     │
│ └─ routes/*.py: HTTP処理、Pydanticバリデーション   │
├─────────────────────────────────────────────────────┤
│ Application Layer (Services)                        │
│ └─ services/*.py: ビジネスロジック、トランザクション│
├─────────────────────────────────────────────────────┤
│ Domain Layer                                        │
│ └─ domain/*.py: 純粋なビジネスルール（FEFO計算等）  │
├─────────────────────────────────────────────────────┤
│ Infrastructure Layer                                │
│ └─ persistence/models/*.py: SQLAlchemy ORM          │
│ └─ repositories/*.py: データアクセス               │
└─────────────────────────────────────────────────────┘
```

**根拠**: `docs/architecture/overview.md`およびディレクトリ構造

### 1.3 重要不変条件（Invariants）

コードベースから読み取れる不変条件：

| 不変条件 | 実装箇所 | 担保方法 |
|----------|----------|----------|
| **在庫がマイナスにならない** | `lots`テーブル `CHECK(current_quantity >= 0)` | DB制約 |
| **予約数量は正の値** | `lot_reservations`テーブル `CHECK(reserved_qty > 0)` | DB制約 |
| **二重引当防止** | `with_for_update()` による悲観ロック | `auto.py:69`, `commit.py:90` |
| **FEFO順序** | `ORDER BY expiry_date ASC NULLS LAST, received_date ASC` | `auto.py:68` |
| **ロット番号の一意性** | `UNIQUE(lot_number, product_id, warehouse_id)` | DB制約 |
| **stock_historyは追記のみ** | Insertのみ（Update/Deleteなし） | コードパターン |

---

## 2. 要点：全体所見

### 2.1 良い点

| # | 良い点 | 根拠 |
|---|--------|------|
| 1 | **堅牢なDB制約設計** | 初期マイグレーション(`000000000000_initial_schema.py`)で50以上のCHECK制約、UNIQUE制約、FK制約を定義。ビジネスルールをDB層で担保 |
| 2 | **悲観ロックによる整合性確保** | 引当処理で`with_for_update()`を一貫して使用（13箇所確認）。同時引当の競合を適切に防止 |
| 3 | **レイヤー分離の明確化** | `domain/` (純粋ロジック) → `services/` (トランザクション管理) → `routes/` (HTTP)の責務分離。循環依存なし |

### 2.2 最大リスク

| # | リスク | 深刻度 | 根拠 |
|---|--------|--------|------|
| 1 | **CIテストがスキップされている** | **Critical** | `.github/workflows/ci.yml:83` に `if: false` でバックエンドテストが無効化されている |
| 2 | **トランザクション境界の不統一** | **High** | ルーター層で`db.commit()`が100箇所以上散在。Service層で完結すべきトランザクションがPresentation層に漏れ出ている |
| 3 | **冪等性の欠如** | **High** | 一括引当`auto_reserve_bulk`が再実行時に既存予約をチェックするが、部分障害時のリカバリ戦略が不明確 |

---

## 3. 比較：現状 vs 望ましい形

### 3.1 トランザクション管理

| 観点 | 現状 | 望ましい形 | 根拠 |
|------|------|------------|------|
| **境界** | Router/Serviceの両方で`db.commit()` | Serviceのみ | `orders_router.py:138,156,206`など多数。`base_service.py`に`_execute_in_transaction`が存在するが未活用 |
| **ロールバック** | 一部で明示的rollback | すべてtry-exceptで統一 | `commit.py:147`は適切。`orders_router.py:156`は不完全 |

### 3.2 エラーハンドリング

| 観点 | 現状 | 望ましい形 | 根拠 |
|------|------|------------|------|
| **エラー形式** | `HTTPException(detail=str(e))` or `{"error": "CODE", "message": "..."}` | 統一された構造 | `allocations_router.py`で2パターン混在 |
| **カスタム例外** | `AllocationCommitError`, `InsufficientStockError`等 | ドメイン層で完結 | `schemas.py`に定義。Presentation層まで到達する設計は適切 |

### 3.3 状態管理（Frontend）

| 観点 | 現状 | 望ましい形 | 根拠 |
|------|------|------------|------|
| **Server State** | TanStack Query | 適切 | `features/*/api.ts`で使用 |
| **Client State** | Jotai（最小限） | 適切 | `atoms.ts`は認証のみ（12行）。UI状態はコンポーネントローカル |
| **キャッシュ戦略** | 未明確 | 明示的なinvalidation | `getOrders`等でstaleTimeの設定不明 |

---

## 4. 具体例：問題点リスト

### 問題点一覧（15件）

| # | Severity | 問題点 | 影響範囲 | 再現シナリオ | 修正方針 | 工数 |
|---|----------|--------|----------|--------------|----------|------|
| 1 | **H** | CIテストスキップ | 品質全般 | PR時にテスト未実行 | `if: false`を削除、テスト修正 | M |
| 2 | **H** | Router層でのcommit | 全API | 複数APIで部分コミット発生 | Service層にトランザクション集約 | L |
| 3 | **H** | 一括引当の部分失敗時リカバリ | 引当機能 | `auto_reserve_bulk`中にエラー発生 | Saga/補償トランザクション導入 | L |
| 4 | **H** | ロック取得のデッドロックリスク | 引当機能 | 複数ロットを異なる順序でロック | ロットIDソート後に取得 | S |
| 5 | **M** | OpenAPIスキーマ同期 | フロント型安全性 | バックエンド変更後にtypegen未実行 | CI/pre-commitでチェック追加 | S |
| 6 | **M** | エラーレスポンス形式不統一 | API消費者 | `detail: string` vs `detail: object` | 共通エラースキーマ定義 | M |
| 7 | **M** | JWT秘密鍵のハードコード | セキュリティ | `ci.yml:89`で固定値 | シークレット管理に移行 | S |
| 8 | **M** | 監査ログの不完全性 | コンプライアンス | 引当確定時のログ欠如 | `operation_logs`への記録追加 | M |
| 9 | **M** | N+1クエリ | パフォーマンス | 受注一覧で製品/顧客を個別取得 | joinedloadまたはselectinload | M |
| 10 | **M** | View再作成の非冪等性 | マイグレーション | `conftest.py`でDROP VIEW失敗時の処理 | `CREATE OR REPLACE`に統一 | S |
| 11 | **L** | 300行超ファイル | 保守性 | `material_delivery_note_service.py` 672行 | 機能分割 | M |
| 12 | **L** | 未使用importの残存 | コード品質 | Ruffで検出可能だが残存 | CI厳格化 | S |
| 13 | **L** | テストカバレッジ不明 | 品質可視性 | カバレッジレポート未生成 | pytest-covの有効化 | S |
| 14 | **L** | 環境変数のデフォルト値 | 運用安全性 | `docker-compose.yml`でパスワードにdefault | 本番では必須化 | S |
| 15 | **L** | フロントエンドテスト不足 | 品質 | `npm run test:run`の中身薄い | ユニットテスト追加 | L |

### 詳細説明

#### 問題 #1: CIテストスキップ【Critical】

**根拠**: `.github/workflows/ci.yml:83`
```yaml
- name: Run tests with coverage
  if: false # Temporary skip to allow merge
```

**影響**: すべてのバックエンドテストがスキップされ、リグレッション検出不能

**修正方針**:
1. `if: false`を削除
2. 失敗するテストを特定・修正
3. テスト実行時間が長い場合はパラレル化

---

#### 問題 #2: Router層でのトランザクション管理

**根拠**: `grep`結果より100箇所以上で`db.commit()`がRouter層に存在

**例**: `orders_router.py:138`
```python
@router.post("/{order_id}/lock")
def acquire_lock(...):
    ...
    db.commit()  # ← Serviceで完結すべき
```

**影響**:
- 複数操作の原子性が保証されない
- エラー時の部分コミット発生

**修正方針**: `base_service.py`の`_execute_in_transaction`パターンを全Serviceに適用

---

#### 問題 #4: デッドロックリスク

**根拠**: `auto.py:69`
```python
candidate_lots = (
    db.query(Lot)
    .filter(...)
    .order_by(Lot.expiry_date.asc())
    .with_for_update()  # FEFOソート順でロック
    .all()
)
```

**影響**: 2つのトランザクションが異なる順序でロットをロックするとデッドロック

**再現シナリオ**:
1. Tx1: ロットA→B順でロック要求
2. Tx2: ロットB→A順でロック要求
3. 相互待ちでデッドロック

**修正方針**:
```python
.order_by(Lot.id.asc())  # ロックはID順に統一
```

---

### 優先順位付きロードマップ

#### 今週（Critical/High修正）

| 優先度 | タスク | 担当 |
|--------|--------|------|
| P0 | CIテストの再有効化と修正（#1） | Backend |
| P0 | Router層commit排除開始（#2） | Backend |
| P1 | デッドロック対策（#4） | Backend |

#### 今月（Medium修正）

| 優先度 | タスク | 担当 |
|--------|--------|------|
| P2 | エラーレスポンス統一（#6） | Backend |
| P2 | 監査ログ強化（#8） | Backend |
| P2 | N+1クエリ修正（#9） | Backend |
| P2 | OpenAPI同期CI追加（#5） | DevOps |

#### 四半期（Low修正・改善）

| 優先度 | タスク | 担当 |
|--------|--------|------|
| P3 | 大規模ファイル分割（#11） | Backend |
| P3 | テストカバレッジ可視化（#13） | DevOps |
| P3 | フロントエンドテスト充実（#15） | Frontend |

---

### 最初の3コミット提案

#### Commit 1: CIテスト再有効化

```
fix(ci): re-enable backend tests with isolated test database

- Remove `if: false` from test step
- Fix test database initialization order
- Add TEST_DB_PRE_INITIALIZED environment handling
```

**変更対象**:
- `.github/workflows/ci.yml`
- `backend/tests/conftest.py`

**目的**: 回帰検出能力の回復

---

#### Commit 2: トランザクション境界の整理（orders_router）

```
refactor(orders): move transaction management to service layer

- Extract db.commit() from router to OrderService
- Add proper rollback handling
- Use _execute_in_transaction pattern
```

**変更対象**:
- `backend/app/presentation/api/routes/orders/orders_router.py`
- `backend/app/application/services/orders/order_service.py`（新規または既存）

**目的**: 原子性保証、責務分離の徹底

---

#### Commit 3: デッドロック防止

```
fix(allocation): prevent deadlock by consistent lock ordering

- Sort lots by ID before acquiring locks
- Add docstring explaining lock strategy
```

**変更対象**:
- `backend/app/application/services/allocations/auto.py`
- `backend/app/application/services/allocations/commit.py`

**目的**: 同時引当時のデッドロック防止

---

## 5. 質問リスト（追加情報のリクエスト）

レビューを完遂するにあたり、以下の情報がコードベースから読み取れませんでした：

| # | 質問 | 理由 |
|---|------|------|
| 1 | **同時実行の想定規模**は？（ユーザー数、同時引当リクエスト/秒） | ロック戦略の妥当性評価に必要 |
| 2 | **SAP連携の具体的なプロトコル・認証方式**は？ | `sap_service.py`はモック実装。本番統合要件が不明 |
| 3 | **在庫データ量**は？（ロット数、受注明細数の目安） | N+1修正の優先度判断、インデックス戦略に必要 |
| 4 | **FEFO以外の引当ルール**の有無は？（顧客別、製品別の例外ルール） | `business_rules`テーブルは存在するが運用状況不明 |
| 5 | **OCR取込のエラー率・リカバリフロー**は？ | 部分成功時の業務フローが不明 |
| 6 | **本番環境の構成**は？（Kubernetes？ECS？オンプレ？） | Docker Composeは開発用のみと推察。本番デプロイ戦略が不明 |
| 7 | **データ保持期間・アーカイブ戦略**は？ | `stock_history`の増加ペースとパフォーマンス影響 |

---

## 総評

本システムは**DB制約とロック戦略による堅牢な整合性担保**、**明確なレイヤー分離**という強固な基盤を持っています。一方、**CIテストの無効化**という致命的な問題があり、早急な対応が必要です。

アーキテクチャは概ね適切であり、「リライト」ではなく「段階的なリファクタリング」で十分改善可能です。上記ロードマップに従い、まずはCIの復旧、次にトランザクション境界の整理を進めることを推奨します。

---

*本レビューは2025-12-21時点のコードベースに基づいています。*
