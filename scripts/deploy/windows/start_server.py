import json
import os
import socket
import subprocess
from pathlib import Path
from datetime import datetime
import psutil


def load_cfg():
    # スクリプトと同じディレクトリにあるconfig.jsonを読む
    cfg_path = Path(__file__).parent / "config.json"
    with open(cfg_path, "r", encoding="utf-8") as f:
        return json.load(f)


def ts():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def log_line(cfg, msg: str):
    Path(cfg["log_dir"]).mkdir(parents=True, exist_ok=True)
    p = Path(cfg["log_dir"]) / "server_control.log"
    # 追記モードで書き込み
    with open(p, "a", encoding="utf-8") as f:
        f.write(msg + "\n")


def is_port_in_use(host: str, port: int) -> bool:
    # 0.0.0.0 はbind用なので、確認は localhost で見る
    check_host = "127.0.0.1"
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex((check_host, port)) == 0


def pid_alive(pid: int) -> bool:
    try:
        p = psutil.Process(pid)
        return p.is_running() and p.status() != psutil.STATUS_ZOMBIE
    except psutil.Error:
        return False


def main():
    cfg = load_cfg()
    pid_file = Path(cfg["pid_file"])

    # 既にPIDファイルがあるなら生存確認（誤って二重起動しない）
    if pid_file.exists():
        try:
            pid = int(pid_file.read_text(encoding="utf-8").strip())
        except ValueError:
            pid = -1

        if pid > 0 and pid_alive(pid):
            msg = f"[{ts()}] START: already running (pid={pid})"
            print(msg)
            log_line(cfg, msg)
            return

        # 死んでるPIDなら掃除
        pid_file.unlink(missing_ok=True)

    # ポート使用中なら起動しない（別プロセスが掴んでる可能性）
    if is_port_in_use(cfg["host"], cfg["port"]):
        msg = f"[{ts()}] START: port {cfg['port']} is already in use. abort."
        print(msg)
        log_line(cfg, msg)
        return

    backend_dir = cfg["backend_dir"]
    python = cfg["venv_python"]

    # current.txt がある場合、動的に最新リリースのパスに書き換える
    current_txt = Path(cfg["pid_file"]).parent.parent / "current.txt"
    if current_txt.exists():
        release_path = Path(current_txt.read_text(encoding="utf-8").strip())
        if release_path.exists():
            backend_dir = str(release_path / "backend")
            # 仮想環境のパスを再構築（config.jsonにある末尾のパーツを利用）
            venv_rel = Path(cfg["venv_python"]).relative_to(cfg["backend_dir"])
            python = str(release_path / "backend" / venv_rel)
            print(f"[{ts()}] Dynamic path resolved from current.txt: {release_path}")

    # 本番OSがWindowsであることを想定
    cmd = [
        python,
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        cfg["host"],
        "--port",
        str(cfg["port"]),
    ]

    print(f"[{ts()}] Starting uvicorn in a new console...")
    # 新しいコンソールで起動（ログはuvicorn側に流れる）
    # Windows のみの定数
    creationflags = getattr(subprocess, "CREATE_NEW_CONSOLE", 0)
    
    try:
        proc = subprocess.Popen(cmd, cwd=backend_dir, creationflags=creationflags)
        
        # PIDを書き込み
        pid_file.write_text(str(proc.pid), encoding="utf-8")
        msg = f"[{ts()}] START: launched pid={proc.pid} port={cfg['port']}"
        print(msg)
        log_line(cfg, msg)
    except Exception as e:
        msg = f"[{ts()}] START: failed to launch: {e}"
        print(msg)
        log_line(cfg, msg)


if __name__ == "__main__":
    main()
