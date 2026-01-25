# ドキュメント再編成の提案

## 実施日: 2026-01-24

## 概要

docs配下のドキュメントを整理し、以下を達成します:

1. **削除候補の隔離完了** (✅ 完了): 15ファイルを `docs/archive/` に移動
2. **バックログの統合** (提案): `docs/project/plans/backlog/` 配下の8ファイルを統合
3. **計画書の整理** (提案): 大型計画書の見直し

---

## 1. 完了作業: 削除候補のアーカイブ (✅)

### 移動したファイル (15件)

**実装済み・統合済みの設計書:**
- `design/rpa_material_delivery_cloud_flow_spec.md` → `archive/design/`
- `design/rpa_material_delivery_run_control_plan.md` → `archive/design/`
- `design/inventory_view_strategy.md` → `archive/design/`
- `features/rpa/pad_minimization_material_delivery_note.md` → `archive/features/rpa/`
- `features/rpa/material_delivery_note_step_db_api.md` → `archive/features/rpa/`
- `features/smartread/pad_runner_implementation_plan.md` → `archive/features/smartread/`
- `features/smartread/smartread_data_management_plan.md` → `archive/features/smartread/`
- `features/smartread/pad_compatibility_review.md` → `archive/features/smartread/`
- `features/smartread/smartread_watchdir_handoff.md` → `archive/features/smartread/`
- `features/smartread/smartread_prompt_requestid_autorun.md` → `archive/features/smartread/`
- `features/shipping/ocr_order_register_ai_handoff.md` → `archive/features/shipping/`
- `features/ocr/ocr-results-column-customization.md` → `archive/features/ocr/`
- `operations/FRONTEND_DB_CONNECTION_CHECK.md` → `archive/operations/`
- `operations/PRODUCTION_DEPLOYMENT.md` → `archive/operations/`
- `operations/MIGRATION_BASELINE.md` → `archive/operations/`

---

## 2. 提案: バックログの統合

### 現状の問題

`docs/project/plans/backlog/` 配下に8ファイルが分散:

```
backlog/
├── TODO.md                                      (3.5K) - 未実装APIエンドポイント、在庫データ問題
├── backlog.md                                   (6.8K) - タスクバックログ (最終更新: 2026-01-18)
├── BUSINESS_CONTEXT_NEEDED.md                   (6.3K) - 業務要件確認事項
├── FUTURE_IMPROVEMENTS.md                       (15K)  - 将来改善項目
├── MASTER_DATA_FIELD_ALIGNMENT_TASKS.md         (8.1K) - マスタデータ整合性タスク
├── any-type-reduction.md                        (6.7K) - TypeScript any型削減
├── next_reviews_ja.md                           (2.3K) - 次回レビュー項目
├── smartread-cache-db-save-inconsistency.md     (7.2K) - SmartReadキャッシュ問題
└── smartread-logging-gaps.md                    (8.1K) - SmartReadログ改善
```

### 統合案

#### Option A: 単一ファイルに統合 (推奨)

**新規ファイル:** `docs/project/BACKLOG.md`

**構成:**
```markdown
# タスクバックログ (統合版)

## 最終更新: YYYY-MM-DD

## 1. 優先度: 高 (即時対応)
- 入庫履歴が表示されない問題 (from TODO.md)
- アーカイブ済みロット表示バグ (from backlog.md)
- ...

## 2. 優先度: 中 (UI/UX改善)
- InboundPlansListのテーブルソート (from backlog.md)
- Toast通知の不足 (from backlog.md)
- ...

## 3. 優先度: 低 (品質改善)
- any型削減 (from any-type-reduction.md)
- SmartReadログ改善 (from smartread-logging-gaps.md)
- ...

## 4. 将来改善 (長期計画)
- DBエクスポート機能 (from FUTURE_IMPROVEMENTS.md)
- ダッシュボードグラフ (from FUTURE_IMPROVEMENTS.md)
- ...

## 5. 業務要件確認待ち
- (from BUSINESS_CONTEXT_NEEDED.md)

## 6. マスタデータ整合性
- (from MASTER_DATA_FIELD_ALIGNMENT_TASKS.md)
```

**移行後:**
- `backlog/` 配下の8ファイルを `archive/backlog/` に移動
- `docs/project/BACKLOG.md` を新規作成 (統合版)

#### Option B: カテゴリ別に3ファイルに整理

```
docs/project/
├── BACKLOG_ACTIVE.md          (TODO.md + backlog.md 統合)
├── BACKLOG_FUTURE.md          (FUTURE_IMPROVEMENTS.md + 長期計画)
└── BACKLOG_TECHNICAL_DEBT.md  (any-type, smartread-*, MASTER_DATA)
```

---

## 3. 提案: 大型計画書の見直し

### 対象ファイル

| ファイル | サイズ | 状態 | 提案 |
|---------|-------|------|------|
| `supplier_customer_items_implementation_plan_v2.1.md` | 49K | Phase 0完了、Phase 1未着手 | **保持** (重要な移行計画) |
| `comprehensive-test-strategy.md` | 34K | 未着手 | **保持** (将来必要) |
| `inventory-lot-improvement-master-plan.md` | 4.3K | Phase 0完了、以降未着手 | **保持** (進行中) |
| `test-data-generation-master-plan.md` | 3.6K | 一部実装済み | **保持** (参照価値あり) |
| `ui_and_lifecycle_plan.md` | 4.7K | 一部実装済み | **保持** (UI実装計画) |

**判断理由:**
- すべて現行または将来実装予定の計画書
- サイズが大きくても、参照価値が高い
- アーカイブ不要

---

## 4. 提案: その他の整理

### rbac-implementation-plan.md

- **現状:** `docs/rbac-implementation-plan.md` (8.6K)
- **実装状況:** 実装済み (#487)
- **提案:** `docs/archive/rbac-implementation-plan.md` に移動
- **理由:** 実装完了、参照用に保持

### test-review.md

- **現状:** `docs/test-review.md` (5.3K)
- **実装状況:** レビュー完了
- **提案:** `docs/project/reviews/` に移動
- **理由:** レビュー履歴として整理

---

## 5. 実行計画

### Phase 1: アーカイブ完了 (✅ 実施済み)
- 15ファイルを `docs/archive/` に移動
- `docs/archive/README.md` 作成

### Phase 2: バックログ統合 (提案)
1. `docs/project/BACKLOG.md` を作成 (統合版)
2. `docs/project/plans/backlog/*.md` を `docs/archive/backlog/` に移動
3. `docs/README.md` の参照を更新

### Phase 3: その他整理 (提案)
1. `docs/rbac-implementation-plan.md` → `docs/archive/`
2. `docs/test-review.md` → `docs/project/reviews/`
3. `docs/README.md` を更新

---

## 6. 更新が必要なファイル

### docs/README.md

バックログ統合後、以下の行を更新:

```diff
- | **Project (案件管理)** | [plans/backlog/backlog.md](project/plans/backlog/backlog.md) | 未完了タスクのバックログ |
+ | **Project (案件管理)** | [BACKLOG.md](project/BACKLOG.md) | 未完了タスクのバックログ (統合版) |
```

### CLAUDE.md

バックログ参照を更新 (該当箇所があれば):

```diff
- docs/tasks/ACTIVE_TASKS.md - Current tasks
+ docs/project/BACKLOG.md - Current tasks
```

---

## 7. 期待される効果

1. **見通しの改善**: バックログが1ファイルに集約され、タスク全体を把握しやすくなる
2. **重複の削減**: 類似内容のファイルが統合され、更新の手間が減る
3. **アーカイブの明確化**: 実装済みドキュメントが隔離され、現行ドキュメントとの区別が明確になる

---

## 8. リスクと対策

### リスク: 統合時の情報欠落

**対策:**
- 統合前のファイルを `archive/backlog/` に保管
- 統合時に全内容を確認し、重要情報を漏らさない

### リスク: 参照リンク切れ

**対策:**
- `docs/README.md`, `CLAUDE.md`, `CHANGELOG.md` のリンクを確認
- Git履歴で過去の参照を追跡可能

---

## 9. 次のステップ

以下の作業を実施するか、ユーザーに確認:

- [ ] バックログ統合 (Option A or B を選択)
- [ ] rbac-implementation-plan.md のアーカイブ
- [ ] test-review.md の移動
- [ ] docs/README.md の更新
- [ ] コミット & PR作成
