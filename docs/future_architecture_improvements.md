# アーキテクチャ改善 - 将来計画

## フロントエンド完全分離（Phase 3+）

### 実施タイミング
フォーキャスト画面での引当機能が必要になった時点

### 変更内容

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

## Lot.allocations リレーション見直し（将来）

### 変更内容
`cascade="all, delete-orphan"` を削除し、ロット削除時の自動引当削除を防ぐ

### 注意点
- 既存クエリの修正が必要
- ビューで互換層を用意する必要あり

---

## 参照ドキュメント
- [integrated_architecture_review.md](file:///Users/kazuya/.gemini/antigravity/brain/da631158-6fd4-4f23-86e5-f764ec801535/integrated_architecture_review.md)
- [decoupling-review.md](file:///Users/kazuya/dev/projects/lot-management-system/docs/decoupling-review.md)
