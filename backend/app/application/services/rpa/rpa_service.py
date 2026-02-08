"""RPA Service - PAD実行と排他制御を管理.

【設計意図】RPAロック管理の設計判断:

1. なぜメモリベースのロック管理を使うのか（L9-66）
   理由: シンプルな実装で同時実行を防止
   業務的背景:
   - Power Automate Desktop（PAD）: 1台のPCで1つのフローしか実行不可
   - 複数ユーザーが同時に「素材納品書発行」を実行 → PAD が競合してエラー
   → ロック機構で同時実行を防止
   実装:
   - _lock_until: ロック有効期限
   - _current_user: ロック取得ユーザー
   トレードオフ:
   - メモリベース: サーバー再起動でロック情報が失われる
   → 本番環境では Redis 等の永続化ストアを推奨

2. なぜタイムアウト付きロックを使うのか（L17-36, duration_seconds）
   理由: ロック解放忘れによるデッドロックを防止
   問題:
   - ユーザーA: PAD実行開始 → サーバーエラー → ロック解放されない
   → 永久にロックされたまま、誰も実行できない
   解決:
   - duration_seconds: ロック有効期限（60秒）
   - is_locked(): 現在時刻と比較してロック状態を判定
   → 期限切れなら自動的にロック解放
   業務影響:
   - PAD実行中にサーバーがクラッシュしても、60秒後に自動復旧

3. なぜグローバルシングルトンを使うのか（L64-70）
   理由: アプリケーション全体で1つのロック管理インスタンスを共有
   問題:
   - 各リクエストで new RPALockManager() を作成
   → ロック状態が共有されない → 同時実行を防げない
   解決:
   - _lock_manager: モジュールレベルのグローバル変数
   - get_lock_manager(): シングルトンインスタンスを返す
   実装:
   - FastAPI の依存性注入で get_lock_manager() を使用
   メリット:
   - 全リクエストで同じロック状態を参照

4. なぜ acquire_lock() が bool を返すのか（L17-36）
   理由: ロック取得成功/失敗を呼び出し側で判定
   業務フロー:
   - acquire_lock() → True: ロック取得成功 → PAD実行
   - acquire_lock() → False: ロック取得失敗 → エラーメッセージ表示
   実装:
   - now < self._lock_until: 既にロックされている → False
   - ロック取得: self._lock_until を更新 → True
   用途:
   - フロントエンド: 「他のユーザーが実行中です（残り XX 秒）」と表示

5. なぜ get_remaining_seconds() があるのか（L50-61）
   理由: ユーザーフレンドリーなエラーメッセージ
   業務的背景:
   - ロック取得失敗時: 「何秒待てば実行できるか」を表示したい
   実装:
   - remaining = (self._lock_until - now).total_seconds()
   - max(0, int(remaining)): 負数を防ぐ
   用途:
   - フロントエンド: 「他のユーザーが実行中です。時間をおいて実施してください（残り45秒）」

6. なぜモック実装なのか（L84-115）
   理由: PAD API 連携は外部依存
   開発時の問題:
   - Power Automate Desktop API: Windows環境でのみ動作
   - 開発環境（Linux/Mac）: PAD を実行できない
   → モック実装で開発・テストを継続
   実装:
   - print(): ログ出力のみ（実際のPAD実行なし）
   - time.sleep(0.1): 実行シミュレーション
   本番実装:
   - PAD API 呼び出しに置き換え（REST API or COM オブジェクト）

7. なぜ status フィールドを返すのか（L100-104, L111-115）
   理由: フロントエンドでの処理分岐
   レスポンス例:
   - status = "locked": 他のユーザーが実行中 → エラー表示
   - status = "success": 実行開始成功 → 成功メッセージ表示
   実装:
   - locked: message に残り秒数を含める
   - success: execution_time_seconds に処理時間を含める
   用途:
   - フロントエンド: status で条件分岐してUI更新

8. なぜ実行時間を返すのか（L103, L114）
   理由: ユーザーに処理完了見込み時間を伝える
   業務的背景:
   - PAD実行: 約60秒かかる（PDF生成 + SAP登録）
   → ユーザーは「いつ完了するか」を知りたい
   実装:
   - execution_time_seconds: 60
   用途:
   - フロントエンド: プログレスバー表示「処理中... (60秒)」

9. なぜ user パラメータを記録するのか（L15, L35）
   理由: 監査証跡とデバッグ
   用途:
   - ロック取得ユーザーを記録 → 「誰がPADを実行中か」を把握
   - デバッグ: ロックが解放されない場合、ログから実行ユーザーを特定
   実装:
   - self._current_user = user
   将来拡張:
   - 管理者機能: 強制ロック解放（特定ユーザーのロックを削除）

10. なぜ本番環境では Redis を推奨するのか（L64 コメント）
    理由: 複数サーバー環境でのロック共有
    問題:
    - メモリベース: サーバーA と サーバーB でロック状態が異なる
    → サーバーA でロック中でも、サーバーB では実行可能（競合発生）
    解決:
    - Redis: 全サーバーで共有されるロックストア
    → サーバーA でロック → サーバーB でも「ロック中」と判定
    実装例:
    - redis-py: redis.set("rpa_lock", user, ex=60)
    メリット:
    - スケールアウト時にもロック機能が正常動作
"""

import json
import logging
import time
from datetime import datetime, timedelta

import httpx

from app.application.services.common.uow_service import UnitOfWork
from app.application.services.execution_queue_service import ExecutionQueueService
from app.core.database import SessionLocal
from app.core.time_utils import utcnow
from app.infrastructure.persistence.models.execution_queue_model import ExecutionQueue


logger = logging.getLogger(__name__)


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
        now = utcnow()

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

        now = utcnow()
        return now < self._lock_until

    def get_remaining_seconds(self) -> int:
        """残りロック時間を取得.

        Returns:
            残り秒数（ロックされていない場合は0）
        """
        if not self.is_locked() or self._lock_until is None:
            return 0

        now = utcnow()
        remaining = (self._lock_until - now).total_seconds()
        return max(0, int(remaining))


# グローバルインスタンス（本番環境ではRedis等を使用）
_lock_manager = RPALockManager()


def get_lock_manager() -> RPALockManager:
    """ロックマネージャーのインスタンスを取得."""
    return _lock_manager


class RPAService:
    """RPA実行サービス."""

    def __init__(self, lock_manager: RPALockManager, db=None):
        """初期化.

        Args:
            lock_manager: ロックマネージャー
            db: データベースセッション
        """
        self.lock_manager = lock_manager
        self.db = db

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

        # Cloud Flow設定を取得
        url_step1 = None
        url_step3 = None
        payload_step1 = None
        payload_step3 = None

        if self.db:
            from app.application.services.cloud_flow_service import CloudFlowService

            cf_service = CloudFlowService(self.db)
            config_step1_url = cf_service.get_config("STEP1_URL")
            config_step3_url = cf_service.get_config("STEP3_URL")
            config_step1_payload = cf_service.get_config("STEP1_PAYLOAD")
            config_step3_payload = cf_service.get_config("STEP3_PAYLOAD")

            if config_step1_url:
                url_step1 = config_step1_url.config_value
            if config_step3_url:
                url_step3 = config_step3_url.config_value
            if config_step1_payload:
                payload_step1 = config_step1_payload.config_value.replace(
                    "{{start_date}}", start_date
                ).replace("{{end_date}}", end_date)
            if config_step3_payload:
                payload_step3 = config_step3_payload.config_value.replace(
                    "{{start_date}}", start_date
                ).replace("{{end_date}}", end_date)

        logger.info(f"[RPA] 素材納品書発行を実行: {start_date} ~ {end_date}")
        logger.debug(f"[RPA] Using STEP1 URL: {url_step1 or 'Not Set'}")
        logger.debug(f"[RPA] Using STEP3 URL: {url_step3 or 'Not Set'}")
        logger.debug(f"[RPA] Using STEP1 Payload: {payload_step1 or 'Not Set'}")
        logger.debug(f"[RPA] Using STEP3 Payload: {payload_step3 or 'Not Set'}")

        if not url_step1:
            return {
                "status": "error",
                "message": "Step1 Flow URLが設定されていません。",
                "execution_time_seconds": 0,
            }

        try:
            step1_payload = json.loads(payload_step1) if payload_step1 else {}
        except json.JSONDecodeError:
            return {
                "status": "error",
                "message": "Step1 JSONペイロードの形式が不正です。",
                "execution_time_seconds": 0,
            }

        step1_payload.setdefault("start_date", start_date)
        step1_payload.setdefault("end_date", end_date)
        step1_payload.setdefault("executed_by", user)

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(url_step1, json=step1_payload)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.exception("[RPA] Step1 Flow呼び出しエラー")
            return {
                "status": "error",
                "message": f"Step1 Flow呼び出しに失敗しました: {exc!s}",
                "execution_time_seconds": 0,
            }

        time.sleep(0.1)  # 実行シミュレーション

        return {
            "status": "success",
            "message": "素材納品書の発行を開始しました。処理には約1分かかります。",
            "execution_time_seconds": 60,
        }

    async def process_rpa_queue_task(self, queue_id: int):
        """RPAキュータスクを処理（バックグラウンド実行）."""
        logger.info(f"Processing RPA queue task: {queue_id}")

        # 1. タスク取得
        with UnitOfWork(SessionLocal) as uow:
            task = uow.session.get(ExecutionQueue, queue_id)
            if not task:
                logger.warning(f"Queue task not found: {queue_id}")
                return

            params = task.parameters
            flow_url = params.get("flow_url")
            json_payload = params.get("json_payload", {})

            # Start heartbeat
            await self._run_with_heartbeat(queue_id, flow_url, json_payload)

    async def _run_with_heartbeat(self, queue_id: int, flow_url: str, json_payload: dict):
        """ハートビート付きでRPAフローを実行."""
        import asyncio

        # Heartbeat loop
        stop_heartbeat = asyncio.Event()

        async def heartbeat_loop():
            while not stop_heartbeat.is_set():
                try:
                    with UnitOfWork(SessionLocal) as uow:
                        qs = ExecutionQueueService(uow.session)
                        qs.update_heartbeat(queue_id)
                    await asyncio.sleep(60)
                except Exception as e:
                    logger.error(f"Heartbeat failed: {e}")
                    await asyncio.sleep(60)

        heartbeat_task = asyncio.create_task(heartbeat_loop())

        try:
            # Execute Flow
            if not flow_url:
                raise ValueError("Flow URL is not specified")

            # Call Flow
            # Note: call_power_automate_flow is async
            from app.application.services.rpa.flow_client import call_power_automate_flow

            # Check if json_payload is string or dict
            payload = json_payload
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except json.JSONDecodeError:
                    pass

            await call_power_automate_flow(flow_url, payload)

            # Complete task
            with UnitOfWork(SessionLocal) as uow:
                queue_service = ExecutionQueueService(uow.session)
                # Check if next task needs to be processed
                next_task = queue_service.complete_task(
                    queue_id, result_message="Flow execution completed"
                )

                if next_task:
                    # Recursive call or spawn new task
                    # Spawning new task is safer to avoid deeper recursion stack
                    # But we are in async, so just await?
                    # Ideally we want to release resources of current function.
                    # Scheduling new task on event loop.
                    asyncio.create_task(self.process_rpa_queue_task(next_task.id))

        except Exception as e:
            logger.error(f"RPA task execution failed: {e}")
            with UnitOfWork(SessionLocal) as uow:
                queue_service = ExecutionQueueService(uow.session)
                next_task = queue_service.fail_task(queue_id, error_message=str(e))
                if next_task:
                    asyncio.create_task(self.process_rpa_queue_task(next_task.id))
        finally:
            stop_heartbeat.set()
            try:
                await heartbeat_task
            except Exception:
                pass
