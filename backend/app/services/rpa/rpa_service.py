"""RPA Service - PAD実行と排他制御を管理."""

import time
from datetime import datetime, timedelta


class RPALockManager:
    """RPA実行のロック管理（メモリベース）."""

    def __init__(self):
        """初期化."""
        self._lock_until: datetime | None = None
        self._current_user: str | None = None

    def acquire_lock(self, user: str = "system", duration_seconds: int = 60) -> bool:
        """ロックを取得.

        Args:
            user: 実行ユーザー
            duration_seconds: ロック期間（秒）

        Returns:
            ロック取得成功時True、失敗時False
        """
        now = datetime.now()

        # 既存のロックが有効かチェック
        if self._lock_until and now < self._lock_until:
            return False

        # ロックを取得
        self._lock_until = now + timedelta(seconds=duration_seconds)
        self._current_user = user
        return True

    def is_locked(self) -> bool:
        """ロック状態を確認.

        Returns:
            ロック中の場合True
        """
        if not self._lock_until:
            return False

        now = datetime.now()
        return now < self._lock_until

    def get_remaining_seconds(self) -> int:
        """残りロック時間を取得.

        Returns:
            残り秒数（ロックされていない場合は0）
        """
        if not self.is_locked() or self._lock_until is None:
            return 0

        now = datetime.now()
        remaining = (self._lock_until - now).total_seconds()
        return max(0, int(remaining))


# グローバルインスタンス（本番環境ではRedis等を使用）
_lock_manager = RPALockManager()


def get_lock_manager() -> RPALockManager:
    """ロックマネージャーのインスタンスを取得."""
    return _lock_manager


class RPAService:
    """RPA実行サービス."""

    def __init__(self, lock_manager: RPALockManager):
        """初期化.

        Args:
            lock_manager: ロックマネージャー
        """
        self.lock_manager = lock_manager

    def execute_material_delivery_document(
        self, start_date: str, end_date: str, user: str = "system"
    ) -> dict:
        """素材納品書発行を実行（モック）.

        Args:
            start_date: 開始日
            end_date: 終了日
            user: 実行ユーザー

        Returns:
            実行結果
        """
        # ロック取得を試行
        if not self.lock_manager.acquire_lock(user=user, duration_seconds=60):
            remaining = self.lock_manager.get_remaining_seconds()
            return {
                "status": "locked",
                "message": f"他のユーザーが実行中です。時間をおいて実施してください（残り{remaining}秒）",
                "execution_time_seconds": remaining,
            }

        # PAD実行のモック（実際はPower Automate Desktop APIを呼び出す）
        # ここでは単にログ出力して成功を返す
        print(f"[RPA] 素材納品書発行を実行: {start_date} ~ {end_date}")
        time.sleep(0.1)  # 実行シミュレーション

        return {
            "status": "success",
            "message": "素材納品書の発行を開始しました。処理には約1分かかります。",
            "execution_time_seconds": 60,
        }
