import json
import os
import subprocess
import sys
import socket
import logging
from datetime import datetime
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
    
    # 既存のハンドラをクリア
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


def is_port_in_use(host: str, port: int) -> bool:
    """ポートが使用中かチェック"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind((host, port))
            return False
        except socket.error:
            return True


def start_server(config_path: str) -> None:
    """サーバーを起動"""
    # 1. Config読み込み
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config: Config = json.load(f)
    except Exception as e:
        print(f"Error loading config: {e}")
        sys.exit(1)

    logger = setup_logger(config["log_dir"])
    logger.info("Starting server...")

    # 2. ポートチェック
    if is_port_in_use(config["host"], config["port"]):
        logger.error(f"Port {config['port']} is already in use. Check if the server is already running.")
        sys.exit(1)

    # 3. コマンド準備
    # Windows用: subprocess.CREATE_NEW_PROCESS_GROUP を使用してバックグラウンド実行
    cmd = [
        config["venv_python"],
        "-m", "uvicorn",
        "app.main:app",
        "--host", config["host"],
        "--port", str(config["port"]),
        "--log-level", "info"
    ]

    try:
        # 環境変数を適切に設定（backendディレクトリをPYTHONPATHに追加）
        env = os.environ.copy()
        env["PYTHONPATH"] = config["backend_dir"]
        
        process = subprocess.Popen(
            cmd,
            cwd=config["backend_dir"],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
        )
        
        # 4. PID保存
        pid_file = Path(config["pid_file"])
        pid_file.parent.mkdir(parents=True, exist_ok=True)
        pid_file.write_text(str(process.pid))
        
        logger.info(f"Server started successfully (PID: {process.pid})")
        
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)


if __name__ == "__main__":
    config_file = "config.json"
    if not os.path.exists(config_file):
        # 実行ディレクトリにない場合はスクリプトと同じディレクトリを探す
        config_file = os.path.join(os.path.dirname(__file__), "config.json")
        
    if not os.path.exists(config_file):
        print(f"Config file not found: {config_file}")
        sys.exit(1)
        
    start_server(config_file)
