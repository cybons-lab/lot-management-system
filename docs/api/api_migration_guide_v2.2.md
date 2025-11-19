# API Migration Guide v2.2

**対象**: ロット管理システム フロントエンド開発者
**移行期限**: 2026-02-15（3ヶ月）
**最終更新**: 2025-11-15

このガイドは、旧 API から v2.2 新 API への移行手順を説明します。

---

## 📋 目次

1. [移行概要](#移行概要)
2. [Forecasts API 移行](#forecasts-api-移行)
3. [Allocations API 移行](#allocations-api-移行)
4. [Masters API 移行](#masters-api-移行)
5. [移行チェックリスト](#移行チェックリスト)

---

## 移行概要

### 変更の背景

v2.2 では、以下の目的でAPI構造をリファクタリングしました：

1. **フォーキャストのヘッダ・明細分離** - スケーラビリティと保守性の向上
2. **引当APIの責務分離** - FEFO / 手動引当 / 候補ロットの明確化
3. **マスタAPIのフラット化** - URL構造の簡素化
4. **product_id基準への統一** - パフォーマンス向上

### 移行期間

- **開始日**: 2025-11-15
- **移行期限**: 2026-02-15（3ヶ月）
- **廃止予定日**: 2026-02-16（旧エンドポイント削除）

### 互換性レベル

| レベル | 説明 | 対応 |
|--------|------|------|
| ✅ 互換性あり | 旧エンドポイント維持 | 移行推奨だが強制ではない |
| ⚠️ Deprecated | 旧エンドポイント非推奨 | 移行期限までに移行必須 |
| ❌ 破壊的 | 旧エンドポイント廃止 | 即座に移行必須 |

---

## Forecasts API 移行

### 変更内容

**旧構造**: 単一テーブル `forecast`
**新構造**: ヘッダ・明細分離 `forecast_headers` + `forecast_lines`

### エンドポイント対応表

| 旧エンドポイント | HTTPメソッド | 新エンドポイント | 互換性 |
|----------------|-------------|----------------|-------|
| `GET /api/forecast` | GET | `GET /api/forecasts/headers` | ❌ 破壊的 |
| `GET /api/forecast/{id}` | GET | `GET /api/forecasts/headers/{id}` | ❌ 破壊的 |
| `POST /api/forecast` | POST | `POST /api/forecasts/headers` | ❌ 破壊的 |
| `PUT /api/forecast/{id}` | PUT | `PUT /api/forecasts/headers/{id}` | ❌ 破壊的 |
| `DELETE /api/forecast/{id}` | DELETE | `DELETE /api/forecasts/headers/{id}` | ❌ 破壊的 |
| `POST /api/forecast/bulk` | POST | `POST /api/forecasts/headers/bulk-import` | ❌ 破壊的 |
| （新規） | GET | `GET /api/forecasts/headers/{id}/lines` | - |
| （新規） | POST | `POST /api/forecasts/headers/{id}/lines` | - |
| （新規） | PUT | `PUT /api/forecasts/lines/{id}` | - |
| （新規） | DELETE | `DELETE /api/forecasts/lines/{id}` | - |

### 移行手順

#### 1. フォーキャスト一覧取得の移行

**旧API**:
```typescript
// ❌ 旧実装（単一テーブル）
const response = await api.get('/api/forecast', {
  params: { customer_id: 123 }
});

// レスポンス例
[
  {
    id: 1,
    forecast_number: "FC-2024-001",
    customer_id: 123,
    product_id: 456,
    forecast_date: "2024-12-01",
    quantity: 100,
    // ... 他のフィールド
  }
]
```

**新API**:
```typescript
// ✅ 新実装（ヘッダ・明細分離）
const response = await api.get('/api/forecasts/headers', {
  params: { customer_id: 123 }
});

// レスポンス例
[
  {
    id: 1,
    forecast_number: "FC-2024-001",
    customer_id: 123,
    delivery_place_id: 789,
    status: "active",
    created_at: "2024-11-15T10:00:00Z",
    updated_at: "2024-11-15T10:00:00Z"
    // 明細は含まれない（ヘッダのみ）
  }
]
```

#### 2. フォーキャスト詳細取得の移行

**旧API**:
```typescript
// ❌ 旧実装
const forecast = await api.get('/api/forecast/1');
```

**新API**:
```typescript
// ✅ 新実装（明細を含む）
const header = await api.get('/api/forecasts/headers/1');

// レスポンス例
{
  id: 1,
  forecast_number: "FC-2024-001",
  customer_id: 123,
  delivery_place_id: 789,
  status: "active",
  lines: [
    {
      id: 101,
      forecast_header_id: 1,
      product_id: 456,
      forecast_date: "2024-12-01",
      quantity: 100
    },
    {
      id: 102,
      forecast_header_id: 1,
      product_id: 457,
      forecast_date: "2024-12-02",
      quantity: 200
    }
  ]
}
```

#### 3. フォーキャスト作成の移行

**旧API**:
```typescript
// ❌ 旧実装（フラットな構造）
await api.post('/api/forecast', {
  forecast_number: "FC-2024-001",
  customer_id: 123,
  product_id: 456,
  forecast_date: "2024-12-01",
  quantity: 100
});
```

**新API**:
```typescript
// ✅ 新実装（ヘッダ・明細構造）
await api.post('/api/forecasts/headers', {
  forecast_number: "FC-2024-001",
  customer_id: 123,
  delivery_place_id: 789,
  status: "active",
  lines: [
    {
      product_id: 456,
      forecast_date: "2024-12-01",
      quantity: 100
    },
    {
      product_id: 457,
      forecast_date: "2024-12-02",
      quantity: 200
    }
  ]
});
```

#### 4. フォーキャスト明細の個別操作（新機能）

**新API のみ**:
```typescript
// ✅ 明細一覧取得
const lines = await api.get('/api/forecasts/headers/1/lines');

// ✅ 明細追加
await api.post('/api/forecasts/headers/1/lines', {
  product_id: 458,
  forecast_date: "2024-12-03",
  quantity: 300
});

// ✅ 明細更新
await api.put('/api/forecasts/lines/101', {
  quantity: 150
});

// ✅ 明細削除
await api.delete('/api/forecasts/lines/101');
```

### データ移行

フロントエンドの移行と並行して、バックエンドでデータ移行を実施します：

```sql
-- 旧 forecast テーブルから新構造へ移行
-- ※ バックエンドチームが実施
```

---

## Allocations API 移行

### 変更内容

引当関連APIを以下の3つに分離し、責務を明確化しました：

1. **Allocations API** (`/allocations`) - 引当確定・取消
2. **Allocation Suggestions API** (`/allocation-suggestions`) - FEFO/手動引当のプレビュー
3. **Allocation Candidates API** (`/allocation-candidates`) - 候補ロット取得

### エンドポイント対応表

| 旧エンドポイント | HTTPメソッド | 新エンドポイント | 互換性 |
|----------------|-------------|----------------|-------|
| `POST /allocations/drag-assign` | POST | `POST /allocation-suggestions/manual` | ⚠️ Deprecated |
| `POST /allocations/preview` | POST | `POST /allocation-suggestions/fefo` | ⚠️ Deprecated |
| `POST /allocations/orders/{id}/allocate` | POST | `POST /allocations/commit` | ⚠️ Deprecated |
| `GET /allocations/candidate-lots` | GET | `GET /allocation-candidates` | ⚠️ Deprecated |
| `DELETE /allocations/{id}` | DELETE | `DELETE /allocations/{id}` | ✅ 互換性あり |

### 移行手順

#### 1. 手動引当（Drag & Drop）の移行

**旧API**:
```typescript
// ❌ 旧実装
await api.post('/api/allocations/drag-assign', {
  order_line_id: 123,
  lot_id: 456,
  allocate_qty: 10.5
});
```

**新API**:
```typescript
// ✅ 新実装
await api.post('/api/allocation-suggestions/manual', {
  order_line_id: 123,
  lot_id: 456,
  allocate_qty: 10.5
});
```

#### 2. FEFO引当プレビューの移行

**旧API**:
```typescript
// ❌ 旧実装
const preview = await api.post('/api/allocations/preview', {
  order_id: 789
});
```

**新API**:
```typescript
// ✅ 新実装
const preview = await api.post('/api/allocation-suggestions/fefo', {
  order_id: 789
});
```

#### 3. FEFO引当確定の移行

**旧API**:
```typescript
// ❌ 旧実装
await api.post('/api/allocations/orders/789/allocate');
```

**新API**:
```typescript
// ✅ 新実装
await api.post('/api/allocations/commit', {
  order_id: 789
});
```

#### 4. 候補ロット取得の移行

**旧API**:
```typescript
// ❌ 旧実装
const candidates = await api.get('/api/allocations/candidate-lots', {
  params: {
    product_id: 456,
    warehouse_id: 1
  }
});
```

**新API**:
```typescript
// ✅ 新実装
const candidates = await api.get('/api/allocation-candidates', {
  params: {
    product_id: 456,
    warehouse_id: 1
  }
});
```

---

## Masters API 移行

### 変更内容

マスタAPIのURLをフラット化し、`/masters/*` プレフィックスを廃止しました。

### エンドポイント対応表

| 旧エンドポイント | 新エンドポイント | 互換性 |
|----------------|----------------|-------|
| `GET /api/masters/warehouses` | `GET /api/warehouses` | ✅ 互換性あり |
| `GET /api/masters/suppliers` | `GET /api/suppliers` | ✅ 互換性あり |
| `GET /api/masters/customers` | `GET /api/customers` | ✅ 互換性あり |
| `GET /api/masters/products` | `GET /api/products` | ✅ 互換性あり |

### 移行手順

#### マスタAPI呼び出しの移行

**旧API**:
```typescript
// ❌ 旧実装
const warehouses = await api.get('/api/masters/warehouses');
const suppliers = await api.get('/api/masters/suppliers');
const customers = await api.get('/api/masters/customers');
const products = await api.get('/api/masters/products');
```

**新API**:
```typescript
// ✅ 新実装（推奨）
const warehouses = await api.get('/api/warehouses');
const suppliers = await api.get('/api/suppliers');
const customers = await api.get('/api/customers');
const products = await api.get('/api/products');
```

**Note**: 旧エンドポイント（`/api/masters/*`）も互換性のため維持されますが、新エンドポイントへの移行を推奨します。

---

## 移行チェックリスト

### フロントエンド開発者向け

#### Phase 1: 調査（Week 1）

- [ ] 旧 Forecast API の使用箇所を特定
- [ ] 旧 Allocation API の使用箇所を特定
- [ ] 旧 Masters API の使用箇所を特定
- [ ] API クライアント関数の一覧作成

#### Phase 2: Forecast API 移行（Week 2-3）

- [ ] フォーキャスト一覧画面のAPI呼び出しを新APIに移行
- [ ] フォーキャスト詳細画面のAPI呼び出しを新APIに移行
- [ ] フォーキャスト作成フォームを新構造に対応
- [ ] フォーキャストCSVインポート機能を新APIに対応
- [ ] 単体テスト更新
- [ ] E2Eテスト更新

#### Phase 3: Allocation API 移行（Week 4-5）

- [ ] 手動引当（Drag & Drop）機能を新APIに移行
- [ ] FEFO引当プレビュー機能を新APIに移行
- [ ] 引当確定処理を新APIに移行
- [ ] 候補ロット取得を新APIに移行
- [ ] 単体テスト更新
- [ ] E2Eテスト更新

#### Phase 4: Masters API 移行（Week 6）

- [ ] 倉庫マスタAPI呼び出しを新URLに更新
- [ ] 仕入先マスタAPI呼び出しを新URLに更新
- [ ] 得意先マスタAPI呼び出しを新URLに更新
- [ ] 製品マスタAPI呼び出しを新URLに更新
- [ ] 単体テスト更新

#### Phase 5: 検証とリリース（Week 7-8）

- [ ] 統合テスト実施
- [ ] パフォーマンステスト実施
- [ ] ステージング環境での動作確認
- [ ] 本番リリース

### バックエンド開発者向け

- [ ] データ移行スクリプト作成（forecast → forecast_headers/lines）
- [ ] 移行検証スクリプト作成
- [ ] ロールバックスクリプト作成
- [ ] Deprecated API 利用状況のモニタリング設定
- [ ] 移行期限後の旧エンドポイント削除計画策定

---

## トラブルシューティング

### Q1. 旧APIと新APIのレスポンス形式が異なるため、既存のフロントエンドが動作しません

**A**: フロントエンド側でアダプターパターンを使用し、新APIレスポンスを旧形式に変換する過渡期対応を検討してください。

```typescript
// アダプター例
function adaptNewForecastToOld(newHeader) {
  return newHeader.lines.map(line => ({
    ...line,
    forecast_number: newHeader.forecast_number,
    customer_id: newHeader.customer_id,
  }));
}
```

### Q2. データ移行中に不整合が発生した場合の対処法は？

**A**: バックエンドチームが提供するロールバックスクリプトを実行してください。詳細はバックエンドチームに問い合わせてください。

### Q3. 移行期限までに移行が完了しない場合は？

**A**: Product Owner に早急に相談してください。期限延長または段階的移行計画の再調整が必要です。

---

## 関連ドキュメント

- [API Reference v2.2](./api_reference.md)
- [API Refactor Plan v2.2](./architecture/api_refactor_plan_v2.2.md)
- [OpenAPI Specification](http://localhost:8000/api/docs)

---

## サポート

移行に関する質問や問題が発生した場合は、以下に連絡してください：

- **Backend Lead**: backend-team@example.com
- **Frontend Lead**: frontend-team@example.com
- **Slack**: #lot-system-migration

**Last Updated**: 2025-11-15
