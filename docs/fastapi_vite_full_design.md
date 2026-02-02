
# FastAPI + Vite テスト常駐運用  
## bat / Python のみで回すための完全設計書

---

## 1. 背景・目的
本設計書は、FastAPI + Vite を用いたテスト環境において、  
**サーバーへ頻繁にログインせずに安全・簡単に運用する**ことを目的とする。

- uvicorn はコマンドプロンプト常駐
- Git / IIS / PowerShell を使わない
- 再起動は「必要なときだけ」「1操作」
- フロント・バックを zip でまとめて配布

---

## 2. 検討した選択肢と判断理由

### uvicorn --reload
- 開発専用
- 常駐・大量変更に不向き → 不採用

### IIS
- 設定・保守コスト増 → 今回は不採用

### PowerShell(ps1)
- 実行ポリシー・運用性に難 → 不採用

### Windowsサービス(NSSM)
- 将来候補だが今は不要

---

## 3. 最終方針（採用構成）

| 項目 | 方針 |
|----|----|
| uvicorn | cmd 常駐 |
| 再起動 | bat で手動 |
| 制御 | Python + PID |
| フロント | dist 差し替え |
| デプロイ | zip |
| ログ | ファイル |
| ps1 | 使わない |
| IIS | 使わない |

---

## 4. ディレクトリ構成

```
C:\lot_management\
  current\            # 最新リリースへのシンボリックリンクまたはパス
    backend\
      app\
      .venv312\       # 仮想環境
    frontend\
      dist\
  releases\           # 過去リリースの保存用
    20260202_120000\
    20260202_150000\
  run\                # 制御スクリプト
    config.json
    start_server.py
    stop_server.py
    start_server.bat
    stop_server.bat
    restart_server.bat
    uvicorn.pid
  logs\
    server_control.log
    deploy.log
```

---

## 5. デプロイ設計

### zip 配布理由
- コピー作業削減
- 人的ミス防止
- Python 単体更新に近づける

### リリースディレクトリ方式
- 直上書き禁止
- ロールバック可能

---

## 6. 再起動設計（PID管理）

### なぜ PID 管理か
- uvicorn.exe を誤 kill しない
- 二重起動防止
- 再現性のある停止

---

## 7. 設定ファイル

`C:\lot_management\run\config.json`
```json
{
  "backend_dir": "C:\\lot_management\\current\\backend",
  "venv_python": "C:\\lot_management\\current\\backend\\.venv312\\Scripts\\python.exe",
  "host": "0.0.0.0",
  "port": 8000,
  "pid_file": "C:\\lot_management\\run\\uvicorn.pid",
  "log_dir": "C:\\lot_management\\logs"
}
```

---

## 8. 起動・停止・再起動

### start_server.py
- ポート使用確認
- PID 生存確認
- uvicorn 起動
- PID 保存
- ログ出力

### stop_server.py
- PID 参照
- terminate → kill
- PID 削除
- ログ出力

### bat
- start_server.bat
- stop_server.bat
- restart_server.bat

---

## 9. ログ設計

### server_control.log
- 起動 / 停止
- PID
- ポート
- 異常系

---

## 10. フロント運用ルール

| 変更 | 再起動 |
|----|----|
| distのみ | 不要 |
| backend | 必要 |

---

### 準備（開発環境）
1. `make build` を実行
2. `deploy/lot-management-deploy-YYYYMMDD.zip` が生成される

### デプロイ（ブラウザ）
1. 管理画面（`/admin/deploy`）へアクセス
2. 生成された ZIP をアップロード
3. システムが自動的に `releases/` に展開し、`current/` を切り替える

### 更新の反映
- **フロントエンド**: アップロード完了と同時に反映されます。
- **バックエンド**: アップロード後、サーバー上の `restart_server.bat` を実行（ダブルクリック）してください。

---

## 12. 将来拡張
- NSSM
- IIS
- 管理画面再起動

---

## 13. まとめ
- 覚える操作は 1 つ
- 壊れにくい
- 将来捨てやすい

---
