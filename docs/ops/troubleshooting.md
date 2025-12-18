# トラブルシューティング (Troubleshooting)

よくある問題とその解決方法。

## 1. API エラー

### 1.1. 500 Internal Server Error

**症状**: APIから500エラーが返される

**調査手順**:
```bash
# バックエンドログを確認
docker compose logs --tail=100 backend

# スタックトレースを確認
grep -A 20 "Traceback" /path/to/log
```

**よくある原因**:
- DB接続エラー → `DATABASE_URL` 環境変数を確認
- マイグレーション未適用 → `alembic upgrade head` を実行
- 依存パッケージ不足 → `pip install -r requirements.txt` を実行

### 1.2. 404 Not Found

**症状**: エンドポイントが見つからない

**確認事項**:
- URLパスにタイポがないか
- バックエンドが起動しているか (`docker compose ps`)
- APIドキュメント (`/docs`) でエンドポイント確認

### 1.3. 422 Validation Error

**症状**: リクエストが拒否される

**対処法**:
- レスポンスの `detail` フィールドを確認
- Pydanticスキーマと送信データを照合
- 日付フォーマット（ISO 8601）を確認

---

## 2. データベース関連

### 2.1. 接続エラー

**症状**: `connection refused` または `could not connect`

**確認事項**:
```bash
# DBコンテナ状態確認
docker compose ps db-postgres

# ヘルスチェック確認
docker compose exec db-postgres pg_isready -U admin
```

**対処法**:
```bash
# コンテナ再起動
docker compose restart db-postgres

# 完全リセット（データ消失注意）
docker compose down -v
docker compose up -d
```

### 2.2. マイグレーションエラー

**症状**: `Table already exists` または `Column does not exist`

**対処法**:
```bash
# 現在のリビジョン確認
docker compose exec backend alembic current

# 履歴確認
docker compose exec backend alembic history

# 強制リセット（開発環境のみ）
docker compose exec backend alembic downgrade base
docker compose exec backend alembic upgrade head
```

### 2.3. デッドロック

**症状**: クエリがタイムアウトする

**調査方法**:
```sql
-- アクティブなロック確認
SELECT pid, query, wait_event_type, state
FROM pg_stat_activity
WHERE state != 'idle';

-- ロック競合確認
SELECT * FROM pg_locks WHERE NOT granted;
```

**対処法**:
```sql
-- 問題のプロセスを終了（最終手段）
SELECT pg_terminate_backend(pid);
```

---

## 3. フロントエンド関連

### 3.1. 型エラー（TypeScript）

**症状**: OpenAPI型定義とAPIレスポンスの不一致

**対処法**:
```bash
# 型定義を再生成
docker compose exec backend python -m scripts.generate_openapi
cd frontend && npm run generate:types
```

### 3.2. ホットリロードが効かない

**症状**: コード変更が反映されない

**対処法**:
```bash
# キャッシュクリア
docker compose exec frontend rm -rf node_modules/.vite

# コンテナ再起動
docker compose restart frontend
```

### 3.3. CORS エラー

**症状**: ブラウザコンソールに「CORS policy」エラー

**確認事項**:
- `.env` の `CORS_ORIGINS` に正しいオリジンが設定されているか
- プロキシ設定が正しいか

---

## 4. 在庫・引当関連

### 4.1. 有効在庫が負になる

**症状**: `available_quantity < 0` の状態が発生

**調査SQL**:
```sql
SELECT 
  l.id, l.lot_number, l.current_quantity, l.locked_quantity,
  COALESCE(SUM(r.reserved_qty) FILTER (WHERE r.status = 'confirmed'), 0) as confirmed_qty,
  l.current_quantity - COALESCE(l.locked_quantity, 0) 
    - COALESCE(SUM(r.reserved_qty) FILTER (WHERE r.status = 'confirmed'), 0) as available
FROM lots l
LEFT JOIN lot_reservations r ON l.id = r.lot_id
GROUP BY l.id
HAVING l.current_quantity - COALESCE(l.locked_quantity, 0) 
    - COALESCE(SUM(r.reserved_qty) FILTER (WHERE r.status = 'confirmed'), 0) < 0;
```

**対処法**:
- 原因調査（予約の重複、数量計算エラー等）
- 必要に応じて在庫調整APIで補正

### 4.2. 予約が残ったままになる

**症状**: `active` ステータスの予約が解放されない

**確認SQL**:
```sql
SELECT * FROM lot_reservations
WHERE status = 'active'
AND expires_at < NOW();  -- 期限切れの仮予約
```

**対処法**:
```sql
-- 期限切れ予約を解放（運用判断で実行）
UPDATE lot_reservations
SET status = 'released', released_at = NOW()
WHERE status = 'active' AND expires_at < NOW();
```

---

## 5. パフォーマンス問題

### 5.1. APIレスポンスが遅い

**調査方法**:
```bash
# スロークエリログ有効化
docker compose exec db-postgres psql -U admin -c "SET log_min_duration_statement = 1000;"
```

**よくある原因**:
- N+1クエリ → `joinedload` / `selectinload` を追加
- インデックス不足 → `EXPLAIN ANALYZE` で確認

### 5.2. フロントエンドが重い

**確認ポイント**:
- React DevToolsでレンダリング回数確認
- Networkタブで不要なリクエスト確認
- TanStack Query DevToolsでキャッシュ状態確認

---

## 6. よくあるエラーメッセージ

| エラーメッセージ | 原因 | 対処法 |
|:---|:---|:---|
| `Invalid reservation status transition` | 不正な状態遷移 | [状態遷移図](../domain/state_machines.md)を確認 |
| `Lot not found` | ロットが存在しない/削除済み | ロットIDを確認 |
| `Insufficient available quantity` | 有効在庫不足 | 在庫状況を確認 |
| `Duplicate key value` | 一意制約違反 | 既存データを確認 |
| `Foreign key violation` | 参照整合性エラー | 関連データの存在を確認 |

---

## 7. ログ確認方法

```bash
# 全サービスのログ
docker compose logs -f

# 特定サービス
docker compose logs -f backend

# 最新N行のみ
docker compose logs --tail=50 backend

# 時間範囲指定
docker compose logs --since="2024-01-01T00:00:00" backend
```

---

## 8. サポート連絡先

問題が解決しない場合:
1. GitHubのIssueを確認
2. 新規Issueを作成（ログ・再現手順を添付）
