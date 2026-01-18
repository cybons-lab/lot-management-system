# ロット管理システム - 包括的テスト戦略計画

## 0. 現状把握と質問

### 確認した情報
- **技術スタック**: FastAPI + pytest (backend), React + Playwright (frontend), PostgreSQL
- **既存テスト**: Backend 70ファイル (API/service/domain/unit), Frontend 10 E2Eファイル
- **テストインフラ**: Docker Compose, GitHub Actions CI/CD, トランザクション分離パターン採用済み

### 仮定事項
1. **想定ユーザー**: 事務員がブラウザで操作（技術知識は限定的）
2. **優先障害**: データ保存失敗、表示不整合、状態遷移エラー、権限漏れ
3. **実行環境**: CI上でDocker環境での自動実行、ローカルでも同一環境を再現可能
4. **テストデータ管理**: APIエンドポイント `/api/admin/reset-database` + `/api/admin/init-sample-data` を活用
5. **テスト実行時間制約**: E2E全体 < 10分、API統合 < 5分、ユニット < 2分を目標

### 追加質問（必須ではない）
**質問なし** - 上記仮定で実用的な計画を作成可能です。不明点は実装時に検証します。

---

## 1. テスト戦略（テストピラミッド）

### 戦略方針: **E2E薄層 + API統合厚層 + ユニット基盤**

```
        E2E (10-15本)         ← 代表シナリオ + 事故パターン（UI破壊検知）
       ---------------
      /               \
     /  API統合 (150本)  \   ← CRUD + 検索 + 制約 + 権限 + 集計（DB整合性の砦）
    /-------------------\
   /  ユニット (80本)      \  ← ビジネスロジック + バリデーション + 計算
  /-----------------------\
```

### 各レイヤーの役割

#### E2E層 (Playwright)
**目的**: UIとバックエンドの統合破壊を検知（手動テストの代替不可部分のみ）

- **対象**:
  - クリティカルパス（注文作成→割当→出荷の一連の流れ）
  - 権限別UI表示差分（管理者/一般ユーザー）
  - ファイルアップロード/ダウンロード
  - 状態遷移UI（Draft→Open→Allocatedのボタン制御）
  - エラーメッセージ表示

- **対象外**:
  - バリデーション詳細（API統合で網羅）
  - 検索/フィルタのすべてのパターン（API統合で網羅）
  - データ整合性（API統合で検証）

- **本数目安**: 10-15本

#### API統合層 (pytest + TestClient)
**目的**: "DB保存できない" "保存できたが反映されない" を高確率で検知

- **対象**:
  - **CRUD完全**: 作成/読取/更新/削除 + 制約違反パターン
  - **検索/フィルタ網羅**: 複数条件、境界値、0件、ソート、ページング
  - **状態遷移**: すべての正常/異常遷移パターン
  - **権限**: 一般/管理者別のアクセス制御
  - **集計/KPI**: 在庫集計、進捗率、不足数の計算正確性
  - **データ整合性**: 保存後の再読込、履歴生成、参照整合
  - **同時操作シミュレーション**: ロック、楽観ロック、重複防止

- **本数目安**: 150本（既存70本を拡張）

#### ユニット層 (pytest)
**目的**: ビジネスロジックの正確性を高速に検証

- **対象**:
  - **ドメインロジック**: FEFO計算、数量変換、進捗率、有効期限判定
  - **バリデーション**: 入力検証、境界値、禁則文字、データ型
  - **状態機械**: 状態遷移ロジック（UI/API層から分離されたコア）
  - **イベント生成**: StockChangedEvent、AllocationCreatedEventの正確性

- **本数目安**: 80本（既存から拡張）

---

## 2. 網羅観点チェックリスト（漏れ対策の核）

### A) 入力/バリデーション

| 観点 | 具体的テストケース | 実装レイヤー |
|------|-------------------|-------------|
| 必須項目 | null, undefined, 空文字列 | API統合 |
| 前後空白 | " value ", "\tvalue\n" | API統合 |
| 最大長 | 境界値（49/50/51文字）、Unicode文字含む | API統合 |
| 最小長 | 0文字、1文字 | API統合 |
| 数値範囲 | 負数、0、0.001、MAX_INT | API統合 |
| 日付範囲 | 過去日付、未来日付、due_date < order_date | API統合 |
| ID改ざん | 存在しないID、他ユーザーのID、削除済みID | API統合 |
| 全角半角 | "ABC" vs "ＡＢＣ" | API統合 |
| 特殊文字 | SQL注入、XSS、制御文字 | API統合 |
| Decimal精度 | 0.1 + 0.2 = 0.3 (float禁止) | ユニット |

### B) 一覧（検索、フィルタ、ソート、ページング）

| 観点 | 具体的テストケース | 実装レイヤー |
|------|-------------------|-------------|
| 単一検索条件 | product_code="ABC"、部分一致、前方一致 | API統合 |
| 複数検索条件 | product_code AND warehouse_code | API統合 |
| 相互フィルタ | customer選択 → delivery_place絞り込み | API統合 |
| 日付範囲 | from=2024-01-01, to=2024-12-31、境界値 | API統合 |
| ソート | ASC/DESC、複数カラム、null値の順序 | API統合 |
| ページング | page=1/2/999、limit=10/50/100、total_count整合 | API統合 |
| 0件結果 | 検索結果なし、空配列返却 | API統合 |
| フィルタクリア | 全条件リセット後の全件表示 | API統合 |
| 削除済み除外 | deleted_at IS NULL（論理削除） | API統合 |

### C) 状態遷移

| 観点 | 具体的テストケース | 実装レイヤー |
|------|-------------------|-------------|
| 正常遷移 | draft→open→allocated→shipped→closed | API統合 |
| 異常遷移 | closed→shipped（禁止）、draft→shipped（スキップ禁止） | API統合 |
| 逆方向遷移 | allocated→part_allocated→open（割当解除） | API統合 |
| 終端状態 | closed/cancelledから遷移不可 | API統合 |
| 削除/無効化 | open状態のみ削除可、allocated以降は削除不可 | API統合 |
| 関連データ制約 | 割当あり注文の削除禁止 | API統合 |
| 状態UIボタン | draft時は"確定"ボタン表示、closed時は編集不可 | E2E |

### D) 権限

| 観点 | 具体的テストケース | 実装レイヤー |
|------|-------------------|-------------|
| 一般ユーザー | 閲覧可、作成可、編集可（自分のみ）、削除不可 | API統合 |
| 管理者 | 全操作可、永久削除可、システム設定変更可 | API統合 |
| APIでも拒否 | UI隠蔽だけでなくAPI側でも403返却 | API統合 |
| トークン期限切れ | 401返却、ログイン画面リダイレクト | E2E |
| 他ユーザーデータ | user_id不一致データへのアクセス拒否 | API統合 |
| 未ログイン | 全API 401返却 | API統合 |

### E) 同時操作

| 観点 | 具体的テストケース | 実装レイヤー |
|------|-------------------|-------------|
| 保存連打 | 同じフォーム2回送信、重複登録防止 | API統合 |
| 楽観ロック | version不一致で409返却、再取得促進 | API統合 |
| 悲観ロック | order_lock 10分間、他ユーザーは423返却 | API統合 |
| タブ2枚操作 | 同じ注文を2窓で編集、後勝ちで警告 | E2E（手動推奨） |
| 在庫競合 | 同じロットへの同時割当、先着優先 | API統合 |
| ロック期限切れ | 10分経過後の自動解放 | API統合 |

### F) エラー処理

| 観点 | 具体的テストケース | 実装レイヤー |
|------|-------------------|-------------|
| 4xx（クライアント） | 400/401/403/404/409/422/423の適切な返却 | API統合 |
| 5xx（サーバー） | 500時のログ記録、ユーザーへの汎用メッセージ | E2E |
| ネットワーク断 | タイムアウト、リトライ可能エラー表示 | E2E |
| バリデーション | 422返却、フィールド別エラーメッセージ | API統合 |
| メッセージ一貫性 | 日本語エラー（UI）と英語（ログ）の対応 | E2E |
| トースト表示 | 成功/エラートースト表示確認 | E2E |

### G) データ整合（最重要）

| 観点 | 具体的テストケース | 実装レイヤー |
|------|-------------------|-------------|
| 保存後再読込 | POST後にGETで同じデータ取得 | API統合 |
| 集計/KPI反映 | lot作成後、inventory_summaryに即反映 | API統合 |
| 履歴生成 | stock_historyへの記録（INSERT only） | API統合 |
| 参照整合性 | product削除時、関連lot削除/拒否 | API統合 |
| トリガー動作 | lot_receipt INSERT → lot_master 集計更新 | API統合 |
| ビュー整合性 | v_inventory_summaryとlots集計の一致 | API統合 |
| 数量精度 | Decimal使用、float誤差ゼロ | ユニット |

---

## 3. テスト計画（優先順位付き）

### 優先度定義

- **P0 (Critical)**: リリース前必須、障害時ビジネス停止
- **P1 (High)**: 初回リリースで実装、データ整合性に影響
- **P2 (Medium)**: 2週目以降、改善・拡張

### P0: 最初の1週間で作るセット (合計45本)

#### E2E (5本)
1. **注文作成→割当→出荷フロー** (draft→open→allocated→shipped)
2. **管理者永久削除** (bulk-delete adminフロー)
3. **一般ユーザー論理削除** (bulk-delete userフロー)
4. **CSV注文アップロード** (RPA material delivery)
5. **在庫一覧エクスポート** (CSV download)

#### API統合 (30本)
**CRUD基本 (10本)**
- orders: POST/GET/PUT/DELETE + 制約違反
- lots: POST/GET/PUT + expiry_date境界値
- allocations: POST/DELETE + 不足在庫エラー

**状態遷移 (5本)**
- order状態機械: 正常遷移5パターン、異常遷移3パターン

**データ整合性 (10本)**
- lot作成→inventory_summary反映
- allocation作成→stock_history記録
- order削除→関連allocation削除/拒否
- 集計view (v_inventory_summary) 整合性
- FEFO割当計算正確性（在庫不足、複数ロット分割）

**権限 (5本)**
- 一般ユーザー: 閲覧可、作成可、削除不可
- 管理者: 永久削除可、システム設定変更可
- 未ログイン: 401返却

#### ユニット (10本)
- FEFO計算: 有効期限ソート、期限切れ除外、不足計算
- 進捗率計算: 0%, 50%, 100%, 境界値（0除算）
- 数量変換: qty_per_internal_unit変換精度
- 状態遷移検証: OrderStateMachine全遷移パターン
- バリデーション: 必須、最大長、数値範囲、日付範囲

### P1: 2週目で追加 (合計75本)

#### E2E (5本)
- 検索/フィルタ操作（product-mappings）
- ロック競合（2ユーザー同時編集）
- エラーメッセージ表示確認
- ページング操作（大量データ）
- フォーム入力バリデーション

#### API統合 (50本)
- 検索/フィルタ全パターン（単一、複数、日付範囲、ソート、ページング）
- 楽観/悲観ロック全パターン
- バリデーション詳細（全角半角、特殊文字、境界値）
- 同時操作（保存連打、在庫競合、ロック期限）
- エラーハンドリング（4xx/5xx全パターン）

#### ユニット (20本)
- ビジネスルール詳細（OrderBusinessRules全メソッド）
- イベント生成（StockChangedEvent、AllocationCreatedEvent）
- ドメイン例外（すべての例外クラス）
- Forecast match confidence計算
- RPA状態遷移（RpaStateManager全ステップ）

### P2: 継続改善 (合計40本)

#### E2E (5本)
- モバイル/レスポンシブ確認
- パフォーマンス（大量データでの表示速度）
- アクセシビリティ（a11y）
- 多言語対応（日/英切替）

#### API統合 (25本)
- パフォーマンステスト（1000件検索）
- 複雑な検索クエリ（JOINを含む）
- バッチ処理（一括割当、一括削除）
- 外部連携モック（SAP、OCR）

#### ユニット (10本)
- エッジケース網羅
- Property-based testing拡張（Hypothesis）

### 本数まとめ

| レイヤー | P0 | P1 | P2 | 合計 |
|---------|----|----|-------|------|
| E2E     | 5  | 5  | 5     | **15** |
| API統合 | 30 | 50 | 25    | **105** |
| ユニット | 10 | 20 | 10    | **40** |
| **合計** | **45** | **75** | **40** | **160** |

---

## 4. 実装アーキテクチャ案（具体）

### リポジトリ内テストフォルダ構成

```
lot-management-system/
├── backend/
│   ├── tests/
│   │   ├── conftest.py                 # 既存（拡張）
│   │   ├── fixtures/                   # NEW: 共通フィクスチャ
│   │   │   ├── __init__.py
│   │   │   ├── auth_fixtures.py        # ユーザー/ロール/トークン
│   │   │   ├── master_fixtures.py      # Product/Supplier/Warehouse
│   │   │   ├── order_fixtures.py       # Order/OrderLine
│   │   │   └── lot_fixtures.py         # Lot/Allocation
│   │   ├── factories/                  # NEW: データファクトリ
│   │   │   ├── __init__.py
│   │   │   ├── order_factory.py        # OrderFactory.create(status="draft")
│   │   │   ├── lot_factory.py          # LotFactory.create(expiry_date=...)
│   │   │   └── allocation_factory.py   # AllocationFactory.create(...)
│   │   ├── helpers/                    # NEW: テストヘルパー
│   │   │   ├── __init__.py
│   │   │   ├── api_client.py           # APIClientWrapper（認証ヘッダ自動付与）
│   │   │   ├── assertions.py           # assert_order_state(), assert_db_record_exists()
│   │   │   └── wait.py                 # wait_for_condition()
│   │   ├── matrices/                   # NEW: テストマトリクス（宣言的定義）
│   │   │   ├── state_transitions.yaml  # 状態遷移表
│   │   │   ├── validation_rules.yaml   # バリデーションルール
│   │   │   └── permission_matrix.yaml  # 権限マトリクス
│   │   ├── api/                        # 既存（拡張）
│   │   │   ├── test_orders_crud.py     # CRUD + 制約
│   │   │   ├── test_orders_state.py    # 状態遷移
│   │   │   ├── test_lots_crud.py
│   │   │   ├── test_allocations.py
│   │   │   └── test_permissions.py     # NEW: 権限テスト
│   │   ├── integration/                # 既存（拡張）
│   │   │   ├── test_data_integrity.py  # NEW: 整合性
│   │   │   ├── test_concurrent.py      # NEW: 同時操作
│   │   │   └── test_aggregations.py    # NEW: 集計/ビュー
│   │   ├── unit/                       # 既存（拡張）
│   │   │   ├── test_fefo_calculator.py
│   │   │   ├── test_order_business_rules.py
│   │   │   └── test_state_machine.py
│   │   └── db_utils.py                 # 既存
│
├── frontend/
│   ├── e2e/
│   │   ├── fixtures/                   # NEW: Page Objects
│   │   │   ├── pages/
│   │   │   │   ├── BasePage.ts
│   │   │   │   ├── LoginPage.ts
│   │   │   │   ├── OrderListPage.ts
│   │   │   │   └── OrderDetailPage.ts
│   │   │   ├── auth.ts                 # setupAuth() ヘルパー
│   │   │   └── api-mock.ts             # setupMockAPI() ヘルパー
│   │   ├── helpers/                    # NEW: 共通ヘルパー
│   │   │   ├── wait.ts                 # waitForCondition()
│   │   │   ├── assertions.ts           # assertToastMessage()
│   │   │   └── test-data.ts            # createTestOrder() via API
│   │   ├── flows/                      # NEW: E2Eフロー
│   │   │   ├── order-create-allocate-ship.spec.ts
│   │   │   ├── bulk-delete-admin.spec.ts
│   │   │   └── csv-upload.spec.ts
│   │   ├── critical/                   # NEW: クリティカルパス
│   │   │   └── data-integrity.spec.ts  # 保存→再読込検証
│   │   └── playwright.config.ts        # 既存
│
├── .github/
│   └── workflows/
│       ├── test-backend.yml            # pytest実行
│       ├── test-frontend-e2e.yml       # Playwright実行
│       └── test-all.yml                # 統合実行
```

### 共通化戦略

#### 1. Data Factory Pattern (backend)

**目的**: テストデータ生成を宣言的にし、重複排除

```python
# tests/factories/order_factory.py
from typing import Optional
from app.infrastructure.persistence.models import Order, OrderLine
from decimal import Decimal

class OrderFactory:
    @staticmethod
    def create(
        db,
        order_number: str = "TEST-ORDER-001",
        status: str = "draft",
        customer_code: Optional[str] = None,
        lines: Optional[list] = None,
        **kwargs
    ) -> Order:
        """Create order with sensible defaults."""
        if not customer_code:
            customer = CustomerFactory.create(db)
            customer_code = customer.customer_code

        order = Order(
            order_number=order_number,
            order_status=status,
            customer_code=customer_code,
            **kwargs
        )
        db.add(order)
        db.flush()

        if lines:
            for line_data in lines:
                line = OrderLine(order_id=order.id, **line_data)
                db.add(line)

        db.commit()
        return order
```

**使用例**:
```python
def test_order_allocation(db):
    order = OrderFactory.create(db, status="open", lines=[
        {"product_code": "P001", "quantity": Decimal("10.0")}
    ])
    lot = LotFactory.create(db, product_code="P001", available_qty=Decimal("10.0"))
    # ... テストロジック
```

#### 2. API Client Wrapper (backend)

**目的**: 認証ヘッダの自動付与、レスポンス検証簡略化

```python
# tests/helpers/api_client.py
from fastapi.testclient import TestClient

class APIClientWrapper:
    def __init__(self, client: TestClient, token_headers: dict):
        self.client = client
        self.headers = token_headers

    def get(self, url: str, expected_status: int = 200):
        response = self.client.get(url, headers=self.headers)
        assert response.status_code == expected_status
        return response.json()

    def post(self, url: str, json: dict, expected_status: int = 201):
        response = self.client.post(url, json=json, headers=self.headers)
        assert response.status_code == expected_status
        return response.json()
```

#### 3. State Transition Matrix (YAML宣言的定義)

**目的**: 状態遷移テストを宣言的に定義し、テストコード生成

```yaml
# tests/matrices/state_transitions.yaml
order_states:
  - from: draft
    to: [open, cancelled]
    allowed: true
  - from: draft
    to: [allocated, shipped, closed]
    allowed: false
  - from: open
    to: [part_allocated, allocated, cancelled]
    allowed: true
  - from: allocated
    to: [shipped]
    allowed: true
  - from: shipped
    to: [closed]
    allowed: true
  - from: [closed, cancelled]
    to: "*"
    allowed: false
```

**テスト生成**:
```python
# tests/api/test_orders_state.py
import yaml
import pytest

with open("tests/matrices/state_transitions.yaml") as f:
    TRANSITIONS = yaml.safe_load(f)["order_states"]

@pytest.mark.parametrize("transition", [t for t in TRANSITIONS if t["allowed"]])
def test_allowed_transition(db, client, transition):
    order = OrderFactory.create(db, status=transition["from"])
    for target_state in transition["to"]:
        response = client.put(f"/api/orders/{order.id}", json={"status": target_state})
        assert response.status_code == 200

@pytest.mark.parametrize("transition", [t for t in TRANSITIONS if not t["allowed"]])
def test_forbidden_transition(db, client, transition):
    order = OrderFactory.create(db, status=transition["from"])
    for target_state in transition["to"]:
        response = client.put(f"/api/orders/{order.id}", json={"status": target_state})
        assert response.status_code == 400
```

#### 4. Page Object Model (frontend E2E)

**目的**: UI要素の変更に強い、セレクタ集約

```typescript
// frontend/e2e/fixtures/pages/OrderListPage.ts
import { Page, Locator } from "@playwright/test";

export class OrderListPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly createButton: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByLabel("注文番号検索");
    this.searchButton = page.getByRole("button", { name: "検索" });
    this.createButton = page.getByRole("button", { name: "新規作成" });
    this.tableRows = page.locator("table tbody tr");
  }

  async goto() {
    await this.page.goto("/orders");
  }

  async searchByOrderNumber(orderNumber: string) {
    await this.searchInput.fill(orderNumber);
    await this.searchButton.click();
  }

  async getRowByOrderNumber(orderNumber: string): Promise<Locator> {
    return this.tableRows.filter({ hasText: orderNumber }).first();
  }
}
```

### テストデータの作り方

#### 原則: **APIでseed、DB直叩きは最小限**

**理由**:
- API経由 → ビジネスロジック/バリデーションを通る（より本番に近い）
- DB直叩き → 整合性チェックをスキップ、トリガー未発火リスク

**例外（DB直叩きOK）**:
- パフォーマンステスト用の大量データ生成（1000件+）
- 特定の不正状態の再現（通常のAPIでは作れない壊れたデータ）

**推奨パターン**:
```python
# E2Eテスト前のデータ準備（API経由）
def setup_test_data_via_api(client):
    # Reset DB
    client.post("/api/admin/reset-database")
    client.post("/api/admin/init-sample-data")

    # Create test-specific data
    product = client.post("/api/masters/products", json={"product_code": "P001", ...})
    lot = client.post("/api/lots", json={"product_code": "P001", "quantity": "10.0", ...})
    return {"product": product, "lot": lot}
```

### テスト分離と並列実行

#### Backend (pytest)

**戦略**: トランザクション分離 + function scope fixture

- **既存パターン継続**: conftest.pyの `db` fixtureでトランザクションロールバック
- **並列実行**: `pytest -n auto` (pytest-xdist) で並列化
- **分離保証**: 各テストは独立したトランザクション内で実行、コミットしない

#### Frontend (Playwright)

**戦略**: テスト間でDBリセット + 並列ワーカー分離

```typescript
// e2e/fixtures/database.ts
import { test as base } from "@playwright/test";

export const test = base.extend({
  resetDatabase: async ({ request }, use) => {
    // テスト前にDBリセット
    await request.post("http://localhost:8000/api/admin/reset-database");
    await request.post("http://localhost:8000/api/admin/init-sample-data");
    await use();
    // テスト後のクリーンアップ（必要に応じて）
  },
});
```

**並列実行設定** (playwright.config.ts):
```typescript
export default defineConfig({
  workers: process.env.CI ? 1 : 4,  // CIでは直列、ローカルは4並列
  fullyParallel: true,
  use: {
    storageState: undefined,  // ワーカー間でストレージ共有しない
  },
});
```

---

## 5. CI設計

### GitHub Actions ワークフロー構成

```yaml
# .github/workflows/test-all.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Unit Tests
        run: |
          docker compose -f docker-compose.test.yml up -d db
          docker compose -f docker-compose.test.yml run --rm backend pytest tests/unit -v
        timeout-minutes: 5

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4
      - name: Run API Integration Tests
        run: |
          docker compose -f docker-compose.test.yml up -d
          docker compose -f docker-compose.test.yml exec -T backend pytest tests/api tests/integration -v
        timeout-minutes: 10

  e2e-smoke:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v4
      - name: Run E2E Smoke Tests (Critical Path)
        run: |
          docker compose up -d
          cd frontend
          npm ci
          npx playwright install --with-deps
          npx playwright test --grep "@smoke"
        timeout-minutes: 10

  e2e-full:
    runs-on: ubuntu-latest
    needs: e2e-smoke
    if: github.ref == 'refs/heads/main'  # mainブランチのみ
    steps:
      - uses: actions/checkout@v4
      - name: Run Full E2E Suite
        run: |
          docker compose up -d
          cd frontend
          npx playwright test
      - name: Upload Playwright Report
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: frontend/playwright-report/
      - name: Upload Playwright Traces
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-traces
          path: frontend/test-results/
```

### 並列実行戦略

#### Backend (pytest-xdist)
```bash
# ローカル: 4並列
pytest tests/api -n 4

# CI: 2並列（リソース制約考慮）
pytest tests/api -n 2
```

#### Frontend (Playwright sharding)
```yaml
# .github/workflows/test-frontend-e2e.yml (分割実行)
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - name: Run E2E Tests (Shard ${{ matrix.shard }}/4)
    run: npx playwright test --shard=${{ matrix.shard }}/4
```

### リトライ方針

**基本ルール**: **闇雲なリトライ禁止**

#### リトライOK条件
1. **ネットワーク起因**: タイムアウト、接続エラー（max 2回）
2. **環境起因**: DBコンテナ起動待ち（max 3回）
3. **E2Eの初回実行**: Playwright `retries: 1` のみ（flaky test検知）

#### リトライNG条件
- アサーション失敗（テスト不具合またはコード不具合）
- バリデーションエラー（期待通り）
- 4xx/5xxエラー（再現性あり）

```typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 1 : 0,  // CI のみ1回リトライ
});
```

### レポート/トレース保存

#### Backend (pytest)
```yaml
- name: Run Tests with Coverage
  run: |
    docker compose exec backend pytest --cov=app --cov-report=xml --cov-report=html
- name: Upload Coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    file: ./backend/coverage.xml
```

#### Frontend (Playwright)
```yaml
- name: Upload Playwright HTML Report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: frontend/playwright-report/
    retention-days: 30

- name: Upload Traces (on failure)
  uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: playwright-traces
    path: frontend/test-results/
    retention-days: 7
```

### 実行時間が伸びた時の分割戦略

#### ステージ分割（優先）

| ステージ | 実行タイミング | 時間目標 |
|---------|---------------|---------|
| Unit    | PR作成時、毎commit | < 2分 |
| API統合 | PR作成時、mergeリクエスト | < 5分 |
| E2E Smoke | PR作成時、mergeリクエスト | < 3分 |
| E2E Full | main merge後、nightly | < 10分 |

#### タグベース分割

```python
# tests/api/test_orders.py
@pytest.mark.smoke
def test_order_create():
    """最重要: 注文作成"""

@pytest.mark.critical
def test_order_state_transition():
    """クリティカルパス"""

@pytest.mark.extended
def test_order_search_all_filters():
    """拡張: 全フィルタ網羅"""
```

```bash
# smoke のみ実行（PR時）
pytest -m smoke

# smoke + critical 実行（merge前）
pytest -m "smoke or critical"

# 全実行（nightly）
pytest
```

---

## 6. リスクと対策

### リスク1: E2Eが壊れやすい・遅い

#### 対策

**A) 待機戦略の標準化**
```typescript
// helpers/wait.ts
export async function waitForCondition(
  page: Page,
  condition: () => Promise<boolean>,
  timeout = 5000
) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) return;
    await page.waitForTimeout(100);
  }
  throw new Error("Condition not met within timeout");
}

// 使用例
await waitForCondition(page, async () => {
  const count = await page.locator("table tbody tr").count();
  return count > 0;
});
```

**B) セレクタ規約の統一**
- 優先順位: `getByRole` > `getByLabel` > `getByTestId` > `locator`
- 動的コンテンツ: `data-testid` を必須化
- テキスト一致: 部分一致を避け、exactマッチ優先

**C) モック境界の明確化**
- **原則**: E2Eは実API使用（モック最小限）
- **例外**: 外部連携（SAP、OCR）のみモック

### リスク2: テストデータ肥大化

#### 対策

**A) データファクトリの最小化**
```python
# 必要最小限のフィールドのみ
OrderFactory.create(db, status="draft")  # 他はデフォルト値
```

**B) DB定期リセット**
```yaml
# E2E各テスト前にリセット
beforeEach(async ({ request }) => {
  await request.post("/api/admin/reset-database");
  await request.post("/api/admin/init-sample-data");
});
```

### リスク3: 環境差分（ローカルとCI）

#### 対策

**A) Docker環境統一**
- ローカル: `docker-compose.yml`
- CI: `docker-compose.test.yml`（最小構成、高速起動）

**B) 環境変数の明示化**
```yaml
# docker-compose.test.yml
environment:
  - TEST_DATABASE_URL=postgresql://testuser:testpass@db:5432/lot_test
  - TEST_DB_PRE_INITIALIZED=false
```

### リスク4: マイグレーション漏れ

#### 対策

**A) マイグレーションテストの追加**
```python
# tests/infrastructure/test_migrations.py
def test_alembic_upgrade_head():
    """マイグレーションが正常に適用されるか"""
    result = subprocess.run(
        ["alembic", "upgrade", "head"],
        capture_output=True,
        text=True
    )
    assert result.returncode == 0
```

**B) CI での自動チェック**
```yaml
- name: Check Migrations
  run: |
    docker compose exec backend alembic upgrade head
    docker compose exec backend alembic check  # 未適用マイグレーション検知
```

### リスク5: 事務員運用手順の漏れ

#### 対策

**A) 運用フローのE2E化**
- 事務員の典型作業（注文入力→割当→出荷）をE2Eで再現
- スクリーンショット自動生成 → マニュアル更新

**B) エラーメッセージの日本語化徹底**
```python
# backend/app/core/exceptions.py
class OrderValidationError(APIException):
    def __init__(self, field: str, message: str):
        super().__init__(
            status_code=400,
            detail={"field": field, "message": message},
            user_message=f"{field}のエラー: {message}"  # 日本語メッセージ
        )
```

**C) 操作ログの記録とレビュー**
- operation_logsテーブルに全操作記録
- 定期的にログを分析し、エラー頻発操作をテストケース化

---

## 7. 実装ロードマップ

### Week 1: 基盤整備 + P0テスト (45本)

**Day 1-2: 共通インフラ**
- tests/factories/ 実装
- tests/helpers/api_client.py 実装
- tests/matrices/state_transitions.yaml 定義

**Day 3-4: API統合 P0 (30本)**
- CRUD基本 (10本)
- 状態遷移 (5本)
- データ整合性 (10本)
- 権限 (5本)

**Day 5: ユニット P0 (10本)**
- FEFO計算
- 進捗率計算
- 状態遷移

**Day 6-7: E2E P0 (5本)**
- Page Object実装
- クリティカルパス (注文フロー、削除、CSV)

### Week 2: P1テスト拡張 (75本)

**Day 8-10: API統合 P1 (50本)**
- 検索/フィルタ全パターン
- 楽観/悲観ロック
- バリデーション詳細

**Day 11-12: ユニット P1 (20本)**
- ビジネスルール詳細
- イベント生成
- ドメイン例外

**Day 13-14: E2E P1 (5本)**
- 検索/フィルタ操作
- ロック競合
- エラーメッセージ

### Week 3-4: P2 + CI整備 (40本)

**Day 15-20: P2テスト (40本)**
- API統合 (25本)
- ユニット (10本)
- E2E (5本)

**Day 21: CI/CD整備**
- GitHub Actions ワークフロー作成
- レポート/トレース保存設定

---

## 8. 検証方法（end-to-end検証）

### テスト成功基準

#### API統合テスト
```bash
# すべてのAPIテストがパス
docker compose exec backend pytest tests/api -v
# ✓ 105 passed in 3.5s

# カバレッジ 80% 以上
docker compose exec backend pytest --cov=app --cov-report=term
# TOTAL coverage: 82%
```

#### E2Eテスト
```bash
# すべてのE2Eテストがパス
cd frontend && npx playwright test
# ✓ 15 passed (45s)

# トレースが保存される（失敗時）
ls frontend/test-results/
# order-create-allocate-ship-chromium/trace.zip
```

#### データ整合性検証（手動確認）
```bash
# テスト実行後、DBデータを目視確認
docker compose exec backend psql -U testuser -d lot_management_test -c "SELECT * FROM stock_history ORDER BY changed_at DESC LIMIT 5;"

# 期待:
# - stock_historyにレコードあり（INSERT成功）
# - lots.available_qty と集計が一致
```

### CI成功基準

- すべてのジョブがグリーン（unit → integration → e2e-smoke）
- E2E実行時間 < 10分
- カバレッジレポートがCodecovにアップロード
- 失敗時にトレース/スクショがArtifactとして保存

---

## 付録: 重要ファイルパス一覧

### Backend
- `backend/tests/conftest.py` - テストフィクスチャ
- `backend/tests/db_utils.py` - DB管理ユーティリティ
- `backend/app/domain/allocation/calculator.py` - FEFO計算ロジック
- `backend/app/domain/order/state_machine.py` - 注文状態機械
- `backend/app/domain/order/business_rules.py` - 注文ビジネスルール

### Frontend
- `frontend/playwright.config.ts` - Playwright設定
- `frontend/e2e/` - E2Eテストディレクトリ

### CI/CD
- `.github/workflows/` - GitHub Actionsワークフロー（作成予定）

### Documentation
- `CLAUDE.md` - プロジェクト概要
- `docs/standards/` - コーディング規約
