import json
import os
import subprocess
import sys
import logging
from pathlib import Path
from typing import TypedDict


class Config(TypedDict):
    backend_dir: str
    venv_python: str
    host: str
    port: int
    pid_file: str
    log_dir: str


def setup_logger(log_dir: str) -> logging.Logger:
    """ロガーの設定"""
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, "server_control.log")
    
    logger = logging.getLogger("ServerControl")
    logger.setLevel(logging.INFO)
    
    if logger.handlers:
        logger.handlers.clear()
        
    formatter = logging.Formatter("[%(asctime)s] %(levelname)s: %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)
    
    return logger


def stop_server(config_path: str) -> None:
    """サーバーを停止"""
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config: Config = json.load(f)
    except Exception as e:
        print(f"Error loading config: {e}")
        sys.exit(1)

    logger = setup_logger(config["log_dir"])
    logger.info("Stopping server...")

    pid_file = Path(config["pid_file"])
    if not pid_file.exists():
        logger.warning(f"PID file not found: {pid_file}. Server might not be running.")
        return

    try:
        pid = pid_file.read_text().strip()
        if not pid:
            logger.error("PID file is empty.")
            pid_file.unlink()
            return

        # Windows用: taskkill /F /T /PID を使用して子プロセス含めて強制終了
        if os.name == "nt":
            # /F: 強制終了, /T: 子プロセスも終了
            cmd = ["taskkill", "/F", "/T", "/PID", pid]
        else:
            # POSIX用 (開発・テスト環境用)
            cmd = ["kill", "-15", pid]

        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            logger.info(f"Server (PID: {pid}) stopped successfully.")
        else:
            if "プロセスが見つかりませんでした" in result.stderr or "not found" in result.stderr.lower():
                 logger.info(f"Process {pid} already exited.")
            else:
                logger.error(f"Failed to kill process {pid}: {result.stderr}")

        # PIDファイルを削除
        pid_file.unlink()
        
    except Exception as e:
        logger.error(f"Error during server shutdown: {e}")
        sys.exit(1)


if __name__ == "__main__":
    config_file = "config.json"
    if not os.path.exists(config_file):
        config_file = os.path.join(os.path.dirname(__file__), "config.json")
        
    if not os.path.exists(config_file):
        print(f"Config file not found: {config_file}")
        sys.exit(1)
        
    stop_server(config_file)
