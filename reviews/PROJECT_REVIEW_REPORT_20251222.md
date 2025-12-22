# プロジェクトレビュー報告書 (2025-12-22)

## 1. 概要 (Executive Summary)

直近のE2Eテスト実装やアーキテクチャ改善により、プロジェクトの健全性は大幅に向上しています。特に懸念されていた「ビジネスロジックの重複」が解消され、Clean Architectureの原則に沿った構成への移行が進んでいます。

**総合評価: 良好 (B+ → A-)**

---

## 2. 改善された点 (Improvements)

### ✅ 引当ロジックの統一 (Backend Architecture)
- **重複の解消**: 以前は `domain/allocation/calculator.py` と `services/allocations/allocator.py` に類似ロジックが散在していましたが、現在は `allocator.py` が `calculator.py`（純粋関数）を呼び出すラッパーとして機能しており、ロジックがドメイン層に一元化されました。
- **Clean Architectureへの適合**: 依存の方向が整い、テスト容易性が向上しています。

### ✅ RPA機能のリファクタリング
- **Orchestratorパターンの導入**: 巨大化していた `MaterialDeliveryNoteService` (God Class) が `MaterialDeliveryNoteOrchestrator` にリファクタリングされました。CSVパースやフロー連携の責務が分離され、見通しが良くなっています。

### ✅ テスト体制の強化
- **E2Eテストの実装**: `frontend/e2e/` 以下のテスト（`auth.spec.ts`, `allocation.spec.ts`, `rpa-material-delivery.spec.ts`）により、クリティカルパスの動作保証が自動化されました。リファクタリングを安全に行える基盤が整いました。

### ✅ フロントエンドの実装標準
- `frontend/STYLE_GUIDE.md` に準拠した実装が徹底されています（`api.ts` への集約、Hookの分離など）。

---

## 3. 残存課題とリスク (Issues & Risks)

### ⚠️ トランザクション管理の一貫性 (Backend)
- `MaterialDeliveryNoteOrchestrator` 内で、`db.flush()` を基本としつつも、一部で明示的な `db.commit()` が行われています（例: `execute_step2`）。
- **リスク**: エラー発生時のロールバック制御が複雑になり、部分的なデータ不整合を招く恐れがあります。呼び出し元（Unit of WorkまたはRouter）でトランザクション境界を制御するのが理想です。

### ⚠️ ルートディレクトリの整理
- `backend/app/` 直下に検証用スクリプト（`check_batch_race.py`, `check_performance.py` 等）が散在しています。これらはアプリケーションコードと混在すべきではありません。

### ⚠️ Orchestratorの責務
- Orchestrator内で直接DBクエリ（`db.query(...)`）を発行している箇所が多くあります。Repositoryパターンを適用することで、Orchestratorを純粋な「進行役」に徹させることができます。

---

## 4. 推奨アクション (Recommendations)

### 優先度：高 (Immediate)
1.  **スクリプトの移動**: `backend/app/check_*.py` を `backend/scripts/` または `backend/tests/manual/` に移動し、ディレクトリをクリーンアップする。

### 優先度：中 (Short-term)
2.  **トランザクション管理の統一**: Orchestratorから `commit()` を排除し、完全なUnit of Workパターンへ移行する。
3.  **E2Eテストの拡充**: 在庫不足時の仮発注フローなど、エッジケースのカバー率を上げる。

### 優先度：低 (Long-term)
4.  **Repositoryの導入**: Orchestrator内のクエリロジックをRepository層へ移動する。

---

この報告書は `reviews/` ディレクトリに保存されています。
