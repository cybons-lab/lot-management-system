#!/bin/bash
# 本番環境用の起動スクリプト

# スクリプトのディレクトリに移動 (backend/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# .envファイルのパスを環境変数に設定
export ENV_FILE="${SCRIPT_DIR}/.env"

echo "Starting Lot Management System..."
echo "ENV_FILE: ${ENV_FILE}"
echo "Working Directory: $(pwd)"

# 仮想環境の有効化
if [ ! -d ".venv" ]; then
    echo "Error: .venv not found. Please run: python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

source .venv/bin/activate

# Uvicornで起動
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4 \
    --log-level info
