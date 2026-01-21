# RPA「素材納品書発行」UI ワイヤーフレーム修正指示（Codex投入用）

## 目的
現状の「素材納品書発行」画面を、**Run中心（RpaRun主語）**で「Stepの意味が明確」「空テーブルが目立たない」「長時間実行（100件=約90分）でも迷子にならない」UIに再設計・実装する。

この指示は **ワイヤーフレーム（情報設計＋配置＋表示列）** を含む。DB/API調査・修正は別途（今回スコープ外）。

---

## 背景・前提（モデル）
- 主語は **RpaRun**（Step遷移単位）と **RpaRunItem**（明細・選択/突合単位）
- Step責務は固定する（重要）  
  - Step1: 取得（進度実績ダウンロード）＝Run候補を作る/更新する  
  - Step2: 選択（発行対象をバラバラに選ぶ）＝Item選別  
  - Step3: 実行/監視（PAD/外部処理）＝Run進捗の監視（長時間）  
  - Step4: 突合レビュー→SAP登録 ＝ match_result確認、OKなら登録  
- 状態（例）
  - `RpaRun.status`: STEP1_DONE / STEP2_CONFIRMED / STEP3_RUNNING / STEP4_REVIEW / DONE
  - `RpaRunItem`: issue_flag / complete_flag / lock_flag / match_result / result_status / sap_registered 等

---

## デザイン方針（必須）
1. **Step画面は「操作＋サマリ」を基本**。重い一覧は必要箇所だけに寄せる。
2. **選択（チェックボックス）はStep2だけ**。Step3/4ではチェックを出さない。
3. 長時間処理に備え、**Runを常に主語**にする（履歴・詳細・進捗・失敗抽出）。
4. **空状態（対象なし）**はテーブルを空で見せず、次アクション導線を必ず出す。

---

## 画面構成（ワイヤーフレーム）

### 0) メニュー（Stepハブ）
#### 目的
作業の入口。説明カードではなく**状態カード**として表示。

#### レイアウト
- ヘッダ：ページタイトル＋「RPAシステム設定」ボタン
- 本文：Stepカード（状態サマリ）＋「実行履歴（Run）」カード

#### Stepカード（共通：表示項目）
- Step名
- 状態（未実行/完了/進行中など）
- 最終更新（あれば）
- 件数サマリ（該当するものだけ）
- [開く] ボタン

#### 表示例（概念）
- Step1: 最終取得日 / 取得件数 / 作成・更新Run数
- Step2: 対象Run候補数 / 選択中件数（直近）
- Step3: 実行待ちRun数 / 実行中Run数
- Step4: 要レビューRun数 / 完了Run数

#### 実行履歴カード（常設）
- 直近Run（進行中があれば最優先表示）
- 進捗（%/done/failed/remaining）
- 最終更新
- [開く] → Run詳細 or 履歴一覧へ

#### 空状態
- 実行中/要レビューがない場合は「直近の完了Run」または「まだありません」を簡潔に表示。

---

### 1) Step1：進度実績ダウンロード（取得）
#### 目的
指定期間の実績を取得し、Run候補を作成/更新する。

#### UI
- 期間入力（開始日/終了日）
- [取得開始] ボタン
- 最新結果サマリ（成功/失敗、Run候補 作成/更新数、取得件数、メッセージ要約）
- [作成されたRun候補を見る] ボタン（→ Step2 or 履歴）

#### 注意
- Step1では詳細一覧を常設表示しない。サマリに寄せる。

---

### 2) Step2：発行対象の選択（チェック主役）
#### 目的
Run候補（STEP1_DONE）を選び、そのRunのItem（明細）から**発行対象をバラバラに選ぶ**。

#### 画面は2段構成
A. 上段：Run候補一覧（status=STEP1_DONE）  
B. 下段：選択したRunのItem一覧（チェック付）

---

#### A. Run候補一覧（STEP1_DONE）
**表示列（最小・強い列）**
- ID
- 対象期間（data_start_date〜data_end_date）
- 取込日時（created_at or started_at）
- 実行ユーザー（あれば）
- 発行対象数（issue_flag=True の件数）
- 未完了数（complete_flag=False の件数）
- アクション：[開く]（下段にItem表示）

**空状態**
- 「確認待ちのRun候補はありません。Step1で取得してください。」＋ [Step1へ] リンク

---

#### B. Item一覧（選択の主戦場）
**表示列**
- ☑ 発行対象（issue_flag） ※チェックはこのStepのみ
- row_no
- item_no
- jiku_code
- layer_code
- external_product_code
- delivery_date
- delivery_quantity
- shipping_vehicle
- status（Item.status）
- 完了（complete_flag）
- ロック（lock_flag）※通常Step2では false 期待。trueなら警告表示
- [詳細]（ドロワー or 別ページ）

**操作ボタン**
- [選択を保存]（issue_flag更新）
- [Step2確定（次へ）]（RunをSTEP2_CONFIRMEDへ）

**空状態**
- 「このRunには明細がありません」＋ [別のRunを選ぶ] など

**注意**
- Step2確定の条件はプロジェクト方針に合わせる（例：選択した分だけcomplete_flag=Trueに揃える/または別途整備）。UI上は「確定」= 次ステップへ進める行為に統一する。

---

### 3) Step3：実行・監視（長時間）
#### 目的
実行待ち（STEP2_CONFIRMED）を実行開始し、実行中/完了を監視する。

#### 画面は2テーブル構成（固定）
A. 実行待ち（STEP2_CONFIRMED）  
B. 実行中/履歴（STEP3_RUNNING / STEP4_REVIEW / DONE など）

---

#### A. 実行待ち一覧（STEP2_CONFIRMED）
**表示列**
- ID
- 対象期間
- 発行対象数（issue_flag=True）
- 取込日時
- アクション：[実行開始]

**空状態**
- 「実行待ちのRunはありません。Step2で確定してください。」＋ [Step2へ]

---

#### B. 実行中/履歴
**表示列**
- ID
- 状態（Run.status）
- 進捗（done/failed/remaining or %）※可能なら
- 最終更新（updated_at）
- アクション：[詳細]

**空状態**
- 「履歴はまだありません」＋ [Step1へ] / [Step2へ] など

---

### 4) Step4：レビュー・SAP登録（突合→登録）
#### 目的
レビュー対象（STEP4_REVIEW）を突合結果（match_result）で確認し、OKならSAP登録する。

#### 画面は2段構成
A. レビュー対象（STEP4_REVIEW）  
B. 完了（DONE）

---

#### A. レビュー対象一覧（STEP4_REVIEW）
**表示列**
- ID
- 対象期間
- NG件数（match_result=False の件数）
- 外部手順完了日時（external_done_at）
- 取込日時
- アクション：[レビュー]

**空状態**
- 「レビュー対象はありません。Step3の実行を完了してください。」＋ [Step3へ]

---

#### レビュー画面（Run内 Item一覧）
**表示列**
- row_no / item_no
- jiku_code / layer_code / external_product_code
- delivery_date / delivery_quantity / shipping_vehicle
- match_result（OK/NG）
- result_status
- sap_registered（表示は任意）
- [詳細]

**操作**
- [NGだけ表示] トグル
- [SAP登録開始]（OK条件を満たすもののみ）
- NGがある場合は「Step2へ戻る」導線を明示

---

#### B. 完了（DONE）一覧
**表示列**
- ID
- 対象期間
- 完了日時（step4_executed_at or updated_at）
- SAP登録済件数（sap_registered=True）
- アクション：[詳細]

---

### 5) Run詳細（必須・90分対策）
#### 目的
進捗・ログ・失敗アイテムを集約し、再試行/抽出ができる。

#### 表示
- 状態（Run.status）
- 開始/最終更新
- 件数（total/done/failed/remaining）
- 進捗バー
- ログテーブル（新しい順・フィルタ）
- 失敗アイテム一覧（理由/再試行ボタンがあると理想）
- [失敗アイテムCSV出力]（できれば）

---

## 実装タスク（フロント中心：ファイル単位で）
> 具体ファイル名はプロジェクトに合わせて読み替え。以下は典型。

1. ルーティング整理
   - `/rpa/material-delivery-note` = メニュー
   - `/rpa/material-delivery-note/step1`
   - `/rpa/material-delivery-note/step2`
   - `/rpa/material-delivery-note/step3`
   - `/rpa/material-delivery-note/step4`
   - `/rpa/material-delivery-note/runs/:id` = Run詳細

2. メニュー画面の改修
   - Stepカードを「状態カード」に変更（説明文を削って状態/件数を表示）
   - 実行履歴カード（直近Runサマリ）を常設

3. Step1画面
   - フォーム＋結果サマリ＋導線（Run候補へ）

4. Step2画面
   - 上段：STEP1_DONEのRun候補一覧
   - 下段：選択RunのItem一覧（☑ issue_flag）
   - 「保存」「確定」ボタン
   - 空状態導線（Step1へ）

5. Step3画面
   - 実行待ち（STEP2_CONFIRMED）一覧＋実行開始
   - 実行中/履歴一覧＋詳細導線
   - 空状態導線（Step2へ）

6. Step4画面
   - レビュー対象（STEP4_REVIEW）一覧
   - 完了（DONE）一覧
   - レビュー詳細（Item一覧、NGフィルタ、SAP登録ボタン）

7. Run詳細画面
   - 進捗・ログ・失敗アイテムのUI枠を実装
   - まずはUI枠だけでも可（ログ/進捗APIが揃っていない場合はプレースホルダ）

---

## 受け入れ条件（Acceptance Criteria）
- [ ] **選択（チェックボックス）はStep2にしか存在しない**
- [ ] Step3/Step4は「空テーブル」だけを出さず、必ず次アクション導線を表示する
- [ ] メニューで各Stepの「状態/最終更新/件数」が一目で分かる
- [ ] Step2は「Run候補一覧→Item選択」が1画面で完結する
- [ ] Step3は「実行待ち」と「実行中/履歴」が分かれ、長時間実行が前提の表示になっている
- [ ] Step4は「レビュー対象」「完了」が分かれ、レビューでは match_result が主役になっている
- [ ] Run詳細が存在し、Step3/4から遷移できる
- [ ] UI上の用語がブレない（Run/明細/発行対象/突合/登録）

---

## 補足（テストデータ）
手元の生成データ（STEP1_DONE / STEP2_CONFIRMED / STEP3_RUNNING / STEP4_REVIEW / DONE）がこのUIで正しく「各一覧に出る」ことを確認すること。

---

## 出力物
- 上記ワイヤーに沿ったフロント改修コミット（複数PR可）
- 追加した画面/コンポーネントには簡単なREADMEまたはコメントで責務を明記
