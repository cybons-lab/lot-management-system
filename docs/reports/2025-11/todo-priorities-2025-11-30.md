# TODO優先順位付けレポート (2025-11-30)

## 概要

コードベース内の23箇所のTODOコメントを分析し、優先度・カテゴリ別に分類しました。
実装上の制約や前提条件も考慮し、実現可能な順序で着手できるよう整理しています。

**検出日時**: 2025-11-30
**総TODO数**: 23箇所 (Backend: 2, Frontend: 21)
**FIXME数**: 0箇所

---

## 優先度分類

### 🔴 P0 - 緊急（セキュリティ/認証） - 1箇所

| # | ファイル | 内容 | 影響 | 実装上の制約 |
|---|---------|------|------|-------------|
| 1 | `frontend/src/features/adjustments/components/AdjustmentForm.tsx:26` | **Auth context統合**: `adjusted_by` フィールドをハードコード(1)から認証コンテキストから取得 | セキュリティ：現在はユーザーIDが固定値 | **⚠️ ブロッカー**: 検証環境でのユーザー作成・認証キー発行の仕組みが未整備 |

**実装前提条件:**
- [ ] 検証環境でのユーザー管理機能の整備
- [ ] 認証トークン発行フローの確立
- [ ] Auth contextの実装とテスト

---

### 🟠 P1 - 高（機能不足・API未実装） - 6箇所

#### Backend API実装（フロントエンド機能ブロック中）

| # | ファイル | 内容 | ブロッキング範囲 | 工数見積 |
|---|---------|------|----------------|---------|
| 2 | 複数箇所 (5ファイル) | **Bulk import/upsert API**: 顧客、製品、倉庫、仕入先、UOMの一括インポートAPI | 一括登録機能が使えない | 1日 |
| | - `features/customers/types/bulk-operation.ts:30` | 顧客 bulk-upsert API | | |
| | - `features/products/types/bulk-operation.ts:38` | 製品 bulk-upsert API | | |
| | - `features/warehouses/types/bulk-operation.ts:28` | 倉庫 bulk-upsert API | | |
| | - `features/suppliers/types/bulk-operation.ts:26` | 仕入先 bulk-upsert API | | |
| | - `shared/hooks/useBulkImport.ts:54` | 共通 bulk import 処理 | | |
| 3 | 複数箇所 (2ファイル) | **Template download API**: CSV テンプレートダウンロード | UX改善：ユーザーがテンプレート作成の手間 | 2時間 |
| | - `features/products/components/ProductBulkImportDialog.tsx:83` | 製品テンプレート | | |
| | - `features/customers/components/CustomerBulkImportDialog.tsx:102` | 顧客テンプレート | | |
| 4 | `hooks/mutations/useAllocationMutations.ts:175` | **受注明細単位の一括取消API** | 現在は個別削除の繰り返し（パフォーマンス低下） | 3時間 |
| 5 | `hooks/mutations/useAllocationMutations.ts:234` | **自動引当API** | 現在は代替実装（FEFO未適用） | 4時間 |

#### 設定・構成

| # | ファイル | 内容 | 影響 | 工数見積 |
|---|---------|------|------|---------|
| 6 | `backend/app/services/inventory/inbound_receiving_service.py:66` | **default_warehouse_id を設定可能に**: ハードコード(1)を環境変数/設定に | 柔軟性低下：倉庫IDが固定 | 1時間 |

---

### 🟡 P2 - 中（機能追加・改善） - 9箇所

#### 機能実装

| # | ファイル | 内容 | 重要度 | 工数見積 |
|---|---------|------|--------|---------|
| 7 | `features/forecasts/components/ForecastDetailCard/ForecastDetailCard.tsx:71` | **予測グループの自動引当実装** | 中：現在はconsole.log出力のみ | 4時間 |
| 8 | `features/forecasts/components/ForecastDetailCard/RelatedOrdersSection.tsx:28` | **全受注の自動引当実装** | 中：現在はconsole.log出力のみ | 4時間 |
| 9 | `features/forecasts/components/ForecastDetailCard/useWarehouseData.ts:54` | **入荷予定を倉庫別に集約する処理実装** | 中：現在は空実装 | 3時間 |
| 10 | `features/forecasts/components/ForecastDetailCard/useWarehouseData.ts:59` | **入荷予定の数量取得** | 中：現在は0固定 | 1時間 |

#### コード品質

| # | ファイル | 内容 | 技術的負債レベル | 工数見積 |
|---|---------|------|----------------|---------|
| 11 | `frontend/eslint.config.js:226` | **大きいファイルをリファクタ**: 小さいコンポーネント/フックに分割 | 中：保守性低下 | 1日 |
| 12 | `hooks/ui/useDialog.ts:199` | **useDialog を useMemo で最適化** | 低：パフォーマンス微改善 | 1時間 |
| 13 | `features/allocations/api.ts:97` | **生成された型を使用** | 低：型安全性向上 | 30分 |

#### UI/UX

| # | ファイル | 内容 | UX影響 | 工数見積 |
|---|---------|------|--------|---------|
| 14 | `features/inbound-plans/components/InboundReceiveDialog.tsx:82` | **エラートースト表示追加** | 中：エラーが見えない | 30分 |
| 15 | `features/customers/components/CustomerForm.tsx:104` | **顧客の追加フィールド実装**: contact_name, phone, email | 中：機能不足 | 2時間 |

#### データ管理

| # | ファイル | 内容 | 影響 | 工数見積 |
|---|---------|------|------|---------|
| 16 | `features/uom-conversions/api.ts:92` | **UOM変換のUPD/DEL対応**: conversion_id追加 | 中：編集・削除不可 | 2時間 |

---

### 🟢 P3 - 低（将来対応） - 1箇所

| # | ファイル | 内容 | タイミング | 工数見積 |
|---|---------|------|----------|---------|
| 17 | `backend/app/services/sap/sap_service.py:60` | **SAP API統合実装**: 現在はモック | 本番導入時 | 1週間 |

---

## 実装上の制約・前提条件

### P0（緊急）の制約

**Auth context統合 (P0-1):**
- **ブロッカー**: 検証環境が未整備
  - ユーザー作成機能が動作していない
  - 認証トークン発行フローが未確立
  - Auth context実装が不完全
- **推奨**: まずP1から着手し、並行して検証環境を整備

### P1（高）の前提条件

**Bulk API実装 (P1-2~5):**
- Backend実装が完了するまでフロントエンド機能が使用不可
- 優先度: Bulk import > Template download > 一括取消 > 自動引当

**マスタデータ表示問題:**
- **既知の問題**: 一部のマスタデータページで正しく表示できていない
- **影響**: Bulk import APIを実装しても、UIが正常動作しない可能性
- **対策**: UI修正を優先的に実施

---

## 推奨アクションプラン

### フェーズ1: マスタデータUI修正（今週）

**優先事項**: マスタデータ表示問題の修正
- 顧客一覧ページ
- 製品一覧ページ
- その他のマスタデータページ

**理由**: Bulk import APIを実装しても、表示が壊れていたら意味がない

---

### フェーズ2: Backend API実装（P1） - 今月中

**優先順位:**
1. **Bulk import/upsert API (P1-2)** - 工数: 1日
   - 顧客、製品、倉庫、仕入先、UOMの5機能
   - 最も要望が多く、効率化効果が高い

2. **Template download API (P1-3)** - 工数: 2時間
   - Bulk importと合わせて実装すると効率的

3. **default_warehouse_id 設定化 (P1-6)** - 工数: 1時間
   - 簡単かつ重要度高い

4. **受注明細一括取消API (P1-4)** - 工数: 3時間
   - パフォーマンス改善

5. **自動引当API (P1-5)** - 工数: 4時間
   - FEFO適用により正確な引当が可能に

**合計工数**: 約2日

---

### フェーズ3: P2機能追加・改善 - 来月

**クイックウィン（工数小・効果大）:**
- エラートースト表示 (30分)
- useDialog最適化 (1時間)
- 生成型使用 (30分)

**機能実装:**
- 入荷予定集約処理 (4時間)
- 予測グループ自動引当 (4時間)
- 全受注自動引当 (4時間)

**リファクタリング:**
- 大きいファイル分割 (1日)
- UOM変換UPD/DEL対応 (2時間)
- 顧客追加フィールド (2時間)

---

### フェーズ4: P0対応（検証環境整備後）

**Auth context統合 (P0-1):**
- 前提: 検証環境のユーザー管理機能整備
- 工数: 1時間（環境整備後）

---

### フェーズ5: P3将来対応

**SAP API統合 (P3-1):**
- タイミング: 本番導入時
- 工数: 1週間

---

## 統計サマリー

| 優先度 | 件数 | 合計工数見積 | タイミング | 状況 |
|--------|------|------------|----------|------|
| **P0（緊急）** | 1 | 1時間 | 検証環境整備後 | ⚠️ ブロッカーあり |
| **P1（高）** | 6 | 約2日 | 今月中 | ✅ 実施可能 |
| **P2（中）** | 9 | 約3日 | 来月 | ✅ 実施可能 |
| **P3（低）** | 1 | 1週間 | 本番導入時 | - |
| **合計** | **17** | **約6日** | - | - |

**注**: 工数見積は実装のみ。テスト・レビュー時間は別途必要。

---

## 次のステップ

### 即座に実施可能（P1から着手）

**推奨開始点:**
1. **マスタデータUI修正**（フェーズ1）
   - 既存の表示問題を解消
   - Bulk API実装の土台を整える

2. **P1-6: default_warehouse_id設定化**
   - 工数: 1時間
   - 影響範囲: 小
   - リスク: 低
   - 即座に価値提供

3. **P1-2: Bulk import API実装**
   - 工数: 1日
   - ユーザー価値: 高
   - UI修正完了後に実施

### P0は後回し

**理由:**
- 検証環境のユーザー管理が未整備
- 認証周りの基盤整備が必要
- P1の方が即座に価値を提供できる

**対応:**
- P1-P2を進めながら、並行して検証環境を整備
- 準備ができ次第P0に着手

---

## 参考資料

- **監査レポート**: `docs/audit-report-2025-11-30.md`
- **コード品質レポート**: `docs/code-quality-report-2025-11-30.md`
- **CLAUDE.md**: プロジェクトガイドライン

---

## 更新履歴

- **2025-11-30**: 初版作成（23箇所のTODO分析・優先順位付け）
