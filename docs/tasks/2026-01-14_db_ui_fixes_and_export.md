# DB/UI整合性修正とエクスポート機能（2026-01-14）

## 概要

直近のPR/コミットで発見されたDB周りの保存漏れ、UIの重複、DB/UIフィールドの不整合を修正し、フォーキャスト・ロット管理・受注管理のExcelエクスポート機能を実装する。

---

## 調査結果サマリー

### 1. UI重複問題
| 場所 | 問題 |
|------|------|
| ConfirmedLinesPage | SAP一括登録ボタンが上下に重複 |
| 15ページ | PageHeaderコンポーネント未使用（手動h1/h2） |

### 2. 保存/更新の問題
| 場所 | 状態 | 内容 |
|------|------|------|
| CustomerDetailPage | ✅修正済(#397) | customer_code保存問題 |
| SupplierDetailPage | ✅修正済(#397) | supplier_code保存問題 |
| WarehouseDetailPage | ✅修正済(#397) | warehouse_code保存問題 |
| ProductDetailPage | ⚠要確認 | コード変更時のリダイレクト欠落 |
| Toast通知欠落 | ⚠要修正 | warehouses, product-mappings, delivery-places |

### 3. DB vs UI の不整合
| エンティティ | UIに未表示のフィールド |
|------------|----------------------|
| Lots | `status`, `inspection_status`, `inspection_date`, `inspection_cert_number`, `origin_reference` |
| Orders | `ocr_source_filename`, `cancel_reason`, `external_product_code`, `shipping_document_text` |

### 4. エクスポート機能（未実装）
| ページ | 推奨形式 | 理由 |
|--------|---------|------|
| Forecasts | Excel | 階層的データ（グループ+フォーキャスト+関連受注） |
| Orders | Excel | 事務員向けのためExcel、フラットな明細データ |
| Inventory/Lots | Excel | 複数集約ビュー（在庫サマリー+ロット詳細） |

---

## フェーズ1: 緊急修正（UI/UX問題）

### 1.1 ConfirmedLinesPageの重複ボタン削除
- [ ] 完了

**問題**: SAP一括登録ボタンが上部と下部に重複して存在

**対象ファイル**:
- `frontend/src/features/orders/pages/ConfirmedLinesPage.tsx`

**修正内容**:
- Line 116-122 の下部アクションバーを削除
- 上部アクションバー（Line 91-106）のみ残す

**コード例**:
```tsx
// 削除対象（Line 116-122付近）
<div className="flex items-center justify-between ...">
  <Button onClick={handleRegister} ...>
    SAP一括登録
  </Button>
</div>
```

---

### 1.2 Toast通知の追加
- [ ] 完了

**問題**: 保存成功時のフィードバックがない

**対象ファイル**:
- `frontend/src/features/warehouses/hooks/useWarehouseMutations.ts`
- `frontend/src/features/product-mappings/hooks/useProductMappings.ts`
- `frontend/src/features/delivery-places/hooks/useDeliveryPlaces.ts`

**修正内容**:
```tsx
// 各 useMutation の onSuccess に追加
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ... });
  toast.success("保存しました");  // 追加
},
```

---

### 1.3 ProductDetailPageのコード変更時リダイレクト
- [ ] 完了

**問題**: 商品コードを変更しても、URLが更新されない

**対象ファイル**:
- `frontend/src/features/products/pages/ProductDetailPage.tsx`

**修正内容**:
```tsx
// CustomerDetailPage.tsx のパターンに合わせる
const onSubmit = async (data: ProductFormInput) => {
  const updateData = { ...data };
  await updateProduct.mutateAsync({ code: productCode!, data: updateData });

  // コード変更時はリダイレクト
  if (data.product_code !== productCode) {
    navigate(`/products/${data.product_code}`, { replace: true });
  }
};
```

---

## フェーズ2: DB/UI整合性

### 2.1 Lotsのstatusフィールド表示
- [ ] 完了

**問題**: ロットの状態（active/depleted/expired/quarantine/locked）がUIに表示されていない

**対象ファイル**:
- `frontend/src/features/inventory/components/InventoryTable.tsx`（または該当テーブル）
- `frontend/src/features/inventory/components/LotEditForm.tsx`

**修正内容**:
- テーブルにstatusカラムを追加
- ステータスに応じたバッジ表示（色分け）
```tsx
const getStatusBadge = (status: string) => {
  const config: Record<string, { label: string; variant: string }> = {
    active: { label: "有効", variant: "success" },
    depleted: { label: "消費済", variant: "secondary" },
    expired: { label: "期限切れ", variant: "destructive" },
    quarantine: { label: "検疫中", variant: "warning" },
    locked: { label: "ロック中", variant: "outline" },
  };
  return config[status] || { label: status, variant: "default" };
};
```

---

### 2.2 Ordersの詳細フィールド追加
- [ ] 完了

**問題**: cancel_reason, ocr_source_filenameがUIに表示されていない

**対象ファイル**:
- `frontend/src/features/orders/pages/OrderDetailPage.tsx`
- `frontend/src/features/orders/components/OrderDetailHeader.tsx`（該当する場合）

**修正内容**:
- キャンセル理由の表示（キャンセル済みの場合のみ）
- OCR元ファイル名の表示（OCR取り込みの場合のみ）

```tsx
// OrderDetailPage.tsx に追加
{order.status === "cancelled" && order.cancel_reason && (
  <div className="text-sm text-red-600">
    キャンセル理由: {order.cancel_reason}
  </div>
)}
{order.ocr_source_filename && (
  <div className="text-sm text-slate-500">
    OCR取込元: {order.ocr_source_filename}
  </div>
)}
```

---

## フェーズ3: エクスポート機能

### 3.1 受注管理（Orders）のExcelエクスポート
- [ ] バックエンドAPI実装
- [ ] フロントエンドボタン追加

**対象ファイル（Backend）**:
- `backend/app/presentation/api/routes/orders_router.py`（エンドポイント追加）
- `backend/app/application/services/orders/` 配下（エクスポートサービス）

**対象ファイル（Frontend）**:
- `frontend/src/features/orders/pages/OrdersListPage.tsx`
- `frontend/src/features/orders/api.ts`

**APIエンドポイント**:
```
GET /api/orders/export/download?format=xlsx
```

**Excelシート構成**:
- Sheet1「受注明細」: order_no, customer_code, customer_name, product_code, product_name, order_quantity, allocated_quantity, delivery_date, status

---

### 3.2 フォーキャストのExcelエクスポート
- [ ] バックエンドAPI実装
- [ ] フロントエンドボタン追加

**対象ファイル（Backend）**:
- `backend/app/presentation/api/routes/forecasts_router.py`
- `backend/app/application/services/forecast/`

**対象ファイル（Frontend）**:
- `frontend/src/features/forecasts/pages/ForecastListPage.tsx`

**APIエンドポイント**:
```
GET /api/forecasts/export/download?format=xlsx
```

**Excelシート構成**:
- Sheet1「フォーキャストサマリー」: customer, delivery_place, product, total_quantity
- Sheet2「フォーキャスト詳細」: forecast_date, forecast_quantity, unit
- Sheet3「関連受注」: order_no, delivery_date, order_quantity, status

---

### 3.3 ロット管理（Inventory）のExcelエクスポート
- [ ] バックエンドAPI実装
- [ ] フロントエンドボタン追加

**対象ファイル（Backend）**:
- `backend/app/presentation/api/routes/inventory_router.py`
- `backend/app/application/services/inventory/`

**対象ファイル（Frontend）**:
- `frontend/src/features/inventory/pages/InventoryPage.tsx`

**APIエンドポイント**:
```
GET /api/inventory/export/download?format=xlsx
```

**Excelシート構成**:
- Sheet1「在庫サマリー」: product_code, product_name, warehouse, total_quantity, allocated_quantity, available_quantity
- Sheet2「ロット詳細」: lot_number, product_code, warehouse, current_quantity, received_date, expiry_date, status
- Sheet3「仕入先別集計」: supplier, total_quantity, lot_count
- Sheet4「倉庫別集計」: warehouse, total_quantity, lot_count

---

## フェーズ4: コード品質（優先度低）

### 4.1 PageHeaderコンポーネントの統一化
- [ ] 完了

**問題**: 15ページで手動ヘッダー（h1/h2タグ）を使用

**対象ファイル**:
- `frontend/src/features/orders/pages/OrderPage.tsx`
- `frontend/src/features/orders/pages/OrderDetailPage.tsx`
- `frontend/src/features/orders/pages/ConfirmedLinesPage.tsx`
- `frontend/src/features/withdrawals/pages/WithdrawalsListPage.tsx`
- `frontend/src/features/masters/pages/MastersPage.tsx`
- `frontend/src/features/assignments/pages/PrimaryAssignmentsPage.tsx`
- `frontend/src/features/inventory/pages/InventoryItemDetailPage.tsx`
- `frontend/src/features/inventory/pages/MovesPage.tsx`
- `frontend/src/features/forecasts/pages/ForecastImportPage.tsx`
- その他6ファイル

**修正内容**:
```tsx
// Before
<h1 className="text-2xl font-bold">ページタイトル</h1>

// After
import { PageHeader } from "@/shared/components/layout/PageHeader";
<PageHeader title="ページタイトル" />
```

---

## 実装順序チェックリスト

### フェーズ1（緊急）
- [ ] 1.1 ConfirmedLinesPage重複ボタン削除
- [ ] 1.2 Toast通知追加（3ファイル）
- [ ] 1.3 ProductDetailPageリダイレクト修正

### フェーズ2（整合性）
- [ ] 2.1 Lots status表示
- [ ] 2.2 Orders詳細フィールド追加

### フェーズ3（エクスポート）
- [ ] 3.1 Orders Excelエクスポート（Backend + Frontend）
- [ ] 3.2 Forecasts Excelエクスポート（Backend + Frontend）
- [ ] 3.3 Inventory Excelエクスポート（Backend + Frontend）

### フェーズ4（品質）
- [ ] 4.1 PageHeader統一化

---

## 既存エクスポート実装（参考）

**Backend**:
- `backend/app/application/services/common/export_service.py` - ExportService クラス
- `export_to_csv()`, `export_to_excel()` メソッド

**Frontend**:
- `frontend/src/shared/components/ExportButton.tsx` - 汎用エクスポートボタン

**既存エンドポイント例**:
- `/masters/customers/export/download`
- `/masters/products/export/download`

---

## 補足: 調査で発見したその他の問題（対応保留）

| 問題 | 詳細 | 対応 |
|------|------|------|
| LotEditForm | supplier_code, delivery_place_codeが意図的に除外 | コメントで「複雑なため保留」とあり、現状維持 |
| OrderCreateForm | due_date, ship_toがDBモデルに存在しない | 要調査（別タスク） |
| inspection系フィールド | inspection_status, inspection_date, inspection_cert_numberがUIにない | 検品管理機能として別タスク化推奨 |
