import json
from pathlib import Path
from datetime import datetime
import psutil


def load_cfg():
    cfg_path = Path(__file__).parent / "config.json"
    with open(cfg_path, "r", encoding="utf-8") as f:
        return json.load(f)


def ts():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def log_line(cfg, msg: str):
    Path(cfg["log_dir"]).mkdir(parents=True, exist_ok=True)
    p = Path(cfg["log_dir"]) / "server_control.log"
    with open(p, "a", encoding="utf-8") as f:
        f.write(msg + "\n")


def main():
    cfg = load_cfg()
    pid_file = Path(cfg["pid_file"])

    if not pid_file.exists():
        msg = f"[{ts()}] STOP: pid_file not found (already stopped?)"
        print(msg)
        log_line(cfg, msg)
        return

    try:
        pid = int(pid_file.read_text(encoding="utf-8").strip())
    except ValueError:
        msg = f"[{ts()}] STOP: pid_file invalid. remove it."
        print(msg)
        log_line(cfg, msg)
        pid_file.unlink(missing_ok=True)
        return

    try:
        p = psutil.Process(pid)
        msg = f"[{ts()}] STOP: terminating pid={pid}"
        print(msg)
        log_line(cfg, msg)

        p.terminate()
        try:
            p.wait(timeout=10)
        except psutil.TimeoutExpired:
            msg = f"[{ts()}] STOP: force kill pid={pid}"
            print(msg)
            log_line(cfg, msg)
            p.kill()
            p.wait(timeout=5)

    except psutil.NoSuchProcess:
        msg = f"[{ts()}] STOP: pid={pid} not found (already dead)"
        print(msg)
        log_line(cfg, msg)
    except Exception as e:
        msg = f"[{ts()}] STOP: error occurred: {e}"
        print(msg)
        log_line(cfg, msg)
    finally:
        pid_file.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
