"""データクラス定義: 引当計算のための型定義.

【設計意図】引当計算データクラスの設計判断:

1. なぜ dataclass を使うのか
   理由: データの構造を明確に定義し、型安全性を確保
   代替案との比較:
   - dict: {"order_line_id": 123, "required_quantity": 100}
   → 型チェックなし、typoを検出できない
   - TypedDict: 型ヒントのみ、実行時チェックなし
   - dataclass: 型ヒント + __init__ 自動生成 + 不変性オプション
   メリット:
   - IDEの補完が効く（.order_line_id で候補表示）
   - 型チェッカー（mypy）でエラー検出
   - __repr__ 自動生成（デバッグが容易）

2. AllocationRequest の設計（L8-24）
   理由: 引当計算の入力を構造化
   必須フィールド:
   - order_line_id: どの受注明細に対する引当か
   - required_quantity: 必要数量（Decimal型で精度保証）
   - reference_date: 基準日（期限切れ判定に使用）
   オプショナルフィールド:
   - allow_partial=True: 分納許可（デフォルト: True）
   → 在庫が不足しても、ある分だけ引当
   - strategy="fefo": 引当戦略（FEFO or Single Lot Fit）
   → デフォルトはFEFO（期限優先）
   業務的意義:
   - このオブジェクトを渡すだけで、引当計算に必要な全情報を伝達
   → 関数シグネチャがシンプルになる

3. AllocationDecision の設計（L26-45）
   理由: 各ロットの引当判定結果を記録
   構造:
   - lot_id, lot_number: どのロット
   - score: 優先度スコア（期限までの日数）
   - decision: "adopted"（採用）, "rejected"（不採用）, "partial"（部分採用）
   - reason: 具体的な理由（例: "FEFO採用", "期限切れ", "在庫不足"）
   - allocated_qty: 実際の引当数量
   業務的意義:
   - トレーサビリティ: なぜこのロットが選ばれたのか
   → 監査時に「引当の根拠」を説明可能
   - デバッグ: 期待と異なる引当結果の原因分析
   例:
   ```
   AllocationDecision(
       lot_id=123,
       lot_number="LOT-2024-001",
       score=Decimal("30"),  # 30日後に期限
       decision="adopted",
       reason="FEFO採用（完全充足）",
       allocated_qty=Decimal("100")
   )
   ```

4. AllocationResult の設計（L47-62）
   理由: 引当計算の最終結果を構造化
   フィールド:
   - allocated_lots: 採用されたロットのリスト
   → これが実際に引当処理で使われる
   - trace_logs: 全てのロットの判定結果（採用 + 不採用）
   → 監査ログ、デバッグ用
   - total_allocated: 引当合計数量
   → 必要数量に対してどれだけ引当できたか
   - shortage: 不足数量
   → 在庫不足の場合、どれだけ足りないか
   業務的意義:
   - shortage > 0 → 購買部門に発注依頼
   - trace_logs → 監査対応、トラブルシューティング

5. なぜ Decimal を使うのか（L5, L20, L44）
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

6. decision フィールドの文字列型（L42）
   理由: 拡張性とデバッグ性
   代替案:
   - Enum: DecisionType.ADOPTED
   → 型安全だが、ログ出力時に Enum オブジェクトが表示される
   → JSON シリアライズ時に変換が必要
   - str: "adopted"
   → ログやJSON出力が読みやすい
   → 型チェックは弱いが、実用上問題なし
   許可される値:
   - "adopted": 採用
   - "rejected": 不採用
   - "partial": 部分採用（将来拡張用）

7. lot_id が Optional（L39）
   理由: "引当可能ロットなし" のケースに対応
   使用例:
   ```python
   AllocationDecision(
       lot_id=None,
       lot_number="",
       score=None,
       decision="rejected",
       reason="引当可能ロットなし",
       allocated_qty=Decimal("0")
   )
   ```
   → トレースログに「なぜ引当できなかったか」を記録

8. reference_date の用途（L15）
   理由: 期限切れ判定の基準日
   業務シナリオ:
   - 通常: reference_date = today（今日時点で期限切れをチェック）
   - 将来引当: reference_date = 出荷予定日（将来時点での期限切れを予測）
   例:
   - 今日: 2024-12-01
   - 出荷予定日: 2024-12-15
   → reference_date = 2024-12-15 で引当
   → 出荷時点で期限切れになるロットを事前に除外

9. allow_partial のデフォルト値（L22）
   理由: 現実的な在庫運用に対応
   デフォルト: True（分納許可）
   業務背景:
   - 受注100個、在庫50個 → 50個だけでも引当（残り50個は後日）
   → 顧客との合意で部分納品が一般的
   False の使用例:
   - 特殊製品: 全量揃わないと出荷できない
   → allow_partial=False で指定

10. strategy フィールドの追加（L23）
    理由: 複数の引当戦略をサポート
    戦略:
    - "fefo": First Expiry First Out（期限優先）
    → 期限が近いものから引当
    - "single_lot_fit": 単一ロット優先
    → 複数ロットに分けず、1ロットで充足できるものを優先
    業務的意義:
    - 顧客ごとに戦略を変更可能
    → 品質重視の顧客: FEFO（期限管理厳格）
    → コスト重視の顧客: Single Lot Fit（ピッキング効率優先）
"""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal


@dataclass
class AllocationRequest:
    """引当リクエスト.

    Attributes:
        order_line_id: 注文明細ID
        required_quantity: 必要数量
        reference_date: 基準日（期限切れ判定に使用）
        allow_partial: 分納を許可するか（デフォルト: True）
    """

    order_line_id: int
    required_quantity: Decimal
    reference_date: date
    allow_partial: bool = True
    strategy: str = "fefo"  # "fefo" or "single_lot_fit"


@dataclass
class AllocationDecision:
    """個別ロットの引当判定結果.

    Attributes:
        lot_id: ロットID（判定対象外の場合はNone）
        lot_number: ロット番号（判定対象外の場合は空文字）
        score: 優先度スコア（低いほど優先、期限までの日数など）
        decision: 判定結果 ('adopted', 'rejected', 'partial')
        reason: 理由（"FEFO採用", "期限切れ", "在庫不足" 等）
        allocated_qty: 実際に引き当てた数量
    """

    lot_id: int | None
    lot_number: str
    score: Decimal | None
    decision: str  # 'adopted', 'rejected', 'partial'
    reason: str
    allocated_qty: Decimal


@dataclass
class AllocationResult:
    """引当計算の最終結果.

    Attributes:
        allocated_lots: 引き当てられたロットのリスト（採用されたもののみ）
        trace_logs: 全てのトレースログ（採用/不採用両方）
        total_allocated: 引当合計数量
        shortage: 不足数量
    """

    allocated_lots: list[AllocationDecision]
    trace_logs: list[AllocationDecision]
    total_allocated: Decimal
    shortage: Decimal
