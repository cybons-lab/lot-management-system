---
description: バックエンドテストを実行（テストDB起動含む）
---

# /test ワークフロー

バックエンドのテストを実行します。テストDBを自動起動します。

## 手順

### 1. テストDBを起動
// turbo
```bash
docker compose -f docker-compose.test.yml up -d
```

### 2. DBの起動を待機（5秒）
// turbo
```bash
timeout 5
```

### 3. テストを実行
```bash
cd backend && python -m pytest tests/ -v --tb=short
```

### 4. （オプション）テストDB停止
テスト完了後、DBを停止する場合：
```bash
docker compose -f docker-compose.test.yml down
```

## 注意事項

- テストDBはポート5433で起動（開発DBの5432と競合しない）
- tmpfsを使用しているためテストは高速だがデータは永続化されない
- 環境変数 `DATABASE_URL` が正しく設定されていることを確認
