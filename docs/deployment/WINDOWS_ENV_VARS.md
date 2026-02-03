# Windows Server 環境変数設定ガイド

本番環境では `.env` ファイルではなく、システム環境変数を使用することを推奨します。

## 必須の環境変数

### 1. SECRET_KEY
JWT トークンの署名に使用する秘密鍵（32文字以上推奨）

```powershell
# PowerShell (管理者権限)
[System.Environment]::SetEnvironmentVariable('SECRET_KEY', 'your-secure-random-32-char-or-longer-string-here', 'Machine')
```

### 2. DATABASE_URL
PostgreSQL 接続文字列

```powershell
[System.Environment]::SetEnvironmentVariable('DATABASE_URL', 'postgresql://username:password@localhost:5432/lot_management', 'Machine')
```

## オプションの環境変数

### ACCESS_TOKEN_EXPIRE_MINUTES
トークンの有効期限（分）。デフォルト: 1440（24時間）

```powershell
[System.Environment]::SetEnvironmentVariable('ACCESS_TOKEN_EXPIRE_MINUTES', '1440', 'Machine')
```

### REFRESH_TOKEN_EXPIRE_MINUTES
リフレッシュトークンの有効期限（分）。デフォルト: 10080（7日）

```powershell
[System.Environment]::SetEnvironmentVariable('REFRESH_TOKEN_EXPIRE_MINUTES', '10080', 'Machine')
```

### CORS_ORIGINS
許可するCORSオリジン（JSON配列形式）

```powershell
[System.Environment]::SetEnvironmentVariable('CORS_ORIGINS', '["http://localhost:3000","http://production-domain.com"]', 'Machine')
```

## 設定手順

### 方法1: PowerShell（推奨）

1. PowerShell を管理者権限で起動
2. 上記のコマンドを実行
3. サービスを再起動

```powershell
# 設定例
[System.Environment]::SetEnvironmentVariable('SECRET_KEY', 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', 'Machine')
[System.Environment]::SetEnvironmentVariable('DATABASE_URL', 'postgresql://lot_user:secure_password@localhost:5432/lot_management', 'Machine')

# 設定確認
[System.Environment]::GetEnvironmentVariable('SECRET_KEY', 'Machine')
[System.Environment]::GetEnvironmentVariable('DATABASE_URL', 'Machine')
```

### 方法2: システムのプロパティ（GUI）

1. `Win + Pause/Break` でシステムのプロパティを開く
2. 「システムの詳細設定」をクリック
3. 「環境変数」ボタンをクリック
4. 「システム環境変数」セクションで「新規」をクリック
5. 変数名と値を入力
6. 「OK」で保存

## 設定確認

### 環境変数が読み込まれているか確認

```powershell
# PowerShell
Get-ChildItem Env:SECRET_KEY
Get-ChildItem Env:DATABASE_URL

# または
[System.Environment]::GetEnvironmentVariable('SECRET_KEY', 'Machine')
```

### FastAPI アプリケーションで確認

アプリケーション起動時のログで確認できます:

```bash
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

エラーが出る場合は環境変数が正しく設定されていません。

## サービスの再起動

環境変数を変更した後は、サービスを再起動する必要があります:

```powershell
# IIS の場合
iisreset /restart

# Windows Service の場合
Restart-Service -Name "YourServiceName"

# または、サーバーを再起動
Restart-Computer -Force
```

## セキュリティのベストプラクティス

1. **SECRET_KEY の生成**
   ```python
   # Python で安全なランダム文字列を生成
   import secrets
   print(secrets.token_urlsafe(32))
   ```

2. **DATABASE_URL のパスワード**
   - 複雑なパスワードを使用
   - 定期的に変更
   - アプリケーション専用のDBユーザーを作成

3. **アクセス権限**
   - システム環境変数へのアクセスを制限
   - 管理者のみが変更可能に設定

4. **.env ファイルの削除**
   - 本番環境から `.env` ファイルを削除
   - Git に `.env` が含まれていないことを確認（`.gitignore` で除外済み）

## トラブルシューティング

### 環境変数が認識されない

1. サービス/プロセスを完全に再起動
2. `Machine` スコープで設定されているか確認
3. PowerShell を再起動して再確認

### DATABASE_URL の形式エラー

正しい形式:
```
postgresql://username:password@host:port/database
```

例:
```
postgresql://lot_user:mypassword@localhost:5432/lot_management
postgresql://lot_user:mypassword@192.168.1.100:5432/lot_management
```

### SECRET_KEY が短すぎる

最低32文字必要です。以下のコマンドで生成:

```powershell
# PowerShell で生成
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

## 参考

- Pydantic Settings: https://docs.pydantic.dev/latest/concepts/pydantic_settings/
- 12-Factor App: https://12factor.net/config
- Backend設定ファイル: `backend/app/core/config.py`
