# Windows テスト環境デプロイ・運用マニュアル

## 1. 概要
本ドキュメントは、Windows環境で FastAPI (Backend) と Vite (Frontend/Static) を簡易的にデプロイ・運用するための手順書です。
IIS等の Web サーバーを使用せず、Python スクリプトとバッチファイルのみでサービスの起動・停止を行います。

## 2. ディレクトリ構成
サーバー上で以下の構成になるように配置してください。

```text
C:\app\
  ├─ current\          # 現在稼働中のソースコード
  │    ├─ backend\     # Python (FastAPI) ソース
  │    │    └─ venv\   # Python 仮想環境
  │    └─ frontend\
  │         └─ dist\   # Vite ビルド済み成果物 (静的ファイル)
  ├─ run\              # 実行制御用スクリプト (今回実装分)
  │    ├─ config.json
  │    ├─ start_server.py
  │    ├─ stop_server.py
  │    ├─ start_server.bat
  │    ├─ stop_server.bat
  │    └─ restart_server.bat
  ├─ logs\             # ログファイル
  │    └─ server_control.log
  └─ releases\         # (任意) 過去バージョンのバックアップ
```

## 3. セットアップ手順

### 3.1 Python の準備
1. Windows 用 Python をインストールしてください（Python 3.10以上推奨）。
2. `C:\app\current\backend` で仮想環境を作成し、依存ライブラリをインストールしてください。
   ```cmd
   cd C:\app\current\backend
   python -m venv venv
   venv\Scripts\pip install -r requirements.txt
   ```

### 3.2 設定ファイル (config.json) の作成
`C:\app\run\config.json` を作成し、環境に合わせてパスを調整してください。

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

## 4. 運用方法

### 起動
`C:\app\run\start_server.bat` をダブルクリックして実行してください。
* 既に起動している場合はエラーメッセージが表示されます。
* 成功すると `uvicorn.pid` が作成され、バックグラウンドで起動します。

### 停止
`C:\app\run\stop_server.bat` をダブルクリックして実行してください。
* `uvicorn.pid` に記録されたプロセスを終了させます（子プロセス含む）。

### 再起動
`C:\app\run\restart_server.bat` を実行してください。
* 停止処理の後、3秒待機してから起動処理を行います。

## 5. ログの確認
起動・停止の履歴は `C:\app\logs\server_control.log` に記録されます。

```text
[2026-02-02 10:30:00] INFO: Starting server...
[2026-02-02 10:30:01] INFO: Server started successfully (PID: 12345)
```

## 6. トラブルシューティング

### 起動できない (Port 8000 is already in use)
* 以前のプロセスが残っている可能性があります。`stop_server.bat` を試すか、タスクマネージャーで `python.exe` (Uvicorn) プロセスを終了させてください。

### バッチファイルが文字化けする
* バッチファイルは `ANSI (Shift-JIS / CP932)` 形式で保存されている必要があります。
* 同梱のバッチファイルは互換性を考慮して作成されています。

### フロントエンド(Vite)の表示
* 本構成はバックエンド API の起動に特化しています。静的ファイル(`frontend/dist`)の配信は、FastAPI の `StaticFiles` マウント等で対応するか、別途簡易的な HTTP サーバー（例: `python -m http.server`）を起動してください。
