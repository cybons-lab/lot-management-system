# 予測データ生成ロジック修正計画

## 概要

現在の予測データ生成ロジックには根本的な設計ミスがあり、Phase 1で抜本的な修正が必要。

## 問題の詳細

### 現在の実装の問題点

**backend/app/services/seed/seed_simulate_service.py の `create_forecast_data` 関数（602行目〜）**

```python
for delivery_place in all_delivery_places:
    daily_entries = _create_daily_forecasts(
        customer_id=delivery_place.customer_id,
        delivery_place_id=delivery_place.id,
        products=all_products,  # ❌ 全製品に対して予測を生成
        ...
    )
```

**問題点:**
1. **製品からスタートして顧客・納入先をぶら下げている**
   - `all_products`（全製品）に対して予測を生成している
   - CustomerItem（商流）を考慮していない

2. **存在しない商流でも予測が生成される**
   - 顧客Aが取り扱っていない製品Bについても予測が生成される
   - CustomerItemに登録されていない組み合わせでデータが作られる

3. **データ整合性の問題**
   - 日次データは存在するのに旬次データがない
   - 月次データだけが存在する
   - など、不完全なデータセットが生成される可能性がある

### なぜこの問題が起きるのか

現在のロジック:
```
納入先でループ
  └─ 全製品でループ
      └─ 日次・旬次・月次を生成
```

この方式では、CustomerItem（商流）の存在を確認していないため、
「顧客が実際に取り扱っている製品」だけを対象にできない。

## 正しいアプローチ

### Phase 1: 商流ベースの予測生成

**基本方針:**
```
商流（CustomerItem）でループ
  └─ 納入先でループ（その顧客の納入先のみ）
      └─ キー: (customer_id, delivery_place_id, product_id)
          └─ 日次・旬次・月次を一貫して生成
```

**重要なポイント:**
1. **CustomerItemを基点とする**
   - 顧客×製品の組み合わせ（商流）が存在するものだけを対象
   - `customer_items` テーブルから取得した組み合わせのみ処理

2. **納入先との組み合わせを作る**
   - CustomerItemの `customer_id` に紐づく `delivery_places` を取得
   - 商流（customer_id, product_id）× 納入先（delivery_place_id）の組み合わせを作成

3. **キー単位で日次・旬次・月次を一貫して生成**
   - 1つのキー（customer_id, delivery_place_id, product_id）に対して
   - 必ず日次・旬次・月次の3種類を生成する
   - どれか1つだけ欠けるという状況を防ぐ

## Phase 1実装計画

### Step 1: CustomerItemベースのグルーピング

```python
# CustomerItemを取得（Phase 0で既に追加済み）
all_customer_items: list[CustomerItem] = db.execute(select(CustomerItem)).scalars().all()

# 顧客ごとにCustomerItemをグルーピング
customer_items_by_customer: dict[int, list[CustomerItem]] = {}
for ci in all_customer_items:
    if ci.customer_id not in customer_items_by_customer:
        customer_items_by_customer[ci.customer_id] = []
    customer_items_by_customer[ci.customer_id].append(ci)

# 顧客ごとに納入先をグルーピング
delivery_places_by_customer: dict[int, list[DeliveryPlace]] = {}
for dp in all_delivery_places:
    if dp.customer_id not in delivery_places_by_customer:
        delivery_places_by_customer[dp.customer_id] = []
    delivery_places_by_customer[dp.customer_id].append(dp)
```

### Step 2: 商流×納入先のキー生成

```python
# 予測生成キーのリストを作成
forecast_keys: list[tuple[int, int, int]] = []  # (customer_id, delivery_place_id, product_id)

for customer_id, customer_items in customer_items_by_customer.items():
    # この顧客の納入先を取得
    customer_delivery_places = delivery_places_by_customer.get(customer_id, [])

    # 商流（CustomerItem）× 納入先のすべての組み合わせを作成
    for customer_item in customer_items:
        for delivery_place in customer_delivery_places:
            forecast_keys.append((
                customer_id,
                delivery_place.id,
                customer_item.product_id
            ))

# 重複排除（念のため）
forecast_keys = list(set(forecast_keys))
```

### Step 3: キー単位で日次・旬次・月次を一貫して生成

```python
forecast_entries: list[ForecastCurrent] = []

for customer_id, delivery_place_id, product_id in forecast_keys:
    # 製品情報を取得
    product = next((p for p in all_products if p.id == product_id), None)
    if not product:
        continue

    # Step 1: 日次予測を生成
    daily_entries = _create_daily_forecasts_for_key(
        customer_id=customer_id,
        delivery_place_id=delivery_place_id,
        product=product,
        start_date=daily_start,
        end_date=daily_end,
        rng=rng,
        now=now,
    )
    forecast_entries.extend(daily_entries)

    # Step 2: 日次合計を計算
    daily_total = sum(entry.forecast_quantity for entry in daily_entries)

    # Step 3: 旬次予測を生成（日次合計から計算）
    jyun_entries = _create_jyun_forecasts_for_key(
        customer_id=customer_id,
        delivery_place_id=delivery_place_id,
        product=product,
        target_month=target_month,
        daily_total=daily_total,
        now=now,
    )
    forecast_entries.extend(jyun_entries)

    # Step 4: 月次予測を生成（日次合計から計算）
    monthly_entries = _create_monthly_forecasts_for_key(
        customer_id=customer_id,
        delivery_place_id=delivery_place_id,
        product=product,
        target_month=target_month,
        daily_total=daily_total,
        now=now,
    )
    forecast_entries.extend(monthly_entries)
```

### Step 4: ヘルパー関数の修正

現在の `_create_daily_forecasts` は製品リストを受け取っているが、
Phase 1では単一の製品に対して処理する新しい関数を作成する:

```python
def _create_daily_forecasts_for_key(
    customer_id: int,
    delivery_place_id: int,
    product: Product,  # 単一の製品
    start_date: date,
    end_date: date,
    rng: Random,
    now: datetime,
) -> list[ForecastCurrent]:
    """Create daily forecast entries for a single key."""
    entries = []
    current_date = start_date
    while current_date <= end_date:
        forecast_period = current_date.strftime("%Y-%m")
        entries.append(
            ForecastCurrent(
                customer_id=customer_id,
                delivery_place_id=delivery_place_id,
                product_id=product.id,
                forecast_date=current_date,
                forecast_quantity=Decimal(rng.randint(10, 1000)),
                unit=product.base_unit or "PCS",
                forecast_period=forecast_period,
                snapshot_at=now,
                created_at=now,
                updated_at=now,
            )
        )
        current_date += timedelta(days=1)
    return entries
```

同様に `_create_jyun_forecasts_for_key` と `_create_monthly_forecasts_for_key` を作成。

## データ整合性の保証

### Phase 1での保証事項

1. **商流の存在保証**
   - CustomerItemに登録されている（customer_id, product_id）の組み合わせのみ処理
   - 存在しない商流では予測を生成しない

2. **日次・旬次・月次の完全性**
   - 1つのキー（customer_id, delivery_place_id, product_id）に対して
   - 必ず日次・旬次・月次の3種類を生成
   - どれか1つだけ欠けることはない

3. **数値の整合性**
   - 旬次の合計 = 日次合計（各旬は日次合計 / 3）
   - 月次の数量 = 日次合計
   - forecast_periodの計算も統一（日次=当月、旬次=翌月、月次=翌々月）

## 実装時の注意点

### 1. パフォーマンス

- 大量のキー（数万〜数十万）が生成される可能性がある
- bulk_save_objectsを使用してバッチ挿入
- 必要に応じてバッチサイズを制限（例: 10000件ごとにflush）

### 2. テストデータの妥当性

- CustomerItemが十分に作成されているか確認
- 各顧客に複数の納入先が存在するか確認
- 予測データが期待通りの件数生成されているか確認

### 3. ログとトラッキング

```python
tracker.add_log(
    task_id,
    f"→ Generated {len(forecast_keys)} forecast keys from "
    f"{len(all_customer_items)} customer items and "
    f"{len(all_delivery_places)} delivery places"
)
```

## テスト計画

### Phase 1実装後の検証項目

1. **商流の整合性**
   ```sql
   -- 予測データに存在するcustomer_id × product_idの組み合わせが
   -- すべてcustomer_itemsに存在することを確認
   SELECT DISTINCT fc.customer_id, fc.product_id
   FROM forecast_current fc
   LEFT JOIN customer_items ci
     ON fc.customer_id = ci.customer_id
     AND fc.product_id = ci.product_id
   WHERE ci.id IS NULL;
   -- 結果が0件であること
   ```

2. **日次・旬次・月次の完全性**
   ```sql
   -- 各キーに対して日次・旬次・月次のデータが存在することを確認
   WITH forecast_keys AS (
     SELECT DISTINCT customer_id, delivery_place_id, product_id
     FROM forecast_current
   ),
   forecast_types AS (
     SELECT
       customer_id,
       delivery_place_id,
       product_id,
       CASE
         WHEN forecast_period = DATE_FORMAT(forecast_date, '%Y-%m') THEN 'daily'
         WHEN forecast_period = DATE_FORMAT(DATE_ADD(forecast_date, INTERVAL 1 MONTH), '%Y-%m') THEN 'jyun'
         WHEN forecast_period = DATE_FORMAT(DATE_ADD(forecast_date, INTERVAL 2 MONTH), '%Y-%m') THEN 'monthly'
       END as forecast_type
     FROM forecast_current
   )
   SELECT
     fk.customer_id,
     fk.delivery_place_id,
     fk.product_id,
     COUNT(DISTINCT CASE WHEN ft.forecast_type = 'daily' THEN 1 END) as has_daily,
     COUNT(DISTINCT CASE WHEN ft.forecast_type = 'jyun' THEN 1 END) as has_jyun,
     COUNT(DISTINCT CASE WHEN ft.forecast_type = 'monthly' THEN 1 END) as has_monthly
   FROM forecast_keys fk
   LEFT JOIN forecast_types ft
     ON fk.customer_id = ft.customer_id
     AND fk.delivery_place_id = ft.delivery_place_id
     AND fk.product_id = ft.product_id
   GROUP BY fk.customer_id, fk.delivery_place_id, fk.product_id
   HAVING has_daily = 0 OR has_jyun = 0 OR has_monthly = 0;
   -- 結果が0件であること
   ```

3. **数値の整合性**
   ```sql
   -- 日次合計と月次数量が一致することを確認
   WITH daily_totals AS (
     SELECT
       customer_id,
       delivery_place_id,
       product_id,
       SUM(forecast_quantity) as daily_total
     FROM forecast_current
     WHERE forecast_period = DATE_FORMAT(forecast_date, '%Y-%m')
     GROUP BY customer_id, delivery_place_id, product_id
   ),
   monthly_quantities AS (
     SELECT
       customer_id,
       delivery_place_id,
       product_id,
       forecast_quantity as monthly_quantity
     FROM forecast_current
     WHERE forecast_period = DATE_FORMAT(DATE_ADD(forecast_date, INTERVAL 2 MONTH), '%Y-%m')
       AND DAY(forecast_date) = 1
   )
   SELECT
     dt.customer_id,
     dt.delivery_place_id,
     dt.product_id,
     dt.daily_total,
     mq.monthly_quantity,
     ABS(dt.daily_total - mq.monthly_quantity) as difference
   FROM daily_totals dt
   JOIN monthly_quantities mq
     ON dt.customer_id = mq.customer_id
     AND dt.delivery_place_id = mq.delivery_place_id
     AND dt.product_id = mq.product_id
   WHERE ABS(dt.daily_total - mq.monthly_quantity) > 0.01;
   -- 結果が0件であること（小数点以下の丸め誤差を考慮）
   ```

## Phase 0とPhase 1の区別

### Phase 0（完了）
- CustomerItem取得コードの追加
- 問題点を明記するTODOコメントの追加
- 既存ロジックは維持（動作に影響なし）

### Phase 1（実装予定）
- 商流ベースの予測生成ロジックへの全面的な書き換え
- `_create_daily_forecasts` などのヘルパー関数の修正
- テストとデータ検証

## まとめ

Phase 1では、「製品ベース」から「商流ベース」への根本的な設計変更を行う。
これにより、以下が保証される:

1. ✅ CustomerItemに存在する商流のみで予測を生成
2. ✅ 日次・旬次・月次が必ず揃ったデータセット
3. ✅ 数値の整合性（旬次合計、月次数量が日次合計と一致）

Phase 0で準備は完了しているため、Phase 1の実装準備が整っている。
