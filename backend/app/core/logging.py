# backend/app/core/logging.py
"""
構造化ロギング設定.

JSON形式でのログ出力、リクエストコンテキスト管理、センシティブ情報のマスキングを提供。
"""

import logging
import sys
from contextvars import ContextVar
from datetime import UTC, datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path

from pythonjsonlogger import jsonlogger


# コンテキスト変数（リクエストごとの情報を保持）
request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)
user_id_var: ContextVar[int | None] = ContextVar("user_id", default=None)
username_var: ContextVar[str | None] = ContextVar("username", default=None)


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """カスタムJSONフォーマッタ.

    ログレコードにコンテキスト情報（request_id, user_idなど）を自動付加。
    """

    def __init__(
        self,
        *args,
        sensitive_fields: list[str] | None = None,
        **kwargs,
    ):
        """初期化.

        Args:
            *args: 親クラスに渡される位置引数
            sensitive_fields: マスキング対象フィールドのリスト
            **kwargs: 親クラスに渡されるキーワード引数
        """
        super().__init__(*args, **kwargs)
        self.sensitive_fields = sensitive_fields or []

    def add_fields(self, log_record: dict, record: logging.LogRecord, message_dict: dict):
        """ログレコードにフィールドを追加.

        Args:
            log_record: 出力するログレコード（辞書形式）
            record: 元のログレコード
            message_dict: メッセージ辞書
        """
        super().add_fields(log_record, record, message_dict)

        # タイムスタンプ（ISO 8601形式）
        log_record["timestamp"] = datetime.now(UTC).isoformat()

        # ログレベル
        log_record["level"] = record.levelname

        # ロガー名
        log_record["logger"] = record.name

        # ファイル情報
        log_record["file"] = f"{record.pathname}:{record.lineno}"
        log_record["function"] = record.funcName

        # コンテキスト情報（存在する場合のみ）
        request_id = request_id_var.get()
        if request_id:
            log_record["request_id"] = request_id

        user_id = user_id_var.get()
        if user_id:
            log_record["user_id"] = user_id

        username = username_var.get()
        if username:
            log_record["username"] = username

        # 環境変数
        from app.core.config import settings

        log_record["environment"] = settings.ENVIRONMENT

        # センシティブ情報のマスキング
        self._mask_sensitive_fields(log_record)

    def _mask_sensitive_fields(self, log_record: dict):
        """センシティブフィールドをマスキング.

        Args:
            log_record: ログレコード
        """
        for key in list(log_record.keys()):
            if any(sensitive in key.lower() for sensitive in self.sensitive_fields):
                log_record[key] = "***MASKED***"

            # ネストされた辞書も再帰的にマスキング
            if isinstance(log_record[key], dict):
                self._mask_dict_fields(log_record[key])

    def _mask_dict_fields(self, data: dict):
        """辞書内のセンシティブフィールドを再帰的にマスキング.

        Args:
            data: マスキング対象の辞書
        """
        for key in list(data.keys()):
            if any(sensitive in key.lower() for sensitive in self.sensitive_fields):
                data[key] = "***MASKED***"
            elif isinstance(data[key], dict):
                self._mask_dict_fields(data[key])


class ColoredConsoleFormatter(logging.Formatter):
    """カラー付きコンソールフォーマッタ（開発環境用）."""

    # ANSI カラーコード
    COLORS = {
        "DEBUG": "\033[36m",  # シアン
        "INFO": "\033[32m",  # 緑
        "WARNING": "\033[33m",  # 黄色
        "ERROR": "\033[31m",  # 赤
        "CRITICAL": "\033[1;31m",  # 太字赤
        "RESET": "\033[0m",  # リセット
    }

    def format(self, record: logging.LogRecord) -> str:
        """ログレコードをフォーマット.

        Args:
            record: ログレコード

        Returns:
            フォーマット済みログメッセージ
        """
        # レベルに応じた色を適用
        level_color = self.COLORS.get(record.levelname, self.COLORS["RESET"])
        reset = self.COLORS["RESET"]

        # リクエストIDとユーザー情報を取得
        request_id = request_id_var.get()
        username = username_var.get()

        context_parts = []
        if request_id:
            context_parts.append(f"req={request_id[:8]}")
        if username:
            context_parts.append(f"user={username}")

        context_str = f"[{' '.join(context_parts)}] " if context_parts else ""

        # フォーマット
        log_message = (
            f"{level_color}{record.levelname:8}{reset} "
            f"{record.name:30} "
            f"{context_str}"
            f"{record.getMessage()}"
        )

        # 例外情報がある場合は追加
        if record.exc_info:
            log_message += f"\n{self.formatException(record.exc_info)}"

        return log_message


def setup_logging(
    level: str | None = None,
    log_dir: Path | None = None,
    file_enabled: bool | None = None,
    json_format: bool | None = None,
    sensitive_fields: list[str] | None = None,
):
    """ロギングシステムを設定.

    Args:
        level: ログレベル（DEBUG, INFO, WARNING, ERROR, CRITICAL）
        log_dir: ログファイル出力先ディレクトリ
        file_enabled: ファイル出力を有効にするか
        json_format: JSON形式でログ出力するか
        sensitive_fields: マスキング対象フィールド
    """
    from app.core.config import settings

    # デフォルト値の設定
    level = level or settings.LOG_LEVEL
    log_dir = log_dir or settings.LOG_DIR
    file_enabled = file_enabled if file_enabled is not None else settings.LOG_FILE_ENABLED
    json_format = json_format if json_format is not None else settings.LOG_JSON_FORMAT
    sensitive_fields = sensitive_fields or settings.LOG_SENSITIVE_FIELDS

    # ルートロガーの設定
    root_logger = logging.getLogger()
    root_logger.setLevel(level.upper())
    root_logger.handlers.clear()

    # コンソールハンドラ
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level.upper())

    if json_format:
        # JSON形式（本番環境）
        console_formatter = CustomJsonFormatter(
            "%(timestamp)s %(level)s %(name)s %(message)s",
            sensitive_fields=sensitive_fields,
        )
    else:
        # カラー付きテキスト形式（開発環境）
        console_formatter = ColoredConsoleFormatter()

    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    # ファイルハンドラ（有効な場合）
    if file_enabled:
        log_dir.mkdir(parents=True, exist_ok=True)

        # アプリケーションログ（全レベル）
        app_log_file = log_dir / "app.log"
        app_handler = RotatingFileHandler(
            app_log_file,
            maxBytes=settings.LOG_ROTATION_SIZE,
            backupCount=settings.LOG_BACKUP_COUNT,
            encoding="utf-8",
        )
        app_handler.setLevel(logging.DEBUG)
        app_formatter = CustomJsonFormatter(
            "%(timestamp)s %(level)s %(name)s %(message)s",
            sensitive_fields=sensitive_fields,
        )
        app_handler.setFormatter(app_formatter)
        root_logger.addHandler(app_handler)

        # エラーログ（ERROR以上のみ）
        error_log_file = log_dir / "error.log"
        error_handler = RotatingFileHandler(
            error_log_file,
            maxBytes=settings.LOG_ROTATION_SIZE,
            backupCount=settings.LOG_BACKUP_COUNT,
            encoding="utf-8",
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(app_formatter)
        root_logger.addHandler(error_handler)

    # サードパーティライブラリのログレベル調整
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    # 起動ログ
    logger = logging.getLogger(__name__)
    logger.info(
        "Logging system initialized",
        extra={
            "log_level": level,
            "file_enabled": file_enabled,
            "json_format": json_format,
        },
    )


def set_request_context(request_id: str | None = None, user_id: int | None = None, username: str | None = None):
    """リクエストコンテキストを設定.

    Args:
        request_id: リクエストID
        user_id: ユーザーID
        username: ユーザー名
    """
    if request_id:
        request_id_var.set(request_id)
    if user_id:
        user_id_var.set(user_id)
    if username:
        username_var.set(username)


def clear_request_context():
    """リクエストコンテキストをクリア."""
    request_id_var.set(None)
    user_id_var.set(None)
    username_var.set(None)


def get_logger(name: str) -> logging.Logger:
    """ロガーを取得.

    Args:
        name: ロガー名（通常は __name__）

    Returns:
        ロガーインスタンス
    """
    return logging.getLogger(name)


# 後方互換性のため、旧関数名も保持
setup_json_logging = setup_logging
