"""引当ポリシー定義.

ロット選択のためのポリシー（FEFO/FIFO）とデータベースロックモードを定義します。
これらはAllocationCandidateServiceによって引当候補のSSoT（信頼できる唯一の情報源）として使用されます。
"""

from enum import Enum


class AllocationPolicy(str, Enum):
    """引当時のロット並び順を決定するポリシー.

    在庫引当時にどのロットを優先的に使用するかを制御します。
    """

    FEFO = "fefo"  # 先入先出（有効期限優先）- 生鮮品・期限管理品のデフォルト
    FIFO = "fifo"  # 先入先出（入荷日優先）- 製造番号管理品等で使用


class LockMode(str, Enum):
    """引当候補クエリ時のデータベースロックモード.

    並行処理時の在庫の整合性を保つためのロック制御戦略を定義します。
    """

    NONE = "none"  # ロックなし（読み取り専用/プレビュー用）
    FOR_UPDATE = "for_update"  # 行ロック取得（更新用、ロック待ち発生）
    FOR_UPDATE_SKIP_LOCKED = "for_update_skip_locked"  # ロック済み行をスキップ（競合回避）
