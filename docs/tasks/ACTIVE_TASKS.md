# 現在のタスク一覧

**最終更新:** 2025-12-08

> **このドキュメントの目的**: 
> - **未対応**または**進行中**のタスクのみを記載
> - **完了したタスク**は`CHANGELOG.md`に記録され、このファイルからは削除される
> - 常に「今やるべきこと」だけが載っている状態を維持

---

## ✅ 直近完了タスク（2025-12-08）

### フェーズ3 - クリーンアーキテクチャ移行 ✅

**全面刷新完了！**

新しいディレクトリ構造:
```
backend/app/
├── presentation/   # api/ + schemas/
├── application/    # services/
├── domain/         # ビジネスロジック + events/
├── infrastructure/ # models/ + repositories/ + external/
└── core/           # config, logging, errors
```

完了項目:
- ✅ ドメインイベント基盤 (`domain/events/`)
- ✅ イベントハンドラー登録 (`main.py`)
- ✅ LotService/AllocationServiceにイベント発行統合
- ✅ ディレクトリ構造の全面刷新
- ✅ 全インポートパスの置換（663箇所）
- ✅ アプリケーション起動確認（174ルート）

---

## 🎯 残タスク

### ✅ 受注非連動ロット対応 - バックエンド実装完了

**設計ドキュメント:** [`docs/designs/lot-non-order-handling-plan.md`](../designs/lot-non-order-handling-plan.md)

見込み生産・サンプル・安全在庫などの確定受注がない段階でロットを払い出せるようにする。

#### フェーズ概要

| フェーズ | 内容 | ステータス |
|---------|------|----------|
| 1. DDL/マイグレーション | `origin_type`, `origin_reference`カラム追加 | ✅ 完了 |
| 2. モデル・スキーマ | Lotモデル/スキーマにカラム追加 | ✅ 完了 |
| 3. サービス層 | バリデーション緩和、採番ユーティリティ | ✅ 完了 |
| 4. API拡張 | 既存POST /api/lotsで対応 | ✅ 完了 |
| 5. フロントエンド | 作成フォーム、一覧表示 | ✅ 完了 |
| 6. FEFO引当 | origin_typeフィルタ | ✅ 完了 |
| 7. テスト | ユニット/統合テスト | ✅ 283 passed |

> **ブランチ:** `feature/non-order-lot-handling`

---

直近の検証結果:
- ✅ バックエンドテスト（283 passed）
- ✅ フロントエンドOpenAPI型再生成
- ✅ TypeScript typecheck（0 errors）

---

## 📌 将来対応（P2: 中優先度）

### ✅ P2-0: ロット引当ページでのHARD引当同時実行対応 - 実装完了

**報告日:** 2025-12-08
**完了日:** 2025-12-08

**実装内容:**
- 「保存 & 確定」ボタンを追加
- ロット選択後、一括でソフト引当作成 → HARD引当確定を実行可能に

**修正ファイル:**
- `frontend/src/features/orders/hooks/useOrderLineAllocation.ts` - `saveAndConfirmAllocations` 関数追加
- `frontend/src/features/allocations/components/lots/LotAllocationPanel.tsx` - 「保存 & 確定」ボタン追加
- `frontend/src/features/orders/pages/OrderDetailPage.tsx` - 新関数の接続

---

### P2-1: 引当ステータスの仮/実区別表示

**報告日:** 2025-12-09

**問題:**
受注明細の「引当済」ステータスバッジが仮引当（SOFT）と実引当（HARD）を区別していない。

**対応案:**
- `pending` → 未引当
- `仮引当` → SOFT引当あり（緑/オレンジ）
- `確定済` → HARD引当のみ（緑）
- `引当済(一部仮)` → HARD + SOFT混在

---

### P2-2: フォーキャスト編集後の画面更新問題

**報告日:** 2025-12-09
**ステータス:** 保留（優先度: 低）

**問題:**
フォーキャスト編集（数量の追加・更新・削除）後、以下のコンポーネントが即時更新されない：
- 計画引当サマリ（Planning Allocation Panel）
- 関連受注セクション（Related Orders）

**実施済み修正:**
- `getForecastQueryKeys()` に `planningAllocationSummary` を追加
- 自動引当mutation後に `forecasts` クエリも無効化

**現状:** 修正後も画面が更新されない（手動リフレッシュで回避可能）

**詳細:** [`docs/tasks/forecast-update-issue.md`](forecast-update-issue.md)

**対応方針:**
手動リフレッシュで回避可能であり、UX上の影響は限定的なため、優先度を下げて保留。
バックエンド調査が必要な可能性あり。

---

### P2-3: SAP在庫同期 - 本番API接続待ち

**現状**: モック実装完了、UI実装完了

**残タスク**（本番SAP接続が必要）:
- ❌ **本番SAP API接続**（現在はモック: `SAPMockClient`）
  - `backend/app/infrastructure/external/sap_mock_client.py` を実際のSAP APIクライアントに置き換え
- ❌ **定期実行設定**（オプション）
  - APScheduler または Celery Beat による自動スケジュール実行
  - 実行頻度設定UI

> **Note**: モック環境で実装可能な部分（UI、API、差異検出ロジック）は全て完了。本番SAP環境準備後に対応。

---

## 📌 将来対応（P3: 低優先度）

### 1. SAP受注登録の本番化

**現状:**
- ✅ SAP受注登録: モック実装済み
- ❌ 本番SAP API接続: 未実装

**関連TODO:**
- `backend/app/application/services/sap/sap_service.py:L61`

---

## 📊 コード品質

### ツール実行結果

| 種類 | 件数 | 状態 |
|------|------|------|
| **ESLint Errors** | 0 | ✅ Clean |
| **TS Errors** | 0 | ✅ Clean |
| **Mypy Errors** | 0 | ✅ Clean |
| **Ruff Errors** | 0 | ✅ Clean |
| **Backend Tests** | 283 passed, 0 failed | ✅ Clean |

### コード品質無視コメント

| 種類 | 件数 | 状態 |
|------|------|------|
| Mypy `# type: ignore` | 40 | ✅ 許容済み |
| Ruff `# noqa` | 54 | ✅ 許容済み |
| ESLint `eslint-disable` | 22 | ✅ 許容済み |
| TypeScript `@ts-ignore` | 0 | ✅ Clean |
| **合計** | **116** | **全て許容済み (2025-12-08)** |

> 詳細な許容理由は [`docs/CODE_QUALITY_IGNORES.md`](../CODE_QUALITY_IGNORES.md) を参照


---

## 参照

- **変更履歴:** [`CHANGELOG.md`](../CHANGELOG.md)
- **完了機能:** [`docs/COMPLETED_FEATURES.adoc`](COMPLETED_FEATURES.adoc)
- **開発ガイド:** [`CLAUDE.md`](../CLAUDE.md)
- **フェーズ3計画:** [`docs/phase3_implementation_plan.md`](../phase3_implementation_plan.md)

