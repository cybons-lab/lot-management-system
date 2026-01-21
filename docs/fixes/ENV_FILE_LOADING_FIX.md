# .env ファイル読み込み問題の修正

## 問題の説明

本番環境で `.venv` から起動した際、`.env` ファイルが正しく読み込まれず、以下の症状が発生していました:

- localhost では動作するが、外部からアクセスするとデータベースの値が取れない
- 環境変数が正しく設定されていない

## 根本原因

1. **`os.getenv()` の直接使用**: `backend/app/core/config.py` で `os.getenv()` を直接使用していたため、Pydantic Settings の `.env` ファイル読み込み機能がバイパスされていた

2. **カレントディレクトリの問題**: 本番環境で起動する際、カレントディレクトリが異なるため、相対パス `.env` が見つからなかった

## 修正内容

### 1. config.py の修正

**変更箇所:** `backend/app/core/config.py`

以下の環境変数を `os.getenv()` から Pydantic Settings の `Field()` に変更:

- `ENVIRONMENT`
- `DATABASE_URL`
- `DEFAULT_WAREHOUSE_ID`
- `LOG_LEVEL`
- `LOG_FILE_ENABLED`
- `LOG_JSON_FORMAT`
- `LOG_ROTATION_SIZE`
- `LOG_RETENTION_DAYS`
- `LOG_BACKUP_COUNT`
- `CLOUD_FLOW_URL_MATERIAL_DELIVERY_NOTE`
- `CLOUD_FLOW_URL_PROGRESS_DOWNLOAD`

**修正前:**
```python
DATABASE_URL: str = os.getenv("DATABASE_URL", "")
```

**修正後:**
```python
DATABASE_URL: str = Field(
    default="",
    validation_alias=AliasChoices("DATABASE_URL", "database_url"),
)
```

### 2. .env ファイルパスの柔軟化

環境変数 `ENV_FILE` で `.env` ファイルのパスを上書きできるように変更:

```python
model_config = SettingsConfigDict(
    # 環境変数 ENV_FILE でパスを上書き可能 (本番環境用)
    env_file=os.getenv("ENV_FILE", ".env"),
    env_file_encoding="utf-8",
    case_sensitive=False,
    extra="ignore",
)
```

### 3. 起動スクリプトの作成

**ファイル:** `backend/start_production.sh`

本番環境用の起動スクリプトを作成し、以下を保証:

- スクリプトのディレクトリに自動的に移動
- `.env` ファイルのパスを環境変数 `ENV_FILE` に設定
- 仮想環境の存在チェック
- 起動時の情報表示

### 4. ドキュメントの追加

以下のファイルを追加:

- `backend/.env.production.example`: 本番環境用の設定例 (プレースホルダー値のみ)
- `backend/lot-management.service.example`: systemd サービスファイルの例
- `docs/PRODUCTION_SETUP.md`: 本番環境セットアップガイド

## 使用方法

### 開発環境 (変更なし)

従来通り、`.env` ファイルが自動的に読み込まれます:

```bash
cd backend
uvicorn app.main:app --reload
```

### 本番環境

#### 方法 1: 起動スクリプトを使用 (推奨)

```bash
cd /path/to/lot-management-system
./backend/start_production.sh
```

#### 方法 2: 環境変数を明示的に設定

```bash
export ENV_FILE="/path/to/lot-management-system/backend/.env"
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### 方法 3: systemd サービス

```bash
sudo cp backend/lot-management.service.example /etc/systemd/system/lot-management.service
# ファイルを編集してパスを修正
sudo systemctl enable lot-management.service
sudo systemctl start lot-management.service
```

## 影響範囲

- **互換性**: 開発環境への影響なし (後方互換性あり)
- **本番環境**: `.env` ファイルが確実に読み込まれるようになる
- **テスト**: 既存のテストに影響なし

## テスト方法

1. 設定が正しく読み込まれることを確認:
```bash
cd backend
python -c "from app.core.config import settings; print(settings.DATABASE_URL)"
```

2. 環境変数 `ENV_FILE` の動作確認:
```bash
export ENV_FILE="/path/to/backend/.env"
python -c "from app.core.config import settings; print(settings.DATABASE_URL)"
```

## セキュリティ考慮事項

- `.env` ファイルには機密情報が含まれるため、権限を `600` に設定すること:
  ```bash
  chmod 600 backend/.env
  ```

- Git にコミットしないこと (`.gitignore` に追加済み)

- 本番環境では `SECRET_KEY` を必ず変更すること

## 関連ファイル

- `backend/app/core/config.py` - 設定クラス (修正)
- `backend/start_production.sh` - 本番起動スクリプト (新規)
- `backend/.env.production.example` - 本番設定例 (新規)
- `backend/lot-management.service.example` - systemd サービス例 (新規)
- `docs/PRODUCTION_SETUP.md` - セットアップガイド (新規)

## 参考

- Pydantic Settings: https://docs.pydantic.dev/latest/concepts/pydantic_settings/
- FastAPI 環境変数: https://fastapi.tiangolo.com/advanced/settings/
