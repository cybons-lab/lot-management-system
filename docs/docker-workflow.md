# Docker開発ワークフロー

## 依存関係の更新時の注意点

### ⚠️ 重要: 依存関係更新時の手順

`pyproject.toml`を変更した場合は、以下の手順を**必ず**実行してください：

```bash
# 1. ロックファイルを更新
cd backend
uv lock

# 2. Dockerイメージをキャッシュなしで再ビルド
cd ..
docker compose build --no-cache backend

# 3. コンテナを再起動
docker compose up -d backend
```

### なぜこの手順が必要か

1. **`uv lock`**: `pyproject.toml`の変更を`uv.lock`に反映
2. **`--no-cache`**: 古いキャッシュレイヤーを使わず、確実に依存関係を再インストール
3. **再起動**: 新しいイメージでコンテナを起動

### よくある問題

#### Q: `ModuleNotFoundError`が出る
**A**: `uv lock`を忘れていないか確認してください。`uv.lock`が更新されていないと、`Dockerfile`の`uv sync --frozen`が古い依存関係を使います。

#### Q: リビルドしても変わらない
**A**: `--no-cache`オプションを使っているか確認してください。キャッシュが残っていると古い依存関係が使われます。

## 仮想環境の配置

### 現在の構成

```dockerfile
# Dockerfile
ENV UV_PROJECT_ENVIRONMENT="/venv"
RUN uv sync --frozen --no-dev
ENV PATH="/venv/bin:$PATH"
```

### 理由

- **問題**: `./backend:/app`のbind mountが`/app/.venv`を上書きしていた
- **解決**: 仮想環境を`/venv`に配置することでマウントの影響を回避

### ⚠️ 注意

この構成を変更する場合は、bind mount設定も見直してください。

## トラブルシューティング

### コンテナが起動しない

```bash
# ログを確認
docker compose logs backend

# コンテナに入って確認
docker compose exec backend bash
which python
which uvicorn
```

### 依存関係が反映されない

```bash
# uv.lockの更新日時を確認
ls -l backend/uv.lock

# Dockerイメージの作成日時を確認
docker images | grep lot-management-system-backend

# 完全クリーンビルド
docker compose down
docker system prune -a  # 注意: すべての未使用イメージを削除
docker compose build --no-cache
docker compose up -d
```

## 開発時のベストプラクティス

### 依存関係追加のチェックリスト

- [ ] `pyproject.toml`を編集
- [ ] `uv lock`を実行
- [ ] `uv.lock`の差分を確認
- [ ] `docker compose build --no-cache backend`
- [ ] `docker compose up -d backend`
- [ ] ログで起動確認: `docker compose logs -f backend`

### 本番用と開発用の依存関係

```toml
[project]
dependencies = [
    # 本番でも必要なもの
    "fastapi>=0.122.0",
    "faker>=38.2.0",  # test_data_routerで使用するため本番依存
]

[dependency-groups]
dev = [
    # 開発・テスト専用
    "pytest>=9.0.1",
    "ruff>=0.14.6",
]
```

**注意**: アプリケーション起動時に`import`されるモジュールは、たとえテスト用でも本番依存関係に含める必要があります。

## 参考: 今回発生した問題と解決

### 問題1: passlib/python-jose未インストール
- **原因**: 新規追加した依存関係が`uv.lock`に反映されていなかった
- **解決**: `uv lock`を実行

### 問題2: faker未インストール
- **原因**: dev依存だったが、`test_data_router`で本番起動時に使用
- **解決**: 本番依存に移動

### 問題3: uvicorn not found
- **原因**: bind mountが`/app/.venv`を上書き
- **解決**: 仮想環境を`/venv`に移動
