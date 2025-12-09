# アーキテクチャ改善 - 将来計画

**作成日**: 2025-12-09  
**経緯**: [decoupling-review.md](./decoupling-review.md) / [integrated_architecture_review.md](~/.gemini/.../integrated_architecture_review.md) に基づく

---

## スキップした項目と理由

### 1. ロット割当 UI 一式の受注非依存化

**元の計画**: `OrderDetailPage` / `LotAllocationPanel` / `useOrderLineAllocation` を受注依存から外し「在庫側のウィジェット」にリファクタ

**スキップ理由**: 
- `features/allocations` フォルダが既に独立したモジュールとして整備済み
- API、hooks、components が分離されており、README.md に移行ガイドも存在
- `useOrderLineAllocation` は受注明細に対する引当操作の統合フックとして正しい位置にある
- **結論**: 現時点では追加の分離作業は不要と判断

**実施タイミング**: フォーキャスト画面で引当機能が必要になった時点

---

### 2. Lot と OrderLine の型定義・正規化分離

**元の計画**: `normalize.ts` 内で Lot と OrderLine の責務を分けるための整理

**スキップ理由**:
- 現状の `normalize.ts` は実用上問題なく動作
- 型の混在はあるが、破壊的変更のリスクに比べてメリットが小さい

**実施タイミング**: 型エラーが頻発するようになった時点、または大規模リファクタリング時

---

## 将来実施予定

### フロントエンド完全分離（Phase 3+）

1. **useOrderLineAllocation → useAllocation に汎用化**
   - 受注明細IDではなく「需要ID + 需要タイプ」を引数にする
   - Order / Forecast 両方で使用可能に

2. **型定義の分離**
   - `AllocationTarget` インターフェース作成
   - 受注/フォーキャストは派生型として定義

3. **コンポーネントの移動**
   - `features/orders/components/allocation/` → `features/allocations/components/`

### 期待効果
- コード再利用性向上
- テスト容易性向上
- 需要側（Order/Forecast）と在庫側（Lot/Allocation）の責務明確化

---

### Lot.allocations リレーション見直し

**変更内容**: `cascade="all, delete-orphan"` を削除し、ロット削除時の自動引当削除を防ぐ

**注意点**:
- 既存クエリの修正が必要
- ビューで互換層を用意する必要あり

---

## 完了済み項目（2025-12-09）

| 項目 | 内容 |
|------|------|
| Phase 1 | `customer_item_delivery_settings` テーブル作成 |
| Phase 2 | `origin_type` デフォルト変更、LotService 責務分離 |
| Phase 4 | CustomerItemDeliverySettingService 実装 |
| Phase 5 | 得意先品番詳細画面に納入先別設定UIを追加 |

