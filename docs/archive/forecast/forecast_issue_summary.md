# Forecast データ表示問題の現状と残タスク

## 現状把握
- **ユーザー報告**: Forecast ページが本日のみ表示され、日次・10日（旬）・月次予測が欠落。
- **フロントエンド**:
  - `useForecastCalculations` が `forecast_period` と `forecast_date` でデータを集計。
  - `ForecastDayCell` は `quantity` が未定義でも `-` を表示し、欠損データは問題なくハンドリング。
- **バックエンド（シード）**:
  - `seed_simulate_service.py::create_forecast_data` が `forecasts` パラメータ > 0 の場合に予測を生成。
  - 現在日が 25 日未満 → 当月、以降 → 翌月を `target_month` とし、対象月の 1 日〜月末までの日次予測を作成。
  - `forecast_period` の設定:
    - **日次予測**: `forecast_date` の月（例: `2025-11`）
    - **旬予測**: 翌月
    - **月次予測**: 翌々月
- **モデル** (`forecast_models.py`):
  - `forecast_date` は `Date`、`forecast_period` は `String(7)`（`YYYY-MM`）で保存。
  - ユニーク制約は `customer_id, delivery_place_id, product_id, forecast_date, forecast_period` の組み合わせ。
- **API**:
  - `admin_simulate_router.py` が `run_seed_simulation`（`seed_simulate_service.py`）をバックグラウンドで実行。
- **Phase 4 完了**: ナビゲーションや `product_id` フィルタ追加等は実装済み。

---

## Phase 4（クロスページナビゲーション）残タスク
- 現時点では実装済みの機能はすべて完了しています。
- **追加で必要になる可能性があるタスク**:
  1. **ドキュメント整備**: 変更点を `docs/` 配下にまとめ、開発者向けの導入ガイドを更新。
  2. **コードレビュー・マージ**: 変更ブランチ `feature/ui-alerts-orders-spec` を `main` へマージし、CI が通過することを確認。
  3. **テスト追加**: 新規ナビゲーションロジックに対するユニットテスト／E2E テストを追加（必要に応じて）。

### オプション: 横連携機能実装（時間があれば）
- **需要予測ページ**: 右側パネルに在庫・入荷予定情報を表示。
- **入荷予定ページ**: 関連情報アクション（在庫確認・入荷予定確認）を追加。
- **各ページ間の遷移リンク**: 「在庫を確認」「入荷予定を確認」ボタンで相互遷移を実装。

---

## Phase 5（Forecast データ表示問題）残タスク
1. **DB データ確認**: `forecast_current` テーブルのレコードを確認し、`forecast_period` が期待通りか検証。
2. **フロントエンドロジック追跡**: `useForecastCalculations` が `forecast_period` をどの範囲で取得・フィルタしているかコードを追う。
3. **シードロジック調整（必要なら）**:
   - `create_forecast_data` の `forecast_period` 計算をフロントエンドが期待する形に合わせる。
   - `forecasts` パラメータが正しく渡されているか確認し、デフォルトで予測が生成されるようにする。
4. **テスト／検証**:
   - 修正後にシードデータを再生成し、Forecast ページで日次・旬・月次が正しく表示されるか手動確認。
   - 必要に応じて自動テストを追加。

### オプション: 追加アラート実装（時間があれば）
- **A2**: 日別フォーキャスト前倒しアラート
- **B1**: 安全在庫割れアラート（`safety_stock` フィールド追加）
- **B2**: 在庫過多アラート
- **C1**: フォーキャスト未達アラート
- **検証計画**:
  - **バックエンド**: `cd backend && pytest tests/test_alerts.py -v`
  - **フロントエンド**: `cd frontend && npm run typecheck && npm run lint`
  - **手動確認**: ダッシュボードでアラート一覧が表示、期限切れロットで B3 アラート、フォーキャストに紐づかない受注で A1 アラート、アラートから詳細ページへ遷移できることを確認。

---

*このファイルは作業中断時の証跡として保存しました。次回作業時に上記タスクを順に実施してください。*
