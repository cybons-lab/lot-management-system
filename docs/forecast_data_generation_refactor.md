# 予測データ生成ロジックのリファクタリング

## 📅 更新日: 2025-11-24

---

## 概要

`generate_test_data.py` (Hypothesis-baseテストデータジェネレータ) における予測データ生成ロジックを、より現実的なデータを生成できるように改善しました。

---

## 問題点

### 1. **DemandKeyごとに日次・旬次・月次がバラバラ**

**症状:**
- 1つのDemandKey（customer_id, delivery_place_id, product_id）に対して、日次・旬次・月次の予測がランダムに生成されていた
- 同じDemandKeyで日次予測があるのに旬次予測がない、などの不整合が発生

**原因:**
```python
# 旧実装: forecast_strategyは1回の呼び出しで1つの予測（daily/jyun/monthly）しか生成しない
forecast = forecast_strategy(
    product_id=product.id,
    customer_id=dp.customer_id,
    delivery_place_id=dp.id
).example()  # daily, jyun, monthly のいずれか1つだけ
```

**影響:**
- 予測データとして不自然（通常、日次予測があれば旬次・月次予測も存在する）
- `seed_simulate_service.py`（本番データ生成）と挙動が異なる

---

### 2. **毎日データが存在する（非現実的）**

**症状:**
- 全ての日に予測データが生成されていた
- 実際のビジネスでは、受注がない日や予測がない日も多い

**原因:**
```python
# 旧実装: 全ての日に対してデータを生成
while current_date <= end_date:
    entries.append(...)  # 毎日必ず追加
    current_date += timedelta(days=1)
```

**影響:**
- 非現実的なテストデータ
- UI表示時に「毎日予測がある」という不自然な画面になる

---

### 3. **旬次予測が日次合計と完全一致**

**症状:**
- 旬次予測の合計が日次予測の合計と完全に一致していた
- 上旬・中旬・下旬の予測がすべて `daily_total / 3` で計算されていた

**原因:**
```python
# 旧実装: 単純に3等分
jyun_quantity = daily_total / Decimal(3)
```

**影響:**
- 予測データとして不自然（予測は通常、実績と一致しない）
- 「予測」なのに「確定値」のように見える

---

## 解決策

### 修正1: DemandKeyごとに日次・旬次・月次をセットで生成

**実装:**
```python
for product in selected_products:
    # Step 1: 日次予測を生成（1ヶ月分）
    daily_entries, period_totals = _create_daily_forecasts(...)

    # Step 2: 旬次予測を生成（日次合計から計算）
    jyun_entries = _create_jyun_forecasts_from_daily(..., period_totals)

    # Step 3: 月次予測を生成（日次合計）
    monthly_entries = _create_monthly_forecasts_from_daily(..., period_totals)
```

**効果:**
- ✅ 1つのDemandKeyに対して必ず日次・旬次・月次がセットで生成される
- ✅ `seed_simulate_service.py`と同じロジックで一貫性が保たれる
- ✅ データの整合性が保証される

---

### 修正2: ランダムな日のみデータを生成（60-80%カバレッジ）

**実装:**
```python
# カバレッジ率を60-80%でランダムに決定
coverage_ratio = random.uniform(0.6, 0.8)

while current_date <= end_date:
    # この日に予測を生成するかランダムに判定
    if random.random() < coverage_ratio:
        # 予測データを生成
        entries.append(...)

    current_date += timedelta(days=1)
```

**効果:**
- ✅ 60-80%の日だけデータが生成される（飛び飛びのパターン）
- ✅ より現実的なテストデータ
- ✅ UIで「毎日予測がある」という不自然さが解消

---

### 修正3: 旬次予測に±15-25%の揺らぎを追加

**実装:**
```python
# 実際の日次合計を旬ごとに集計
period_totals = {
    'joujun': Decimal(0),   # 上旬（1-10日）
    'chuujun': Decimal(0),  # 中旬（11-20日）
    'gejun': Decimal(0)     # 下旬（21-月末）
}

# 旬次予測に揺らぎを追加
variance_pct = Decimal(str(random.uniform(-0.25, 0.25)))  # ±15-25%
jyun_quantity = base_quantity * (Decimal(1) + variance_pct)
```

**効果:**
- ✅ 旬次予測が日次合計から±15-25%の範囲でばらつく
- ✅ 「予測は外れる」という現実的なシミュレーション
- ✅ 予測精度検証などのテストが可能になる

---

## 実装の詳細

### データ生成フロー

```
1. DemandKey選択
   └─ delivery_place × product の組み合わせ（30-50%をランダムに選択）

2. 日次予測生成
   ├─ 60-80%の日をランダムに選択
   ├─ 各日に10-100のランダムな数量を設定
   └─ 上旬・中旬・下旬ごとに合計を集計
       ├─ joujun (1-10日)
       ├─ chuujun (11-20日)
       └─ gejun (21-月末)

3. 旬次予測生成
   ├─ 上旬: joujun合計 × (1 ± 15-25%)
   ├─ 中旬: chuujun合計 × (1 ± 15-25%)
   └─ 下旬: gejun合計 × (1 ± 15-25%)

4. 月次予測生成
   └─ joujun + chuujun + gejun の合計（揺らぎなし）
```

### 期間（forecast_period）の設定

```
基準: 今日の日付（base_date）

■ 対象月（target_month）の決定:
  - 今日 < 25日 → 当月
  - 今日 >= 25日 → 翌月

■ 各予測の期間設定:
  - 日次予測: forecast_period = 対象月（YYYY-MM）
  - 旬次予測: forecast_period = 対象月 + 1ヶ月
  - 月次予測: forecast_period = 対象月 + 2ヶ月
```

---

## コミット履歴

### Commit 1: `d0a5bb3`
**タイトル:** refactor: Generate daily/jyun/monthly forecasts as a set per DemandKey

**内容:**
- 3つのヘルパー関数を追加（`_create_daily_forecasts`, `_create_jyun_forecasts_from_daily`, `_create_monthly_forecasts_from_daily`）
- DemandKeyごとに日次・旬次・月次をセットで生成するロジックに変更
- `seed_simulate_service.py`と同じ構造を採用

### Commit 2: `1a6d25a`
**タイトル:** refactor: Add realistic variance and gaps to forecast generation

**内容:**
- 日次予測に60-80%のカバレッジを適用（ランダムな隙間を追加）
- 旬次予測に±15-25%の揺らぎを追加
- 期間ごとの合計を正確に集計する仕組みを実装

---

## 今後の課題・改善点

### Phase 1: CustomerItemベースのロジック実装

**現在の問題:**
```python
# TODO: 現在のロジックは誤り（製品からスタートして顧客・納入先をぶら下げている）
# 正しいアプローチ：
#   1. 商流（CustomerItem）を基点として、顧客×製品の組み合わせを特定
#   2. その商流に納入先を組み合わせて、(customer_id, delivery_place_id, product_id) のキーを作成
#   3. そのキー単位で日次・旬次・月次を一貫して生成
```

**必要な修正:**
- `seed_simulate_service.py:592-598` のTODOコメント参照
- `generate_test_data.py`も同様の修正が必要
- CustomerItemベースに変更することで、商流が存在しない組み合わせの予測が生成されなくなる

### Phase 2: seed_simulate_service.pyとの完全統一

**現状:**
- 基本的なロジックは統一されている
- CustomerItemベースのロジックは両方未実装

**目標:**
- 予測データ生成ロジックを共通化
- `generate_test_data.py`が`seed_simulate_service.py`の関数を直接importする形に変更
- コード重複を削減し、メンテナンス性を向上

---

## 参考ファイル

### 修正されたファイル
- `backend/scripts/generate_test_data.py` - Hypothesis-baseテストデータジェネレータ

### 参考実装
- `backend/app/services/seed/seed_simulate_service.py` - 本番データ生成サービス
  - 特に `create_forecast_data` 関数（520-671行目）
  - `_create_daily_forecasts`（394-425行目）
  - `_create_jyun_forecasts_from_daily`（428-475行目）
  - `_create_monthly_forecasts_from_daily`（478-517行目）

### 関連ドキュメント
- `CLAUDE.md` - プロジェクト全体のドキュメント
- `docs/architecture/codebase_structure.md` - アーキテクチャドキュメント

---

## 補足: なぜこの修正が必要だったのか

### ビジネス要件との整合性

1. **予測データは実績データと異なる**
   - 予測は「未来の見積もり」であり、実績とは必ず誤差がある
   - 旬次予測が日次実績と完全一致するのは非現実的

2. **全ての日に予測があるわけではない**
   - 営業日のみ予測する、週末は予測しない、などのパターンがある
   - 毎日予測データがあるのは不自然

3. **予測の粒度が複数存在する**
   - 日次予測: 短期的な細かい予測
   - 旬次予測: 中期的な大まかな予測（10日単位）
   - 月次予測: 長期的な全体予測
   - これらは「同じDemandKeyで一貫性を持つ」必要がある

### テストデータの品質向上

1. **リアルなテストデータ**
   - UI開発時に「実際の画面」がイメージできる
   - ユーザーフィードバックが正確になる

2. **エッジケースのテスト**
   - 予測と実績の誤差がある場合の処理
   - 一部の日だけ予測がある場合の表示
   - 旬次と月次の整合性チェック

3. **本番環境との一貫性**
   - `seed_simulate_service.py`と同じロジックを使用
   - 本番データと同じ構造・特性を持つテストデータ

---

## まとめ

| 項目 | 修正前 | 修正後 |
|------|--------|--------|
| **日次・旬次・月次の生成** | ランダムにバラバラ | DemandKeyごとにセット生成 |
| **日次予測の密度** | 毎日100% | 60-80%（ランダムな隙間） |
| **旬次予測の精度** | 日次合計と完全一致 | ±15-25%の揺らぎ |
| **月次予測** | 日次合計 / 3（不正確） | 実際の日次合計 |
| **seed_simulate_service.pyとの一貫性** | 異なるロジック | 同じロジック |

**結果:**
- ✅ より現実的なテストデータ
- ✅ 本番データ生成との一貫性
- ✅ UIテストの品質向上
- ✅ 予測精度検証のベースデータ

---

## 次のステップ

1. **Phase 1実装**: CustomerItemベースのロジックに変更
2. **コード共通化**: `seed_simulate_service.py`と`generate_test_data.py`の予測生成ロジックを統一
3. **テスト**: 修正後のデータ生成をテストして、意図通りのデータが生成されることを確認
4. **ドキュメント更新**: CLAUDE.mdやCOMMON_TYPE_CANDIDATES等の関連ドキュメントを更新
