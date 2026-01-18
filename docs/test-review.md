# テストレビュー結果（統合版）

## 前提
- ロット／ビュー関連の修正が別ブランチで進行中のため、**ロット依存のテスト追加は保留**。
- ここでは、ロット以外で「不足している観点」を整理し、**優先度の高いものから追加対象**を明確化する。
- 2026-01-18: E2E P0テスト6本実装完了。今後確認すべき点を本ドキュメントに統合。

---

## 現状把握（サマリ）

### Backend
- API/サービス/インフラ/一部ユニットテストが存在。
- ただし **skip/xfail が残っている領域**があり、コア機能の回帰検知が不十分。

### Frontend
- Vitestベースのコンポーネント/ユニットテストは多い。
- **E2E P0 6本を実装済み**（導線、保存永続化、二重送信防止、権限、一覧フィルタ、失敗系）
- smoke/full分割でCI実行可能。

---

## skip/xfail 詳細リスト

### 解消済み（4件 → 0件）
- ~~`tests/unit/test_quantity.py`~~ → 空ファイルのため削除
- ~~`tests/error_scenarios/test_constraints.py:8`~~ → skip解消（ロール作成API実装済み）
- ~~`tests/error_scenarios/test_validation_errors.py:5,23,39`~~ → skip解消（全API実装済み）

### 残存（7件） - アーキテクチャ制約により即時解消困難

| ファイル | 行 | 理由 | 対応案 |
|---------|-----|------|--------|
| `tests/test_allocations_refactored.py` | 172 | Flaky TestClient db visibility | DBビュー問題（別アーキテクチャ検討） |
| `tests/test_allocations_refactored.py` | 180 | View not visible in test transaction | DBビュー問題 |
| `tests/test_allocations_refactored.py` | 196 | View not visible in test transaction | DBビュー問題 |
| `tests/api/test_allocations.py` | 328 | Instance is not persistent | セッション管理問題 |
| `tests/api/test_allocations.py` | 668 | DB constraint prevents scenario | 仕様として不可能なシナリオ |
| `tests/api/test_bulk_auto_allocate.py` | 8 | Flaky TestClient db visibility | 優先度低（bulk機能） |

> [!NOTE]
> 残存するxfailは「DBビューがテストトランザクション内で見えない」または「DB制約によりテストシナリオが不可能」という根本的な問題です。
> 解消には、テストアーキテクチャの変更（commit + rollback または separate test DB）が必要です。

---


## 追加対応項目（E2E実装後の残課題）

### 今後確認すべき点（E2E実装時に発生）

| # | 項目 | 優先度 | 状態 |
|---|------|--------|------|
| 1 | CI E2E実行時間が10分以内か確認 | P1 | [ ] 未確認 |
| 2 | testuser作成と一般ユーザー権限テスト追加 | P1 | [ ] 未対応 |
| 3 | data-testid追加（セレクタで苦労した箇所） | P2 | [ ] 未対応 |
| 4 | Backend API統合テスト: 保存→再取得パターン追加 | P2 | [ ] 未対応 |

---

## 不足観点（ロットを除いた重点領域）

### 1. スキップ／xfailの解消（最優先）
- [x] skip/xfailリストを洗い出し（上記11箇所）
- [ ] DB非依存に修正可能なユニットテストを特定
- [ ] conftest修正でFlaky問題を解消

### 2. 実API連携を伴うE2E（高優先）
- [x] E2E P0 6本実装完了
- [x] APIレスポンス確認（waitForResponse）実装
- [x] DB永続化確認（リロード後も残る）実装
- [ ] testuser（一般ユーザー）での権限テスト追加

### 3. 異常系の仕様固定（高優先）
- [x] E2E-06で API 500 / ネットワーク断をテスト
- [x] 400/409/422 の返却仕様をAPI統合テストで固定（12テスト追加）
- [x] バリデーションエラーメッセージの一貫性確認

### 4. 外部連携／帳票入出力の精度確認（中優先）
- [ ] ダウンロードファイルの内容検証（列/値/集計）
- [ ] Excel/CSV出力の形式確認

---

## 追加テストの優先順位（ロット以外）

### P0: 直ちに対応すべき
1. ~~**E2E P0テストの実装**~~ ✅ 完了
2. ~~**skip/xfail を解消して動く状態にする**~~ ✅ 解消可能分完了（4件解消、6件はアーキテクチャ制約）

### P1: 早期に追加
3. ~~**実API連携のE2Eを最低限追加**~~ ✅ 完了
4. **testuser（一般ユーザー）での権限テスト追加**
5. ~~**異常系テストの拡充**~~ ✅ 完了（12テスト追加）
   - バリデーション・重複・競合（409等）をAPI/サービスで固定

### P2: 中期的に追加
6. **出力帳票の中身検証**
   - Excel/CSVの列/値/集計ロジック検証
7. **data-testid追加**
   - セレクタ安定性向上

---

## 次のアクション候補

### 即時対応可能
1. [ ] `tests/unit/test_quantity.py` のskip解消（DB非依存に修正）
2. [ ] `tests/error_scenarios/` のAPI実装状況確認
3. [ ] 注文作成API (`POST /api/orders/`) の実装確認

### 別ブランチ待ち
- RPAステップの状態遷移や設定値解決など、**DBビュー非依存のサービス層**を優先してテスト追加。
- ロット関連テストは別ブランチマージ後に対応。

---

## 参照ドキュメント
- [testing.md](./testing.md) - テスト実行ガイド
- [comprehensive-test-strategy.md](./plan/comprehensive-test-strategy.md) - 詳細なテスト戦略計画
