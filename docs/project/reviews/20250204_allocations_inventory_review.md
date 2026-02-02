# 引当確定・ソフト予約解放・在庫計算のコードレビュー

対象: `backend/app/application/services/allocations/confirm.py`,
`backend/app/application/services/allocations/preempt.py`,
`backend/app/application/services/inventory/stock_calculation.py`

目的: アンチパターン、性能劣化要因、バグになりうる漏れ、保守性を落とす書き方を網羅的に洗い出し、改善案を提示する。

---

## 1. サマリ（重大リスク/性能/設計の要点）

1. **バッチ確定時に副作用（予約分割など）が失敗分まで混入する可能性**があり、部分成功でも意図しないデータ更新が残る恐れがある。特に `confirm_reservation(..., commit_db=False)` をバッチで回し、最後に `db.commit()` する設計は注意が必要。 (confirm.py)
2. **部分確定の入力検証不足**（0/負数/超過）があり、確定数量の不正状態や意図しない挙動が起きうる。 (confirm.py)
3. **在庫判定が `received_quantity` 依存**で、出庫・調整を含まない場合は過剰確定や不足判定ミスのリスク。 (confirm.py / stock_calculation.py)
4. **preempt の実行順序が在庫不足判定後**のため、ソフト予約を解放すれば足りるケースでも失敗する可能性。 (confirm.py)
5. **バッチ確定時にイベント通知が欠落**し、後続処理（通知/監査/外部連携）が漏れる可能性。 (confirm.py)
6. **ソフト予約解放ロジックは優先度設計が明確**だが、ロック順序やORDER以外の予約での優先度デフォルトなど、要確認事項が残る。 (preempt.py)

---

## 2. 指摘一覧（優先度順）

### R-01
- **優先度:** P1
- **場所:** `confirm.py` L213-L357, L414-L450
- **問題:** バッチ確定で `confirm_reservation(..., commit_db=False)` を呼び出した後に `db.commit()` するため、途中失敗した予約の副作用（分割されたremainder等）が成功分に混ざってコミットされる恐れがある。
- **根拠:** 予約分割はSAP呼び出し前に `db.add(remainder)` されるが、失敗時に明示的な `rollback` がない。バッチは最後に1回だけ `db.commit()`。
- **改善案:**
  - 各予約を `db.begin_nested()` で囲み、失敗時は savepoint rollback。
  - もしくは `confirm_reservation` 内で例外時に `db.rollback()` or `expunge`。
- **影響/トレードオフ:**
  - 整合性向上。savepoint増加によるDB負荷が少し上がる。

### R-02
- **優先度:** P1
- **場所:** `confirm.py` L213-L229, L248-L269
- **問題:** 部分確定の `quantity` が 0/負数/予約超過でも明示的にエラーにならず、ゼロ数量確定や「指定量無視」が起こりうる。
- **根拠:** `quantity < reserved_qty` の場合のみ分割処理され、範囲外の入力を弾くロジックがない。
- **改善案:**
  - `quantity` が `<=0` または `> reserved_qty` の場合は `AllocationCommitError` を返す。
- **影響/トレードオフ:**
  - 既存利用側で「暗黙全量確定」していた場合の挙動変更に注意。

### R-03
- **優先度:** P1
- **場所:** `confirm.py` L259-L278
- **問題:** 在庫不足判定が preempt 実行前に行われるため、ソフト予約解放で在庫を確保できるケースでも失敗する可能性がある。
- **根拠:** `current_quantity < reserved_qty` 判定が `preempt_soft_reservations_for_hard` より前。
- **改善案:**
  - preempt を先に実行し、解放後に再計算して判定。
- **影響/トレードオフ:**
  - 確定成功率が上がる。解放の副作用が増えるため可視化が必要。

### R-04
- **優先度:** P1
- **場所:** `confirm.py` L346-L357, L414-L450
- **問題:** バッチ確定ではイベントが発火しないため、通知/監査/外部連携が漏れる。
- **根拠:** イベント追加は `commit_db=True` の場合のみで、バッチは常に `False`。
- **改善案:**
  - バッチ側で成功分をまとめて `EventDispatcher.queue` する。
- **影響/トレードオフ:**
  - 監査/通知の整合性が向上。バッチロジックの責務増加。

### R-05
- **優先度:** P1
- **場所:** `confirm.py` L259-L266, `stock_calculation.py` L87-L117
- **問題:** 在庫判定が `received_quantity` 前提で、出庫や調整が計算に入っていない場合に過剰確定のリスク。
- **根拠:** `current_quantity = lot.received_quantity` と明記。stock_calculation は `received_quantity` をベースに設計。
- **改善案:**
  - 出庫/調整を加味した `on_hand` の導入。
- **影響/トレードオフ:**
  - 正確性向上、ただし追加クエリや計算が増える。

### R-06
- **優先度:** P2
- **場所:** `confirm.py` L193-L199
- **問題:** idempotent 判定が `str(reservation.status)` に依存しており、Enumの文字列表現によっては一致しない恐れ（要確認）。
- **根拠:** `str(Enum)` は `ReservationStatus.CONFIRMED` になるケースがある。
- **改善案:**
  - Enum比較に統一する（`reservation.status == ReservationStatus.CONFIRMED`）。
- **影響/トレードオフ:**
  - 判定の確実性向上。

### R-07
- **優先度:** P2
- **場所:** `confirm.py` L407-L412
- **問題:** `reservation_ids` が不定順の場合、並行バッチでロック順序がずれ、デッドロックする可能性（要確認）。
- **根拠:** 先に予約行ロック → その後ロット行ロックの順序で、複数プロセスが逆順になり得る。
- **改善案:**
  - 予約IDを事前にソートしてロック順序を固定。
- **影響/トレードオフ:**
  - デッドロック回避の可能性が上がる。

### R-08
- **優先度:** P2
- **場所:** `confirm.py` L218-L226
- **問題:** 分割されたremainderに必要な属性（created_by, metadata等）がコピーされない可能性があり、監査・参照に不整合が起きる。
- **根拠:** コメントで「必要ならコピー」とあるが未実装。
- **改善案:**
  - cloneメソッドを作り、必須フィールドを明示的にコピー。
- **影響/トレードオフ:**
  - データ完全性向上。

### R-09
- **優先度:** P2
- **場所:** `preempt.py` L70-L111
- **問題:** ORDER 以外の予約の場合 `OrderLine` 参照が `None` となり、優先度が `else_=3` に固定される。ビジネス上の優先度が正しいか要確認。
- **根拠:** `outerjoin` で `OrderLine` が無い場合 `else_=3` を使用。
- **改善案:**
  - `source_type` による優先度テーブルを設計し、ORDER以外も明示。
- **影響/トレードオフ:**
  - ルールの明文化と保守性向上。

### R-10
- **優先度:** P3
- **場所:** `preempt.py` L55-L70
- **問題:** `available` 計算で `get_available_quantity` を使用しているため、`reserved` に CONFIRMED のみを含める設計になっている。ACTIVEを除外する方針がソフト予約解放に適切か要確認。
- **根拠:** stock_calculation の設計では ACTIVE を除外する前提。
- **改善案:**
  - preempt専用の「soft-reserved込みの可用在庫」計算を検討。
- **影響/トレードオフ:**
  - 期待する優先度・解放量の正確性が向上。

---

## 3. まず入れるべき計測/ログ

- **SAP登録の成功/失敗率と所要時間**（`register_allocation` 前後のメトリクス）。
- **preemptで解放された数量/件数**のログ・メトリクス。
- **バッチ確定の失敗理由内訳**を集計して可視化（error_code別）。

