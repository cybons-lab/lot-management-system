# テストデータ生成・発注提案・需要予測 統合計画書

**バージョン**: v1.2
**作成日**: 2026-01-17
**ステータス**: Draft

---

## 目次

1. [背景と目的](#1-背景と目的)
2. [用語定義](#2-用語定義)
3. [設計原則](#3-設計原則)
4. [全体アーキテクチャ](#4-全体アーキテクチャ)
5. [テストデータ生成](#5-テストデータ生成)
6. [発注提案（補充ロジック）](#6-発注提案補充ロジック)
7. [需要予測](#7-需要予測)
8. [API設計](#8-api設計)
9. [検証とモニタリング](#9-検証とモニタリング)
10. [実装ロードマップ](#10-実装ロードマップ)
11. [成功指標](#11-成功指標)
12. [Decision一覧](#12-decision一覧)

---

## 1. 背景と目的

### 1.1 現状の課題

| 領域 | 課題 | 詳細 |
|------|------|------|
| **テストデータ** | 表面的なデータ | 正常系パターンが中心で、エッジケースが不足 |
| | 短い期間 | 翌月分のフォーキャストのみ（1ヶ月分） |
| | CI不安定 | 破壊データ混入によるテスト失敗 |
| | 再現性不足 | seed固定だけでは日付依存ロジックが不安定 |
| **発注・予測** | 発注提案なし | 補充判断が人依存、欠品/過剰在庫のリスク |
| | 需要予測なし | 安全在庫・発注点の根拠が不明確 |
| | 説明可能性欠如 | なぜその発注量になったか追跡できない |

### 1.2 目標

**テストデータ生成**:
1. 6ヶ月〜1年分の時系列データを生成
2. モジュール単位での選択的生成
3. 包括的なエッジケース網羅
4. CI安定性（破壊データの隔離）
5. 完全な再現性（seed + base_date）

**発注提案・需要予測**:
6. 発注点（ROP）・発注量の自動提案
7. 統計ベースの需要予測（将来ML差し替え可能）
8. 説明可能性（各計算要素の可視化）
9. テストデータによる検証可能性

---

## 2. 用語定義

### 2.1 需要（Demand）関連

| 用語 | 定義 | 備考 |
|------|------|------|
| **需要（demand）** | 顧客への出荷を目的とした在庫消費 | `ORDER_AUTO` + `ORDER_MANUAL` |
| **非需要消費** | 需要以外の在庫消費 | `DISPOSAL`, `INTERNAL_USE`, `TRANSFER`, `SAMPLE` |
| **欠品需要（unfulfilled）** | 在庫不足で満たせなかった需要 | `order.unfulfilled_qty > 0` |
| **取りこぼし需要** | 欠品により失われた潜在需要 | 推定が必要（**Decision #7**） |

```python
# 需要としてカウントする出庫タイプ
DEMAND_WITHDRAWAL_TYPES = ["ORDER_AUTO", "ORDER_MANUAL"]

# 需要から除外する出庫タイプ
NON_DEMAND_WITHDRAWAL_TYPES = ["DISPOSAL", "INTERNAL_USE", "TRANSFER", "SAMPLE", "RETURN"]
```

### 2.2 在庫関連

| 用語 | 定義 | 計算式 |
|------|------|--------|
| **手持在庫（on_hand）** | 現在倉庫にある物理在庫 | `Σ lot.current_quantity` |
| **予約済（reserved）** | 受注/フォーキャストで確保済み | `Σ lot_reservation.quantity (status=active)` |
| **入荷予定（inbound）** | 確定済みの入荷予定数量 | `Σ inbound_plan_line.quantity (status=planned/in_transit)` |
| **利用可能在庫（available）** | 新規受注に割当可能な在庫 | `on_hand - reserved` |
| **有効在庫（effective）** | 将来の入荷を含めた利用可能在庫 | `on_hand + inbound - reserved` |

```python
# 利用可能在庫の計算
def calc_available_stock(product_id: int, warehouse_id: int) -> Decimal:
    on_hand = sum(lot.current_quantity for lot in active_lots)
    reserved = sum(r.quantity for r in active_reservations)
    return on_hand - reserved

# 有効在庫の計算
def calc_effective_stock(product_id: int, warehouse_id: int) -> Decimal:
    available = calc_available_stock(product_id, warehouse_id)
    inbound = sum(line.quantity for line in planned_inbound_lines)
    return available + inbound
```

### 2.3 リードタイム（LT）関連

| 用語 | 定義 | 備考 |
|------|------|------|
| **計画LT** | サプライヤーマスタに設定されたLT | `supplier_product.lead_time_days` |
| **実績LT** | 実際の入荷までの日数 | `received_date - order_date` |
| **LTばらつき** | 実績LTの標準偏差 | 安全在庫計算に使用 |
| **遅延率** | 計画LTを超過した入荷の割合 | モニタリング指標 |

```python
# 実績LTの計算
def calc_actual_lead_time(inbound_plan: InboundPlan) -> int:
    """入荷予定から実際のLTを計算"""
    if inbound_plan.received_date is None:
        return None
    return (inbound_plan.received_date - inbound_plan.order_date).days

# LT統計の集計
@dataclass
class LeadTimeStats:
    supplier_id: int
    product_id: int
    avg_lt: float           # 平均LT
    std_lt: float           # 標準偏差
    max_lt: int             # 最大LT
    delay_rate: float       # 遅延率（計画超過の割合）
    sample_count: int       # サンプル数
```

---

## 3. 設計原則

### 3.1 データセットモード（3モード分離）

**最重要**: 破壊データを通常データセットに混入させない

| モード | 目的 | DB整合性 | 含む内容 | CI利用 |
|--------|------|----------|----------|--------|
| **strict** | 通常テスト・CI | 100% | 合法な例外のみ | ✅ 推奨 |
| **relaxed** | 例外処理検証 | 100% | 警告対象を5〜10%含む | ⚠️ 条件付き |
| **invalid_only** | 異常検出テスト | 0% | 破壊データのみ | ❌ 専用テストのみ |

**重要な区別**:
- **合法な例外**（strict/relaxed）：期限切れロット、納期遅延、部分割当、キャンセル、欠品
- **破壊データ**（invalid_only）：FK違反、マイナス在庫、オーバーアロケーション

### 3.2 再現性の保証

```python
REPRODUCIBILITY_KEYS = {
    "seed": 42,                    # 乱数シード
    "base_date": "2025-01-15",     # 基準日（TODAY相当）
    "version": "1.2",              # 生成器バージョン
}
```

### 3.3 予測器の差し替え可能性

```python
# 予測器インターフェース（Phase B: 統計 → Phase C: ML 差し替え）
class DemandEstimator(Protocol):
    """需要予測器の共通インターフェース"""

    def estimate(
        self,
        product_id: int,
        warehouse_id: int,
        horizon_days: int,
        as_of_date: date,
    ) -> DemandForecast:
        """指定期間の需要を予測"""
        ...

    def get_explanation(self) -> EstimationExplanation:
        """予測根拠を返す（説明可能性）"""
        ...
```

---

## 4. 全体アーキテクチャ

### 4.1 システム構成図

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Lot Management System                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐   │
│  │  Test Data       │    │  Replenishment   │    │  Demand          │   │
│  │  Generator       │    │  Engine          │    │  Estimator       │   │
│  │                  │    │                  │    │                  │   │
│  │  - scenarios/    │    │  - ROP計算       │    │  - 移動平均      │   │
│  │  - generators/   │◄──►│  - 発注量計算    │◄──►│  - EWMA          │   │
│  │  - validators/   │    │  - 制約適用      │    │  - 季節係数      │   │
│  │                  │    │  - 説明生成      │    │  - (将来)ML      │   │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘   │
│           │                       │                       │             │
│           ▼                       ▼                       ▼             │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                         Domain Layer                              │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │   │
│  │  │   Lots     │  │  Orders    │  │  Inbound   │  │ Withdrawals│  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 モジュール構成（拡張版）

```
backend/app/
├── application/services/
│   ├── test_data/                    # テストデータ生成（既存）
│   │   ├── orchestrator.py
│   │   ├── config.py
│   │   ├── validators.py
│   │   ├── scenarios/
│   │   │   ├── normal_operations.py
│   │   │   ├── edge_cases.py
│   │   │   ├── cancellation.py
│   │   │   ├── time_series.py
│   │   │   ├── traceability.py
│   │   │   ├── replenishment.py      # 【新規】発注検証用シナリオ
│   │   │   └── demand_patterns.py    # 【新規】需要パターン
│   │   └── generators/
│   │       └── ...
│   │
│   ├── replenishment/                # 【新規】発注提案
│   │   ├── __init__.py
│   │   ├── engine.py                 # 発注提案エンジン
│   │   ├── calculator.py             # ROP/発注量計算
│   │   ├── constraints.py            # 制約（MOQ、ロット丸めなど）
│   │   └── explainer.py              # 説明生成
│   │
│   └── demand/                       # 【新規】需要予測
│       ├── __init__.py
│       ├── estimator.py              # 予測器インターフェース
│       ├── statistical/              # Phase B: 統計ベース
│       │   ├── moving_average.py
│       │   ├── ewma.py
│       │   ├── seasonal.py
│       │   └── outlier.py            # スパイク抑制
│       └── ml/                       # Phase C: ML（将来）
│           └── placeholder.py
│
└── presentation/api/routes/
    ├── admin/
    │   ├── test_data_router.py       # 既存
    │   └── replenishment_router.py   # 【新規】
    └── ...
```

### 4.3 依存関係グラフ（拡張版）

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          依存関係グラフ（DAG）                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   masters ─────────────────────────────────────────────────────────┐     │
│      │                                                             │     │
│      ├──→ lots ──────────────────────────────────────┐             │     │
│      │      │                                        │             │     │
│      ├──→ forecasts ─────────────────────────┐       │             │     │
│      │      │                                │       │             │     │
│      ├──→ inbound ───────────────────┐       │       │             │     │
│      │      │                        │       │       │             │     │
│      └──→ orders ←───────────────────┴───────┴───────┘             │     │
│                │                                                   │     │
│                ├──→ reservations                                   │     │
│                │                                                   │     │
│                └──→ withdrawals ──────────────────────────────────┐│     │
│                           │                                       ││     │
│                           ▼                                       ││     │
│   ┌─────────────────────────────────────────────────────────────┐ ││     │
│   │                    【新規】発注・予測                         │ ││     │
│   │                                                             │ ││     │
│   │   withdrawals ──→ DemandEstimator ──→ ReplenishmentEngine   │ ││     │
│   │        │                │                    │              │ ││     │
│   │        │                ▼                    ▼              │ ││     │
│   │        │         需要予測結果         発注提案結果            │ ││     │
│   │        │                                                    │ ││     │
│   │        └──→ LT統計（inbound実績）                            │ ││     │
│   │                                                             │ ││     │
│   └─────────────────────────────────────────────────────────────┘ ││     │
│                                                                    ││     │
└────────────────────────────────────────────────────────────────────┘│     │
```

---

## 5. テストデータ生成

### 5.1 データ規模設定（scale）

**基準**: 月12,000ヘッダ受注

| スケール | 月間受注 | 顧客 | 製品 | ロット | 用途 |
|---------|---------|------|------|--------|------|
| **small** | 200 | 10 | 20 | 100 | 開発・単体テスト |
| **medium** | 2,000 | 30 | 80 | 500 | 統合テスト |
| **large** | 12,000 | 100 | 300 | 3,000 | 本番相当 |
| **production** | 12,000×12 | 100 | 300 | 30,000 | 年次シミュレーション |

### 5.2 プリセット定義（6本立てに拡張）

| プリセットID | scale | mode | scenarios | 用途 |
|-------------|-------|------|-----------|------|
| **quick** | small | strict | normal | 開発中の素早い確認 |
| **full_coverage** | medium | strict | normal, edge_cases, traceability | 網羅的テスト |
| **warning_focus** | medium | relaxed | cancellations, delays | 警告検証 |
| **invalid_only** | small | invalid_only | invalid | 破壊データテスト |
| **replenishment_test** | medium | strict | normal, demand_patterns, replenishment | 【新規】発注検証 |
| **forecast_test** | medium | strict | time_series, demand_patterns | 【新規】予測検証 |

### 5.3 発注・予測検証用シナリオ（新規追加）

#### 5.3.1 需要パターンシナリオ

```python
DEMAND_PATTERN_SCENARIOS = {
    # === 基本パターン ===
    "steady_demand": {
        "scenario_id": "demand_steady",
        "description": "定常需要（変動なし）",
        "daily_demand": 100,
        "variance": 0.05,
        "duration_days": 90,
    },
    "growing_demand": {
        "scenario_id": "demand_growing",
        "description": "成長トレンド（月5%増）",
        "daily_demand": 100,
        "trend": 0.05,
        "duration_days": 180,
    },
    "declining_demand": {
        "scenario_id": "demand_declining",
        "description": "減少トレンド（月3%減）",
        "daily_demand": 100,
        "trend": -0.03,
        "duration_days": 180,
    },

    # === 季節パターン ===
    "seasonal_summer_peak": {
        "scenario_id": "demand_seasonal_summer",
        "description": "夏季繁忙（6-8月150%）",
        "base_demand": 100,
        "peak_months": [6, 7, 8],
        "peak_factor": 1.5,
    },
    "seasonal_winter_peak": {
        "scenario_id": "demand_seasonal_winter",
        "description": "冬季繁忙（11-1月150%）",
        "base_demand": 100,
        "peak_months": [11, 12, 1],
        "peak_factor": 1.5,
    },

    # === 週次パターン ===
    "weekly_pattern": {
        "scenario_id": "demand_weekly",
        "description": "週次パターン（月曜多、週末少）",
        "base_demand": 100,
        "day_factors": {0: 1.3, 1: 1.1, 2: 1.0, 3: 1.0, 4: 0.9, 5: 0.4, 6: 0.3},
    },

    # === 異常パターン ===
    "spike_demand": {
        "scenario_id": "demand_spike",
        "description": "スパイク（特定日に急増）",
        "base_demand": 100,
        "spike_days": [15, 45, 75],  # 15日ごとにスパイク
        "spike_factor": 3.0,
    },
    "irregular_demand": {
        "scenario_id": "demand_irregular",
        "description": "不規則需要（ランダム変動大）",
        "base_demand": 100,
        "variance": 0.40,
    },
}
```

#### 5.3.2 欠品シナリオ

```python
STOCKOUT_SCENARIOS = {
    "partial_fulfillment": {
        "scenario_id": "stockout_partial",
        "description": "部分充足（在庫不足で一部のみ出荷）",
        "order_qty": 100,
        "available_qty": 60,
        "fulfilled_qty": 60,
        "unfulfilled_qty": 40,
        "edge_case_id": "partial_allocation",
    },
    "complete_stockout": {
        "scenario_id": "stockout_complete",
        "description": "完全欠品（在庫ゼロで出荷不可）",
        "order_qty": 100,
        "available_qty": 0,
        "fulfilled_qty": 0,
        "unfulfilled_qty": 100,
        "edge_case_id": "no_allocation",
    },
    "backorder_created": {
        "scenario_id": "stockout_backorder",
        "description": "バックオーダー発生（入荷待ち）",
        "order_qty": 100,
        "available_qty": 0,
        "inbound_qty": 150,
        "expected_fulfillment_date": "base_date + 14",
    },
}
```

#### 5.3.3 リードタイムシナリオ

```python
LT_SCENARIOS = {
    "lt_on_time": {
        "scenario_id": "lt_on_time",
        "description": "計画通りの入荷",
        "planned_lt_days": 14,
        "actual_lt_days": 14,
        "variance": 0,
    },
    "lt_early": {
        "scenario_id": "lt_early",
        "description": "早着（計画より3日早い）",
        "planned_lt_days": 14,
        "actual_lt_days": 11,
        "variance": -3,
    },
    "lt_delayed_minor": {
        "scenario_id": "lt_delayed_minor",
        "description": "軽微遅延（1-3日）",
        "planned_lt_days": 14,
        "actual_lt_days": 16,
        "variance": 2,
    },
    "lt_delayed_major": {
        "scenario_id": "lt_delayed_major",
        "description": "大幅遅延（1週間以上）",
        "planned_lt_days": 14,
        "actual_lt_days": 25,
        "variance": 11,
    },
    "lt_variable": {
        "scenario_id": "lt_variable",
        "description": "ばらつき大（標準偏差5日）",
        "planned_lt_days": 14,
        "actual_lt_distribution": {"mean": 14, "std": 5},
    },
}
```

#### 5.3.4 発注検証シナリオ

```python
REPLENISHMENT_TEST_SCENARIOS = {
    "rop_trigger": {
        "scenario_id": "repl_rop_trigger",
        "description": "発注点到達で発注提案が生成される",
        "on_hand": 50,
        "rop": 100,
        "expected": "recommendation_generated",
    },
    "rop_not_trigger": {
        "scenario_id": "repl_rop_not_trigger",
        "description": "発注点未到達で発注提案なし",
        "on_hand": 150,
        "rop": 100,
        "expected": "no_recommendation",
    },
    "moq_applied": {
        "scenario_id": "repl_moq_applied",
        "description": "MOQ制約が適用される",
        "calculated_qty": 80,
        "moq": 100,
        "expected_qty": 100,
    },
    "lot_rounding": {
        "scenario_id": "repl_lot_rounding",
        "description": "ロット丸めが適用される",
        "calculated_qty": 85,
        "lot_size": 50,
        "expected_qty": 100,  # 50の倍数に切り上げ
    },
    "seasonal_safety_stock": {
        "scenario_id": "repl_seasonal_safety",
        "description": "繁忙期前の安全在庫増加",
        "current_month": 5,  # 6月繁忙期の前月
        "peak_months": [6, 7, 8],
        "safety_stock_multiplier": 1.5,
    },
}
```

### 5.4 出庫タグ付け（需要/非需要の区別）

```python
# Withdrawalレコードに needs_for_demand フラグを追加
WITHDRAWAL_DEMAND_TAGGING = {
    "ORDER_AUTO": {"is_demand": True, "description": "自動受注出庫"},
    "ORDER_MANUAL": {"is_demand": True, "description": "手動受注出庫"},
    "SAMPLE": {"is_demand": False, "description": "サンプル出荷"},
    "INTERNAL_USE": {"is_demand": False, "description": "社内使用"},
    "DISPOSAL": {"is_demand": False, "description": "廃棄"},
    "TRANSFER": {"is_demand": False, "description": "倉庫間移動"},
    "RETURN": {"is_demand": False, "description": "返品（需要の減算として扱う場合あり）"},
}
```

---

## 6. 発注提案（補充ロジック）

### 6.1 概要

発注提案エンジンは、需要予測とリードタイム情報に基づいて、**いつ・どの製品を・いくつ発注すべきか**を提案する。

### 6.2 出力項目

```python
@dataclass
class ReplenishmentRecommendation:
    """発注提案"""
    id: str                          # 提案ID
    product_id: int
    warehouse_id: int
    supplier_id: int

    # === 提案内容 ===
    recommended_order_qty: Decimal   # 推奨発注量
    recommended_order_date: date     # 推奨発注日
    expected_arrival_date: date      # 想定入荷日

    # === 計算根拠 ===
    reorder_point: Decimal           # 発注点（ROP）
    safety_stock: Decimal            # 安全在庫
    target_stock: Decimal            # 目標在庫

    # === 現在状況 ===
    current_on_hand: Decimal         # 現在手持在庫
    current_reserved: Decimal        # 予約済み
    current_available: Decimal       # 利用可能在庫
    pending_inbound: Decimal         # 入荷予定

    # === 需要予測 ===
    avg_daily_demand: Decimal        # 平均日次需要
    demand_forecast_horizon: int     # 予測期間（日）
    demand_forecast_total: Decimal   # 予測期間の需要合計

    # === リードタイム ===
    lead_time_days: int              # リードタイム（日）
    lead_time_std: float             # LT標準偏差

    # === 制約適用 ===
    moq: Decimal | None              # 最小発注数量
    lot_size: Decimal | None         # ロットサイズ
    constraints_applied: list[str]   # 適用された制約

    # === メタ情報 ===
    created_at: datetime
    status: str                      # draft / approved / rejected
    explanation: str                 # 説明文
```

### 6.3 計算アルゴリズム（初期実装）

```python
class ReplenishmentCalculator:
    """発注提案計算"""

    def calculate(
        self,
        product_id: int,
        warehouse_id: int,
        as_of_date: date,
    ) -> ReplenishmentRecommendation | None:
        """発注提案を計算"""

        # 1. 需要予測を取得
        demand = self.demand_estimator.estimate(
            product_id=product_id,
            warehouse_id=warehouse_id,
            horizon_days=self.config.forecast_horizon_days,
            as_of_date=as_of_date,
        )
        avg_daily_demand = demand.avg_daily

        # 2. リードタイム統計を取得
        lt_stats = self.lt_repository.get_stats(product_id, supplier_id)
        lead_time_days = lt_stats.avg_lt
        lead_time_std = lt_stats.std_lt

        # 3. 安全在庫を計算
        # SS = Z × σ_demand × √LT + Z × avg_demand × σ_LT
        z_score = self.config.service_level_z  # 例: 1.65 (95%)
        safety_stock = self._calc_safety_stock(
            avg_daily_demand, demand.std_daily,
            lead_time_days, lead_time_std,
            z_score
        )

        # 4. 発注点（ROP）を計算
        # ROP = avg_demand × LT + SS
        reorder_point = avg_daily_demand * lead_time_days + safety_stock

        # 5. 現在の有効在庫を計算
        on_hand = self.lot_repo.get_on_hand(product_id, warehouse_id)
        reserved = self.reservation_repo.get_reserved(product_id, warehouse_id)
        inbound = self.inbound_repo.get_pending(product_id, warehouse_id)
        effective_stock = on_hand - reserved + inbound

        # 6. 発注要否を判定
        if effective_stock >= reorder_point:
            return None  # 発注不要

        # 7. 発注量を計算
        # order_qty = target_stock - effective_stock
        target_stock = reorder_point + avg_daily_demand * self.config.coverage_days
        raw_order_qty = target_stock - effective_stock

        # 8. 制約を適用
        order_qty = self._apply_constraints(raw_order_qty, product_id, supplier_id)

        # 9. 発注日・入荷日を計算
        order_date = as_of_date
        arrival_date = order_date + timedelta(days=lead_time_days)

        return ReplenishmentRecommendation(
            # ... 全フィールドを設定
        )

    def _calc_safety_stock(
        self,
        avg_demand: Decimal,
        std_demand: Decimal,
        avg_lt: float,
        std_lt: float,
        z_score: float,
    ) -> Decimal:
        """安全在庫を計算（需要変動 + LT変動を考慮）"""
        # SS = Z × √(LT × σ_d² + D² × σ_LT²)
        variance = avg_lt * (std_demand ** 2) + (avg_demand ** 2) * (std_lt ** 2)
        return Decimal(str(z_score * (variance ** 0.5)))

    def _apply_constraints(
        self,
        raw_qty: Decimal,
        product_id: int,
        supplier_id: int,
    ) -> Decimal:
        """制約を適用"""
        constraints = self.constraint_repo.get(product_id, supplier_id)
        qty = raw_qty

        # MOQ
        if constraints.moq and qty < constraints.moq:
            qty = constraints.moq

        # ロット丸め
        if constraints.lot_size:
            qty = math.ceil(qty / constraints.lot_size) * constraints.lot_size

        return qty
```

### 6.4 説明可能性

```python
class ReplenishmentExplainer:
    """発注提案の説明生成"""

    def explain(self, recommendation: ReplenishmentRecommendation) -> str:
        """人が読める説明文を生成"""
        return f"""
## 発注提案の根拠

### 現在の在庫状況
- 手持在庫: {recommendation.current_on_hand}
- 予約済み: {recommendation.current_reserved}
- 利用可能: {recommendation.current_available}
- 入荷予定: {recommendation.pending_inbound}
- **有効在庫**: {recommendation.current_available + recommendation.pending_inbound}

### 需要予測
- 平均日次需要: {recommendation.avg_daily_demand}
- 予測期間: {recommendation.demand_forecast_horizon}日
- 予測需要合計: {recommendation.demand_forecast_total}

### 発注点計算
- リードタイム: {recommendation.lead_time_days}日
- 安全在庫: {recommendation.safety_stock}
- **発注点(ROP)**: {recommendation.reorder_point}

### 判定
- 有効在庫 ({recommendation.current_available + recommendation.pending_inbound}) < ROP ({recommendation.reorder_point})
- → **発注が必要**

### 発注量計算
- 目標在庫: {recommendation.target_stock}
- 計算発注量: {recommendation.target_stock} - 有効在庫 = {recommendation.recommended_order_qty}
- 適用制約: {', '.join(recommendation.constraints_applied) or 'なし'}
"""
```

---

## 7. 需要予測

### 7.1 段階導入方針

| Phase | 手法 | 特徴 | 実装時期 |
|-------|------|------|---------|
| **Phase B** | 統計ベース | 移動平均、EWMA、季節係数 | 初期リリース |
| **Phase C** | ML | 機械学習モデル | 将来（データ蓄積後） |

### 7.2 Phase B: 統計ベース予測

#### 7.2.1 予測器インターフェース

```python
class DemandEstimator(Protocol):
    """需要予測器の共通インターフェース"""

    def estimate(
        self,
        product_id: int,
        warehouse_id: int | None,
        horizon_days: int,
        as_of_date: date,
    ) -> DemandForecast:
        ...

    def get_explanation(self) -> EstimationExplanation:
        ...

@dataclass
class DemandForecast:
    """需要予測結果"""
    product_id: int
    warehouse_id: int | None
    as_of_date: date
    horizon_days: int

    # 予測値
    total: Decimal           # 期間合計
    avg_daily: Decimal       # 日平均
    std_daily: Decimal       # 日標準偏差
    daily_forecasts: list[DailyForecast]  # 日別予測（オプション）

    # メタ情報
    method: str              # 使用した手法
    confidence: float        # 信頼度（0-1）
    data_points_used: int    # 使用したデータ点数
```

#### 7.2.2 移動平均

```python
class MovingAverageEstimator:
    """単純移動平均による需要予測"""

    def __init__(self, window_days: int = 30):
        self.window_days = window_days

    def estimate(
        self,
        product_id: int,
        warehouse_id: int | None,
        horizon_days: int,
        as_of_date: date,
    ) -> DemandForecast:
        # 過去N日の需要実績を取得
        history = self.withdrawal_repo.get_demand_history(
            product_id=product_id,
            warehouse_id=warehouse_id,
            start_date=as_of_date - timedelta(days=self.window_days),
            end_date=as_of_date,
            demand_types=DEMAND_WITHDRAWAL_TYPES,
        )

        # 日次需要を集計
        daily_demands = self._aggregate_daily(history)

        # 平均・標準偏差を計算
        avg_daily = statistics.mean(daily_demands) if daily_demands else Decimal(0)
        std_daily = statistics.stdev(daily_demands) if len(daily_demands) > 1 else Decimal(0)

        return DemandForecast(
            product_id=product_id,
            warehouse_id=warehouse_id,
            as_of_date=as_of_date,
            horizon_days=horizon_days,
            total=avg_daily * horizon_days,
            avg_daily=avg_daily,
            std_daily=std_daily,
            method="moving_average",
            confidence=min(len(daily_demands) / self.window_days, 1.0),
            data_points_used=len(daily_demands),
        )
```

#### 7.2.3 指数加重移動平均（EWMA）

```python
class EWMAEstimator:
    """指数加重移動平均による需要予測"""

    def __init__(self, alpha: float = 0.3):
        self.alpha = alpha  # 平滑化係数（0-1）

    def estimate(self, ...) -> DemandForecast:
        history = self._get_history(...)

        # EWMA計算
        ewma = None
        for demand in history:
            if ewma is None:
                ewma = demand
            else:
                ewma = self.alpha * demand + (1 - self.alpha) * ewma

        return DemandForecast(
            avg_daily=ewma,
            method="ewma",
            ...
        )
```

#### 7.2.4 季節係数

```python
class SeasonalEstimator:
    """季節係数を適用した需要予測"""

    def __init__(self, base_estimator: DemandEstimator):
        self.base_estimator = base_estimator

    def estimate(self, ...) -> DemandForecast:
        # ベース予測を取得
        base_forecast = self.base_estimator.estimate(...)

        # 季節係数を計算
        seasonal_factor = self._calc_seasonal_factor(
            product_id, as_of_date, horizon_days
        )

        # 季節調整
        adjusted_avg = base_forecast.avg_daily * seasonal_factor

        return DemandForecast(
            avg_daily=adjusted_avg,
            method=f"{base_forecast.method}+seasonal",
            ...
        )

    def _calc_seasonal_factor(
        self,
        product_id: int,
        target_date: date,
        horizon_days: int,
    ) -> Decimal:
        """季節係数を計算（過去同月との比較）"""
        # 過去1年の同月データから係数を算出
        ...
```

#### 7.2.5 スパイク抑制（Winsorize）

```python
class OutlierHandler:
    """外れ値処理"""

    @staticmethod
    def winsorize(
        values: list[Decimal],
        lower_percentile: float = 0.05,
        upper_percentile: float = 0.95,
    ) -> list[Decimal]:
        """極端な値を指定パーセンタイルに置換"""
        lower = np.percentile(values, lower_percentile * 100)
        upper = np.percentile(values, upper_percentile * 100)
        return [max(lower, min(upper, v)) for v in values]
```

### 7.3 Phase C: ML（将来設計）

#### 7.3.1 入力特徴量

```python
DEMAND_FEATURES = {
    # 時間特徴量
    "day_of_week": "曜日（0-6）",
    "day_of_month": "日（1-31）",
    "month": "月（1-12）",
    "is_holiday": "祝日フラグ",
    "is_month_end": "月末フラグ",

    # 製品特徴量
    "product_category": "製品カテゴリ",
    "product_lifecycle": "製品ライフサイクル段階",
    "unit_price": "単価",

    # 顧客特徴量
    "customer_segment": "顧客セグメント",
    "customer_order_frequency": "顧客発注頻度",

    # 履歴特徴量
    "demand_lag_1d": "1日前需要",
    "demand_lag_7d": "7日前需要",
    "demand_lag_30d": "30日前需要",
    "demand_ma_7d": "7日移動平均",
    "demand_ma_30d": "30日移動平均",

    # イベント特徴量
    "cancellation_rate_7d": "直近7日キャンセル率",
    "return_rate_7d": "直近7日返品率",
    "inbound_delay_rate": "入荷遅延率",
}
```

#### 7.3.2 評価指標

```python
EVALUATION_METRICS = {
    "MAPE": "Mean Absolute Percentage Error",
    "SMAPE": "Symmetric Mean Absolute Percentage Error",
    "WAPE": "Weighted Absolute Percentage Error",
    "RMSE": "Root Mean Square Error",
    "bias": "予測バイアス（過大/過小傾向）",

    # ビジネス指標
    "stockout_impact": "欠品による機会損失（金額）",
    "overstock_impact": "過剰在庫による保管コスト",
}
```

---

## 8. API設計

### 8.1 テストデータ生成API（既存＋拡張）

```python
# POST /api/admin/test-data/generate
class GenerateRequest(BaseModel):
    seed: int = 42
    base_date: date | None = None
    mode: Literal["strict", "relaxed", "invalid_only"] = "strict"
    scale: Literal["small", "medium", "large", "production"] = "medium"
    modules: list[str] = ["all"]
    scenarios: list[str] = ["normal"]
    truncate: bool = True
    dataset_id: str | None = None

    # 【新規】発注・予測検証用オプション
    include_demand_patterns: bool = False
    include_stockout_scenarios: bool = False
    include_lt_variance: bool = False
```

### 8.2 発注提案API（新規）

```python
# GET /api/admin/replenishment/recommendations
# 発注提案一覧を取得
class GetRecommendationsRequest(BaseModel):
    as_of_date: date | None = None       # 基準日（省略時は実行日）
    product_ids: list[int] | None = None # 対象製品（省略時は全製品）
    warehouse_ids: list[int] | None = None
    supplier_ids: list[int] | None = None
    status: list[str] | None = None      # draft / approved / rejected
    min_order_qty: Decimal | None = None

class GetRecommendationsResponse(BaseModel):
    recommendations: list[ReplenishmentRecommendation]
    total_count: int
    as_of_date: date
    generated_at: datetime


# POST /api/admin/replenishment/recommendations/run
# 発注提案を再計算
class RunRecommendationsRequest(BaseModel):
    as_of_date: date | None = None
    product_ids: list[int] | None = None
    warehouse_ids: list[int] | None = None
    force_recalculate: bool = False      # 既存提案を上書き

    # 計算パラメータ（オーバーライド用）
    service_level_z: float | None = None # サービスレベル（Z値）
    forecast_horizon_days: int | None = None
    coverage_days: int | None = None


# GET /api/admin/replenishment/explain/{recommendation_id}
# 発注提案の詳細説明を取得
class ExplainResponse(BaseModel):
    recommendation: ReplenishmentRecommendation
    explanation_markdown: str
    calculation_trace: dict  # 計算過程の詳細
    input_data: dict         # 使用した入力データ
```

### 8.3 需要予測API（新規）

```python
# GET /api/admin/demand/forecast
# 需要予測を取得
class GetForecastRequest(BaseModel):
    product_id: int
    warehouse_id: int | None = None
    as_of_date: date | None = None
    horizon_days: int = 30
    method: str | None = None  # moving_average / ewma / seasonal

class GetForecastResponse(BaseModel):
    forecast: DemandForecast
    history_used: list[DailyDemand]  # 予測に使用した履歴
    explanation: str


# GET /api/admin/demand/history
# 需要履歴を取得
class GetHistoryRequest(BaseModel):
    product_id: int
    warehouse_id: int | None = None
    start_date: date
    end_date: date
    include_non_demand: bool = False  # 非需要出庫も含める

class GetHistoryResponse(BaseModel):
    daily_demands: list[DailyDemand]
    total: Decimal
    avg_daily: Decimal
    std_daily: Decimal
```

### 8.4 API一覧

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/admin/test-data/generate` | POST | テストデータ生成 |
| `/api/admin/test-data/presets` | GET | プリセット一覧 |
| `/api/admin/replenishment/recommendations` | GET | 発注提案一覧 |
| `/api/admin/replenishment/recommendations/run` | POST | 発注提案再計算 |
| `/api/admin/replenishment/explain/{id}` | GET | 発注提案の説明 |
| `/api/admin/demand/forecast` | GET | 需要予測取得 |
| `/api/admin/demand/history` | GET | 需要履歴取得 |

---

## 9. 検証とモニタリング

### 9.1 テストデータ検証（既存）

| チェック項目 | strict | relaxed | invalid_only |
|-------------|--------|---------|--------------|
| 外部キー整合性 | fail | fail | expect_fail |
| ロット数量非負 | fail | fail | expect_fail |
| 予約が在庫内 | fail | warn | expect_fail |
| 期限切れロット存在 | allow | require | - |
| キャンセル受注存在 | allow | require | - |

### 9.2 発注・予測検証（新規）

| チェック項目 | 説明 |
|-------------|------|
| 需要データ存在 | 各製品に需要履歴が存在すること |
| LTデータ存在 | サプライヤー×製品ごとにLT実績が存在すること |
| 欠品シナリオ存在 | unfulfilled_qty > 0 のレコードが存在すること |
| 季節パターン存在 | 季節変動のあるデータが存在すること |
| 発注提案生成可能 | 発注点到達製品に提案が生成されること |

### 9.3 予測精度モニタリング

```python
class ForecastAccuracyMonitor:
    """予測精度のモニタリング"""

    def calculate_metrics(
        self,
        forecasts: list[DemandForecast],
        actuals: list[DailyDemand],
    ) -> AccuracyMetrics:
        mape = self._calc_mape(forecasts, actuals)
        bias = self._calc_bias(forecasts, actuals)

        return AccuracyMetrics(
            mape=mape,
            bias=bias,
            sample_count=len(forecasts),
        )
```

---

## 10. 実装ロードマップ

### Phase 1: テストデータ基盤（既存）

| タスク | 詳細 | 優先度 |
|--------|------|-------|
| 1.1 | config.py - モード・スケール定義 | 最高 |
| 1.2 | orchestrator.py - 依存解決 | 最高 |
| 1.3 | validators.py - 検証ロジック | 高 |
| 1.4 | API エンドポイント拡張 | 高 |
| 1.5 | 既存モジュールのリファクタ | 中 |

### Phase 2: エッジケース・シナリオ（既存＋拡張）

| タスク | 詳細 |
|--------|------|
| 2.1 | scenarios/edge_cases.py - 合法な例外 |
| 2.2 | scenarios/traceability.py - トレーサビリティ |
| 2.3 | scenarios/cancellation.py - 取り消し |
| 2.4 | 【新規】scenarios/demand_patterns.py - 需要パターン |
| 2.5 | 【新規】scenarios/replenishment.py - 発注検証用 |
| 2.6 | 【新規】欠品・LTばらつきシナリオ |

### Phase 3: 需要予測（Phase B: 統計）

| タスク | 詳細 |
|--------|------|
| 3.1 | demand/estimator.py - インターフェース定義 |
| 3.2 | demand/statistical/moving_average.py |
| 3.3 | demand/statistical/ewma.py |
| 3.4 | demand/statistical/seasonal.py |
| 3.5 | demand/statistical/outlier.py - スパイク抑制 |
| 3.6 | 需要履歴API |

### Phase 4: 発注提案

| タスク | 詳細 |
|--------|------|
| 4.1 | replenishment/calculator.py - ROP/発注量計算 |
| 4.2 | replenishment/constraints.py - 制約（MOQ等） |
| 4.3 | replenishment/explainer.py - 説明生成 |
| 4.4 | 発注提案API |
| 4.5 | 発注提案UI |

### Phase 5: 時系列拡張

| タスク | 詳細 |
|--------|------|
| 5.1 | scenarios/time_series.py - 季節パターン |
| 5.2 | base_date起点の履歴データ生成 |
| 5.3 | 週次・月次パターン実装 |

### Phase 6: 検証・レポート

| タスク | 詳細 |
|--------|------|
| 6.1 | カバレッジレポート生成 |
| 6.2 | 予測精度モニタリング |
| 6.3 | CI連携 |

### Phase C（将来）: ML予測

| タスク | 詳細 |
|--------|------|
| C.1 | 特徴量エンジニアリング |
| C.2 | モデル学習パイプライン |
| C.3 | A/Bテスト基盤 |
| C.4 | 統計→ML切り替え機構 |

---

## 11. 成功指標

### テストデータ生成

| 指標 | 目標値 |
|------|--------|
| エッジケースカバレッジ | 95%以上 |
| CI安定性（strict mode） | 100% |
| 再現性 | seed + base_date で100%同一 |
| 生成時間（medium） | 30秒以内 |

### 発注提案

| 指標 | 目標値 |
|------|--------|
| 発注提案精度 | 実際発注との乖離20%以内 |
| 欠品率削減 | 導入前比30%減 |
| 過剰在庫削減 | 導入前比20%減 |
| 説明可能性 | 全提案に根拠表示 |

### 需要予測

| 指標 | 目標値 |
|------|--------|
| MAPE | 30%以下 |
| バイアス | ±10%以内 |
| 予測対象カバー率 | 80%の製品で予測可能 |

---

## 12. Decision一覧

| # | 決定事項 | 推奨案 | 代替案 | 影響範囲 | 既定値 |
|---|---------|--------|--------|---------|--------|
| **D1** | qty_scaleの格納場所 | A) Productテーブル | B) ProductTypeマスタ | DB設計、生成器 | A |
| **D2** | dataset_idの実装方式 | B) カラム追加 | A) プレフィックス, C) 別スキーマ | DB設計 | B |
| **D3** | edge_case_idの格納方式 | A) JSONカラム | B) 専用カラム, C) 別テーブル | DB設計、レポート | A |
| **D4** | relaxedモードの警告比率 | C) 設定可能（default 5%） | A) 固定5%, B) 固定10% | 生成器 | C |
| **D5** | invalid_onlyの実行環境 | A) 専用テストDB | B) 別スキーマ, C) 一時テーブル | インフラ | A |
| **D6** | base_dateのデフォルト | A) 実行日（CI環境変数で上書き可） | B) 固定日 | API、CI | A |
| **D7** | 取りこぼし需要の扱い | A) 欠品数量をそのまま使用 | B) 過去実績から推定, C) 除外 | 予測精度 | A |
| **D8** | RETURNの需要扱い | A) 需要から除外 | B) 需要のマイナスとして計上 | 需要計算 | A |
| **D9** | 安全在庫の計算式 | A) 需要変動+LT変動考慮 | B) 需要変動のみ, C) 固定日数 | 発注精度 | A |
| **D10** | サービスレベルのデフォルト | B) 95%（Z=1.65） | A) 90%, C) 99% | 安全在庫量 | B |
| **D11** | 需要予測の初期手法 | A) 移動平均+季節係数 | B) EWMAのみ, C) 単純平均 | 予測精度 | A |
| **D12** | MOQ/ロット丸めの適用順 | A) MOQ→ロット丸め | B) ロット丸め→MOQ | 発注量 | A |
| **D13** | 予測期間のデフォルト | B) 30日 | A) 14日, C) 60日 | 計算負荷、精度 | B |
| **D14** | LT統計のサンプル期間 | B) 過去6ヶ月 | A) 過去3ヶ月, C) 過去1年 | LT精度 | B |

### Decision詳細

#### D7: 取りこぼし需要の扱い

| 選択肢 | 説明 | メリット | デメリット |
|--------|------|---------|-----------|
| A) 欠品数量をそのまま使用 | unfulfilled_qtyを需要に加算 | シンプル、実測値 | 潜在需要を過小評価 |
| B) 過去実績から推定 | 欠品時の代替購入率等を推定 | 潜在需要を反映 | 推定ロジックが複雑 |
| C) 除外 | 欠品は需要に含めない | シンプル | 需要を過小評価 |

**推奨**: A)（シンプルかつ保守的）

#### D9: 安全在庫の計算式

| 選択肢 | 計算式 | 適用場面 |
|--------|--------|---------|
| A) 需要+LT変動考慮 | `SS = Z × √(LT×σ_d² + D²×σ_LT²)` | LTばらつきが大きい場合 |
| B) 需要変動のみ | `SS = Z × σ_d × √LT` | LTが安定している場合 |
| C) 固定日数 | `SS = avg_demand × N日` | シンプル運用 |

**推奨**: A)（精度重視）

---

## 付録A: 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| v1.0 | 2026-01-17 | 初版（テストデータ生成のみ） |
| v1.1 | 2026-01-17 | モード分離、API改訂、scale再定義、CI安定性対応 |
| v1.2 | 2026-01-17 | 発注提案・需要予測を統合、テストデータシナリオ拡張 |

## 付録B: v1.2 変更点サマリ

### 章構成の変更

| v1.1 | v1.2 | 変更内容 |
|------|------|---------|
| 1. 背景と目的 | 1. 背景と目的 | 発注・予測の課題を追加 |
| - | 2. 用語定義 | 【新規】需要、在庫、LTの定義 |
| 2. 設計原則 | 3. 設計原則 | 予測器差し替え可能性を追加 |
| 3. 新アーキテクチャ | 4. 全体アーキテクチャ | 発注・予測モジュールを追加 |
| 4-9. テストデータ関連 | 5. テストデータ生成 | 発注・予測検証シナリオを追加 |
| - | 6. 発注提案 | 【新規】 |
| - | 7. 需要予測 | 【新規】 |
| 4. API設計 | 8. API設計 | 発注・予測APIを追加 |
| 7. 検証 | 9. 検証 | 予測精度モニタリングを追加 |
| 10. 実装計画 | 10. ロードマップ | Phase 3-4,C を追加 |
| 12. 成功指標 | 11. 成功指標 | 発注・予測指標を追加 |
| 付録D. 未決事項 | 12. Decision一覧 | D7-D14 を追加 |

### 新規追加項目

1. **用語定義**: 需要、欠品、LT、利用可能在庫の明確な定義
2. **発注提案**: ROP/発注量計算、制約適用、説明可能性
3. **需要予測**: 統計ベース（移動平均、EWMA、季節係数）、ML差し替えインターフェース
4. **テストシナリオ**: 需要パターン、欠品、LTばらつき、発注検証
5. **API**: 発注提案・需要予測エンドポイント
6. **Decision**: D7-D14（発注・予測関連の意思決定項目）

---

*作成日: 2026-01-17*
*バージョン: 1.2*
