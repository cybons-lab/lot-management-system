# frontend/Dockerfile
FROM node:20-slim

# Install curl for OpenAPI type generation
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# 作業ディレクトリ
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー（キャッシュ活用）
COPY package*.json ./

# 依存関係インストール
RUN npm install

# アプリケーションコードをコピー
COPY . .

# ポート公開
EXPOSE 5173

# 起動コマンド（開発用: ホットリロード有効）
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
