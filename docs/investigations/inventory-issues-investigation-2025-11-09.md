# 在庫管理システム 問題調査レポート

**調査日**: 2025-11-09
**対象**: 在庫管理ページのデータ取得失敗、無限レンダー、過剰リロード
**調査範囲**: コード読解とログ分析（修正は実施せず）

---

## A. 事象整理

### 1. 在庫ページでデータ取得失敗
- **症状**: 在庫管理ページ（InventoryPage）でロットデータが空または取得失敗
- **対照**: ダッシュボードは正常（総在庫 7,969、総受注 25、未引当 25 が正しく表示）
- **再現条件**: 在庫管理ページへの直接アクセスまたはナビゲーション経由のアクセス

### 2. React無限レンダー
- **症状**: `Maximum update depth exceeded` エラー
- **発生箇所**: LotAllocationPage (推定)
- **再現条件**: 受注選択時または明細行選択時

### 3. 開発環境の過剰リロード
- **症状**: ファイル保存時に複数回リロードが発生
- **環境**: Docker + Vite
- **設定**: `vite.config.ts` で `usePolling: true` が有効

### 4. URL露出リスク
- **症状**: 副作用的なパラメータがURLに露出する可能性
- **例**: `?product_code=P001&warehouse_code=W01&quantity=100`
- **リスク**: ブックマーク/共有時の意図しない操作実行、セキュリティリスク

### 5. ブラウザ拡張機能の副作用
- **症状**: `content_script.js: Cannot read properties of undefined (reading 'control')`
- **確認済み**: シークレットウィンドウで消滅 → 拡張機能が原因
- **影響**: 開発時のノイズ（機能的影響は限定的）

---

## B. 原因仮説（優先度順）

### 🔴 最優先 #1: バックエンドモデル定義の致命的エラー

**ファイル**: `backend/app/models/inventory.py` (114-118行)

```python
class LotCurrentStock(Base):
    # ...
    # 114-115行目
    current_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    last_updated: Mapped[datetime | None] = mapped_column(DateTime)

    # 117-118行目（重複定義！）
    current_quantity: Mapped[float] = mapped_column(Float, nullable=False)
    last_updated: Mapped[datetime | None] = mapped_column(DateTime)
```

**問題点**:
- 同じクラス内で `current_quantity` と `last_updated` が2回定義されている
- 型も異なる（Decimal → float）
- SQLAlchemyのマッピングが不正になる可能性が高い

**影響**:
- ORM経由のクエリ失敗
- LotCurrentStockからのデータ取得が不安定
- 在庫数量の取得エラー

**優先度**: 🔴 **Critical** - これが在庫データ取得失敗の最有力原因

---

### 🔴 最優先 #2: Lot.current_stock relationshipの欠落

**ファイル**: `backend/app/models/inventory.py`

**問題**:
- `Lot` モデルに `current_stock` relationship が定義されていない
- しかし `backend/app/api/routes/lots.py` で以下のように使用：
  - 76行: `query.join(Lot.current_stock)`
  - 93-95行: `lot.current_stock.current_quantity`
  - 211-213行, 272-274行でも同様にアクセス

**影響**:
- Runtime `AttributeError: 'Lot' object has no attribute 'current_stock'`
- `/api/lots` エンドポイントでの500エラー
- 在庫データ取得の完全失敗

**優先度**: 🔴 **Critical**

---

### 🟠 高優先度 #3: useEffectの依存配列の問題

**ファイル**: `frontend/src/pages/LotAllocationPage.tsx` (289-326行)

```typescript
useEffect(() => {
  // warehouseSummaries を使用しているが、依存配列に含まれていない
  const newKeys = warehouseSummaries.map((w) => w.key).sort();
  // ...
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedLineId, candidateLots.length]);  // ⚠️ warehouseSummaries が欠落
```

**問題点**:
- `warehouseSummaries` を使用しているが依存配列にない
- `candidateLots.length` で代用しているが不安定
- ESLint警告を意図的に抑制（`exhaustive-deps` disable）

**影響**:
- 状態更新のタイミングずれ
- 無限レンダーループの可能性
- `Maximum update depth exceeded` エラーの原因候補

**優先度**: 🟠 **High** - 無限レンダーの最有力原因

---

### 🟠 高優先度 #4: React Query queryKeyの不安定化

**問題箇所**:

1. **LotAllocationPage.tsx** (198-201行)
```typescript
const ordersQuery = useQuery({
  queryKey: ["orders", { status: "open" }],  // ⚠️ オブジェクトリテラル毎回生成
  queryFn: () => getOrders({ status: "open" }),
});
```

2. **useLotsQuery.ts** (@/hooks/api)
```typescript
queryKey: ["lots", params]  // ⚠️ params が毎回異なる参照
```

**影響**:
- queryKeyが毎回異なる参照として認識される
- 不要な再フェッチが発生
- パフォーマンス低下、無限ループ誘発の可能性

**優先度**: 🟠 **High**

---

### 🟡 中優先度 #5: Vite polling設定による過剰リロード

**ファイル**: `frontend/vite.config.ts` (24-26行)

```typescript
watch: {
  usePolling: true,  // Docker環境での安定化のため有効化
},
```

**問題点**:
- ポーリング間隔の設定がない（デフォルト値使用）
- 監視除外設定がない（node_modules等も監視対象の可能性）
- CHOKIDARの詳細設定がない

**影響**:
- ファイル保存時の複数回リロード
- 開発体験の低下
- CPUリソースの浪費

**優先度**: 🟡 **Medium** - 機能的影響は小さいが開発効率に影響

---

### 🟡 中優先度 #6: APIサービスの重複実装

**問題**:
- `useLotsQuery` が2箇所に実装されている
  1. `frontend/src/hooks/api/useLotsQuery.ts` (params受け取り)
  2. `frontend/src/hooks/useLotsQuery.ts` (productCode受け取り)
- パラメータ名の混在: `with_stock` vs `has_stock`

**影響**:
- 保守性の低下
- APIコールの不整合リスク
- 開発者の混乱

**優先度**: 🟡 **Medium**

---

## C. 影響範囲

### フロントエンド

| 領域 | 影響ファイル | 内容 |
|------|------------|------|
| ページ | `pages/InventoryPage.tsx` | データ取得失敗の直接的影響 |
| ページ | `pages/LotAllocationPage.tsx` | 無限レンダーの発生源 |
| Hooks | `hooks/api/useLotsQuery.ts` | queryKey不安定化 |
| Hooks | `hooks/useLotsQuery.ts` | 重複実装 |
| API | `features/inventory/api.ts` | バックエンドエラーの伝播 |
| API | `features/orders/api.ts` | 同上 |
| HTTP | `lib/http.ts` | エラーハンドリング（現状は正常） |

### バックエンド

| 領域 | 影響ファイル | 内容 |
|------|------------|------|
| モデル | `models/inventory.py` | **重複フィールド定義** (Critical) |
| モデル | `models/inventory.py` | **relationship欠落** (Critical) |
| API | `api/routes/lots.py` | AttributeError発生リスク |
| リポジトリ | `repositories/allocation_repository.py` | ビューへの不正更新試行 |
| サービス | `services/allocation_service.py` | 同上 |
| マイグレーション | `alembic/versions/` | VIEW定義の未適用リスク |

### 開発環境

| 領域 | 影響ファイル | 内容 |
|------|------------|------|
| Docker | `docker-compose.yml` | 正常（ボリューム設定適切） |
| Vite | `frontend/vite.config.ts` | polling設定の最適化必要 |
| 環境変数 | `.env.example` | VITE_API_BASE設定（正常） |

---

## D. 収集してほしい証跡

### 1. ブラウザ Network タブ（在庫API）

**確認項目**:
```
Request URL: http://localhost:8000/api/lots?with_stock=true
Method: GET
Status: ???  ← 200 / 500 / 404 を確認
Response Headers:
  Content-Type: application/json
Response Body: ??? ← エラーメッセージまたは空配列を確認
Timing:
  Time to first byte: ??? ms
```

**重点確認**:
- Status 500 → バックエンドのモデル/relationship問題を示唆
- Status 200 だが空配列 → クエリ条件またはDB状態の問題
- Status 404 → ルーティング問題（可能性低い）

---

### 2. DevTools Console（無限レンダー）

**確認項目**:
```
Error: Maximum update depth exceeded
  at LotAllocationPage.tsx:??? ← 行番号を確認
  at useEffect (react-dom.production.min.js:???)
Component stack:
  at LotAllocationPage ← コンポーネント名
```

**重点確認**:
- どのuseEffectで発生しているか（行番号）
- 発生頻度（1回 / 連続）
- 発生タイミング（マウント時 / 状態更新時）

---

### 3. React Query Devtools

**確認項目**:
```
Query: ["lots", {...}]
  Status: loading / success / error
  Fetch Count: ??? ← 異常に多い場合はqueryKey不安定化
  Data Preview: [...] または null
  Error: ??? ← エラーメッセージ
```

**重点確認**:
- Fetch Count が異常に多い（10回以上） → queryKey不安定化
- Status が error → ネットワークまたはバックエンドエラー
- Data が null または空配列 → クエリ結果の問題

---

### 4. バックエンドログ（サーバーコンソール）

**確認項目**:
```bash
# Docker環境での取得方法
docker logs lot-backend --tail 100 --follow

# 期待されるログ例（エラー時）
ERROR: Exception in ASGI application
AttributeError: 'Lot' object has no attribute 'current_stock'
  File "app/api/routes/lots.py", line 76, in list_lots
    query = query.join(Lot.current_stock)
```

**重点確認**:
- `AttributeError` の有無 → relationship欠落の証拠
- `SQLAlchemyError` の有無 → モデル定義の問題
- クエリのSQL文（DEBUG時） → WHERE条件の確認

---

### 5. DB確認（PostgreSQL）

**実行コマンド**:
```bash
# Dockerコンテナ内でpsqlを起動
docker exec -it lot-db-postgres psql -U admin -d lot_management

# ビューの存在確認
\dv+ lot_current_stock

# データ件数確認
SELECT COUNT(*) FROM lot_current_stock;

# サンプルデータ確認
SELECT * FROM lot_current_stock LIMIT 5;

# lotsテーブルとのJOIN確認
SELECT l.id, l.lot_number, lcs.current_quantity
FROM lots l
LEFT JOIN lot_current_stock lcs ON l.id = lcs.lot_id
LIMIT 5;
```

**期待結果**:
- ビューが存在しない → マイグレーション未適用
- データが空 → stock_movementsにデータがない
- JOINが失敗 → キー不整合

---

## E. 改善方針案（実装しない／提案のみ）

### フロントエンド改善案

#### 1. queryKey安定化

**現状**:
```typescript
// LotAllocationPage.tsx
queryKey: ["orders", { status: "open" }]  // ⚠️ 毎回新規オブジェクト
```

**改善案**:
```typescript
// 定数として定義
const QUERY_FILTERS = {
  ORDERS_OPEN: { status: "open" } as const,
} as const;

// 使用時
queryKey: ["orders", QUERY_FILTERS.ORDERS_OPEN]

// または単純化
queryKey: ["orders", "open"]  // プリミティブ型で安定化
```

---

#### 2. useEffect依存配列の修正

**現状**:
```typescript
useEffect(() => {
  // warehouseSummariesを使用
  const newKeys = warehouseSummaries.map((w) => w.key).sort();
  // ...
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedLineId, candidateLots.length]);
```

**改善案A（依存配列を正しく設定）**:
```typescript
useEffect(() => {
  const lineChanged = lastSelectedLineIdRef.current !== (selectedLineId ?? null);

  if (warehouseSummaries.length === 0) {
    if (lineChanged) {
      setWarehouseAllocations({});
      lastSelectedLineIdRef.current = selectedLineId ?? null;
    }
    return;
  }

  // ...既存ロジック
}, [selectedLineId, warehouseSummaries]);  // 正しい依存配列
```

**改善案B（useRefで安定化）**:
```typescript
const warehouseSummariesRef = useRef(warehouseSummaries);

useEffect(() => {
  warehouseSummariesRef.current = warehouseSummaries;
}, [warehouseSummaries]);

useEffect(() => {
  const summaries = warehouseSummariesRef.current;
  // ...ロジック
}, [selectedLineId]);  // warehouseSummariesは除外、Refで参照
```

---

#### 3. useLotsQueryの統一

**改善案**:
```typescript
// 統一版: hooks/api/useLotsQuery.ts
export interface LotsQueryParams {
  product_code?: string;
  warehouse_code?: string;
  with_stock?: boolean;
  skip?: number;
  limit?: number;
}

export const useLotsQuery = (params?: LotsQueryParams) => {
  // paramsをJSON.stringifyでシリアライズ（順序保証）
  const stableParams = useMemo(
    () => (params ? JSON.stringify(params, Object.keys(params).sort()) : null),
    [params]
  );

  return useQuery({
    queryKey: ["lots", stableParams],
    queryFn: () => getLots(params),
    enabled: !!params?.product_code || params?.with_stock !== undefined,
    staleTime: 30_000,
  });
};
```

---

#### 4. URL→state取り込みフローの設計

**現状リスク**:
- URLに副作用パラメータが露出
- ブックマーク/共有時の意図しない操作

**改善案（セッションストレージ活用）**:
```typescript
// 初回マウント時
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const prefillData = {
    product_code: params.get('product_code'),
    warehouse_code: params.get('warehouse_code'),
    quantity: params.get('quantity'),
  };

  // セッションストレージに保存
  if (Object.values(prefillData).some(v => v !== null)) {
    sessionStorage.setItem('lot_prefill', JSON.stringify(prefillData));

    // URLクリーン化（replace で履歴を残さない）
    navigate(location.pathname, { replace: true });
  }

  // セッションストレージから読み込み
  const stored = sessionStorage.getItem('lot_prefill');
  if (stored) {
    const data = JSON.parse(stored);
    setFormData(data);
    sessionStorage.removeItem('lot_prefill');  // 一度だけ適用
  }
}, []);
```

**トレードオフ**:
- ✅ URL露出リスク解消
- ✅ ブックマーク安全性向上
- ❌ 直リンク再現性の低下（セッション限定）

---

### バックエンド改善案

#### 1. LotCurrentStockモデルの修正

**ファイル**: `backend/app/models/inventory.py`

**修正案（擬似diff）**:
```diff
class LotCurrentStock(Base):
    """Current stock aggregated per lot (VIEW)."""
    __tablename__ = "lot_current_stock"
    __table_args__ = {"info": {"is_view": True}}

    lot_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    warehouse_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    current_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    last_updated: Mapped[datetime | None] = mapped_column(DateTime)
-
-   current_quantity: Mapped[float] = mapped_column(Float, nullable=False)
-   last_updated: Mapped[datetime | None] = mapped_column(DateTime)
```

**重要**: 117-118行の重複定義を削除

---

#### 2. Lot.current_stock relationshipの追加

**修正案（擬似diff）**:
```diff
class Lot(Base):
    # ...既存フィールド

    warehouse: Mapped[Warehouse | None] = relationship("Warehouse", back_populates="lots")
    product: Mapped[Product | None] = relationship("Product", back_populates="lots")
    supplier: Mapped[Supplier | None] = relationship("Supplier", back_populates="lots")
    stock_movements: Mapped[list["StockMovement"]] = relationship(
        "StockMovement",
        back_populates="lot",
        cascade="all, delete-orphan",
    )
    allocations: Mapped[list["Allocation"]] = relationship(
        "Allocation",
        back_populates="lot",
        cascade="all, delete-orphan",
    )
+   current_stock: Mapped["LotCurrentStock | None"] = relationship(
+       "LotCurrentStock",
+       foreign_keys="[LotCurrentStock.lot_id]",
+       primaryjoin="Lot.id == LotCurrentStock.lot_id",
+       uselist=False,
+       viewonly=True,  # VIEWなので読み取り専用
+   )
```

**注意**:
- `viewonly=True` を必ず指定（VIEWは更新不可）
- 複合主キーのため `foreign_keys` と `primaryjoin` を明示

---

#### 3. allocation_repository.pyの修正

**ファイル**: `backend/app/repositories/allocation_repository.py`

**問題箇所**: 142-158行の `update_lot_current_stock()` メソッド

**修正案**:
```diff
- def update_lot_current_stock(self, lot_id: int, quantity_delta: float) -> None:
-     """ロットの現在在庫を更新（VIEWなので実際は無効）"""
-     current_stock = self.get_lot_current_stock(lot_id)
-     if current_stock:
-         current_stock.current_quantity += quantity_delta
-         current_stock.last_updated = datetime.utcnow()
```

**理由**:
- `lot_current_stock` はVIEWなので直接更新不可
- 在庫更新は `stock_movements` テーブルへのINSERTで行うべき
- このメソッドは削除するか、stock_movements追加に変更

---

#### 4. マイグレーション戦略の見直し

**現状**:
- `alembic/versions/4b2a45018747_initial_schema_base_imported_sql.py` のみ有効
- `alembic/versions_archive/744d13c795bd_migrate_lot_current_stock_to_view.py` が未適用

**確認コマンド**:
```bash
docker exec -it lot-backend alembic current
docker exec -it lot-backend alembic history
```

**改善案**:
1. `versions_archive` 配下のマイグレーションを `versions` に移動
2. `alembic upgrade head` で適用
3. または初回セットアップスクリプトでVIEW作成を含める

---

### 開発環境改善案

#### 1. Vite polling設定の最適化

**ファイル**: `frontend/vite.config.ts`

**改善案（擬似diff）**:
```diff
server: {
  host: true,
  port: 5173,
  strictPort: true,
  hmr: {
    host: "localhost",
    port: 5173,
  },
  watch: {
    usePolling: true,
+   interval: 1000,  // ポーリング間隔（ms）
+   ignored: [
+     '**/node_modules/**',
+     '**/.git/**',
+     '**/dist/**',
+     '**/.vite/**',
+   ],
  },
  proxy: {
    "/api": {
      target,
      changeOrigin: true,
    },
  },
},
```

**効果**:
- ポーリング間隔を1秒に調整（デフォルト100msより緩和）
- node_modules等の監視除外でCPU負荷軽減
- 過剰リロードの抑制

---

#### 2. Docker Composeの最適化（参考）

**現状は適切**だが、さらなる最適化案:

```yaml
# docker-compose.yml
frontend:
  volumes:
    - ./frontend:/usr/src/app
    - frontend_node_modules:/usr/src/app/node_modules
    # 以下を追加で除外すると監視負荷軽減
    - /usr/src/app/.vite
    - /usr/src/app/dist
```

---

## F. リスクとトレードオフ

### 1. URLクリーン化のトレードオフ

| 項目 | メリット | デメリット |
|------|---------|----------|
| URLパラメータ保持 | 直リンク再現性高い | 副作用的操作のリスク |
| セッションストレージ | セキュリティ向上 | ブックマーク無効化 |
| ワンタイムトークン | 両立可能 | 実装コスト大 |

**推奨**:
- 参照系（検索フィルタ等）→ URLパラメータ OK
- 副作用系（作成/更新）→ セッションストレージまたはPOSTボディ

---

### 2. queryKey最適化のトレードオフ

| 手法 | メリット | デメリット |
|------|---------|----------|
| JSON.stringify | 正確なキャッシュ | パフォーマンスコスト小 |
| 定数化 | 高速 | 柔軟性低下 |
| useMemo | バランス良好 | 記述量増加 |

**推奨**: useMemo + 定数化の組み合わせ

---

### 3. ビュー vs マテリアライズドビュー

**lot_current_stock の設計選択肢**:

| 種類 | メリット | デメリット |
|------|---------|----------|
| VIEW | 常に最新 | クエリ毎に集計 |
| Materialized VIEW | 高速 | リフレッシュ必要 |
| テーブル（現状の一部） | 柔軟性高い | 整合性維持が複雑 |

**現状**: VIEWとして定義されているが、マイグレーション未適用でテーブル化している可能性

**推奨**:
- トランザクション頻度が低い → VIEW
- 参照頻度が高い → Materialized VIEW + トリガーでリフレッシュ

---

## G. 実行可能な検証手順（明日API直叩き時の観点表）

### 検証1: ロット一覧API（with_stock=true）

**リクエスト**:
```bash
curl -X GET "http://localhost:8000/api/lots?with_stock=true&limit=10" \
  -H "Accept: application/json"
```

**期待結果**:
- Status: 200 OK
- Body: `[{"id": 1, "lot_number": "...", "current_quantity": 100.0, ...}, ...]`

**異常パターンと切り分け**:
| Status | Body | 原因仮説 | 次のアクション |
|--------|------|---------|--------------|
| 500 | `{"detail": "...AttributeError..."}` | Lot.current_stock欠落 | モデル修正 |
| 500 | `{"detail": "...SQLAlchemyError..."}` | モデル定義の重複 | 重複削除 |
| 200 | `[]` (空配列) | データなしまたはクエリ条件 | with_stock=false で再試行 |
| 404 | - | ルーティング問題 | backend/app/main.py確認 |

---

### 検証2: ロット一覧API（with_stock=false）

**リクエスト**:
```bash
curl -X GET "http://localhost:8000/api/lots?with_stock=false&limit=10" \
  -H "Accept: application/json"
```

**期待結果**:
- Status: 200 OK
- Body: ロット全件（在庫0も含む）

**判定**:
- 成功 → `with_stock=true` のJOIN処理に問題あり
- 失敗 → 基本的なLotモデルまたはDB接続に問題

---

### 検証3: DB直接クエリ（ビュー存在確認）

**コマンド**:
```bash
docker exec -it lot-db-postgres psql -U admin -d lot_management -c "\dv lot_current_stock"
```

**期待結果**:
```
                 List of relations
 Schema |        Name        | Type |  Owner
--------+--------------------+------+----------
 public | lot_current_stock  | view | admin
```

**異常時**:
```
Did not find any relation named "lot_current_stock".
```
→ マイグレーション未適用、CREATE VIEW を手動実行して確認

---

### 検証4: ビューのデータ確認

**コマンド**:
```bash
docker exec -it lot-db-postgres psql -U admin -d lot_management -c "SELECT * FROM lot_current_stock LIMIT 5;"
```

**判定**:
- データあり → バックエンドのクエリ処理に問題
- データなし → stock_movementsにデータがない、またはVIEWのロジック問題

---

### 検証5: Frontend Network監視

**手順**:
1. Chrome DevTools → Network タブ
2. 在庫ページにアクセス
3. `/api/lots` へのリクエストを確認

**確認項目**:
- Request URL が正しいか（`http://localhost:8000/api/lots?with_stock=true`）
- Request Method が GET か
- Response Status が 200 / 500 / その他
- Response Body の内容（エラーメッセージまたはデータ）

---

### 検証6: React Query Devtools監視

**手順**:
1. ページ下部の React Query Devtoolsアイコンをクリック
2. `["lots", ...]` クエリを選択
3. Fetch Count / Status / Data を確認

**判定基準**:
- Fetch Count > 10 → queryKey不安定化、useEffect依存問題
- Status: error → バックエンドエラーまたはネットワーク問題
- Status: success だが Data: [] → クエリ条件またはDB状態

---

### 検証7: バックエンドログ確認

**コマンド**:
```bash
docker logs lot-backend --tail 50 --follow
```

**監視しながら在庫ページにアクセス**

**確認項目**:
- `AttributeError: 'Lot' object has no attribute 'current_stock'` の有無
- SQLクエリログ（DEBUG時）
- スタックトレース

---

## H. アーキテクチャ図

### データフロー図（在庫取得）

```
[Browser]
   |
   | 1. GET /
   v
[Vite Dev Server]
   |
   | 2. Serve index.html + React App
   v
[InventoryPage.tsx]
   |
   | 3. useLotsQuery({ with_stock: true })
   v
[React Query]
   |
   | 4. GET /api/lots?with_stock=true
   v
[fetchApi (lib/http.ts)]
   |
   | 5. toApiUrl() → http://localhost:8000/api/lots
   | 6. axios.get()
   v
[Backend: FastAPI]
   |
   | 7. Router: /api/lots
   v
[routes/lots.py: list_lots()]
   |
   | 8. db.query(Lot).join(Lot.current_stock)  ← ⚠️ AttributeError?
   v
[SQLAlchemy ORM]
   |
   | 9. SELECT ... FROM lots LEFT JOIN lot_current_stock ...
   v
[PostgreSQL]
   |
   | 10. VIEW lot_current_stock ← ⚠️ 存在する？
   v
[Result]
   |
   | 11. Rows or Error
   v
[Backend Response]
   |
   | 12. JSON or 500 Error
   v
[Frontend: React Query]
   |
   | 13. Update state, trigger re-render
   v
[UI Update]
```

**問題発生ポイント**:
- ❌ Step 8: `Lot.current_stock` が存在しない → AttributeError
- ❌ Step 9: `LotCurrentStock` モデルの重複定義 → SQLAlchemyError
- ❌ Step 10: VIEW未作成 → Relation does not exist

---

### 無限レンダーループ図

```
[LotAllocationPage Mount]
   |
   | selectedLineId: null
   v
[useEffect #4: 初回自動選択]
   |
   | setSearchParams({ selected: "1", line: "10" })
   v
[URL Update] → selectedLineId: null → 10
   |
   v
[Re-render]
   |
   | lotsQuery.data 更新
   v
[candidateLots 更新]
   |
   | candidateLots.length 変化
   v
[useEffect #1: 倉庫配分初期化]  ← ⚠️ 依存配列に candidateLots.length
   |
   | warehouseSummaries 計算（useMemo）
   | setWarehouseAllocations({ ... })
   v
[State Update]
   |
   v
[Re-render]
   |
   | warehouseSummaries 再計算
   v
[useMemo実行]
   |
   | candidateLots が変化していないが、
   | warehouseSummaries の参照が変わる可能性
   v
[useEffect #1 再実行]  ← ⚠️ warehouseSummaries が依存配列にない
   |
   | setWarehouseAllocations() 再実行
   v
[State Update] → [Re-render] → ループ！
```

**解決策**:
- useEffect #1 の依存配列に `warehouseSummaries` を追加
- または `warehouseSummaries` を `useMemo` で安定化
- または `useRef` でガード

---

## I. 次のステップ（推奨作業順序）

### Phase 1: 緊急対応（Critical問題の修正）

1. **LotCurrentStockモデルの重複削除**
   - ファイル: `backend/app/models/inventory.py`
   - 作業: 117-118行削除
   - 影響: バックエンド全体
   - 所要時間: 5分

2. **Lot.current_stock relationshipの追加**
   - ファイル: `backend/app/models/inventory.py`
   - 作業: relationship定義追加
   - 影響: バックエンド全体
   - 所要時間: 10分

3. **マイグレーション確認とVIEW作成**
   - コマンド: `alembic current`, `alembic upgrade head`
   - または手動で `CREATE VIEW lot_current_stock ...`
   - 影響: DB
   - 所要時間: 15分

4. **動作確認**
   - API直叩き: `curl http://localhost:8000/api/lots?with_stock=true`
   - ブラウザ確認: 在庫ページアクセス
   - 所要時間: 10分

---

### Phase 2: 高優先度対応（無限レンダー修正）

5. **useEffect依存配列の修正**
   - ファイル: `frontend/src/pages/LotAllocationPage.tsx`
   - 作業: 依存配列に `warehouseSummaries` 追加
   - 影響: ロット引当ページ
   - 所要時間: 10分

6. **queryKeyの安定化**
   - ファイル: `LotAllocationPage.tsx`, `useLotsQuery.ts`
   - 作業: オブジェクトリテラルを定数化
   - 影響: クエリキャッシュ
   - 所要時間: 15分

7. **動作確認**
   - Console監視: Maximum update depth エラーの消滅確認
   - React Query Devtools: Fetch Count の正常化確認
   - 所要時間: 10分

---

### Phase 3: 中優先度対応（開発体験改善）

8. **Vite polling設定の最適化**
   - ファイル: `frontend/vite.config.ts`
   - 作業: interval, ignored 設定追加
   - 影響: 開発環境のみ
   - 所要時間: 5分

9. **useLotsQueryの統一**
   - ファイル: `hooks/api/useLotsQuery.ts`, `hooks/useLotsQuery.ts`
   - 作業: 重複実装の統合
   - 影響: フロントエンド全体（影響範囲大）
   - 所要時間: 30分

10. **allocation_repository.pyの修正**
    - ファイル: `backend/app/repositories/allocation_repository.py`
    - 作業: `update_lot_current_stock()` 削除または改修
    - 影響: 引当処理
    - 所要時間: 20分

---

### Phase 4: テストと文書化

11. **統合テスト実施**
    - 在庫登録 → 受注引当 → 在庫確認のフロー
    - 所要時間: 30分

12. **ドキュメント更新**
    - README更新（トラブルシューティング追加）
    - アーキテクチャドキュメント更新
    - 所要時間: 20分

---

## J. まとめ

### 最重要の発見

1. **LotCurrentStockモデルの重複フィールド定義** → 在庫取得失敗の直接原因
2. **Lot.current_stock relationshipの欠落** → AttributeError発生
3. **useEffectの依存配列不備** → 無限レンダーの直接原因

### 推奨される最初の3ステップ

1. `backend/app/models/inventory.py` 117-118行削除
2. `Lot` モデルに `current_stock` relationship追加
3. DB上で `lot_current_stock` VIEW作成確認

この3つで**在庫データ取得失敗は解決する見込みが高い**。

---

**調査完了**
