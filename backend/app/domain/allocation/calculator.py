"""純粋関数による引当計算エンジン.

このモジュールはDBに依存せず、入力データに対してのみ計算を行う。 テストが容易で、ビジネスロジックが明確に分離されている。

【設計意図】引当計算エンジンの設計判断:

1. なぜ純粋関数（Pure Function）で実装するのか
   理由: テスタビリティとビジネスロジックの明確化
   設計原則:
   - 副作用なし（DB操作、API呼び出し、グローバル状態変更なし）
   - 同じ入力 → 必ず同じ出力（決定論的）
   - 外部依存ゼロ → ユニットテストが容易
   メリット:
   - テスト実行が高速（DB不要、モック不要）
   - デバッグが簡単（入力データを見れば結果が予測可能）
   - 並列処理が安全（スレッドセーフ）
   代替案との比較:
   - Service層で直接DB操作: テストが遅い、ビジネスロジックが埋もれる
   - 純粋関数: ビジネスロジックが明確、テストが容易

2. FEFO（First Expiry First Out）の業務的意義（L19, L172-189）
   理由: 自動車部品の期限切れ廃棄を最小化
   業務背景:
   - 自動車部品（ゴム部品、樹脂部品等）は経年劣化する
   - 期限切れ部品は使用不可 → 廃棄損失
   - FEFO戦略: 期限が近いものから出荷
   → 期限切れリスクを最小化
   代替案:
   - FIFO（First In First Out）: 入庫順に出荷
   → 期限を考慮しない、期限切れリスクが高い
   - LIFO（Last In First Out）: 最新入庫品を出荷
   → 在庫が古くなる、自動車部品では不適

3. 分納対応（allow_partial）の設計（L123-145）
   理由: 現実的な在庫運用に対応
   業務シナリオ:
   - 得意先からの受注: 100個
   - 在庫状況: ロットA=60個、ロットB=50個
   - allow_partial=True: 60個だけでも引当（残り40個は後日）
   - allow_partial=False: 100個揃わないと引当しない
   実運用:
   - デフォルト: True（部分出荷を許可）
   → 得意先との合意で部分納品が一般的
   メリット:
   - 在庫回転率向上
   - 得意先への納期短縮

4. Single Lot Fit 戦略（L68-93）
   理由: ロット分割による作業コスト削減
   業務背景:
   - 物流コスト: 複数ロットから出荷 → ピッキング作業が複雑
   - 品質リスク: ロット混在 → トレーサビリティが複雑
   戦略:
   - 単一ロットで全量充足できるなら、そのロットを優先
   - 例: 100個必要、ロットA=150個、ロットB=90個（期限近い）
   → FEFO: ロットB(90) + ロットA(10) → 2ロット出荷
   → Single Lot Fit: ロットA(100) → 1ロット出荷（作業効率◎）
   トレードオフ:
   - 利点: 作業効率、品質管理
   - 欠点: FEFOより期限管理が甘くなる可能性
   v3.0での導入:
   - request.strategy で選択可能
   → 顧客ごとに戦略を切り替え可能

5. トレースログの設計（L31, L42-64）
   理由: 引当の意思決定プロセスを可視化
   業務要件:
   - 営業担当者: 「なぜこのロットが選ばれたのか？」
   - 品質部門: 「期限切れロットが引当されていないか？」
   → 全ての候補ロットの採用/不採用理由をログ化
   AllocationDecision の内容:
   - lot_id: どのロット
   - score: 優先度スコア（期限までの日数）
   - decision: "adopted" or "rejected"
   - reason: 具体的な理由（例: "期限切れ", "FEFO採用（完全充足）"）
   - allocated_qty: 引当数量
   メリット:
   - 監査対応（なぜこの引当になったか説明可能）
   - デバッグ（期待と異なる引当結果の原因分析）

6. スコア計算（_calculate_score）の設計（L192-208）
   理由: 優先度の数値化
   計算ロジック:
   - 期限あり: 基準日から期限までの日数
   → 30日後期限 → スコア=30（低いほど優先）
   - 期限なし: 999999（実質的に最低優先）
   用途:
   - FEFOソート順の決定
   - トレースログでの可視化
   例:
   - ロットA: 有効期限2025-01-15（スコア=18）
   - ロットB: 有効期限2025-02-01（スコア=35）
   - ロットC: 有効期限なし（スコア=999999）
   → 引当順: A → B → C

7. Decimal型の使用理由（L6, L33）
   理由: 数量計算の精度保証
   問題:
   - float: 0.1 + 0.2 = 0.30000000000000004（誤差）
   → 在庫数量の計算で誤差が蓄積
   解決:
   - Decimal: 十進数を正確に表現
   → 0.1 + 0.2 = 0.3（正確）
   業務影響:
   - 自動車部品: 小数単位での取引あり（例: 0.5kg）
   → 精度が重要

8. 期限切れチェック（L41-51）
   理由: 品質保証
   業務ルール:
   - 期限切れ部品は絶対に出荷できない
   → lot.is_expired(reference_date) でチェック
   → rejected として記録（引当対象外）
   トレーサビリティ:
   - trace_logs に "期限切れ" として記録
   → 監査時に「期限切れ品は引当されていない」ことを証明可能

9. 在庫不足時の挙動（L53-64, L148-159）
   理由: 現実的な在庫状況に対応
   シナリオ:
   - 100個必要、全候補ロットの合計=50個
   → shortage=50 として返す
   → UI側で「50個不足」と表示
   運用:
   - 購買部門に発注依頼
   - 残り50個は後日引当

10. なぜcalculate_allocationが単一関数なのか
    理由: ビジネスロジックの凝集性
    設計:
    - 引当の意思決定プロセス全体が1つの関数に集約
    → テストケースが書きやすい（入力→出力の検証）
    → ビジネスルール変更時の影響範囲が明確
    代替案:
    - 複数の小さな関数に分割: 呼び出し順序の管理が複雑
    → 状態管理が必要になる可能性
"""

from decimal import Decimal

from app.domain.lot import LotCandidate

from .types import AllocationDecision, AllocationRequest, AllocationResult


def calculate_allocation(
    request: AllocationRequest, candidates: list[LotCandidate]
) -> AllocationResult:
    """引当計算のメインエンジン.

    ロジック:
    1. FEFO（First Expiry First Out）: 有効期限が近い順にソート
    2. 期限切れロットを除外
    3. 分納対応: 要求数に対し、在庫が足りない場合は「ある分だけ」引き当て
    4. 各ロットの採用/不採用理由を詳細にログ化

    Args:
        request: 引当リクエスト
        candidates: 候補ロットのリスト

    Returns:
        AllocationResult: 引当結果とトレースログ
    """
    trace_logs: list[AllocationDecision] = []
    allocated_lots: list[AllocationDecision] = []
    remaining_qty = request.required_quantity

    # FEFO: 有効期限でソート（期限なしは最後）
    sorted_candidates = _sort_by_fefo(candidates)
    valid_candidates: list[LotCandidate] = []

    # 1. フィルタリング (期限切れ、在庫ゼロ等のチェック)
    for lot in sorted_candidates:
        if lot.is_expired(request.reference_date):
            decision = AllocationDecision(
                lot_id=lot.lot_id,
                lot_number=lot.lot_number or "",
                score=None,
                decision="rejected",
                reason="期限切れ",
                allocated_qty=Decimal("0"),
            )
            trace_logs.append(decision)
            continue

        # 在庫がない場合
        if lot.available_qty <= 0:
            decision = AllocationDecision(
                lot_id=lot.lot_id,
                lot_number=lot.lot_number or "",
                score=None,
                decision="rejected",
                reason="在庫不足（利用可能数量0）",
                allocated_qty=Decimal("0"),
            )
            trace_logs.append(decision)
            continue

        valid_candidates.append(lot)

    # 2. 戦略: Single Lot Fit (単一ロットで満たせるならそれを優先)
    # v3.0: FEFOよりも「分割回避」を優先する戦略
    if request.strategy == "single_lot_fit" and valid_candidates:
        single_fit_lot = next(
            (lot for lot in valid_candidates if Decimal(str(lot.available_qty)) >= remaining_qty),
            None,
        )
        if single_fit_lot:
            # 単一ロットで全量引当
            score = _calculate_score(single_fit_lot, request.reference_date)
            decision = AllocationDecision(
                lot_id=single_fit_lot.lot_id,
                lot_number=single_fit_lot.lot_number or "",
                score=score,
                decision="adopted",
                reason="Single Lot Fit (完全充足)",
                allocated_qty=remaining_qty,
            )
            allocated_lots.append(decision)
            trace_logs.append(decision)
            return AllocationResult(
                allocated_lots=allocated_lots,
                trace_logs=trace_logs,
                total_allocated=remaining_qty,
                shortage=Decimal("0"),
            )

    # 3. 戦略: FEFO Split (標準)
    # フィルタ済みの候補から順番に引当
    for lot in valid_candidates:
        if remaining_qty <= 0:
            break

        # スコア計算
        score = _calculate_score(lot, request.reference_date)

        # 引き当て可能な数量を計算
        allocatable_qty = min(remaining_qty, Decimal(str(lot.available_qty)))

        if allocatable_qty >= remaining_qty:
            # 完全に引き当て可能
            decision = AllocationDecision(
                lot_id=lot.lot_id,
                lot_number=lot.lot_number or "",
                score=score,
                decision="adopted",
                reason="FEFO採用（完全充足）",
                allocated_qty=allocatable_qty,
            )
            allocated_lots.append(decision)
            trace_logs.append(decision)
            remaining_qty = Decimal("0")
            break
        # 部分的に引き当て
        if request.allow_partial:
            decision = AllocationDecision(
                lot_id=lot.lot_id,
                lot_number=lot.lot_number or "",
                score=score,
                decision="adopted",
                reason="FEFO採用（部分充足）",
                allocated_qty=allocatable_qty,
            )
            allocated_lots.append(decision)
            trace_logs.append(decision)
            remaining_qty -= allocatable_qty
        else:
            # 分納不可ならスキップ（ただし通常はallow_partial=True）
            decision = AllocationDecision(
                lot_id=lot.lot_id,
                lot_number=lot.lot_number or "",
                score=score,
                decision="rejected",
                reason="在庫不足かつ分納不可",
                allocated_qty=Decimal("0"),
            )
            trace_logs.append(decision)

    # 全て処理しても不足がある場合
    if remaining_qty > 0 and len(allocated_lots) == 0:
        # 引当可能なロットが1つもない場合のトレースログ
        trace_logs.append(
            AllocationDecision(
                lot_id=None,
                lot_number="",
                score=None,
                decision="rejected",
                reason="引当可能ロットなし",
                allocated_qty=Decimal("0"),
            )
        )

    total_allocated = sum((lot.allocated_qty for lot in allocated_lots), Decimal(0))
    shortage = request.required_quantity - total_allocated

    return AllocationResult(
        allocated_lots=allocated_lots,
        trace_logs=trace_logs,
        total_allocated=total_allocated,
        shortage=shortage,
    )


def _sort_by_fefo(candidates: list[LotCandidate]) -> list[LotCandidate]:
    """FEFO（First Expiry First Out）でソート.

    期限が近い順、期限なしは最後。

    Args:
        candidates: 候補ロットのリスト

    Returns:
        ソート済みの候補ロットリスト
    """
    return sorted(
        candidates,
        key=lambda lot: (
            lot.expiry_date is None,  # 期限なしは最後
            lot.expiry_date if lot.expiry_date else "",  # 期限が近い順
        ),
    )


def _calculate_score(lot: LotCandidate, reference_date) -> Decimal:
    """優先度スコアを計算.

    期限までの日数を計算。期限なしの場合は大きな値を返す。

    Args:
        lot: ロット候補
        reference_date: 基準日

    Returns:
        スコア（低いほど優先）
    """
    if lot.expiry_date is None:
        return Decimal("999999")

    days_to_expiry = (lot.expiry_date - reference_date).days
    return Decimal(str(days_to_expiry))
