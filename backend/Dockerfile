# backend/Dockerfile
FROM python:3.13-slim

WORKDIR /app

# システムパッケージのインストール
# PostgreSQLドライバーのビルドに必要
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        postgresql-client && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# uvのインストール
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# 依存関係ファイルをコピー
COPY pyproject.toml uv.lock ./

# 依存関係インストール
# --frozen: lockファイルを使用
# --no-dev: 開発依存を除外
# Bind mountによる上書きを防ぐため、venvを/app外に作成
ENV UV_PROJECT_ENVIRONMENT="/venv"
RUN uv sync --frozen --no-dev

# PATHを通す
ENV PATH="/venv/bin:$PATH"

# アプリケーションコードをコピー
COPY . .

# ポート公開
EXPOSE 8000

# アプリケーション起動
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]