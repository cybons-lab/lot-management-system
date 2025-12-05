# **Lot Management System**







## **Forecast / Order / Allocation 仕様まとめ（v1）**





------





## **1. 用語・前提**







### **Demand 種別**





- **FORECAST** : フォーキャスト（需要予測）
- **ORDER** : フォーキャスト連携ありの受注（SAP受注）
- **KANBAN** : フォーキャストと無関係な即時実需







### **引当種別**





- **SOFT** : 仮引当（在庫を押さえるが、他需要に譲ってよい）
- **HARD** : 確定引当（ユーザー操作でのみ確定する）





> ※ HARD は自動処理では作成しない。

> ※ 自動処理はすべて SOFT までに留める。



------





## **2. テーブルの役割**





------





### **2.1** 

### **allocation_suggestions**

### **（フォーキャスト計画レベル）**





**目的：**

フォーキャストを全体で並べたとき、倉庫在庫で足りるかどうかを試算する

「計画レベルの仮引当」を保持する。



**特徴：**



- forecast_group_id は必須
- order_line_id は持たない
- ロット割当は任意（なくても良い）
- allocation_type = "soft" 固定（計画ソフト）





**用途：**



- 在庫充足判定
- グループ別自動引当のヒント





------





### **2.2** 

### **allocations**

### **（受注明細レベルの実引当）**





**目的：**

受注明細（ORDER / KANBAN）単位で、どのロットを何個割り当てているかを管理する。



**特徴：**



- order_line_id 必須
- lot_id 必須
- allocation_type in "soft" | "hard"





**意味：**



- "soft"：受注明細レベルの仮引当
- "hard"：UI上の操作による確定引当（ロック扱い）





------





## **3. 画面 × データ の整理**





------





### **3.1 フォーキャストページ**





**表示するデータ：**



- フォーキャスト（日別・旬別）
- そのフォーキャストに紐づく ORDER
- allocation_suggestions（計画ソフト）
- allocations（soft/hard）





**表示しないデータ：**



- KANBAN（無関係）
- フォーキャスト非連携の ORDER





**特徴：**



- Soft 引当は自動計算
- Hard 引当はユーザーが受注行ごとに明確に行う





------





### **3.2 受注ページ（Order Dashboard）**





**対象：すべての受注（ORDER + KANBAN + Spot）**



**表示例：**



- order_no
- order_type（FC / KB / SP などのバッジ）
- forecast_group_id（あれば）
- qty_required / qty_allocated
- allocation_type（未 / Soft / Hard）
- lot 情報
- due_date





**フィルタ：**



- [FC連携のみ]
- [FC非連携]
- [全部]





**参照するテーブル：**



- allocations のみ

  → allocation_suggestions はここでは用いない（計画だから）





------





## **4. ボタン別の処理仕様**





------





### **4.1 「引当推奨生成」ボタン（Forecast一覧の右上）**





**対象：全フォーキャストグループ**



**処理内容：**



1. 全倉庫ロットを取得

2. 各 forecast_group の需要量を集計

3. 在庫充足計算を行う

4. 結果を allocation_suggestions に保存

   

   - ※ allocations は更新しない

   





**目的：**



- 在庫が足りるかの判定
- 各グループの自動引当のヒント作成





------





### **4.2 グループの「自動引当」ボタン（Forecast詳細）**




**対象：その forecast_group の ORDER のみ**



**処理内容：**



1. 対象グループの order_lines を取得

2. 最新ロット在庫を参照して FEFO で自動引当を計算
   （※ allocation_suggestions は参照しない。在庫は日々変動するため、実行時点の最新ロットから再計算する）

3. 結果を allocations に **SOFT** で書き込む

   

   - ※ Hard は作らない
   - ※ KANBAN は対象外（別画面）

   





------





### **4.3 「引当確定（Hard化）」操作**





**操作対象：ユーザーが選んだ受注行**



**処理内容：**



1. 該当 allocations.soft を参照

2. その中から確定したい数量分だけ allocation_type を "hard" に変更

3. Hard で使用したロットと在庫を確認

   

   - 他受注の Soft と競合する場合

     → Soft を削減 or 解除

   

4. 履歴として「Hard化によりSoftが解除された」を記録（任意）





**ポイント：**



- Hard 化は必ずユーザーが行う
- システムは自動 Hard を作らない





------





## **5. KANBAN処理**





**優先度：**

```
KANBAN(Hard) > ORDER(Hard) > ORDER(Soft) > FORECAST(plan)
```

**処理ルール：**



- KANBAN 受注入力 → allocations.soft を作る（自動引当）

- 担当者が Hard 化したら：

  

  - そのロットの Soft alloc を自動排除（競合分）

  

- Forecast には表示されないが、間接的に Soft 引当が減る





------





## **6. 時系列シナリオ**





------





### **シナリオA：フォーキャスト取り込みと月次計画**





1. フォーキャスト読み込み
2. 「引当推奨生成」押下
3. allocation_suggestions に計画ソフトが出力される
4. フォーキャストページで推奨結果を確認





------





### **シナリオB：受注が来た場合**





1. ORDER 登録（forecast_group_id あり）
2. 「自動引当」を押下
3. allocations.soft が生成される
4. ユーザーが必要に応じて Hard 化する





------





### **シナリオC：KANBANが来た場合**





1. KANBAN 登録
2. 自動引当（soft）
3. 担当者が Hard 化
4. 他受注の Soft が競合していれば自動調整
5. Forecastページでは Soft の減少だけが反映される





------





## **7. 実装AIへの注意点（最重要）**



```
allocation_suggestions と allocations では "soft" の意味が異なる。

・allocation_suggestions.soft は「フォーキャスト計画レベルの仮引当」
・allocations.soft は「受注明細レベルの仮引当」

Hard 化は UI でのユーザー操作時にのみ発生する。
自動処理は Soft までに留める。

引当推奨生成 → allocation_suggestions（計画）
自動引当 → allocations（実引当）
```



------



必要なら、

**ER図・状態遷移図・API仕様・アルゴリズム擬似コード**

まで Markdown 形式で続きも作れます。



次どうする？