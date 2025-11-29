# 残タスク詳細レポート - コードクリーンアップ

**作成日:** 2025-11-29
**対象:** lot-management-system
**優先度:** CRITICAL → HIGH → MEDIUM

本レポートは、コードベース品質レビューで検出された問題のうち、今回のPRで対応できなかった項目をまとめたものです。

---

## 📋 完了済みタスク（本PR）

✅ ErrorBoundary 重複削除
✅ useLotsQuery 重複削除
✅ ListResponse を Page[T] に統合（5箇所サンプル実装）
✅ 型チェック・フォーマッター実行

---

## 🔴 CRITICAL: エラー処理の問題（最優先対応）

### 1. `.first()` の None チェック漏れ（30+箇所）

**影響度:** 🔥🔥🔥 システムクラッシュの原因
**見積もり:** 2-3時間

#### 対象ファイルと箇所

**backend/app/services/allocations/fefo.py**
- Line 84, 92: `db.query(...).first()` の結果を None チェックせずに使用

**backend/app/services/inventory/lot_service.py**
- Line 48: `product = db.query(Product).filter(...).first()`
- Line 62: 同様のパターン

**backend/app/services/inventory/adjustment_service.py**
- Line 88, 121: lot/product クエリの None チェック漏れ

**backend/app/services/inventory/inbound_service.py**
- Line 90, 240, 276, 345: 入荷処理における None チェック漏れ

**backend/app/services/allocations/core.py**
- Line 36: order_line クエリの None チェック漏れ

**その他対象ファイル:**
- `services/masters/*.py` - マスタデータサービス全般
- `services/orders/*.py` - オーダー処理サービス
- `repositories/*.py` - リポジトリ層のクエリ

#### 修正パターン

```python
# ❌ Before
product = db.query(Product).filter(Product.maker_part_code == product_code).first()
product_code = product.maker_part_code  # クラッシュリスク

# ✅ After
product = db.query(Product).filter(Product.maker_part_code == product_code).first()
if not product:
    raise ValueError(f"Product not found: {product_code}")
product_code = product.maker_part_code
```

---

### 2. 配列アクセス前の長さチェック漏れ（Frontend、15+箇所）

**影響度:** 🔥🔥🔥 ユーザー体験の破壊
**見積もり:** 1-2時間

#### 対象ファイルと箇所

**frontend/src/shared/libs/csv.ts**
- Line 14: `Object.keys(data[0])` - 空配列の可能性

**frontend/src/shared/utils/csv-parser.ts**
- Line 38: `result.data[0]` - 空配列の可能性

**frontend/src/features/forecasts/hooks/useSAPRegistration.ts**
- Line 24: `response.results[0]` - results が空配列の可能性

**frontend/src/features/forecasts/components/ForecastDetailCard/hooks/use-forecast-calculations.ts**
- Line 88, 93: 配列アクセス前のチェック漏れ

**その他対象:**
- CSV エクスポート関連コンポーネント全般
- 予測計算関連フック
- 割当表示コンポーネント

#### 修正パターン

```typescript
// ❌ Before
if (!data || data.length === 0) return;
const headers = Object.keys(data[0]);  // data[0] が undefined の可能性

// ✅ After
if (!data || data.length === 0 || !data[0]) {
  console.warn("No data to export");
  return;
}
const headers = Object.keys(data[0]);
```

---

### 3. 広すぎる例外ハンドラ（エラーの隠蔽）

**影響度:** 🔥🔥🔥 デバッグ不可能
**見積もり:** 1時間

#### 対象ファイルと箇所

**backend/app/core/errors.py**
- Line 228: `except Exception: pass` - リクエストボディ読み込みエラーの隠蔽

**backend/app/middleware/metrics.py**
- Line 94: `except Exception: return 0.0` - メトリクス計算エラーのマスク

**backend/app/api/deps.py**
- Line 25: `except Exception:` - 汎用的すぎる例外ハンドラ

**backend/app/services/allocations/actions.py**
- Line 146: `except Exception:` - 詳細が不明

**backend/scripts/run_api_smoke.py**
- Line 59: `except Exception:` - スクリプトエラーの隠蔽

#### 修正パターン

```python
# ❌ Before
except Exception:
    pass  # エラー詳細が完全に失われる

# ✅ After
except (json.JSONDecodeError, UnicodeDecodeError) as e:
    logger.warning(f"Failed to decode body: {e}")
    request_body = "<invalid encoding>"
```

---

## 🟠 HIGH PRIORITY: エラー処理と重複コード

### 4. トランザクション境界の欠如

**影響度:** 🔥🔥 データ整合性の問題
**見積もり:** 30分

**ファイル:** `backend/app/api/routes/orders/orders_router.py`

**箇所:**
- Line 100-125: 手動割当ループのトランザクション未保護
- Line 140-186: ステータス更新ループのトランザクション未保護

#### 修正例

```python
# ❌ Before
for item in payload.allocations:
    allocation = allocate_manually(db, order_line_id, item.lot_id, item.quantity)
    # ループ途中で失敗すると部分コミット

# ✅ After
created_ids = []
try:
    for item in payload.allocations:
        if item.quantity <= 0:
            continue
        allocation = allocate_manually(db, order_line_id, item.lot_id, item.quantity)
        created_ids.append(allocation.id)
    db.commit()  # すべて成功してからコミット
except Exception as e:
    db.rollback()
    logger.error(f"Allocation save failed: {e}")
    raise HTTPException(status_code=500, detail=str(e))
```

---

### 5. Frontend: 構造化されたエラー処理の欠如

**影響度:** 🔥🔥 ユーザー体験の劣化
**見積もり:** 2時間

#### 問題

複数の features で `alert()` による原始的なエラー表示が使用されている。

**対象:**
- `features/customers/components/*.tsx`
- `features/products/components/*.tsx`
- `features/orders/pages/*.tsx`
- その他、API呼び出しを行う大部分のコンポーネント

#### 修正方針

1. エラー表示用の共有コンポーネント作成
   - `shared/components/error/ErrorToast.tsx`
   - `shared/components/error/ErrorDialog.tsx`

2. エラーハンドラフックの作成
   - `shared/hooks/useErrorHandler.ts`
   - ネットワークエラー、APIエラー、バリデーションエラーを区別

3. TanStack Query の `onError` ハンドラ統一

---

### 6. ProductService の重複定義（CRITICAL）

**影響度:** 🔥🔥 コード重複、保守性の問題
**見積もり:** 15分

**ファイル:**
- `backend/app/services/masters/product_service.py`
- `backend/app/services/masters/products_service.py`

**現状:**
- 両方のファイルが同一の `ProductService` クラスを定義
- Router は `product_service.py` をインポート
- Tests は `products_service.py` をインポート
- `services/__init__.py` は `products_service.py` をエクスポート

**対応:**
1. `products_service.py` に統一（既存のエクスポートに合わせる）
2. `product_service.py` を削除
3. Router のインポートを `products_service` に変更

---

### 7. HTTPクライアント統合（CRITICAL）

**影響度:** 🔥🔥 コード重複、設定の不一致
**見積もり:** 1-2時間

**ファイル:**
- `frontend/src/services/http.ts` (legacy, axios)
- `frontend/src/shared/libs/http.ts` (modern, axios)

**違い:**
- services/http: `VITE_API_BASE_URL`, timeout 30000, error-logger 統合
- shared/libs/http: `VITE_API_BASE`, timeout 15000, URL resolution logic, auth token injection

**対応:**
1. 両方の機能を `shared/libs/http.ts` に統合
2. services/http.ts を削除
3. services/api/* のインポートを更新（5ファイル）

---

## 🟡 MEDIUM PRIORITY: コード品質改善

### 8. 残りの ListResponse 統合（9箇所）

**影響度:** 🟡 コード重複
**見積もり:** 30分

**本PRで対応済み（5箇所）:**
- ✅ masters_schema.py: CustomerListResponse
- ✅ masters_schema.py: ProductListResponse
- ✅ masters_schema.py: SupplierListResponse
- ✅ masters_schema.py: DeliveryPlaceListResponse
- ✅ allocations_schema.py: AllocationListResponse

**残り（9箇所）:**
1. `allocations_schema.py`: CandidateLotsResponse (Line 143-148)
2. `allocation_suggestions_schema.py`: AllocationSuggestionListResponse (Line 120-125)
3. `forecast_schema.py`: ForecastListResponse (Line 95-100)
4. `operation_logs_schema.py`: OperationLogListResponse (Line 25-30)
5. `operation_logs_schema.py`: MasterChangeLogListResponse (Line 49-54)
6. `inbound_schema.py`: InboundPlanListResponse (Line 117-122)
7. `batch_jobs_schema.py`: BatchJobListResponse (Line 48-52)
8. `business_rules_schema.py`: BusinessRuleListResponse (Line 43-48)
9. `admin_schema.py`: AdminPresetListResponse (Line 30-34)

**対応例:**
```python
# Before
class ForecastListResponse(BaseSchema):
    items: list[ForecastHeaderResponse]
    total: int = 0

# After
ForecastListResponse = ListResponse[ForecastHeaderResponse]
"""Forecast list response."""
```

---

### 9. 未使用ファイルの削除

**影響度:** 🟡 コードベースのクリーンアップ
**見積もり:** 30分

**本PRで対応済み:**
- ✅ `frontend/src/shared/components/ErrorBoundary.tsx`
- ✅ `frontend/src/hooks/useLotsQuery.ts`

**残り:**

#### Backend（4ファイル）
1. `backend/app/decorators/logging.py` - どこからもインポートされていない
2. `backend/app/api/routes/orders/orders_validate_router.py` - コメントアウト済み（TODO付き）
3. `backend/app/inspect_db.py` - 開発用スクリプト（tools/ に移動推奨）
4. `backend/verify_refactor.py` + `verify_test_data_refactor.py` - 検証スクリプト

#### Frontend（5ファイル）
1. `frontend/src/shared/components/CommonUI.tsx` - 未使用コンポーネント
2. `frontend/src/hooks/use-toast.ts` - shadcn/ui版（未使用）
3. `frontend/src/hooks/ui/useToast.ts` - カスタム実装（未使用）
4. `frontend/src/factories/master-factory.ts` - エクスポートされているが未使用
5. `frontend/src/shared/libs/api.ts` - 未使用のアグリゲーター

**削除前の確認手順:**
```bash
# Grep で本当に使われていないか確認
cd frontend
grep -r "CommonUI" src/
grep -r "use-toast" src/
grep -r "master-factory" src/

# 削除
rm src/shared/components/CommonUI.tsx
# ... etc
```

---

### 10. レガシーフィールドの分離

**影響度:** 🟡 型安全性、バンドルサイズ
**見積もり:** 1-2時間

**ファイル:** `frontend/src/shared/types/aliases.ts`

**問題:**
`OrderLine` 型が30+フィールドを持ち、DDL v2.2とレガシーが混在

**レガシーフィールド（2026-02-15廃止予定）:**
- `order_no` → `order_number` (v2.2)
- `product_code` → `product_id` (v2.2)
- `quantity` → `order_quantity` (v2.2)
- `due_date` → `delivery_date` (v2.2)
- `line_no` → `id` (v2.2)
- `allocated_qty` → `allocated_quantity` (v2.2)

**対応:**
1. `shared/types/legacy/order-line-legacy.ts` を作成
2. レガシーフィールドを分離
3. 型の discriminated union を作成して移行期間をサポート

```typescript
// shared/types/legacy/order-line-legacy.ts
export type OrderLineLegacy = {
  line_no?: number;
  product_code?: string;
  quantity?: number;
  due_date?: string;
  allocated_qty?: number;
};

// shared/types/aliases.ts
export type OrderLineCurrent = {
  id: number;
  product_id: number;
  order_quantity: Decimal;
  delivery_date: Date;
  allocated_quantity: Decimal;
};

// 移行期間は両方サポート
export type OrderLine = OrderLineCurrent & OrderLineLegacy;
```

---

### 11. AllocationResponse の重複定義

**影響度:** 🟡 コード重複
**見積もり:** 15分

**ファイル:**
- `backend/app/schemas/orders/orders_schema.py` (Line 61-73)
- `backend/app/schemas/allocations/allocations_schema.py` (Line 155-163)

**対応:**
1. allocations_schema.py の定義を正とする
2. orders_schema.py では AllocationDetail を import
3. エイリアス定義: `AllocationResponse = AllocationDetail`

---

### 12. ESLint エラーの修正（18件）

**影響度:** 🟡 コード品質
**見積もり:** 2-3時間

#### 残存エラー（今回のPR範囲外）

**max-lines-per-function（6件）:**
- `InventoryTable.tsx`: Function too long (337 lines)
- `LotListPanel.tsx`: Function too long (329 lines)
- `ConfirmedLinesPage.tsx`: Function too long (187 lines)
- `SupplierProductBulkImportDialog.tsx`: Function too long (239 lines)
- `UomConversionBulkImportDialog.tsx`: Function too long (241 lines)
- `SupplierProductsPage.tsx`: Function too long (85 lines)

**complexity（3件）:**
- `LotListPanel.tsx`: Complexity 21 (max 12)
- `SupplierProductBulkImportDialog.tsx`: Complexity 22 (max 12)
- `UomConversionBulkImportDialog.tsx`: Complexity 22 (max 12)

**@typescript-eslint/no-explicit-any（6件）:**
- `OrdersListPage.tsx`: Line 107, 289, 291, 333, 335
- `http-client.ts`: Line 47

**jsx-a11y/label-has-associated-control（2件）:**
- `SupplierProductBulkImportDialog.tsx`: Line 113
- `UomConversionBulkImportDialog.tsx`: Line 109

**対応方針:**
1. 長すぎる関数は小さな関数に分割
2. 複雑度が高い関数はリファクタリング
3. `any` 型は適切な型定義に置き換え
4. アクセシビリティ問題は `htmlFor` 属性を追加

---

## 📊 タスクサマリー

| 優先度 | カテゴリ | タスク数 | 見積もり |
|--------|---------|---------|---------|
| 🔴 CRITICAL | エラー処理 | 3 | 4-6時間 |
| 🟠 HIGH | 重複コード・エラー処理 | 4 | 4-5時間 |
| 🟡 MEDIUM | コード品質 | 5 | 5-7時間 |
| **合計** | | **12タスク** | **13-18時間** |

---

## 🎯 推奨作業順序（明日以降）

### Day 1: CRITICAL対応（4-6時間）
1. ✅ `.first()` の None チェック追加（30+箇所、2-3時間）
2. ✅ 配列アクセスの長さチェック（15+箇所、1-2時間）
3. ✅ 広すぎる例外ハンドラの修正（5箇所、1時間）

### Day 2: HIGH対応（4-5時間）
4. ✅ トランザクション境界の追加（30分）
5. ✅ ProductService 重複削除（15分）
6. ✅ HTTPクライアント統合（1-2時間）
7. ✅ Frontend エラー処理の構造化（2時間）

### Day 3: MEDIUM対応（5-7時間）
8. ✅ 残りの ListResponse 統合（9箇所、30分）
9. ✅ 未使用ファイル削除（9ファイル、30分）
10. ✅ AllocationResponse 重複削除（15分）
11. ✅ レガシーフィールド分離（1-2時間）
12. ✅ ESLint エラー修正（18件、2-3時間）

---

## 📝 チェックリスト

各タスク完了時に以下を確認：

- [ ] 型チェックがパス（Backend: mypy、Frontend: tsc）
- [ ] リンターがパス（Backend: ruff、Frontend: eslint）
- [ ] フォーマッターがパス（Backend: ruff format、Frontend: prettier）
- [ ] テストがパス（Backend: pytest -k "not integration"）
- [ ] git commit 実施（適切なコミットメッセージ）

---

## 🔗 関連ドキュメント

- [コードベース品質レビュー完了レポート](./CODEBASE_QUALITY_REVIEW_20251129.md)
- [CLAUDE.md - Common Type Candidates セクション](../CLAUDE.md#common-type-candidates-共通型候補)
- [docs/architecture/common_type_candidates_backend.md](./architecture/common_type_candidates_backend.md)
- [docs/architecture/common_type_candidates_frontend.md](./architecture/common_type_candidates_frontend.md)

---

**次回レビュー:** 上記タスク完了後、再度コードベース全体をスキャンして改善効果を確認
