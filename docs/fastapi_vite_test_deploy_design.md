
# FastAPI + Vite テスト常駐運用 デプロイ設計書（bat / Python 版）

## 1. 目的
- テスト環境において FastAPI（uvicorn）を **コマンドプロンプト常駐**のまま運用する
- Git / IIS / PowerShell を使わず、**bat と Python のみ**で再起動・運用を簡略化する
- フロント（Vite build）・バックエンドを **zip でまとめて配布**し、差し替えを安全に行う
- 再起動操作を **ダブルクリック 1 回**に集約する

## 2. 前提条件
- OS: Windows
- FastAPI 起動コマンド:
  ```bat
  uvicorn app.main:app --host 0.0.0.0 --port 8000
  ```
- Python 仮想環境（venv）を使用
- uvicorn は Windows サービス化しない
- IIS / PowerShell は使用しない

## 3. ディレクトリ構成
```
C:\app\
  current\
    backend\
      app\
      venv\
    frontend\
      dist\
  releases\
  run\
    config.json
    start_server.py
    stop_server.py
    start_server.bat
    stop_server.bat
    restart_server.bat
  logs\
    server_control.log
```

## 4. 再起動制御（PID管理）
- 起動時に PID を保存
- 停止時は PID ファイルを参照
- ポート使用中は起動を拒否

### config.json
```json
{
  "backend_dir": "C:\\app\\current\\backend",
  "venv_python": "C:\\app\\current\\backend\\venv\\Scripts\\python.exe",
  "host": "0.0.0.0",
  "port": 8000,
  "pid_file": "C:\\app\\run\\uvicorn.pid",
  "log_dir": "C:\\app\\logs"
}
```

## 5. bat 運用
### 起動
```bat
@echo off
cd /d C:\app\run
"C:\app\current\backend\venv\Scripts\python.exe" start_server.py
pause
```

### 停止
```bat
@echo off
cd /d C:\app\run
"C:\app\current\backend\venv\Scripts\python.exe" stop_server.py
pause
```

### 再起動
```bat
@echo off
cd /d C:\app\run
"C:\app\current\backend\venv\Scripts\python.exe" stop_server.py
"C:\app\current\backend\venv\Scripts\python.exe" start_server.py
pause
```

## 6. ログ設計
- ファイル: `C:\app\logs\server_control.log`
- 起動・停止・異常を時系列で記録

## 7. 運用フロー
1. zip デプロイ
2. backend 変更ありなら再起動 bat 実行
3. frontend のみ変更なら再起動不要

## 8. 割り切り
- テスト常駐前提
- 自動再起動はしない
- 本番では別途設計

