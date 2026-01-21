# SmartRead Cache-to-DB Save Inconsistency

## Status
- **Created**: 2026-01-21
- **Priority**: Medium (次回対応)
- **Related**: smartread-logging-gaps.md

## 問題の概要

キャッシュされたデータ（IndexedDB）が自動的にDBに保存されないため、データの永続性が保証されていない。

## 詳細な分析

### データフローと DB保存タイミング

| シナリオ | DB保存? | 詳細 |
|----------|---------|------|
| 初回ページ読み込み（キャッシュヒット） | ❌ なし | IDBキャッシュを返すだけ、バックエンド呼び出しなし |
| 初回ページ読み込み（キャッシュミス） | ✅ あり | バックエンドが`save_to_db=True`で自動保存 |
| 「サーバー取得」ボタン（`forceSync: false`） | ❌ 条件付き | キャッシュがあればバックエンド呼び出しなし → DB保存なし |
| 「サーバー取得」ボタン（`forceSync: true`） | ✅ あり | バックエンド同期 → 変換 → DB保存 |
| 手動「縦変換」ボタン（開発モード） | ✅ あり | フロントエンド変換 → 明示的DB保存 |

### 各コンポーネントの動作

#### 1. `useResultDataLoader` (初回ページ読み込み)
**パス**: `frontend/src/features/rpa/smartread/hooks/useResultDataLoader.ts`

**フロー**:
1. IDBキャッシュを最初にチェック
2. キャッシュヒット → **キャッシュデータを返す（DB保存なし）**
3. キャッシュミス → `syncMutation.mutateAsync({ forceSync: false })`呼び出し
4. `forceSync: false` → バックエンドはまずDBをチェック、存在すれば返す
5. DBにもない場合 → SmartRead APIからダウンロード → 変換 → **DB保存（`save_to_db=True`）**

**問題点**: キャッシュヒット時はバックエンドを呼ばないため、そのデータがDBに存在する保証がない

#### 2. `useSyncTaskResults` (「サーバー取得」ボタン)
**パス**: `frontend/src/features/rpa/smartread/hooks.ts:646-764`

**フロー**:
1. `forceSync: false`の場合 → IDBキャッシュを最初にチェック
2. キャッシュヒット → **キャッシュデータを返す（バックエンド呼び出しなし）**
3. `forceSync: true`の場合 → キャッシュをスキップ、バックエンドAPI呼び出し
4. バックエンド sync API → SmartRead APIからダウンロード → 変換 → **DB保存**
5. フロントエンドは結果をIDBにキャッシュ

**実装状況**:
- `SmartReadResultView.tsx:279` - 「サーバー取得」ボタンは `forceSync: true` を使用
- したがって、このボタンからは常にDB保存される

**問題点**: 他の場所で`forceSync: false`を使う場合、キャッシュヒット時にDB保存されない

#### 3. `useTransformToLong` (手動「縦変換」ボタン - 開発モード)
**パス**: `frontend/src/features/rpa/smartread/hooks/useTransformToLong.ts:119-136`

**フロー**:
1. フロントエンドで横持ち → 縦持ち変換
2. IDBキャッシュに保存
3. **`saveToDatabase()`を明示的に呼び出し → DB保存**

**結論**: このフローは問題なし、常にDB保存される

## 問題の影響範囲

### 発生するシナリオ

1. **ユーザーがタスク詳細を開く**
   - 初回: API経由でデータ取得 → DB保存される ✅
   - 再度開く: IDBキャッシュから読み込み → DB保存されない ❌
   - **影響**: キャッシュクリア後にデータが消える可能性

2. **別ブラウザ/デバイスでアクセス**
   - 1台目: キャッシュにデータあり、表示できる ✅
   - 2台目: キャッシュなし、DBにもない → データなし ❌

3. **IndexedDB が削除された場合**
   - ブラウザキャッシュクリア、プライベートモード等
   - DBにデータがない → 完全にデータ消失 ❌

## 対策案（次回実装）

### オプションA: キャッシュ読み込み時に自動DB保存

**アプローチ**: IDBキャッシュから読み込んだデータを、未保存の場合のみDBに保存

**実装**:
```typescript
// useResultDataLoader.ts
const cached = await loadFromCache(configId, taskId);
if (cached) {
  // バックグラウンドでDB保存（未保存の場合のみ）
  saveToDbIfNeeded(cached).catch(console.error);
  return cached; // すぐに返す
}
```

**メリット**:
- データの永続性を保証
- UXへの影響最小（バックグラウンド処理）

**デメリット**:
- 不要な保存が発生する可能性
- IDBに「DB保存済みフラグ」が必要

### オプションB: `forceSync`のデフォルトを`true`に変更

**アプローチ**: `useResultDataLoader`で常にバックエンドを呼び出す

**実装**:
```typescript
// useResultDataLoader.ts
const result = await syncMutation.mutateAsync({
  configId,
  taskId,
  forceSync: true  // 常にtrue
});
```

**メリット**:
- シンプルで確実
- 常に最新データを取得

**デメリット**:
- 毎回API呼び出しが発生（パフォーマンス低下）
- キャッシュの意味がなくなる

### オプションC: IDBに「DB保存済み」フラグを追加 ⭐ 推奨

**アプローチ**: キャッシュデータに`saved_to_db: boolean`フラグを追加

**実装**:
```typescript
// db/export-cache.ts
interface ExportCacheEntry {
  // ... 既存フィールド
  saved_to_db: boolean; // 新規フィールド
}

// useResultDataLoader.ts
const cached = await loadFromCache(configId, taskId);
if (cached) {
  if (!cached.saved_to_db) {
    // DB未保存の場合のみ保存
    await saveToDatabase(cached);
    // フラグを更新
    await updateCacheSavedFlag(configId, taskId, true);
  }
  return cached;
}
```

**メリット**:
- 無駄な保存を防ぐ
- キャッシュのパフォーマンスメリットを維持
- データの永続性を保証

**デメリット**:
- スキーマ変更が必要
- マイグレーション処理が必要（既存キャッシュに`saved_to_db: false`を設定）

## 実装タスク（オプションCの場合）

### フェーズ1: スキーマ変更
1. `db/export-cache.ts`に`saved_to_db`フィールドを追加
2. 既存データのマイグレーション処理
3. `set()`メソッドでデフォルト`false`を設定

### フェーズ2: 保存ロジック実装
1. `useResultDataLoader`に保存チェック処理を追加
2. `saveToDatabase`ヘルパー関数を作成
3. 保存後にフラグを`true`に更新

### フェーズ3: 他のフロー修正
1. `useSyncTaskResults`でDB保存後にフラグを`true`に設定
2. `useTransformToLong`でDB保存後にフラグを`true`に設定

### フェーズ4: テスト
1. キャッシュヒット時のDB保存確認
2. フラグ更新の確認
3. マイグレーション動作確認

## 関連ファイル

- `frontend/src/features/rpa/smartread/hooks/useResultDataLoader.ts`
- `frontend/src/features/rpa/smartread/hooks.ts` (`useSyncTaskResults`)
- `frontend/src/features/rpa/smartread/hooks/useTransformToLong.ts`
- `frontend/src/features/rpa/smartread/db/export-cache.ts`
- `frontend/src/features/rpa/smartread/api.ts` (`saveLongData`)

## 参考

- PR #454 - errorLogger integration
- `docs/tasks/smartread-logging-gaps.md` - Logging gaps documentation
