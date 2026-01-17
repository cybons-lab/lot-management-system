# テストデータ生成システム改善計画書

**バージョン**: v1.1
**作成日**: 2026-01-17
**ステータス**: Draft

---

## 1. 背景と目的

### 1.1 現状の課題

| 課題 | 詳細 |
|------|------|
| **表面的なデータ** | 正常系パターンが中心で、エッジケースが不足 |
| **短い期間** | 翌月分のフォーキャストのみ（1ヶ月分） |
| **一括生成のみ** | 個別モジュールの選択的生成ができない |
| **状態変化の欠如** | 取り消し、変更、削除などの履歴データが少ない |
| **CI不安定** | 破壊データ混入によるテスト失敗 |
| **再現性不足** | seed固定だけでは日付依存ロジックが不安定 |

### 1.2 目標

1. **6ヶ月〜1年分**の時系列データを生成
2. **モジュール単位での選択的生成**を可能に
3. **包括的なエッジケース**をすべてのエンティティで網羅
4. **CI安定性**：破壊データは隔離し、通常テストに混入させない
5. **完全な再現性**：seed + base_date で同一データを再生成可能

---

## 2. 設計原則

### 2.1 データセットモード（3モード分離）

**最重要**: 破壊データを通常データセットに混入させない

| モード | 目的 | DB整合性 | 含む内容 | CI利用 |
|--------|------|----------|----------|--------|
| **strict** | 通常テスト・CI | 100% | 合法な例外のみ（期限切れ、欠品、遅延、部分割当など） | ✅ 推奨 |
| **relaxed** | 例外処理検証 | 100% | 警告対象を5〜10%含む（UI/ロジックの堅牢性検証） | ⚠️ 条件付き |
| **invalid_only** | 異常検出テスト | 0% | FK違反、不正遷移、オーバーアロケーション、負数など | ❌ 専用テストのみ |

**重要な区別**:
- **合法な例外**（strict/relaxedで使用）：期限切れロット、納期遅延、部分割当、キャンセル済み受注
- **破壊データ**（invalid_onlyのみ）：外部キー違反、マイナス在庫、オーバーアロケーション、不正ステータス遷移

### 2.2 再現性の保証

```python
# 再現性を保証する3要素
REPRODUCIBILITY_KEYS = {
    "seed": 42,           # 乱数シード
    "base_date": "2025-01-15",  # 基準日（TODAY相当）
    "version": "1.1",     # 生成器バージョン
}
```

- `seed`: Faker/randomの乱数シード
- `base_date`: 「今日」の基準日。省略時は実行日
- `version`: 生成ロジックのバージョン（将来の互換性用）

### 2.3 生成方式（truncate + dataset_id共存）

| 方式 | 用途 | 動作 |
|------|------|------|
| **truncate**（標準） | 通常のテスト | 既存データを全削除して再生成 |
| **dataset_id** | バグ再現・比較 | 既存と共存して保存（IDプレフィックス付与） |

```python
# dataset_id の運用例
DATASET_ID_EXAMPLES = {
    "ci-20250117": "CI用の日次生成データ",
    "bugrepro-issue-123": "Issue #123 再現用データ",
    "compare-before": "リファクタ前後の比較用",
}
```

---

## 3. 新アーキテクチャ設計

### 3.1 モジュール構成

```
backend/app/application/services/test_data/
├── __init__.py
├── orchestrator.py          # 統合オーケストレーター（依存解決）
├── config.py                # 生成設定・期間管理・モード定義
├── validators.py            # 生成後の整合性検証
├── scenarios/
│   ├── __init__.py
│   ├── base.py              # シナリオ基底クラス
│   ├── normal_operations.py # 正常系シナリオ
│   ├── edge_cases.py        # 合法な例外（strict/relaxed用）
│   ├── invalid_data.py      # 破壊データ（invalid_only専用）
│   ├── cancellation.py      # 取り消し系シナリオ
│   ├── time_series.py       # 時系列パターン
│   ├── traceability.py      # トレーサビリティシナリオ
│   └── stress_test.py       # 大量データシナリオ
├── generators/
│   ├── __init__.py
│   ├── masters.py           # マスタデータ
│   ├── lots.py              # ロット（旧inventory.py）
│   ├── forecasts.py         # フォーキャスト
│   ├── orders.py            # 受注
│   ├── inbound.py           # 入荷予定
│   ├── withdrawals.py       # 出庫履歴
│   └── reservations.py      # 予約
└── utils.py                 # ユーティリティ
```

### 3.2 モジュール依存関係（DAG）

```
┌─────────────────────────────────────────────────────────────┐
│                    依存関係グラフ（DAG）                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   masters ─────────────────────────────────────────────────┐│
│      │                                                     ││
│      ├──→ lots ─────────────────────────────────────┐      ││
│      │      │                                       │      ││
│      ├──→ forecasts ────────────────────────┐       │      ││
│      │      │                               │       │      ││
│      ├──→ inbound ──────────────────┐       │       │      ││
│      │                              │       │       │      ││
│      └──→ orders ←──────────────────┴───────┴───────┘      ││
│                │                                           ││
│                ├──→ reservations ←── lots + (orders|forecasts)│
│                │                                           ││
│                └──→ withdrawals ←── lots + (orders optional)│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**依存解決ルール**:

| モジュール | 必須依存 | オプション依存 | 備考 |
|-----------|---------|--------------|------|
| masters | なし | - | 最初に生成 |
| lots | masters | - | |
| forecasts | masters | - | |
| inbound | masters | - | |
| orders | masters, forecasts | lots, inbound | 欠品/部分割当があるためlots必須にしない |
| reservations | lots | orders, forecasts | source_typeに応じて |
| withdrawals | lots | orders | 手動出庫は受注不要 |

### 3.3 数量の小数スケール（製品単位）

```python
# 製品マスタに qty_scale を追加
class Product:
    qty_scale: int = 0  # 0: 整数, 3: 小数3桁

# 生成時の丸め規則
ROUNDING_RULES = {
    "method": "ROUND_HALF_UP",  # 四捨五入
    "apply_at": "generation",   # 生成時に適用
    "validate_at": "insertion", # DB挿入前に再検証
}

# 製品タイプ別のデフォルト
PRODUCT_QTY_SCALE_DEFAULTS = {
    "standard": 0,      # 通常製品: 整数
    "liquid": 3,        # 液体: 小数3桁
    "bulk": 3,          # バルク: 小数3桁
}
```

---

## 4. API設計詳細

### 4.1 生成リクエスト（GenerateRequest）

```python
from datetime import date
from typing import Literal
from pydantic import BaseModel, Field

class PeriodConfig(BaseModel):
    """期間設定（明示指定時に使用）"""
    start_date: date
    end_date: date

class GenerateRequest(BaseModel):
    """テストデータ生成リクエスト"""

    # === 基本設定 ===
    seed: int = Field(default=42, description="乱数シード")
    base_date: date | None = Field(default=None, description="基準日（省略時は実行日）")

    # === 期間設定（優先順位: period > past/future_months）===
    period: PeriodConfig | None = Field(default=None, description="明示的な期間指定")
    past_months: int = Field(default=6, ge=0, le=24, description="過去月数（base_date起点）")
    future_months: int = Field(default=6, ge=0, le=24, description="将来月数（base_date起点）")

    # === モジュール選択 ===
    modules: list[str] = Field(
        default=["all"],
        description="生成モジュール: masters, lots, forecasts, orders, inbound, withdrawals, reservations"
    )

    # === モード・シナリオ ===
    mode: Literal["strict", "relaxed", "invalid_only"] = Field(default="strict")
    scenarios: list[str] = Field(
        default=["normal"],
        description="シナリオ: normal, edge_cases, cancellations, traceability, time_series"
    )

    # === スケール ===
    scale: Literal["small", "medium", "large", "production"] = Field(default="medium")

    # === 生成方式 ===
    truncate: bool = Field(default=True, description="既存データを削除して再生成")
    dataset_id: str | None = Field(default=None, description="データセット識別子（共存保存用）")

    # === 互換性エイリアス ===
    @classmethod
    def normalize_modules(cls, modules: list[str]) -> list[str]:
        """モジュール名の正規化"""
        ALIASES = {
            "inventory": "lots",
            "lot": "lots",
            "order": "orders",
            "forecast": "forecasts",
            "withdrawal": "withdrawals",
            "reservation": "reservations",
            "master": "masters",
        }
        return [ALIASES.get(m, m) for m in modules]
```

### 4.2 JSON リクエスト例

```json
{
    "seed": 42,
    "base_date": "2025-01-15",
    "mode": "strict",
    "scale": "medium",
    "modules": ["masters", "lots", "forecasts", "orders"],
    "scenarios": ["normal", "edge_cases", "traceability"],
    "truncate": true
}
```

### 4.3 個別モジュール生成エンドポイント

```python
# POST /api/admin/test-data/generate/{module}
# 依存関係を自動解決して生成

# 例: POST /api/admin/test-data/generate/orders
# 実行順序（自動解決）:
#   1. masters（依存）
#   2. forecasts（依存）
#   3. lots または inbound（オプション依存、設定による）
#   4. orders（本体）
```

**依存解決の例**:

```python
def resolve_dependencies(module: str) -> list[str]:
    """モジュールの依存関係を解決して実行順序を返す"""
    DEPENDENCIES = {
        "masters": [],
        "lots": ["masters"],
        "forecasts": ["masters"],
        "inbound": ["masters"],
        "orders": ["masters", "forecasts"],  # lots/inboundはオプション
        "reservations": ["masters", "lots"],
        "withdrawals": ["masters", "lots"],
    }

    result = []
    visited = set()

    def visit(m):
        if m in visited:
            return
        visited.add(m)
        for dep in DEPENDENCIES.get(m, []):
            visit(dep)
        result.append(m)

    visit(module)
    return result

# 例
resolve_dependencies("orders")
# => ["masters", "forecasts", "orders"]

resolve_dependencies("withdrawals")
# => ["masters", "lots", "withdrawals"]
```

### 4.4 レスポンス

```python
class GenerateResponse(BaseModel):
    """生成結果レスポンス"""
    success: bool
    mode: str
    seed: int
    base_date: date
    dataset_id: str | None
    generated_counts: dict[str, int]  # {"masters": 50, "lots": 300, ...}
    validation_result: ValidationResult
    edge_case_coverage: CoverageReport
    warnings: list[str]
    elapsed_seconds: float
```

---

## 5. データ規模設定（scale）

### 5.1 スケール定義（受注ヘッダ件数ベース）

**基準**: ユーザー実態 = 月12,000ヘッダ受注

| スケール | 月間受注ヘッダ | 顧客 | 製品 | ロット | フォーキャスト | 用途 |
|---------|--------------|------|------|--------|--------------|------|
| **small** | 200 | 10 | 20 | 100 | 500 | 開発・単体テスト |
| **medium** | 2,000 | 30 | 80 | 500 | 3,000 | 統合テスト（現実ライン） |
| **large** | 12,000 | 100 | 300 | 3,000 | 20,000 | 本番相当の月次負荷 |
| **production** | 12,000 × 12 | 100 | 300 | 30,000 | 200,000 | 年次シミュレーション |

### 5.2 スケール別推奨設定

```python
SCALE_PRESETS = {
    "small": {
        "orders_per_month": 200,
        "recommended_period": {"past_months": 1, "future_months": 1},
        "estimated_time": "5秒",
    },
    "medium": {
        "orders_per_month": 2000,
        "recommended_period": {"past_months": 3, "future_months": 3},
        "estimated_time": "30秒",
    },
    "large": {
        "orders_per_month": 12000,
        "recommended_period": {"past_months": 1, "future_months": 1},  # 期間短縮
        "estimated_time": "2分",
        "warning": "1年分生成は爆増するため期間短縮を推奨",
    },
    "production": {
        "orders_per_month": 12000,
        "recommended_period": {"past_months": 6, "future_months": 6},
        "estimated_time": "15分",
        "warning": "本番シミュレーション専用。CI非推奨",
    },
}
```

### 5.3 データ量の概算式

```python
def estimate_record_counts(scale: str, months: int) -> dict:
    """スケールと期間からレコード数を概算"""
    BASE = SCALE_PRESETS[scale]
    orders_total = BASE["orders_per_month"] * months

    return {
        "orders": orders_total,
        "order_lines": orders_total * 2.5,       # 平均2.5明細/受注
        "lots": orders_total * 0.15,             # 受注の15%がロット数
        "withdrawals": orders_total * 1.2,       # 受注の120%（手動出庫含む）
        "forecasts": orders_total * 1.5,         # 受注の150%
        "reservations": orders_total * 0.8,      # 受注の80%
    }
```

---

## 6. プリセット定義（4本立て）

| プリセットID | scale | mode | scenarios | 期間 | 用途 |
|-------------|-------|------|-----------|------|------|
| **quick** | small | strict | normal | past:1, future:1 | 開発中の素早い確認（数秒） |
| **full_coverage** | medium | strict | normal, edge_cases, traceability | past:3, future:3 | 網羅的なテスト |
| **warning_focus** | medium | relaxed | cancellations, delays, short_expiry | past:3, future:3 | 警告・例外処理の検証 |
| **invalid_only** | small | invalid_only | invalid | past:1, future:1 | 破壊データ検出テスト |

```python
PRESETS = {
    "quick": {
        "scale": "small",
        "mode": "strict",
        "scenarios": ["normal"],
        "past_months": 1,
        "future_months": 1,
        "description": "開発中の素早い確認（数秒）",
    },
    "full_coverage": {
        "scale": "medium",
        "mode": "strict",
        "scenarios": ["normal", "edge_cases", "traceability"],
        "past_months": 3,
        "future_months": 3,
        "description": "網羅的なテスト（CI推奨）",
    },
    "warning_focus": {
        "scale": "medium",
        "mode": "relaxed",
        "scenarios": ["normal", "cancellations", "delays", "short_expiry"],
        "past_months": 3,
        "future_months": 3,
        "description": "警告・例外処理の検証",
    },
    "invalid_only": {
        "scale": "small",
        "mode": "invalid_only",
        "scenarios": ["invalid"],
        "past_months": 1,
        "future_months": 1,
        "description": "破壊データ検出テスト（専用テストのみ）",
    },
}
```

---

## 7. 検証とモニタリング

### 7.1 モード別検証動作

| モード | 検証失敗時の動作 | レポート内容 |
|--------|----------------|-------------|
| **strict** | 全体rollback、生成失敗 | エラー詳細 |
| **relaxed** | 警告として続行 | 警告一覧をレポート |
| **invalid_only** | "検出できたか"を判定 | 検出成功/失敗をレポート |

### 7.2 検証チェックリスト

```python
VALIDATION_CHECKS = {
    # === DB整合性（strict必須、relaxed必須、invalid_only対象外）===
    "referential_integrity": {
        "description": "外部キー整合性",
        "strict": "fail",
        "relaxed": "fail",
        "invalid_only": "expect_fail",
    },
    "lot_quantities_non_negative": {
        "description": "ロット数量が負でないこと",
        "strict": "fail",
        "relaxed": "fail",
        "invalid_only": "expect_fail",
    },
    "reservation_within_stock": {
        "description": "予約が在庫内であること",
        "strict": "fail",
        "relaxed": "warn",
        "invalid_only": "expect_fail",
    },

    # === 合法な例外（strict許可、relaxed多め）===
    "expired_lots_exist": {
        "description": "期限切れロットが存在すること",
        "strict": "allow",
        "relaxed": "require",
    },
    "cancelled_orders_exist": {
        "description": "キャンセル受注が存在すること",
        "strict": "allow",
        "relaxed": "require",
    },
    "partial_allocations_exist": {
        "description": "部分割当が存在すること",
        "strict": "allow",
        "relaxed": "require",
    },

    # === トレーサビリティ ===
    "lot_withdrawal_history_exists": "ロット別出庫履歴が存在",
    "order_lot_linkage_exists": "受注-ロット紐付けが存在",
    "multi_lot_allocation_exists": "複数ロット分割割当が存在",
}
```

### 7.3 カバレッジ算定（タグ方式）

```python
# 生成時にタグを付与
class GeneratedRecord:
    edge_case_id: str | None      # "expiry_today", "partial_allocation"
    scenario_id: str | None       # "traceability_full_lifecycle"
    test_tags: list[str]          # ["boundary", "cancellation"]

# カバレッジレポート
class CoverageReport(BaseModel):
    total_edge_cases_defined: int
    edge_cases_generated: int
    coverage_percentage: float
    by_category: dict[str, CategoryCoverage]
    missing_edge_cases: list[str]
    generated_tags: dict[str, int]  # タグ別の生成数
```

---

## 8. エンティティ別エッジケース定義

### 8.1 合法な例外（strict/relaxed共通）

これらは**DB整合性を保ちつつ**、ビジネス上の例外状態を表現する。

#### ロット (LotReceipt)

| カテゴリ | エッジケース | edge_case_id |
|----------|-------------|--------------|
| **期限系** | 本日期限 | `expiry_today` |
| | 期限切れ（1日前） | `expiry_yesterday` |
| | 期限切れ（1ヶ月前） | `expiry_1month_ago` |
| | 3日以内期限 | `expiry_within_3days` |
| **数量系** | 数量=0（消費済） | `qty_zero` |
| | 数量=1（最小） | `qty_one` |
| | 残り少量（閾値以下） | `qty_low_threshold` |
| **状態系** | ロック中 | `locked` |
| | 検疫中 | `quarantine` |
| | 枯渇（depleted） | `depleted` |
| **FEFO系** | 同一製品で期限異なる複数ロット | `multi_lot_different_expiry` |

#### 受注 (Order)

| カテゴリ | エッジケース | edge_case_id |
|----------|-------------|--------------|
| **納期系** | 納期=本日 | `delivery_today` |
| | 納期遅延（過去日） | `delivery_overdue` |
| **状態系** | キャンセル済み | `cancelled` |
| | 部分出荷 | `partial_shipped` |
| | 保留中 | `on_hold` |
| **割当系** | 部分割当（在庫不足） | `partial_allocation` |
| | 未割当（在庫ゼロ） | `no_allocation` |
| | 複数ロット割当 | `multi_lot_allocation` |

### 8.2 破壊データ（invalid_only専用）

**警告**: これらは通常データセットに混入させてはならない。

```python
INVALID_DATA_SCENARIOS = {
    # FK違反
    "order_nonexistent_product": {
        "description": "存在しない製品IDの受注",
        "expected_error": "ForeignKeyViolation",
    },
    "lot_nonexistent_warehouse": {
        "description": "存在しない倉庫IDのロット",
        "expected_error": "ForeignKeyViolation",
    },

    # 数量異常
    "negative_stock": {
        "description": "マイナス在庫",
        "lot": {"received": 100, "consumed": 150},
        "expected_error": "NegativeStockError",
    },
    "over_allocation": {
        "description": "在庫超過の割当",
        "lot": {"remaining": 100},
        "reservations": [{"qty": 120}],
        "expected_error": "OverAllocationError",
    },

    # 不正遷移
    "invalid_status_transition": {
        "description": "shipped → pending への不正遷移",
        "order_history": ["pending", "shipped", "pending"],
        "expected_error": "InvalidStatusTransition",
    },

    # 日付異常
    "future_withdrawal_date": {
        "description": "未来日の出庫（withdrawn_at > now）",
        "expected_error": "FutureDateError",
    },
}
```

---

## 9. トレーサビリティシナリオ

### 9.1 トレーサビリティ関連テーブル

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

### 9.2 トレーサビリティシナリオ

```python
LOT_TRACEABILITY_SCENARIOS = {
    "full_lifecycle": {
        "scenario_id": "trace_full_lifecycle",
        "description": "入荷→予約→割当→出荷の完全フロー",
        "data": {
            "inbound_plan": {"status": "received", "quantity": 100},
            "lot_receipt": {"received_quantity": 100, "status": "active"},
            "reservations": [
                {"source_type": "forecast", "qty": 30},
                {"source_type": "order", "qty": 50},
            ],
            "withdrawals": [
                {"type": "ORDER_AUTO", "quantity": 50},
                {"type": "SAMPLE", "quantity": 5},
            ],
        },
        "expected_current_qty": 45,
    },

    "multi_order_allocation": {
        "scenario_id": "trace_multi_order",
        "description": "1ロット→複数受注への割当",
    },

    "forecast_to_order_conversion": {
        "scenario_id": "trace_forecast_order",
        "description": "フォーキャスト予約が受注予約に変換",
    },

    "multi_lot_fefo": {
        "scenario_id": "trace_fefo",
        "description": "FEFO順での複数ロット分散割当",
    },
}
```

### 9.3 手動出庫シナリオ

```python
MANUAL_WITHDRAWAL_SCENARIOS = {
    "paper_based_manual_order": {
        "scenario_id": "manual_paper",
        "description": "FAXや紙で来た注文を手動でロットから払い出す",
        "withdrawal_type": "order_manual",
        "note": "受注テーブルにレコードなし、Withdrawalのみ",
    },
    "sample_shipment": {
        "scenario_id": "manual_sample",
        "description": "営業担当がサンプルとして顧客に提供",
        "withdrawal_type": "sample",
    },
    "internal_use": {
        "scenario_id": "manual_internal",
        "description": "品質検査や試作のための社内消費",
        "withdrawal_type": "internal_use",
    },
    "disposal_expired": {
        "scenario_id": "manual_disposal",
        "description": "期限切れロットの廃棄",
        "withdrawal_type": "disposal",
    },
}
```

### 9.4 分納・複数回入出庫シナリオ

```python
PARTIAL_DELIVERY_SCENARIOS = {
    "same_lot_multiple_withdrawals": {
        "scenario_id": "partial_same_lot",
        "description": "同一ロットから異なる日に複数回出庫",
    },
    "order_partial_shipments": {
        "scenario_id": "partial_order_ship",
        "description": "1つの受注を複数回に分けて出荷",
    },
    "order_partial_then_cancel": {
        "scenario_id": "partial_then_cancel",
        "description": "部分出荷後に残りをキャンセル",
    },
    "single_withdrawal_multi_lot": {
        "scenario_id": "partial_multi_lot",
        "description": "1回の出庫で複数ロットから払い出す（FIFO）",
        "note": "WithdrawalLineで各ロットからの出庫数を記録",
    },
}
```

---

## 10. 実装計画

### Phase 1: 基盤整備

| タスク | 詳細 | 優先度 |
|--------|------|-------|
| 1.1 | `config.py` - モード定義、スケール定義、期間管理 | 最高 |
| 1.2 | `orchestrator.py` - 依存解決、モード別生成制御 | 最高 |
| 1.3 | `validators.py` - モード別検証ロジック | 高 |
| 1.4 | API エンドポイント拡張（GenerateRequest対応） | 高 |
| 1.5 | 既存モジュールを `generators/` に移動・リネーム | 中 |

### Phase 2: エッジケース実装

| タスク | 詳細 |
|--------|------|
| 2.1 | `scenarios/edge_cases.py` - 合法な例外（strict/relaxed用） |
| 2.2 | `scenarios/invalid_data.py` - 破壊データ（invalid_only専用） |
| 2.3 | `scenarios/traceability.py` - トレーサビリティシナリオ |
| 2.4 | `scenarios/cancellation.py` - 取り消しシナリオ |
| 2.5 | タグ付与機構（edge_case_id, scenario_id, test_tags） |

### Phase 3: 時系列拡張

| タスク | 詳細 |
|--------|------|
| 3.1 | `scenarios/time_series.py` - 時系列パターン定義 |
| 3.2 | base_date 起点の履歴データ生成 |
| 3.3 | 季節変動・週次パターン実装 |

### Phase 4: 検証・レポート

| タスク | 詳細 |
|--------|------|
| 4.1 | カバレッジレポート生成 |
| 4.2 | モード別検証動作の実装 |
| 4.3 | CI連携（strict失敗時のrollback） |

---

## 11. 管理画面UI設計

```
┌─────────────────────────────────────────────────────────────┐
│  テストデータ生成                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [プリセット選択]                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ○ quick（開発用・数秒）                                   │ │
│  │ ● full_coverage（CI推奨）                                │ │
│  │ ○ warning_focus（例外検証用）                             │ │
│  │ ○ invalid_only（破壊データテスト専用）                     │ │
│  │ ○ カスタム                                              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  [モード]  ● strict  ○ relaxed  ○ invalid_only              │
│                                                             │
│  [スケール]  ○ small  ● medium  ○ large  ○ production       │
│                                                             │
│  [期間設定]                                                  │
│  基準日: [2025-01-15]  過去: [3] ヶ月  将来: [3] ヶ月          │
│                                                             │
│  [モジュール選択]（カスタム時のみ）                            │
│  ☑ masters  ☑ lots  ☑ forecasts  ☑ orders                  │
│  ☑ inbound  ☑ withdrawals  ☑ reservations                   │
│                                                             │
│  [シナリオ選択]                                              │
│  ☑ normal  ☑ edge_cases  ☑ traceability                    │
│  ☐ cancellations  ☐ time_series                            │
│                                                             │
│  [詳細オプション]                                            │
│  Seed: [42]  ☑ 既存データを削除（truncate）                   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  [生成実行]                            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [生成結果]                                                  │
│  ├─ モード: strict                                          │
│  ├─ 顧客: 30件                                              │
│  ├─ 製品: 80件                                              │
│  ├─ ロット: 512件 (エッジケース: 48件)                       │
│  ├─ 受注: 6,024件 (キャンセル: 152件)                        │
│  ├─ 検証: ✅ PASS                                           │
│  └─ カバレッジ: 96.2%                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. 成功指標

| 指標 | 目標値 |
|------|--------|
| **エッジケースカバレッジ** | 95%以上 |
| **CI安定性**（strict mode） | 100%（失敗なし） |
| **データ期間** | 過去6ヶ月〜将来6ヶ月 |
| **再現性** | seed + base_date で100%同一データ |
| **生成時間（medium）** | 30秒以内 |
| **破壊データ隔離** | invalid_only以外に0件 |

---

## 付録A: モジュール名対応表

| 正式名 | エイリアス（互換用） |
|--------|-------------------|
| masters | master |
| lots | inventory, lot |
| forecasts | forecast |
| orders | order |
| inbound | - |
| withdrawals | withdrawal |
| reservations | reservation |

---

## 付録B: 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| v1.0 | 2026-01-17 | 初版作成 |
| v1.1 | 2026-01-17 | モード分離、API改訂、scale再定義、CI安定性対応 |

---

## 付録C: v1.1 変更点サマリ（diff要約）

### 章単位の変更

| 章 | 変更内容 |
|----|---------|
| **1. 背景と目的** | 課題に「CI不安定」「再現性不足」を追加、目標に「CI安定性」「完全な再現性」を追加 |
| **2. 設計原則** | 【新規】モード分離（strict/relaxed/invalid_only）、再現性の保証、生成方式を追加 |
| **3. 新アーキテクチャ設計** | モジュール構成を整理、依存関係DAGを明文化、数量の小数スケールを追加 |
| **4. API設計詳細** | GenerateRequestに`base_date`追加、モジュール名正規化、依存解決の例を追加 |
| **5. データ規模設定** | 【大幅変更】受注ヘッダ件数ベースに再定義（月12,000ヘッダ基準） |
| **6. プリセット定義** | 【大幅変更】4本立てに再編（quick/full_coverage/warning_focus/invalid_only） |
| **7. 検証とモニタリング** | モード別検証動作を追加、検証チェックリストをモード対応に変更 |
| **8. エンティティ別エッジケース** | 「合法な例外」と「破壊データ」を明確に分離、edge_case_idを追加 |
| **9. トレーサビリティ** | scenario_idを追加、v1.0の詳細シナリオを簡潔に整理 |
| **10. 実装計画** | Phase構成を4段階に整理、優先度を明記 |
| **11. UI設計** | モード選択、基準日入力を追加 |
| **12. 成功指標** | 「CI安定性」「破壊データ隔離」を追加 |

### 主要な設計変更

1. **モード分離**: strict/relaxed/invalid_onlyの3モードを導入し、破壊データを通常テストから完全隔離
2. **再現性**: seed + base_date で同一データを再生成可能に
3. **scale再定義**: 月間受注ヘッダ件数ベース（small:200, medium:2000, large:12000）
4. **API改訂**: base_date追加、期間設定の優先順位明確化（period > past/future_months）
5. **依存関係**: ordersはlots必須にしない（欠品/部分割当対応）、withdrawalsはorders必須にしない（手動出庫対応）
6. **検証動作**: strictは失敗で全体rollback、relaxedは警告として続行

---

## 付録D: 未決事項リスト

| # | 項目 | 選択肢 | 影響範囲 | 決定期限 |
|---|------|--------|---------|---------|
| 1 | **qty_scale の格納場所** | A) Productテーブルに追加 B) ProductTypeマスタに持たせる | DB設計、生成器 | Phase 1開始前 |
| 2 | **dataset_id の実装方式** | A) テーブルプレフィックス B) カラム追加 C) 別スキーマ | DB設計、クエリ | Phase 1 |
| 3 | **edge_case_id の格納方式** | A) メタデータカラム（JSON） B) 専用カラム C) 別テーブル | DB設計、レポート | Phase 2 |
| 4 | **relaxedモードの警告比率** | A) 5% B) 10% C) 設定可能 | 生成器、検証 | Phase 2 |
| 5 | **invalid_onlyの実行環境** | A) 専用テストDB B) メインDBの別スキーマ C) 一時テーブル | インフラ、CI | Phase 4 |
| 6 | **base_dateのデフォルト** | A) 実行日 B) 固定日（例: 2025-01-15） C) CI環境変数 | API、CI | Phase 1 |

### 推奨決定

- **#1**: A)（Productテーブルに`qty_scale`を追加）- シンプルで直感的
- **#2**: B)（カラム追加）- 既存クエリへの影響最小
- **#3**: A)（JSON）- 柔軟性が高く、スキーマ変更不要
- **#4**: C)（設定可能）- ユースケースに応じて調整可能
- **#5**: A)（専用テストDB）- 本番DBを汚染しない
- **#6**: A)（実行日、ただしCI環境変数でオーバーライド可能）

---

*作成日: 2026-01-17*
*バージョン: 1.1*
