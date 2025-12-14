# アプリ層 あら探しレポート

## 指摘一覧

### 1. CONFIRM時の在庫判定がACTIVE予約を無視し二重確定を許容
- **優先度**: P0
- **症状**: 同一ロットにACTIVEの仮予約が積み上がっていても在庫不足判定に引っかからず、複数のハード確定を通してしまう。結果として current_quantity を超える確定済み出荷が成立し、後続出荷やSAP登録で在庫不足が顕在化する。
- **再現/条件**: 例) lot.current_quantity=10 に対し ACTIVE予約(8, 5)が存在。`confirm_reservation`を連続実行すると両方がCONFIRMEDになり得る（`get_reserved_quantity`がCONFIRMEDのみを集計するため不足判定が働かない）。
- **原因**: `confirm_reservation` の在庫チェックが `get_reserved_quantity` (CONFIRMEDのみ集計) を使っており、ACTIVE予約を在庫消費として扱っていない。【F:backend/app/application/services/allocations/confirm.py†L90-L109】【F:backend/app/application/services/inventory/stock_calculation.py†L53-L75】
- **影響範囲**: ハード引当API、バッチ確定、FEFO確定フロー全体。多重確定によりLot在庫整合性、SAP連携、出庫実績に波及。
- **修正案**: 
  - 最小: CONFIRM前のチェックを「現在数量 - (ACTIVE+CONFIRMED) - locked」基準にする（専用関数を追加し共通利用）。
  - 理想: 状態遷移のインバリアントをドメインサービスに集約し、ACTIVE→CONFIRMEDの一連処理をトランザクション化した上で楽観ロック/悲観ロックを併用。
- **修正時の注意**: APIの429/409などエラーコードは既存フロントが期待するため変更は最小限に。ロット残数計算の定義変更はビュー/集計への波及を確認。

### 2. SAP登録失敗時に他予約を解放したままロールバックされない
- **優先度**: P1
- **症状**: CONFIRM処理中にSAP登録が失敗すると例外で抜けるが、その前に `preempt_soft_reservations_for_hard` が実行されており、他のソフト予約が部分/全解除されたまま確定は失敗する。結果、元の需要が未確定・未復元のまま在庫が遊休化し、割り当て漏れが発生する。
- **再現/条件**: ハード確定対象のSAP連携がエラーになるケースで発生。バッチ確定でも例外を握りつぶしつつコミットをまとめるため同様の不整合が残る。
- **原因**: preemptで更新されたLotReservation/OrderLineを囲むトランザクションがなく、SAPエラー時に明示的な `rollback` を行っていない。バッチ版もitem単位で例外を蓄積するのみでセッションを巻き戻さない。【F:backend/app/application/services/allocations/confirm.py†L102-L214】【F:backend/app/application/services/allocations/preempt.py†L30-L81】
- **影響範囲**: 予約調整(ソフト→ハード)フロー全体。優先度が低い需要が勝手に解放され、受注引当率や在庫表示に差異が出る。
- **修正案**: 
  - 最小: confirm_reservation内部でSAP呼び出しも含めてトランザクションを張り、失敗時に `db.rollback()` する。バッチも各予約ごとにサブトランザクションを張るか、全体を一括トランザクション化して成功分のみコミット。
  - 理想: preempt結果を一時的に保持し、SAP成功後に確定反映する二段階コミット構造にする。
- **修正時の注意**: SAP APIの副作用（外部登録済み）との整合性を考慮し、再送/冪等性の契約を明確化すること。

### 3. FEFOコミットがソフト予約を考慮せず二重確保を許容
- **優先度**: P1
- **症状**: 他ラインが既にACTIVE予約しているロットでも `commit_fefo_reservation` の在庫チェックが「CONFIRMEDのみ」を基準にするため、同じ数量を重複確保できる。後続のCONFIRMで不足が判明し、引当実績が元に戻せないケースが出る。
- **再現/条件**: ソフト予約(ACTIVE)が存在するロットを含む受注でFEFOコミットを実行すると、available判定が緩く予約が追加される。
- **原因**: `persist_reservation_entities` が `get_available_quantity` を使用しており、これはCONFIRMEDのみを予約として控除する仕様になっている。【F:backend/app/application/services/allocations/commit.py†L68-L110】【F:backend/app/application/services/inventory/stock_calculation.py†L53-L75】
- **影響範囲**: FEFOベースの自動/一括コミット。ソフト予約の優先順位付けが無効化され、在庫枯渇時の競合を誘発。
- **修正案**: 
  - 最小: FEFOコミット時のavailable計算を「ACTIVE+CONFIRMED」に変更し、必要ならpreempt処理と組み合わせる。
  - 理想: 需要優先順位に基づく予約解放戦略をドメインサービス化し、コミット/プレエンプトを共通化。
- **修正時の注意**: 在庫計算ロジックを変更するとUIやレポートの「Available Qty」表示定義も揃える必要がある。

### 4. 在庫ビューがCONFIRMED予約を無視しておりAPI出力と整合しない
- **優先度**: P1
- **症状**: `v_lot_allocations` が status='active' だけを集計し、CONFIRMED予約を除外している。これを参照する `v_lot_available_qty` ではConfirmed分を差し引かないため、実在庫より多いavailable_qtyを返す。フロントやバッチがこのビューを使うと在庫超過の配分が許容される。
- **再現/条件**: CONFIRMED予約を持つロットに対し `v_lot_available_qty` を参照すると、current_quantityとlocked_quantityしか控除されないためavailable_qtyが過大となる。
- **原因**: ビュー定義が「ACTIVEのみ引当」となっており、CONFIRMEDやロックの扱いがアプリ層の在庫計算と乖離している。【F:backend/sql/views/create_views.sql†L29-L119】
- **影響範囲**: ビューを利用するレポート、在庫一覧API、外部連携SQL。available数量を基にした自動引当や警告ロジックが誤作動する。
- **修正案**: 
  - 最小: ビューのWHERE句を `status IN ('active','confirmed')` に修正し、locked_quantityをnull安全に扱う。
  - 理想: ビューを廃止し、アプリ層の在庫計算ヘルパーと同一ロジックをSQL関数化して共有。
- **修正時の注意**: ビュー変更は依存ジョブ/BIへの互換性を確認し、マイグレーションで再作成すること。

### 5. 誰が確定したかの監査情報が保存されない
- **優先度**: P2
- **症状**: APIから `confirmed_by` を受け取っているが、LotReservationやイベントに操作者が記録されず、誰がどの引当を確定したか追跡できない。問題発生時に証跡が取れない。
- **再現/条件**: CONFIRM/バッチCONFIRMを実行してもDB・イベントに操作者情報が残らない。
- **原因**: `confirm_reservation` で受け取った confirmed_by をどこにも保存・ログ出力していない。【F:backend/app/application/services/allocations/confirm.py†L39-L151】
- **影響範囲**: 監査要件、誤操作時の原因追跡、社内統制。SAP連携不整合時に操作主体を特定できない。
- **修正案**: 
  - 最小: LotReservationに confirmed_by カラムを追加するか、SAP連携イベントに操作者を含めて履歴テーブルに永続化。
  - 理想: すべての在庫系ステート変更で操作者/リクエストIDを統一的に記録する監査モジュールを導入。
- **修正時の注意**: 既存テーブル変更時はマイグレーションを追加し、既存データのデフォルト値やNULL許容を検討する。

## 上位5件のまとめ
1. CONFIRM在庫判定がACTIVE予約を無視し二重確定を許容（P0）
2. SAP失敗時にプレエンプト結果がロールバックされず予約が消える（P1）
3. FEFOコミットがソフト予約を考慮せず二重確保を許容（P1）
4. 在庫ビューがCONFIRMED予約を無視しavailable_qtyを過大計上（P1）
5. 確定操作者の監査情報が欠落（P2）

## 推奨実行順
1. P0の在庫判定ロジック修正とテスト追加（CONFIRM周り）。
2. SAP連携含めたトランザクション/ロールバック処理の導入（プレエンプトの巻き戻し）。
3. FEFOコミットのavailable計算・優先順位見直し。
4. 在庫ビュー定義の修正と依存ジョブ確認。
5. 監査情報の保存・出力拡張。
