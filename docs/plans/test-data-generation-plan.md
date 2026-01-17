# テストデータ生成システム改善計画書

## 1. 背景と目的

### 1.1 現状の課題

現在のテストデータ生成システムには以下の問題がある：

| 課題 | 詳細 |
|------|------|
| **表面的なデータ** | 正常系パターンが中心で、エッジケースが不足 |
| **短い期間** | 翌月分のフォーキャストのみ（1ヶ月分） |
| **一括生成のみ** | 個別モジュールの選択的生成ができない |
| **状態変化の欠如** | 取り消し、変更、削除などの履歴データが少ない |
| **テスト網羅性不足** | ビジネスロジックの境界値テストに必要なデータがない |

### 1.2 目標

1. **6ヶ月〜1年分**の時系列データを生成
2. **モジュール単位での選択的生成**を可能に
3. **包括的なエッジケース**をすべてのエンティティで網羅
4. **テスト駆動開発**を支援する高品質なデータセット

---

## 2. 新アーキテクチャ設計

### 2.1 モジュール構成（リファクタリング後）

```
backend/app/application/services/test_data/
├── __init__.py
├── orchestrator.py          # 新規: 統合オーケストレーター
├── config.py                # 新規: 生成設定と期間管理
├── scenarios/               # 新規: シナリオベース生成
│   ├── __init__.py
│   ├── base.py              # シナリオ基底クラス
│   ├── normal_operations.py # 正常系シナリオ
│   ├── edge_cases.py        # エッジケース集約
│   ├── cancellation.py      # 取り消し系シナリオ
│   ├── time_series.py       # 時系列パターン
│   ├── traceability.py      # トレーサビリティシナリオ（ロット履歴追跡）
│   └── stress_test.py       # 大量データシナリオ
├── generators/              # 既存モジュールをリファクタ
│   ├── __init__.py
│   ├── masters.py           # マスタデータ（拡張）
│   ├── inventory.py         # 在庫・ロット（拡張）
│   ├── forecasts.py         # フォーキャスト（拡張）
│   ├── orders.py            # 受注（拡張）
│   ├── inbound.py           # 入荷予定（拡張）
│   ├── withdrawals.py       # 出庫履歴（拡張）
│   └── reservations.py      # 新規: 予約専用
├── edge_cases/              # 新規: エッジケース専用
│   ├── __init__.py
│   ├── lot_edge_cases.py
│   ├── order_edge_cases.py
│   ├── forecast_edge_cases.py
│   ├── inbound_edge_cases.py
│   └── allocation_edge_cases.py
└── utils.py                 # ユーティリティ（拡張）
```

### 2.2 選択的生成API設計

```python
# POST /api/admin/test-data/generate
{
    "modules": ["masters", "lots", "forecasts", "orders"],  # 選択的
    "period": {
        "start_date": "2024-07-01",
        "end_date": "2025-06-30"
    },
    "scenarios": ["normal", "edge_cases", "cancellations"],
    "scale": "medium",  # small/medium/large
    "seed": 42  # 再現性
}
```

---

## 3. エンティティ別エッジケース定義

### 3.1 ロット (LotReceipt / LotMaster)

| カテゴリ | エッジケース | テスト目的 |
|----------|-------------|-----------|
| **期限系** | 本日期限切れ | 期限当日の警告表示 |
| | 明日期限 | 直前警告ロジック |
| | 3日以内期限 | 短期警告範囲 |
| | 7日以内期限 | 中期警告範囲 |
| | 30日以内期限 | 長期警告範囲 |
| | 期限切れ（1日前） | 境界値テスト |
| | 期限切れ（1ヶ月前） | 古い期限切れ |
| | 期限切れ（1年前） | 長期放置 |
| **数量系** | 数量=0（消費済） | 空ロット表示 |
| | 数量=1（最小） | 最小数量割当 |
| | 数量=0.01（小数最小） | 小数点精度 |
| | 数量=999,999（大量） | 大量在庫表示 |
| | 受入=100, 消費=100 | 完全消費 |
| | 受入=100, 消費=99 | 残1個 |
| | 受入=100, 消費=101 | **マイナス在庫**（異常検知） |
| **ロック系** | 全数ロック | 割当不可状態 |
| | 部分ロック | 残数のみ割当可能 |
| | ロック解除待ち | ロック解除フロー |
| **状態系** | 新規入荷（当日） | 新着表示 |
| | ステータス=active | 通常状態 |
| | ステータス=depleted | 枯渇状態 |
| | ステータス=expired | 期限切れ状態 |
| | ステータス=on_hold | 保留状態 |
| | ステータス=quarantine | 検疫中状態 |
| **FEFO系** | 同一製品で期限異なる3ロット | FEFO順序検証 |
| | 同一期限で入荷日異なる | FIFO fallback |
| | 複数倉庫に分散 | 倉庫間FEFO |
| **予約系** | 全数予約済み | 新規割当不可 |
| | 部分予約 | 残数割当可能 |
| | 予約+ロック重複 | 複合制約 |
| **取り消し系** | 入荷取り消し済み | 取り消しロット表示 |
| | 部分返品後 | 返品反映 |

### 3.2 受注 (Order / OrderLine)

| カテゴリ | エッジケース | テスト目的 |
|----------|-------------|-----------|
| **ステータス系** | draft（下書き） | 未確定受注 |
| | pending（保留） | 割当待ち |
| | allocated（割当済） | 出荷待ち |
| | shipped（出荷済） | 完了系 |
| | completed（完了） | 最終状態 |
| | cancelled（取消） | キャンセル表示 |
| | on_hold（保留） | 一時停止 |
| | partial_shipped（部分出荷） | 分割出荷 |
| **日付系** | 納期=本日 | 当日出荷 |
| | 納期=明日 | 翌日出荷 |
| | 納期=過去（1日前） | 納期遅延 |
| | 納期=過去（1週間前） | 長期遅延 |
| | 納期=1ヶ月後 | 通常リードタイム |
| | 納期=6ヶ月後 | 長期受注 |
| | 受注日=本日 | 当日受注 |
| | 受注日=1年前 | 古い受注 |
| **数量系** | 数量=1 | 最小受注 |
| | 数量=0.001 | 小数点最小 |
| | 数量=10,000 | 大量受注 |
| | 在庫超過受注 | 欠品シナリオ |
| | 在庫ギリギリ受注 | 境界値 |
| **割当系** | 単一ロットで充足 | 基本割当 |
| | 複数ロット分割割当 | 分割アルゴリズム |
| | ロット不足で部分割当 | 部分割当 |
| | 全ロット期限切れ | 割当不可 |
| | 同一製品複数明細 | 集約処理 |
| **異常系** | フォーキャストなし受注 | 予測外需要 |
| | フォーキャスト超過受注 | 追加需要 |
| | 顧客マッピングなし | マスタ不整合 |
| | 納入先変更受注 | 変更履歴 |
| **取り消し系** | 受注キャンセル | キャンセルフロー |
| | 割当後キャンセル | ロールバック |
| | 出荷後キャンセル | 返品フロー |
| | 部分キャンセル | 数量変更 |
| | キャンセル後再受注 | 履歴管理 |
| **変更系** | 数量変更（増加） | 追加割当 |
| | 数量変更（減少） | 割当解除 |
| | 納期変更（前倒し） | 優先度変更 |
| | 納期変更（後ろ倒し） | 再スケジュール |
| | 製品変更 | 明細差替 |

### 3.3 フォーキャスト (ForecastCurrent / ForecastHistory)

| カテゴリ | エッジケース | テスト目的 |
|----------|-------------|-----------|
| **期間系** | 日別フォーキャスト | 基本単位 |
| | 旬別フォーキャスト | 集約単位 |
| | 月別フォーキャスト | 大枠予測 |
| | 過去期間のフォーキャスト | 履歴比較 |
| | 6ヶ月先フォーキャスト | 長期予測 |
| **数量系** | 数量=0 | ゼロ予測 |
| | 数量=1 | 最小予測 |
| | 数量=100,000 | 大量予測 |
| | 小数点フォーキャスト | 精度検証 |
| **パターン系** | 毎日一定量 | 定常需要 |
| | 週次変動パターン | 週末増減 |
| | 月次変動パターン | 月初/月末 |
| | 季節変動パターン | 繁忙期/閑散期 |
| | 急激な増加 | スパイク |
| | 急激な減少 | ドロップ |
| **ギャップ系** | 欠損日あり | 間引きパターン |
| | 重複エントリ | 重複検出 |
| | 日付跨ぎなし | 連続性 |
| **履歴系** | 履歴なし（新規） | 初回予測 |
| | 履歴10件 | 通常履歴 |
| | 履歴100件 | 長期履歴 |
| | 履歴との乖離大 | 予測精度検証 |
| **マッピング系** | 複数顧客同一製品 | 集約計算 |
| | 複数納入先同一顧客 | 分散計算 |
| | 顧客なしフォーキャスト | 孤立データ |
| **取り消し系** | フォーキャスト削除 | 削除影響 |
| | フォーキャスト更新 | 差分計算 |
| | フォーキャスト巻き戻し | 履歴復元 |

### 3.4 入荷予定 (InboundPlan / InboundPlanLine / ExpectedLot)

| カテゴリ | エッジケース | テスト目的 |
|----------|-------------|-----------|
| **ステータス系** | planned（計画中） | 未着予定 |
| | in_transit（輸送中） | 到着待ち |
| | received（入荷済） | 完了 |
| | cancelled（取消） | キャンセル |
| | partial_received（部分入荷） | 分割入荷 |
| | delayed（遅延） | 遅延対応 |
| **日付系** | 入荷予定=本日 | 当日入荷 |
| | 入荷予定=明日 | 翌日入荷 |
| | 入荷予定=過去（遅延） | 遅延入荷 |
| | 入荷予定=1ヶ月後 | 通常リード |
| | 入荷予定=6ヶ月後 | 長期計画 |
| **数量系** | 予定数量=1 | 最小入荷 |
| | 予定数量=10,000 | 大量入荷 |
| | 実績 < 予定（欠品） | 不足入荷 |
| | 実績 > 予定（過剰） | 過剰入荷 |
| | 実績 = 予定（正常） | 正常入荷 |
| **複数明細** | 1予定1明細 | 基本 |
| | 1予定10明細 | 複数製品 |
| | 同一製品複数明細 | 製品重複 |
| **ロット連携** | 予定ロット=実績ロット | 正常紐付け |
| | 予定ロット≠実績ロット | ロット変更 |
| | ロット分割入荷 | 分割受入 |
| **取り消し系** | 入荷予定キャンセル | キャンセル |
| | 部分キャンセル | 数量減 |
| | キャンセル後再計画 | 再発注 |
| **変更系** | 入荷日変更（前倒し） | 早着 |
| | 入荷日変更（後ろ倒し） | 遅延 |
| | 数量変更 | 数量修正 |
| | サプライヤー変更 | 振替 |

### 3.5 出庫履歴 (Withdrawal)

| カテゴリ | エッジケース | テスト目的 |
|----------|-------------|-----------|
| **タイプ系** | ORDER_AUTO（自動出荷） | 通常出荷 |
| | ORDER_MANUAL（手動出荷） | 手動操作 |
| | ADJUSTMENT（調整） | 棚卸調整 |
| | DISPOSAL（廃棄） | 期限切れ廃棄 |
| | SAMPLE（サンプル） | サンプル出荷 |
| | RETURN（返品） | 返品処理 |
| | TRANSFER（移動） | 倉庫間移動 |
| **数量系** | 数量=1 | 最小出庫 |
| | 数量=全数 | 全量出庫 |
| | 数量=残数超過 | 過剰出庫（エラー） |
| **取り消し系** | 出庫取り消し | キャンセル |
| | 取り消し後再出庫 | 再処理 |
| | 部分取り消し | 数量変更 |
| **日付系** | 出庫日=本日 | 当日出庫 |
| | 出庫日=過去（1年前） | 過去履歴 |
| | 出庫日=未来（予定） | 出庫予定 |

### 3.6 マスタデータ

| エンティティ | エッジケース | テスト目的 |
|-------------|-------------|-----------|
| **顧客** | アクティブ顧客 | 通常 |
| | 非アクティブ顧客 | 停止顧客 |
| | 納入先なし顧客 | 不完全マスタ |
| | 納入先100件顧客 | 大量納入先 |
| | 削除済み顧客 | 論理削除 |
| **製品** | アクティブ製品 | 通常 |
| | 廃番製品 | 非アクティブ |
| | 新規製品（在庫なし） | 初期状態 |
| | SKU違い同一品 | 製品マッピング |
| | 単位変換あり | UOM変換 |
| **サプライヤー** | アクティブサプライヤー | 通常 |
| | 非アクティブサプライヤー | 停止 |
| | 複数製品サプライヤー | 多品目 |
| | 単一製品サプライヤー | 専門 |
| **倉庫** | アクティブ倉庫 | 通常 |
| | 非アクティブ倉庫 | 閉鎖 |
| | 複数製品倉庫 | 大型倉庫 |
| | 単一製品倉庫 | 専用倉庫 |

---

## 4. 時系列データ生成戦略

### 4.1 期間設定

```python
class DataGenerationPeriod:
    """生成期間の設定"""

    # 推奨: 過去6ヶ月 + 将来6ヶ月 = 1年分
    PAST_MONTHS = 6      # 履歴データ期間
    FUTURE_MONTHS = 6    # 将来予測期間

    # 詳細度設定
    DAILY_DETAIL_MONTHS = 3   # 日別詳細を生成する月数
    WEEKLY_DETAIL_MONTHS = 6  # 週別詳細を生成する月数
```

### 4.2 時系列パターン

```python
TIME_SERIES_PATTERNS = {
    "steady": {
        "description": "定常需要（変動なし）",
        "variance": 0.05,
        "trend": 0,
    },
    "growing": {
        "description": "成長トレンド（月5%増）",
        "variance": 0.10,
        "trend": 0.05,
    },
    "declining": {
        "description": "減少トレンド（月3%減）",
        "variance": 0.10,
        "trend": -0.03,
    },
    "seasonal_summer": {
        "description": "夏季繁忙（6-8月150%）",
        "peak_months": [6, 7, 8],
        "peak_factor": 1.5,
    },
    "seasonal_winter": {
        "description": "冬季繁忙（11-1月150%）",
        "peak_months": [11, 12, 1],
        "peak_factor": 1.5,
    },
    "weekly_pattern": {
        "description": "週次パターン（月曜多、週末少）",
        "day_factors": {0: 1.3, 1: 1.1, 2: 1.0, 3: 1.0, 4: 0.9, 5: 0.4, 6: 0.3},
    },
    "spike": {
        "description": "スパイク（特定日に急増）",
        "spike_days": [15],  # 毎月15日
        "spike_factor": 3.0,
    },
    "irregular": {
        "description": "不規則（ランダム変動大）",
        "variance": 0.40,
    },
}
```

### 4.3 履歴データ生成

```python
def generate_historical_data(months: int = 6):
    """過去データの生成戦略"""

    for month_offset in range(-months, 0):
        target_date = today + relativedelta(months=month_offset)

        # ロット: 入荷→消費→出荷の一連フロー
        generate_lot_history(target_date)

        # 受注: 受注→割当→出荷→完了
        generate_order_history(target_date)

        # フォーキャスト: 予測→実績の比較データ
        generate_forecast_vs_actual(target_date)

        # 入荷: 計画→入荷完了
        generate_inbound_history(target_date)
```

---

## 5. データ規模設定

### 5.1 スケール定義

| スケール | 顧客 | 製品 | ロット | 受注 | フォーキャスト | 用途 |
|---------|------|------|--------|------|--------------|------|
| **small** | 5 | 10 | 50 | 100 | 500 | 単体テスト |
| **medium** | 20 | 50 | 300 | 1,000 | 3,000 | 統合テスト |
| **large** | 50 | 200 | 2,000 | 10,000 | 30,000 | パフォーマンステスト |
| **production** | 100 | 500 | 10,000 | 50,000 | 150,000 | 本番シミュレーション |

### 5.2 エッジケース比率

```python
EDGE_CASE_DISTRIBUTION = {
    # 正常系: 70%
    "normal": 0.70,

    # 境界値: 15%
    "boundary": 0.15,

    # 異常系: 10%
    "anomaly": 0.10,

    # 極端ケース: 5%
    "extreme": 0.05,
}
```

---

## 6. 実装計画

### Phase 1: 基盤整備

**目標**: モジュール構造のリファクタリングと設定システム

| タスク | 詳細 |
|--------|------|
| 1.1 | `config.py` 作成 - 生成設定の一元管理 |
| 1.2 | `orchestrator.py` 作成 - 選択的生成のオーケストレーション |
| 1.3 | 既存モジュールを `generators/` に移動 |
| 1.4 | API エンドポイントの拡張 |
| 1.5 | 基本UIの更新（モジュール選択） |

### Phase 2: エッジケース実装

**目標**: 各エンティティのエッジケース生成器

| タスク | 詳細 |
|--------|------|
| 2.1 | `edge_cases/lot_edge_cases.py` - ロットエッジケース |
| 2.2 | `edge_cases/order_edge_cases.py` - 受注エッジケース |
| 2.3 | `edge_cases/forecast_edge_cases.py` - フォーキャストエッジケース |
| 2.4 | `edge_cases/inbound_edge_cases.py` - 入荷予定エッジケース |
| 2.5 | `edge_cases/allocation_edge_cases.py` - 割当エッジケース |
| 2.6 | 取り消しデータ専用生成器 |
| 2.7 | `scenarios/traceability.py` - トレーサビリティシナリオ生成 |
| 2.8 | ロット-受注-フォーキャスト紐付けデータ生成 |

### Phase 3: 時系列拡張

**目標**: 6ヶ月〜1年分の時系列データ

| タスク | 詳細 |
|--------|------|
| 3.1 | `scenarios/time_series.py` - 時系列パターン定義 |
| 3.2 | 履歴データ生成ロジック |
| 3.3 | 将来予測データ生成ロジック |
| 3.4 | 季節変動パターン実装 |
| 3.5 | 週次・日次パターン実装 |

### Phase 4: シナリオ統合

**目標**: ビジネスシナリオの組み合わせ

| タスク | 詳細 |
|--------|------|
| 4.1 | `scenarios/normal_operations.py` - 正常業務フロー |
| 4.2 | `scenarios/cancellation.py` - 取り消しシナリオ |
| 4.3 | `scenarios/stress_test.py` - 負荷テストデータ |
| 4.4 | シナリオ組み合わせテスト |

### Phase 5: テスト・ドキュメント

**目標**: 品質保証とドキュメント整備

| タスク | 詳細 |
|--------|------|
| 5.1 | 生成データの検証テスト |
| 5.2 | エッジケースカバレッジレポート |
| 5.3 | 使用ガイドの作成 |
| 5.4 | API ドキュメントの更新 |

---

## 7. API設計詳細

### 7.1 生成エンドポイント

```python
# POST /api/admin/test-data/generate
class GenerateRequest(BaseModel):
    """テストデータ生成リクエスト"""

    # モジュール選択
    modules: list[str] = ["all"]  # masters, lots, forecasts, orders, inbound, withdrawals

    # 期間設定
    period: PeriodConfig | None = None

    # シナリオ選択
    scenarios: list[str] = ["normal", "edge_cases"]

    # スケール
    scale: Literal["small", "medium", "large"] = "medium"

    # 乱数シード
    seed: int = 42

    # オプション
    include_cancellations: bool = True
    include_history: bool = True
    time_series_pattern: str = "mixed"


class PeriodConfig(BaseModel):
    """期間設定"""
    past_months: int = 6
    future_months: int = 6
    daily_detail_months: int = 3
```

### 7.2 プリセットエンドポイント

```python
# GET /api/admin/test-data/presets
# 事前定義されたデータセットの一覧

presets = [
    {
        "id": "quick-test",
        "name": "クイックテスト",
        "description": "最小限のデータで素早くテスト",
        "scale": "small",
        "scenarios": ["normal"],
    },
    {
        "id": "full-coverage",
        "name": "フルカバレッジ",
        "description": "全エッジケースを含む完全なデータセット",
        "scale": "medium",
        "scenarios": ["normal", "edge_cases", "cancellations", "time_series"],
    },
    {
        "id": "edge-cases-only",
        "name": "エッジケースのみ",
        "description": "境界値・異常系のテスト用",
        "scale": "small",
        "scenarios": ["edge_cases"],
    },
    {
        "id": "performance-test",
        "name": "パフォーマンステスト",
        "description": "大量データでの負荷テスト",
        "scale": "large",
        "scenarios": ["normal"],
    },
]
```

### 7.3 個別モジュール生成

```python
# POST /api/admin/test-data/generate/{module}
# 特定モジュールのみ生成（依存関係を自動解決）

# 例: POST /api/admin/test-data/generate/orders
# → 自動的に masters, lots, forecasts を先に生成
```

---

## 8. 取り消し・変更データの詳細設計

### 8.1 取り消しシナリオカタログ

```python
CANCELLATION_SCENARIOS = {
    # 受注取り消し
    "order_cancelled_before_allocation": {
        "description": "割当前に受注キャンセル",
        "flow": ["order_created", "order_cancelled"],
        "impact": "なし",
    },
    "order_cancelled_after_allocation": {
        "description": "割当後に受注キャンセル",
        "flow": ["order_created", "allocated", "order_cancelled"],
        "impact": "ロット予約解除",
    },
    "order_cancelled_after_partial_ship": {
        "description": "部分出荷後に残りキャンセル",
        "flow": ["order_created", "allocated", "partial_shipped", "remaining_cancelled"],
        "impact": "残数のロット予約解除",
    },

    # 入荷予定取り消し
    "inbound_cancelled_before_arrival": {
        "description": "入荷前に入荷予定キャンセル",
        "flow": ["inbound_planned", "inbound_cancelled"],
        "impact": "予定在庫減少",
    },
    "inbound_partial_cancelled": {
        "description": "入荷予定の数量減少",
        "flow": ["inbound_planned", "quantity_reduced"],
        "impact": "予定在庫減少",
    },

    # 出庫取り消し
    "withdrawal_cancelled": {
        "description": "出庫取り消し（在庫戻し）",
        "flow": ["withdrawn", "withdrawal_cancelled"],
        "impact": "ロット数量復元",
    },

    # フォーキャスト取り消し
    "forecast_deleted": {
        "description": "フォーキャスト削除",
        "flow": ["forecast_created", "forecast_deleted"],
        "impact": "予約解除",
    },
    "forecast_reduced": {
        "description": "フォーキャスト数量減少",
        "flow": ["forecast_created", "quantity_reduced"],
        "impact": "予約数量減少",
    },
}
```

### 8.2 変更履歴データ

```python
CHANGE_HISTORY_SCENARIOS = {
    # 受注変更
    "order_quantity_increased": {
        "description": "受注数量増加",
        "changes": [
            {"field": "order_quantity", "old": 100, "new": 150},
        ],
    },
    "order_quantity_decreased": {
        "description": "受注数量減少",
        "changes": [
            {"field": "order_quantity", "old": 100, "new": 50},
        ],
    },
    "order_delivery_date_changed": {
        "description": "納期変更",
        "changes": [
            {"field": "delivery_date", "old": "2025-01-15", "new": "2025-01-20"},
        ],
    },
    "order_delivery_place_changed": {
        "description": "納入先変更",
        "changes": [
            {"field": "delivery_place_id", "old": 1, "new": 2},
        ],
    },

    # 入荷予定変更
    "inbound_arrival_date_changed": {
        "description": "入荷予定日変更",
        "changes": [
            {"field": "planned_arrival_date", "old": "2025-01-10", "new": "2025-01-15"},
        ],
    },
    "inbound_quantity_changed": {
        "description": "入荷予定数量変更",
        "changes": [
            {"field": "planned_quantity", "old": 100, "new": 80},
        ],
    },
}
```

### 8.3 トレーサビリティデータ生成

**目的**: ロットを起点としたデータの紐付け（追跡可能性）を検証するためのテストデータ

#### 8.3.1 トレーサビリティ関連テーブル

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ロット中心のトレーサビリティ                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   InboundPlan ──→ ExpectedLot ──→ LotReceipt (入荷元)               │
│                                        │                            │
│                                        ▼                            │
│   ForecastCurrent ←── LotReservation ──┤ (予約関係)                 │
│   (source_type=forecast)               │                            │
│                                        │                            │
│   OrderLine ←──────── LotReservation ──┤ (割当関係)                 │
│   (source_type=order)                  │                            │
│                                        │                            │
│                                        ▼                            │
│                                   Withdrawal (出庫履歴)              │
│                                        │                            │
│                                        ▼                            │
│                              Customer / DeliveryPlace               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 8.3.2 ロット履歴シナリオ（製品別・ロット別）

```python
LOT_TRACEABILITY_SCENARIOS = {
    # シナリオ1: 完全なライフサイクル
    "full_lifecycle": {
        "description": "入荷→予約→割当→出荷の完全フロー",
        "data": {
            "inbound_plan": {"status": "received", "quantity": 100},
            "lot_receipt": {"received_quantity": 100, "status": "active"},
            "reservations": [
                {"source_type": "forecast", "source_id": "forecast_1", "qty": 30},
                {"source_type": "order", "source_id": "order_line_1", "qty": 50},
            ],
            "withdrawals": [
                {"type": "ORDER_AUTO", "quantity": 50, "order_line_id": "order_line_1"},
                {"type": "SAMPLE", "quantity": 5, "customer_id": "customer_1"},
            ],
        },
        "expected_current_qty": 45,  # 100 - 50 - 5
    },

    # シナリオ2: 複数受注への分割割当
    "multi_order_allocation": {
        "description": "1ロットから複数受注への割当",
        "data": {
            "lot_receipt": {"received_quantity": 200, "status": "active"},
            "reservations": [
                {"source_type": "order", "source_id": "order_line_1", "qty": 50},
                {"source_type": "order", "source_id": "order_line_2", "qty": 70},
                {"source_type": "order", "source_id": "order_line_3", "qty": 30},
            ],
            "withdrawals": [
                {"type": "ORDER_AUTO", "quantity": 50, "order_line_id": "order_line_1"},
                {"type": "ORDER_AUTO", "quantity": 70, "order_line_id": "order_line_2"},
            ],
        },
        "expected_current_qty": 80,  # 200 - 50 - 70
        "expected_reserved_qty": 30,  # order_line_3 pending
    },

    # シナリオ3: フォーキャスト→受注の変換
    "forecast_to_order_conversion": {
        "description": "フォーキャスト予約が受注予約に変換",
        "data": {
            "lot_receipt": {"received_quantity": 100, "status": "active"},
            "reservations": [
                {"source_type": "forecast", "source_id": "forecast_1", "qty": 40, "status": "released"},
                {"source_type": "order", "source_id": "order_line_1", "qty": 40, "status": "active"},
            ],
        },
        "note": "フォーキャスト予約がreleased、同数量の受注予約がactive",
    },

    # シナリオ4: 部分出荷と残在庫
    "partial_shipment": {
        "description": "部分出荷後の残在庫追跡",
        "data": {
            "lot_receipt": {"received_quantity": 100, "status": "active"},
            "reservations": [
                {"source_type": "order", "source_id": "order_line_1", "qty": 100, "status": "active"},
            ],
            "withdrawals": [
                {"type": "ORDER_AUTO", "quantity": 60, "ship_date": "2025-01-10"},
            ],
        },
        "expected_current_qty": 40,
        "expected_reserved_qty": 100,  # 予約はまだ全数
        "note": "予約100、出荷60、残40がまだ予約済み（部分出荷状態）",
    },

    # シナリオ5: キャンセルと予約解除
    "cancellation_flow": {
        "description": "受注キャンセルによる予約解除",
        "data": {
            "lot_receipt": {"received_quantity": 100, "status": "active"},
            "reservations": [
                {"source_type": "order", "source_id": "order_line_1", "qty": 50, "status": "released",
                 "cancel_reason": "customer_request"},
            ],
        },
        "expected_available_qty": 100,  # 予約解除で全数利用可能
    },

    # シナリオ6: 同一製品・複数ロット（FEFO検証用）
    "multi_lot_fefo": {
        "description": "同一製品の複数ロットへの分散割当",
        "data": {
            "lots": [
                {"lot_number": "LOT-001", "expiry": "2025-02-01", "qty": 50},
                {"lot_number": "LOT-002", "expiry": "2025-03-01", "qty": 80},
                {"lot_number": "LOT-003", "expiry": "2025-04-01", "qty": 100},
            ],
            "order": {"quantity": 100},
            "expected_allocation": [
                {"lot": "LOT-001", "qty": 50},  # 先に期限の近いロットから
                {"lot": "LOT-002", "qty": 50},  # 残りを次のロットから
            ],
        },
    },
}
```

#### 8.3.3 手動出庫シナリオ（受注経由ではない出庫）

**重要**: 受注システムを経由しない出庫パターン。紙ベースのデータ、ロット管理画面からの直接出庫など。

```python
MANUAL_WITHDRAWAL_SCENARIOS = {
    # ========================================
    # 手動出庫タイプ別シナリオ
    # ========================================

    # 1. 紙データ→手動登録→出庫
    "paper_based_manual_order": {
        "description": "FAXや紙で来た注文を手動でロットから払い出す",
        "type": "ORDER_MANUAL",
        "flow": [
            "紙注文書受領",
            "ロット管理画面で対象ロット選択",
            "手動出庫登録（reference_number: 紙注文書番号）",
            "出庫完了",
        ],
        "data": {
            "lot": "LOT-001",
            "quantity": 50,
            "withdrawal_type": "order_manual",
            "customer_id": "CUST-001",
            "delivery_place_id": "DP-001",
            "reference_number": "FAX-2025-001234",
            "reason": "紙注文書（FAX）による出荷",
        },
        "note": "受注テーブルにレコードなし、Withdrawalのみ",
    },

    # 2. サンプル出荷（営業用）
    "sample_shipment": {
        "description": "営業担当がサンプルとして顧客に提供",
        "type": "SAMPLE",
        "data": {
            "lot": "LOT-001",
            "quantity": 5,
            "withdrawal_type": "sample",
            "customer_id": "CUST-002",
            "reason": "新製品サンプル提供（営業: 山田）",
            "reference_number": "SAMPLE-2025-0001",
        },
    },

    # 3. 社内使用（検査・試作）
    "internal_use_testing": {
        "description": "品質検査や試作のための社内消費",
        "type": "INTERNAL_USE",
        "data": {
            "lot": "LOT-001",
            "quantity": 10,
            "withdrawal_type": "internal_use",
            "customer_id": None,  # 顧客なし
            "delivery_place_id": None,
            "reason": "品質検査用サンプル（検査部門）",
            "reference_number": "QC-2025-0001",
        },
    },

    # 4. 廃棄処理（期限切れ）
    "disposal_expired": {
        "description": "期限切れロットの廃棄",
        "type": "DISPOSAL",
        "data": {
            "lot": "LOT-EXPIRED-001",
            "quantity": 100,  # 残全数を廃棄
            "withdrawal_type": "disposal",
            "customer_id": None,
            "reason": "有効期限切れ（2025-01-01期限）",
            "reference_number": "DISP-2025-0001",
        },
    },

    # 5. 廃棄処理（品質不良）
    "disposal_quality_issue": {
        "description": "品質検査NGによる廃棄",
        "type": "DISPOSAL",
        "data": {
            "lot": "LOT-001",
            "quantity": 20,
            "withdrawal_type": "disposal",
            "reason": "品質検査NG（異物混入）",
            "reference_number": "QA-REJECT-2025-0001",
        },
    },

    # 6. 返品受入（顧客から戻ってきた在庫）
    "return_from_customer": {
        "description": "顧客からの返品を受け入れ（マイナス出庫として記録）",
        "type": "RETURN",
        "note": "返品は別途入荷処理で在庫戻しする設計の場合もある",
        "data": {
            "withdrawal_type": "return",
            "customer_id": "CUST-001",
            "reason": "顧客都合返品（品番相違）",
            "reference_number": "RET-2025-0001",
        },
    },

    # 7. その他（特殊ケース）
    "other_special_case": {
        "description": "分類困難な特殊出庫",
        "type": "OTHER",
        "data": {
            "lot": "LOT-001",
            "quantity": 3,
            "withdrawal_type": "other",
            "reason": "展示会用貸出（要返却）",
            "reference_number": "EXHIBIT-2025-001",
        },
    },
}
```

#### 8.3.4 分納・複数回入出庫シナリオ

**重要**: 同一ロット/同一受注に対する複数回の入出庫パターン

```python
PARTIAL_DELIVERY_SCENARIOS = {
    # ========================================
    # 分納（同一ロットの複数回出庫）
    # ========================================

    # 1. 同一ロットからの時間差出庫
    "same_lot_multiple_withdrawals": {
        "description": "同一ロットから異なる日に複数回出庫",
        "lot": "LOT-001",
        "initial_qty": 200,
        "withdrawals": [
            {"date": "2025-01-05", "qty": 50, "type": "ORDER_MANUAL", "customer": "CUST-A"},
            {"date": "2025-01-08", "qty": 30, "type": "ORDER_MANUAL", "customer": "CUST-B"},
            {"date": "2025-01-12", "qty": 40, "type": "SAMPLE", "customer": "CUST-C"},
            {"date": "2025-01-15", "qty": 20, "type": "ORDER_MANUAL", "customer": "CUST-A"},
        ],
        "remaining_qty": 60,  # 200 - 50 - 30 - 40 - 20
        "note": "同一ロットでも出庫先・日付・タイプが異なる",
    },

    # 2. 受注に対する部分出荷（複数回）
    "order_partial_shipments": {
        "description": "1つの受注を複数回に分けて出荷",
        "order": {"order_line_id": "OL-001", "quantity": 100},
        "shipments": [
            {"date": "2025-01-05", "lot": "LOT-001", "qty": 40, "status": "shipped"},
            {"date": "2025-01-10", "lot": "LOT-001", "qty": 30, "status": "shipped"},
            {"date": "2025-01-15", "lot": "LOT-002", "qty": 30, "status": "shipped"},  # ロット切替
        ],
        "total_shipped": 100,
        "note": "最後の出荷でロットが切り替わるケース",
    },

    # 3. 分割入荷（同一入荷予定の複数回入荷）
    "inbound_partial_receipts": {
        "description": "1つの入荷予定を複数回に分けて入荷",
        "inbound_plan": {"plan_id": "IP-001", "planned_qty": 500},
        "receipts": [
            {"date": "2025-01-05", "lot": "LOT-NEW-001", "qty": 200},
            {"date": "2025-01-08", "lot": "LOT-NEW-001", "qty": 150},  # 同一ロット追加入荷
            {"date": "2025-01-12", "lot": "LOT-NEW-002", "qty": 150},  # 別ロットで残り入荷
        ],
        "total_received": 500,
        "note": "同一ロットへの追加入荷と、別ロットでの入荷が混在",
    },

    # 4. 同一ロットへの追加入荷
    "lot_additional_receipt": {
        "description": "既存ロットへの追加入荷（同一ロット番号で数量増加）",
        "lot": "LOT-001",
        "receipts": [
            {"date": "2025-01-01", "qty": 100, "type": "initial"},
            {"date": "2025-01-10", "qty": 50, "type": "additional"},
            {"date": "2025-01-20", "qty": 30, "type": "additional"},
        ],
        "total_received": 180,
        "note": "同一ロット番号で受入数量が増加していくケース",
    },

    # ========================================
    # 複数ロットからの払出
    # ========================================

    # 5. 1出庫→複数ロット（WithdrawalLine使用）
    "single_withdrawal_multi_lot": {
        "description": "1回の出庫で複数ロットから払い出す（FIFO）",
        "withdrawal": {"id": "W-001", "total_qty": 150},
        "lines": [
            {"lot": "LOT-001", "qty": 50, "expiry": "2025-02-01"},   # 先に期限近いロット
            {"lot": "LOT-002", "qty": 80, "expiry": "2025-03-01"},   # 次に期限近いロット
            {"lot": "LOT-003", "qty": 20, "expiry": "2025-04-01"},   # 残りを別ロットから
        ],
        "note": "WithdrawalLineで各ロットからの出庫数を記録",
    },

    # 6. 1受注→複数ロット割当
    "single_order_multi_lot_allocation": {
        "description": "1つの受注明細に複数ロットを割り当て",
        "order_line": {"id": "OL-001", "product": "PRD-001", "quantity": 200},
        "allocations": [
            {"lot": "LOT-001", "qty": 80, "expiry": "2025-02-01"},
            {"lot": "LOT-002", "qty": 100, "expiry": "2025-03-01"},
            {"lot": "LOT-003", "qty": 20, "expiry": "2025-04-01"},
        ],
        "note": "LotReservationが3件作成される",
    },

    # 7. 複数受注→同一ロット
    "multi_order_same_lot": {
        "description": "複数の受注が同一ロットから割り当てられる",
        "lot": {"id": "LOT-001", "qty": 300},
        "orders": [
            {"order_line": "OL-001", "customer": "CUST-A", "qty": 100},
            {"order_line": "OL-002", "customer": "CUST-B", "qty": 80},
            {"order_line": "OL-003", "customer": "CUST-A", "qty": 50},
        ],
        "remaining_qty": 70,  # 300 - 100 - 80 - 50
    },

    # ========================================
    # 部分納品後のキャンセル
    # ========================================

    # 8. 受注：部分出荷後に残りキャンセル
    "order_partial_then_cancel": {
        "description": "分納予定の受注で一部出荷後、残りをキャンセル",
        "order_line": {"id": "OL-001", "quantity": 100},
        "timeline": [
            {"date": "2025-01-05", "action": "ship", "qty": 40, "lot": "LOT-001"},
            {"date": "2025-01-10", "action": "ship", "qty": 30, "lot": "LOT-001"},
            {"date": "2025-01-15", "action": "cancel_remaining", "qty": 30,
             "reason": "顧客都合キャンセル", "cancel_reason": "customer_request"},
        ],
        "final_state": {
            "shipped_qty": 70,
            "cancelled_qty": 30,
            "status": "partial_shipped",  # or "closed"
        },
        "lot_impact": {
            "LOT-001": {"reserved_released": 30},  # 残予約30が解除される
        },
    },

    # 9. 受注：出荷後にロット差し替え
    "order_lot_change_after_partial_ship": {
        "description": "部分出荷後、品質問題でロットを差し替え",
        "order_line": {"id": "OL-001", "quantity": 100},
        "timeline": [
            {"date": "2025-01-05", "action": "allocate", "lot": "LOT-001", "qty": 100},
            {"date": "2025-01-08", "action": "ship", "qty": 50, "lot": "LOT-001"},
            {"date": "2025-01-10", "action": "quality_issue", "lot": "LOT-001",
             "note": "LOT-001に品質問題発覚"},
            {"date": "2025-01-10", "action": "release_allocation", "lot": "LOT-001", "qty": 50},
            {"date": "2025-01-10", "action": "allocate", "lot": "LOT-002", "qty": 50},
            {"date": "2025-01-12", "action": "ship", "qty": 50, "lot": "LOT-002"},
        ],
        "final_state": {
            "total_shipped": 100,
            "lots_used": ["LOT-001", "LOT-002"],
        },
    },

    # 10. 入荷：部分入荷後に残りキャンセル
    "inbound_partial_then_cancel": {
        "description": "入荷予定500個のうち300個入荷後、残り200はサプライヤー都合でキャンセル",
        "inbound_plan": {"plan_id": "IP-001", "planned_qty": 500},
        "timeline": [
            {"date": "2025-01-05", "action": "receive", "lot": "LOT-NEW-001", "qty": 200},
            {"date": "2025-01-10", "action": "receive", "lot": "LOT-NEW-001", "qty": 100},
            {"date": "2025-01-15", "action": "cancel_remaining", "qty": 200,
             "reason": "サプライヤー生産遅延により残数キャンセル"},
        ],
        "final_state": {
            "received_qty": 300,
            "cancelled_qty": 200,
            "status": "partial_received",
        },
        "impact": "フォーキャスト予約への影響（在庫不足発生の可能性）",
    },

    # 11. 入荷：入荷日変更（前倒し/後ろ倒し）
    "inbound_date_change": {
        "description": "入荷予定日の変更",
        "inbound_plan": {"plan_id": "IP-001", "original_date": "2025-01-15"},
        "changes": [
            {"date": "2025-01-10", "action": "reschedule", "new_date": "2025-01-20",
             "reason": "輸送遅延"},
            {"date": "2025-01-18", "action": "reschedule", "new_date": "2025-01-22",
             "reason": "通関遅延"},
            {"date": "2025-01-22", "action": "receive", "qty": 500},
        ],
        "note": "予定日変更履歴を追跡",
    },

    # 12. 入荷：数量変更（増減）
    "inbound_quantity_change": {
        "description": "入荷予定数量の変更",
        "inbound_plan": {"plan_id": "IP-001", "original_qty": 500},
        "changes": [
            {"date": "2025-01-08", "action": "qty_reduce", "new_qty": 400,
             "reason": "サプライヤー生産数変更"},
            {"date": "2025-01-12", "action": "qty_reduce", "new_qty": 350,
             "reason": "輸送中破損"},
            {"date": "2025-01-15", "action": "receive", "qty": 350},
        ],
        "final_state": {
            "planned_qty": 350,
            "received_qty": 350,
            "variance": -150,
        },
    },

    # 13. 入荷：ロット番号変更
    "inbound_lot_number_change": {
        "description": "入荷予定のロット番号がサプライヤーから変更通知",
        "inbound_plan": {"plan_id": "IP-001"},
        "expected_lot": {"original": "EXP-LOT-001", "changed_to": "SUP-LOT-2025-A001"},
        "timeline": [
            {"date": "2025-01-10", "action": "lot_change_notice",
             "reason": "サプライヤーシステム変更によるロット番号体系変更"},
            {"date": "2025-01-15", "action": "receive", "lot": "SUP-LOT-2025-A001", "qty": 500},
        ],
    },

    # 14. 受注：数量変更（増減）
    "order_quantity_change": {
        "description": "受注数量の変更（追加注文/減少）",
        "order_line": {"id": "OL-001", "original_qty": 100},
        "timeline": [
            {"date": "2025-01-05", "action": "allocate", "lot": "LOT-001", "qty": 100},
            {"date": "2025-01-08", "action": "qty_increase", "new_qty": 150,
             "reason": "顧客追加注文"},
            {"date": "2025-01-08", "action": "allocate_additional", "lot": "LOT-002", "qty": 50},
            {"date": "2025-01-12", "action": "qty_decrease", "new_qty": 120,
             "reason": "顧客数量減"},
            {"date": "2025-01-12", "action": "release_allocation", "lot": "LOT-002", "qty": 30},
        ],
        "final_state": {
            "quantity": 120,
            "allocations": [
                {"lot": "LOT-001", "qty": 100},
                {"lot": "LOT-002", "qty": 20},
            ],
        },
    },

    # 15. 複合：受注変更＋入荷遅延＋ロット差し替え
    "complex_order_inbound_lot_change": {
        "description": "現実的な複合シナリオ",
        "scenario": [
            {"date": "2025-01-01", "action": "order_received", "qty": 200, "delivery": "2025-01-20"},
            {"date": "2025-01-02", "action": "allocate", "lot": "LOT-001", "qty": 100},
            {"date": "2025-01-02", "action": "reserve_future", "inbound": "IP-001", "qty": 100,
             "note": "入荷予定在庫を予約"},
            {"date": "2025-01-10", "action": "inbound_delayed", "inbound": "IP-001",
             "new_date": "2025-01-25", "note": "入荷遅延で納期に間に合わない"},
            {"date": "2025-01-10", "action": "split_order",
             "part1": {"qty": 100, "delivery": "2025-01-20", "lot": "LOT-001"},
             "part2": {"qty": 100, "delivery": "2025-01-28", "inbound": "IP-001"}},
            {"date": "2025-01-20", "action": "ship", "qty": 100, "lot": "LOT-001"},
            {"date": "2025-01-25", "action": "receive_inbound", "lot": "LOT-NEW-001", "qty": 150},
            {"date": "2025-01-28", "action": "ship", "qty": 100, "lot": "LOT-NEW-001"},
        ],
        "note": "入荷遅延により受注を分割、一部先行出荷",
    },
}
```

#### 8.3.5 極端なエッジケース・異常系シナリオ

```python
EXTREME_EDGE_CASES = {
    # ========================================
    # 数量境界系
    # ========================================

    "zero_remaining_after_exact_consumption": {
        "description": "ピッタリ消費で残0になるケース",
        "lot": {"received": 100, "consumed": 100},
        "expected": {"remaining": 0, "status": "depleted"},
    },

    "one_remaining_after_consumption": {
        "description": "残り1個（最小在庫）",
        "lot": {"received": 100, "consumed": 99},
        "expected": {"remaining": 1, "status": "active"},
        "test": "残り1個に対する割当可否",
    },

    "decimal_precision_edge": {
        "description": "小数点以下の精度テスト",
        "lot": {"received": "100.001", "consumed": "100.000"},
        "expected": {"remaining": "0.001"},
        "test": "小数点3桁の精度が保たれるか",
    },

    "large_quantity": {
        "description": "大量在庫（上限テスト）",
        "lot": {"received": 999999.999},
        "test": "Numeric(15,3)の上限近くで正常動作するか",
    },

    # ========================================
    # 日付境界系
    # ========================================

    "expiry_today": {
        "description": "本日期限切れ",
        "lot": {"expiry_date": "TODAY"},
        "test": "当日期限の表示・警告",
    },

    "expiry_yesterday": {
        "description": "昨日期限切れ（1日超過）",
        "lot": {"expiry_date": "TODAY - 1"},
        "test": "期限切れ判定の境界",
    },

    "expiry_tomorrow": {
        "description": "明日期限",
        "lot": {"expiry_date": "TODAY + 1"},
        "test": "期限直前の警告",
    },

    "delivery_date_past": {
        "description": "納期過ぎ受注（遅延）",
        "order": {"delivery_date": "TODAY - 7"},
        "test": "納期遅延の警告・フラグ",
    },

    "year_boundary": {
        "description": "年またぎデータ",
        "data": {
            "forecast_period": "2024-12",
            "order_date": "2024-12-31",
            "delivery_date": "2025-01-05",
        },
        "test": "年度またぎの計算",
    },

    "leap_year": {
        "description": "うるう年境界",
        "data": {
            "date": "2024-02-29",
            "expiry": "2025-02-28",  # 翌年は2/29がない
        },
    },

    # ========================================
    # ステータス遷移異常系
    # ========================================

    "cancelled_then_reactivated": {
        "description": "キャンセル後に再有効化（通常は不可）",
        "order": {
            "history": [
                {"status": "pending", "date": "2025-01-01"},
                {"status": "cancelled", "date": "2025-01-05"},
                {"status": "pending", "date": "2025-01-06"},  # 異常遷移
            ],
        },
        "test": "不正遷移の検出",
    },

    "depleted_lot_with_positive_reservation": {
        "description": "枯渇ロットに予約が残っている（データ不整合）",
        "lot": {"status": "depleted", "remaining": 0},
        "reservation": {"qty": 50, "status": "active"},
        "test": "不整合検出",
    },

    "over_allocation": {
        "description": "在庫以上の割当（オーバーアロケーション）",
        "lot": {"remaining": 100},
        "reservations": [
            {"qty": 60, "source": "order_1"},
            {"qty": 60, "source": "order_2"},  # 合計120 > 100
        ],
        "test": "オーバーアロケーション警告",
    },

    # ========================================
    # マスタ変更系
    # ========================================

    "product_discontinued": {
        "description": "製品廃番後も在庫が残っている",
        "product": {"status": "discontinued", "discontinued_at": "2024-12-01"},
        "lot": {"qty": 50, "status": "active"},
        "test": "廃番製品の在庫処理",
    },

    "customer_inactive_with_open_orders": {
        "description": "非アクティブ顧客にオープン受注がある",
        "customer": {"status": "inactive"},
        "orders": [{"status": "pending"}, {"status": "allocated"}],
        "test": "顧客停止時の受注処理",
    },

    "supplier_change_during_inbound": {
        "description": "入荷予定中にサプライヤー変更",
        "inbound": {"supplier_id": 1, "status": "planned"},
        "change": {"new_supplier_id": 2, "reason": "サプライヤー変更"},
    },

    # ========================================
    # 同時処理系（競合状態のテストデータ）
    # ========================================

    "concurrent_allocation_to_same_lot": {
        "description": "同一ロットへの同時割当リクエスト",
        "lot": {"remaining": 100},
        "requests": [
            {"order": "OL-001", "qty": 80, "timestamp": "09:00:00.001"},
            {"order": "OL-002", "qty": 80, "timestamp": "09:00:00.002"},
        ],
        "expected": "1つは成功、1つは在庫不足で失敗",
    },

    "concurrent_withdrawal_and_reservation": {
        "description": "出庫処理と予約処理の競合",
        "lot": {"remaining": 50},
        "concurrent": [
            {"action": "withdraw", "qty": 50},
            {"action": "reserve", "qty": 30},
        ],
    },

    # ========================================
    # 複合異常系
    # ========================================

    "order_for_nonexistent_product": {
        "description": "存在しない製品への受注（マスタ不整合）",
        "order": {"product_id": 99999},
        "test": "外部キー制約違反の検出",
    },

    "forecast_without_customer_item_mapping": {
        "description": "顧客-製品マッピングなしのフォーキャスト",
        "forecast": {"customer_id": 1, "product_id": 1},
        "customer_item": None,  # マッピングなし
        "test": "マッピング欠落の検出",
    },

    "multiple_lot_masters_same_number": {
        "description": "同一ロット番号で複数のLotMaster（重複）",
        "lots": [
            {"lot_number": "LOT-001", "product": "PRD-001"},
            {"lot_number": "LOT-001", "product": "PRD-002"},  # 異なる製品
        ],
        "test": "ロット番号の一意性（製品跨ぎ）",
    },

    # ========================================
    # 出庫取り消し後の状態
    # ========================================

    "withdrawal_cancel_restore_stock": {
        "description": "出庫取り消しで在庫が戻る",
        "timeline": [
            {"action": "receive", "qty": 100},
            {"action": "withdraw", "qty": 30},  # 残70
            {"action": "cancel_withdrawal", "qty": 30},  # 取り消し→残100に戻る
        ],
        "expected": {"remaining": 100},
    },

    "double_cancellation": {
        "description": "同一出庫の二重取り消し（不正操作）",
        "withdrawal": {"id": "W-001", "cancelled_at": "2025-01-05"},
        "attempt": {"cancel_again": "2025-01-06"},
        "expected": "エラー（既に取り消し済み）",
    },

    # ========================================
    # 予約ステータス遷移
    # ========================================

    "reservation_expired_temporary": {
        "description": "仮予約の期限切れ",
        "reservation": {
            "status": "temporary",
            "created_at": "2025-01-01 09:00:00",
            "expires_at": "2025-01-01 10:00:00",  # 1時間後に期限切れ
        },
        "test": "一時予約の自動解放",
    },

    "confirmed_reservation_cancelled": {
        "description": "確定済み予約のキャンセル（SAP連携必要）",
        "reservation": {
            "status": "confirmed",
            "sap_document_no": "SAP-001",
        },
        "cancel": {
            "reason": "customer_request",
            "requires_sap_reversal": True,
        },
    },
}
```

#### 8.3.6 出庫履歴の詳細追跡

```python
WITHDRAWAL_HISTORY_SCENARIOS = {
    # 製品別出庫履歴（全タイプ混在）
    "product_withdrawal_history": {
        "description": "製品Aの全ロットからの出庫履歴（手動含む）",
        "product_id": "PRD-001",
        "history": [
            # 受注経由の自動出庫
            {"date": "2024-12-01", "lot": "LOT-A1", "qty": 30, "type": "ORDER_AUTO", "customer": "顧客A", "order_line": "OL-001"},
            {"date": "2024-12-05", "lot": "LOT-A1", "qty": 20, "type": "ORDER_AUTO", "customer": "顧客B", "order_line": "OL-002"},
            # 手動出庫（紙注文）
            {"date": "2024-12-08", "lot": "LOT-A1", "qty": 15, "type": "ORDER_MANUAL", "customer": "顧客C", "reference": "FAX-001"},
            # サンプル
            {"date": "2024-12-10", "lot": "LOT-A2", "qty": 5, "type": "SAMPLE", "customer": "顧客D"},
            # 社内使用
            {"date": "2024-12-12", "lot": "LOT-A2", "qty": 10, "type": "INTERNAL_USE", "reason": "品質検査"},
            # 廃棄
            {"date": "2024-12-15", "lot": "LOT-A1", "qty": 8, "type": "DISPOSAL", "reason": "品質不良"},
            # 受注経由（複数ロット払出）
            {"date": "2024-12-20", "lot": "LOT-A2", "qty": 40, "type": "ORDER_AUTO", "customer": "顧客A", "order_line": "OL-003",
             "multi_lot": True, "other_lots": [{"lot": "LOT-A3", "qty": 10}]},
        ],
        "summary": {
            "total_withdrawn": 138,
            "by_lot": {"LOT-A1": 73, "LOT-A2": 55, "LOT-A3": 10},
            "by_customer": {"顧客A": 80, "顧客B": 20, "顧客C": 15, "顧客D": 5, "社内": 18},
            "by_type": {"ORDER_AUTO": 100, "ORDER_MANUAL": 15, "SAMPLE": 5, "INTERNAL_USE": 10, "DISPOSAL": 8},
        },
    },

    # 顧客別出庫履歴
    "customer_withdrawal_history": {
        "description": "顧客Aへの全製品出庫履歴",
        "customer_id": "CUST-001",
        "history": [
            {"date": "2024-12-01", "product": "PRD-001", "lot": "LOT-A1", "qty": 30, "type": "ORDER_AUTO"},
            {"date": "2024-12-10", "product": "PRD-001", "lot": "LOT-A2", "qty": 50, "type": "ORDER_AUTO"},
            {"date": "2024-12-12", "product": "PRD-002", "lot": "LOT-B1", "qty": 100, "type": "ORDER_MANUAL"},  # 紙注文
            {"date": "2024-12-18", "product": "PRD-003", "lot": "LOT-C1", "qty": 25, "type": "SAMPLE"},
        ],
    },

    # ロット別出庫履歴（取り消し含む）
    "lot_withdrawal_with_cancellation": {
        "description": "取り消しを含むロット出庫履歴",
        "lot_id": "LOT-001",
        "history": [
            {"date": "2024-12-01", "qty": 30, "type": "ORDER_AUTO", "status": "completed"},
            {"date": "2024-12-05", "qty": 20, "type": "ORDER_MANUAL", "status": "cancelled",
             "cancelled_at": "2024-12-06", "cancel_reason": "input_error"},
            {"date": "2024-12-08", "qty": 15, "type": "SAMPLE", "status": "completed"},
            {"date": "2024-12-10", "qty": 10, "type": "DISPOSAL", "status": "cancelled",
             "cancelled_at": "2024-12-10", "cancel_reason": "wrong_lot"},
            {"date": "2024-12-12", "qty": 25, "type": "ORDER_AUTO", "status": "completed"},
        ],
        "net_withdrawn": 70,  # 30 + 15 + 25 (キャンセル分は除外)
    },

    # 複数ロット払出の履歴
    "multi_lot_withdrawal_history": {
        "description": "複数ロットから払い出した出庫の履歴",
        "withdrawal_id": "W-001",
        "lines": [
            {"lot": "LOT-001", "qty": 50, "consumed_at": "2024-12-15 09:00:00"},
            {"lot": "LOT-002", "qty": 80, "consumed_at": "2024-12-15 09:00:00"},
            {"lot": "LOT-003", "qty": 20, "consumed_at": "2024-12-15 09:00:00"},
        ],
        "total": 150,
        "note": "WithdrawalLineテーブルに3レコード",
    },
}
```

#### 8.3.4 受注-ロット紐付けシナリオ

```python
ORDER_LOT_LINKAGE_SCENARIOS = {
    # 単一ロット割当
    "single_lot_order": {
        "order_line": {"product": "PRD-001", "quantity": 50},
        "allocation": [
            {"lot": "LOT-001", "qty": 50, "status": "confirmed"},
        ],
    },

    # 複数ロット分割割当
    "multi_lot_split": {
        "order_line": {"product": "PRD-001", "quantity": 120},
        "allocation": [
            {"lot": "LOT-001", "qty": 50, "status": "confirmed"},  # LOT-001は50で完売
            {"lot": "LOT-002", "qty": 70, "status": "confirmed"},  # 残りをLOT-002から
        ],
    },

    # 部分割当（在庫不足）
    "partial_allocation": {
        "order_line": {"product": "PRD-001", "quantity": 200},
        "allocation": [
            {"lot": "LOT-001", "qty": 50, "status": "confirmed"},
            {"lot": "LOT-002", "qty": 80, "status": "confirmed"},
        ],
        "unallocated": 70,  # 200 - 50 - 80 = 70が未割当
    },

    # 割当変更（ロット差し替え）
    "allocation_change": {
        "order_line": {"product": "PRD-001", "quantity": 50},
        "original_allocation": {"lot": "LOT-001", "qty": 50, "status": "released"},
        "new_allocation": {"lot": "LOT-002", "qty": 50, "status": "active"},
        "reason": "品質問題によるロット変更",
    },
}
```

#### 8.3.5 フォーキャスト-ロット紐付けシナリオ

```python
FORECAST_LOT_LINKAGE_SCENARIOS = {
    # フォーキャスト予約
    "forecast_reservation": {
        "forecast": {"product": "PRD-001", "customer": "CUST-001", "qty": 100, "period": "2025-02"},
        "reservation": {"lot": "LOT-001", "qty": 100, "status": "active"},
    },

    # フォーキャスト→実績の紐付け
    "forecast_to_actual": {
        "forecast": {"product": "PRD-001", "qty": 100, "period": "2025-01"},
        "reservations": [
            {"lot": "LOT-001", "qty": 60, "source_type": "forecast", "status": "released"},
            {"lot": "LOT-002", "qty": 40, "source_type": "forecast", "status": "released"},
        ],
        "actual_orders": [
            {"qty": 55, "lot": "LOT-001"},  # フォーキャストより5少ない
            {"qty": 50, "lot": "LOT-002"},  # フォーキャストより10多い
        ],
        "variance": {"LOT-001": -5, "LOT-002": +10, "total": +5},
    },
}
```

---

## 9. 検証とモニタリング

### 9.1 生成後検証チェックリスト

```python
VALIDATION_CHECKS = [
    # データ整合性
    "lot_quantities_non_negative",  # ロット数量が負でないこと
    "order_allocation_within_stock",  # 割当が在庫内
    "forecast_reservation_consistency",  # 予約とフォーキャストの整合性
    "inbound_lot_linkage",  # 入荷予定とロットの紐付け

    # エッジケースカバレッジ
    "expired_lots_exist",  # 期限切れロットが存在
    "cancelled_orders_exist",  # キャンセル受注が存在
    "partial_allocations_exist",  # 部分割当が存在
    "zero_stock_products_exist",  # 在庫ゼロ製品が存在

    # 時系列
    "historical_data_completeness",  # 過去データの完全性
    "future_forecasts_exist",  # 将来予測が存在
    "seasonal_patterns_present",  # 季節パターンが含まれる

    # トレーサビリティ
    "lot_withdrawal_history_exists",  # ロット別出庫履歴が存在
    "order_lot_linkage_exists",  # 受注-ロット紐付けが存在
    "forecast_lot_linkage_exists",  # フォーキャスト-ロット紐付けが存在
    "multi_lot_allocation_exists",  # 複数ロット分割割当が存在
    "allocation_cancellation_history_exists",  # 割当キャンセル履歴が存在
]
```

### 9.2 カバレッジレポート

```python
# GET /api/admin/test-data/coverage
# 生成されたデータのエッジケースカバレッジレポート

{
    "total_edge_cases_defined": 150,
    "edge_cases_covered": 142,
    "coverage_percentage": 94.7,
    "missing_edge_cases": [
        "order_negative_quantity",  # 意図的に除外（ビジネスルールで不可）
        ...
    ],
    "by_entity": {
        "lots": {"defined": 30, "covered": 28, "percentage": 93.3},
        "orders": {"defined": 35, "covered": 35, "percentage": 100.0},
        ...
    }
}
```

---

## 10. 管理画面UI設計

### 10.1 テストデータ生成画面

```
┌─────────────────────────────────────────────────────────────┐
│  テストデータ生成                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [プリセット選択]                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ○ クイックテスト（最小限）                                │ │
│  │ ● フルカバレッジ（推奨）                                  │ │
│  │ ○ エッジケースのみ                                       │ │
│  │ ○ パフォーマンステスト                                   │ │
│  │ ○ カスタム                                              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  [モジュール選択]（カスタム時のみ）                            │
│  ☑ マスタデータ   ☑ ロット   ☑ フォーキャスト                 │
│  ☑ 受注          ☑ 入荷予定  ☑ 出庫履歴                     │
│                                                             │
│  [期間設定]                                                  │
│  過去: [6] ヶ月  将来: [6] ヶ月                              │
│                                                             │
│  [オプション]                                                │
│  ☑ 取り消しデータを含む                                      │
│  ☑ 履歴データを含む                                         │
│  ☑ 時系列パターンを適用                                      │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  [生成実行]                            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [生成結果]                                                  │
│  ├─ 顧客: 20件                                              │
│  ├─ 製品: 50件                                              │
│  ├─ ロット: 312件 (エッジケース: 45件)                       │
│  ├─ 受注: 1,024件 (キャンセル: 52件)                        │
│  ├─ フォーキャスト: 3,200件                                  │
│  └─ カバレッジ: 94.7%                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. 実装優先度

### 最優先（Phase 1-2）

1. **config.py** - 設定一元管理
2. **orchestrator.py** - 選択的生成
3. **lot_edge_cases.py** - ロットエッジケース（最も重要）
4. **order_edge_cases.py** - 受注エッジケース
5. **API拡張** - モジュール選択エンドポイント

### 高優先（Phase 3）

6. **time_series.py** - 時系列パターン
7. **cancellation.py** - 取り消しシナリオ
8. **履歴データ生成** - 6ヶ月分の過去データ

### 中優先（Phase 4）

9. **forecast_edge_cases.py** - フォーキャストエッジケース
10. **inbound_edge_cases.py** - 入荷予定エッジケース
11. **allocation_edge_cases.py** - 割当エッジケース

### 低優先（Phase 5）

12. **stress_test.py** - 負荷テストデータ
13. **カバレッジレポート** - 検証機能
14. **UI更新** - 管理画面の改善

---

## 12. 成功指標

| 指標 | 目標値 |
|------|--------|
| エッジケースカバレッジ | 95%以上 |
| データ期間 | 過去6ヶ月〜将来6ヶ月 |
| 取り消しデータ比率 | 全データの5-10% |
| 生成時間（medium） | 30秒以内 |
| テスト通過率向上 | 20%向上 |
| バグ検出数 | 現在の2倍 |

---

## 付録A: 現在の生成モジュール一覧

| モジュール | ファイル | 機能 |
|-----------|---------|------|
| masters | `test_data/masters.py` | マスタデータ生成 |
| inventory | `test_data/inventory.py` | ロット生成 |
| inventory_scenarios | `test_data/inventory_scenarios.py` | UI テストシナリオ(P1-P8) |
| forecasts | `test_data/forecasts.py` | フォーキャスト・予約生成 |
| orders | `test_data/orders.py` | 受注生成 |
| inbound | `test_data/inbound.py` | 入荷予定生成 |
| withdrawals | `test_data/withdrawals.py` | 出庫履歴生成 |
| utils | `test_data/utils.py` | ユーティリティ |

---

## 付録B: データベーステーブル依存関係

```
warehouses ─┐
suppliers ──┼─→ lots ─────────────────→ withdrawals
products ───┤     │                         │
            │     └─→ lot_reservations ←────┘
customers ──┼─→ orders ─→ order_lines ─────→ allocation_suggestions
            │                │
delivery_   ┘                ↓
places ──────→ forecasts ←───┘
                   │
                   └─→ inbound_plans ─→ inbound_plan_lines ─→ expected_lots
```

---

*作成日: 2026-01-17*
*バージョン: 1.0*
