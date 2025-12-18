📘 Lot Management System：Forecast & Order Handling Summary**







# **============================**





この仕様は、ロット管理システムにおける **Forecast（予測）**, **Order（受注）**, **Kanban（かんばん）** の関係、および **Soft / Hard 引当ルール** と **画面分離方針** を明確化したもの。



AIがそのまま設計・実装に使える形式で整理している。



------





# **——————————————**







# **■ 1. 需要（Demand）の3分類と優先度**







# **——————————————**





需要は以下の3種類のみを扱う。





### **1)** 

### **FORECAST（予測）**





- 月次フォーキャスト入力に由来
- 必要であれば Soft 引当を持つ
- 受注が来るまで Hard にはならない
- 関連受注が発生する場合は forecast_id で紐づく







### **2)** 

### **ORDER（受注 / SAP受注）**





- 得意先からの実受注
- Forecastと一致・紐づく場合は FORCAST_LINKED
- 引確された時点で **Hard 引当**







### **3)** 

### **KANBAN（かんばん）**





- Forecastと無関係
- 即納が多い（翌日出荷など）
- 常に Hard 引当
- Forecastの Soft 引当ロットを“横取り”する可能性がある







### **■ 優先度（引当の取り合い時）**



```
KANBAN > ORDER > FORECAST
```



------





# **——————————————**







# **■ 2. 引当の種類（Soft / Hard）と状態遷移**







# **——————————————**







### **● Soft 引当（仮）**





- Forecastがロットを確保する目的

- 他需要（kanban/order）により解除され得る

- 状態遷移：

  未引当 → Soft → （Hard or 解除）







### **● Hard 引当（確定）**





- 受注・かんばんに対する確定引当

- Soft 引当より常に優先

- 状態遷移：

  Soft → Hard







### **● Soft 解除ルール**





KANBAN または ORDER(Hard化) がロットを必要とした場合：



- 同ロットに対する Forecast の Soft 引当は自動解除（0になる）
- Forecast数量は維持（引当だけ消える）
- 必要に応じてアラート履歴に記録する





------





# **——————————————**







# **■ 3. Forecastページの役割**







# **——————————————**







### **● このページに表示する要素**





- 対象 Forecast（1グループ）
- その Forecast に紐づく ORDER（forecast_id一致する受注）
- Soft / Hard 引当状況
- 対象商品・倉庫の現在ロット状況（残数、期限、ロック状態）







### **● 表示しないもの**





- KANBAN（フォーキャストとは無関係）
- Forecast非連携の ORDER （Spot受注）







### **● このページでの引当ルール**





- 受注に対して「引確」した瞬間 Hard 引当へ遷移
- Forecast 単体で引当している間は Soft のまま







### **● Forecastは“部分的に消化される”前提**





- Forecast数量 ≠ Hard引当数量
- Soft引当が剥がされることがある
- Forecastはあくまで「需要枠」であり “確定” ではない





------





# **——————————————**







# **■ 4. Orderページ（受注ページ）の役割**







# **——————————————**







### **● 表示対象**





Order（受注）はすべてこのページに集約する。





### **● 受注の種類（order_type）**



```
FORECAST_LINKED  … forecast_id がある受注
KANBAN           … かんばん
SPOT             … フォーキャスト無関係のスポット受注
```



### **● UI側フィルタ**





- [FC連携のみ] → forecast_id がある ORDER
- [FC非連携]   → KANBAN + SPOT
- [全部]     → 全オーダー







### **● 各行に表示する情報**





- order_no
- order_type バッジ（FC / KB / SP）
- forecast_month（リンク）
- qty_required
- qty_allocated
- allocation_type（未/Soft/Hard）
- lot list
- due_date







### **● 目的**





- 全需要を一元管理
- Forecastページの「外側の世界」を扱う
- Forecastページとの混乱をなくすため、明確なバッジ＆フィルタで分類





------





# **——————————————**







# **■ 5. ロット（Lot）状態**







# **——————————————**





ロットは以下の状態を持つ：

```
AVAILABLE         （通常）
LOCKED            （使用禁止）
ALLOCATED_SOFT
ALLOCATED_HARD
EXPIRED / EXPIRE_SOON
```

ロットは複数需要に対して Soft/Hard の割り当てを持つ。



“ロットロック”は手動で設定可能。

LOCKED のロットは自動引当対象から外す。



------





# **——————————————**







# **■ 6. 共通ルール（エンジン側）**







# **——————————————**







### **● ロット引当共通 API / サービス**



```
allocate(demand_id, lot_id, qty, type)
deallocate(demand_id, lot_id)
preemptSoftAllocationForHardDemand(demand_id)
```



### **● かんばんがロットを必要とした場合**





1. Hard 引当
2. 同ロットの Soft 引当を全て解除
3. Forecastページでは「引当数が減る」結果として反映







### **● ORDER が Hard化する場合も同様の処理**





------





# **——————————————**







# **■ 7. 画面遷移の基本ルール**







# **——————————————**







### **● Forecastページ → Orderページ**





- 「このForecastに紐づく受注のみ」フィルタ状態で遷移
- 必要なら「Forecastへ戻る」リンクあり







### **● Orderページ → Forecastページ**





- FORECAST_LINKED の行で forecast_month をクリックすると該当Forecast画面へ





------





# **——————————————**







# **■ 8. 想定される2つの主要シナリオ（時系列）**







# **——————————————**







## **シナリオA：Forecast → Order → Hard 引当**





1. Forecastが入力される
2. ロットをSoftで割り当て
3. Order（受注）が来る（forecast_idあり）
4. Forecastページで引確 → Hard引当に変わる
5. Softは不要分だけ解除される







## **シナリオB：Forecast Soft → Kanban Hard が横取り**





1. ForecastにSoft引当されている
2. Kanban需要が発生（急ぎ・高優先度）
3. allocate(Hard) を実施
4. 同ロットのSoft引当が自動解除される
5. Forecastページでは「引当数が減っている」状態になる
6. Forecast自体の数量は変わらない（引当だけ消える）

