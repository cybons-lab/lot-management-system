# SmartRead Logging Gaps - errorLogger Integration

## Status
- **Created**: 2026-01-21
- **Priority**: Medium
- **Related PR**: feature/smartread-vertical-conversion-fix

## Background
PR #454 added `errorLogger` to main features for success/error logging. However, SmartRead feature lacks consistent logging across all operations.

## Current Status

### ✅ Completed / 部分的実装済み

#### Verified Implementation (`api.ts` checks)
- `getTasks` / `getManagedTasks` : `operationLogger` 実装済み。
- `saveLongData` : `operationLogger.start` のみ実装確認。
- `skip_today` : `operationLogger` 実装済み。
- `pad_runs` : `operationLogger` 実装済み。

#### Original Completed Items
- `useTransformToLong` - Added errorLogger for:
  - `smartread_transform_start` - Transform begins
  - `smartread_transform_complete` - Transform completes
  - `smartread_save_success` - DB save succeeds
  - `smartread_save_failed` - DB save fails
  - `smartread_transform_failed` - Transform fails

### 🔄 Remaining Gaps / 未対応・要改善

#### API Operations (`frontend/src/features/rpa/smartread/api.ts`)
- `syncTaskResults()` uses `logger.info`, not `operationLogger`. (Inconsistent)
- `createConfig()`, `updateConfig()` lack `operationLogger`.
- `saveLongData()` logs start but lacks success/failure wrapping in some paths.

#### High Priority (Refined)
1. Consolidate logging strategy: `logger.info` vs `operationLogger`.
2. Ensure `syncTaskResults` errors are visible to user (currently relies on `logger.info`).

#### Original List (Superseded where checked matches above)

#### Hook Operations (`frontend/src/features/rpa/smartread/hooks.ts`)
- `useSyncTaskResults` - API sync with auto-transform
- `useSmartReadConfigs` - Config loading
- `useSmartReadTasks` - Task list loading

#### Component Operations
- `SmartReadResultView` - User-triggered actions (sync button, download, etc.)
- `SmartReadUploadPanel` - File upload completion
- `SmartReadTaskList` - Task operations

#### Backend (`backend/app/application/services/smartread/smartread_service.py`)
- Current logging uses Python `logger.info()` - needs review if backend logging strategy should be consistent

## Action Items

### High Priority
1. Add errorLogger to `useSyncTaskResults` - This is the primary auto-transform path
2. Add errorLogger to API file operations (upload, sync)
3. Add errorLogger to config CRUD operations

### Medium Priority
4. Review SmartReadResultView user action logging
5. Add errorLogger to task list operations
6. Document SmartRead logging events in a central place

### Low Priority
7. Review backend logging strategy (Python logger vs structured logging)
8. Consider adding performance metrics (transform duration, DB save duration)

## Logging Event Names (Proposed Convention)

Format: `smartread_{operation}_{status}`

### Transform Operations
- `smartread_transform_start` ✅
- `smartread_transform_complete` ✅
- `smartread_transform_failed` ✅

### Save Operations
- `smartread_save_success` ✅
- `smartread_save_failed` ✅

### API Sync Operations (TODO)
- `smartread_sync_start` - When sync begins
- `smartread_sync_complete` - When sync completes successfully
- `smartread_sync_failed` - When sync fails

### Upload Operations (TODO)
- `smartread_upload_start`
- `smartread_upload_complete`
- `smartread_upload_failed`

### Config Operations (TODO)
- `smartread_config_create_success`
- `smartread_config_update_success`
- `smartread_config_delete_success`
- `smartread_config_operation_failed`

### Task Operations (TODO)
- `smartread_tasks_load_success`
- `smartread_tasks_load_failed`

## Investigation Notes

### Auto-Save Flow ✅ VERIFIED
DB save happens automatically via this flow:
1. User clicks "サーバー取得" button → `handleSyncFromApi()` called
2. Calls `syncTaskResults(configId, taskId, forceSync: true)`
3. Backend `/tasks/{task_id}/sync` endpoint (smartread_router.py:475):
   - Downloads export from SmartRead API
   - Calls `get_export_csv_data(..., save_to_db=True)` (smartread_service.py:599)
   - Transforms wide → long (backend CSV transformer)
   - Saves to DB via `_save_wide_and_long_data()` (smartread_service.py:792)
4. Returns `{wide_data, long_data, errors, filename}` to frontend

**Code Locations**:
- Frontend: `SmartReadResultView.tsx:279` - `forceSync: true` is used
- Backend: `smartread_router.py:475` - `/tasks/{task_id}/sync` endpoint
- Backend: `smartread_service.py:523` - `sync_task_results()` method
- Backend: `smartread_service.py:599` - `get_export_csv_data(save_to_db=True)`
- Backend: `smartread_service.py:792` - `_save_wide_and_long_data()`

### Potential Issue - WHY User Might Not See Saved Data
User reported: "縦持ち変換は自動でできてるっぽいんだけど、DB保存が自動で行われてない可能性"

**Possible Causes**:
1. **Cache Hit**: If `force=False` and data exists, returns cached data without re-saving
   - `smartread_service.py:546-571` - Returns existing data if found
   - Frontend uses `forceSync: true`, so this shouldn't happen
2. **Silent Failure**: DB save might fail but error is not propagated to frontend
   - Need errorLogger in sync operation to catch failures
3. **Transaction Not Committed**: Data saved but transaction not committed?
   - Check if `session.flush()` vs `session.commit()` is used correctly
4. **Different Task ID**: User might be looking at wrong task's data
   - Add logging to show which task_id is being saved

**Investigation Steps** (PRIORITY):
1. ✅ Add errorLogger to `useSyncTaskResults` hook - Track sync start/success/failure
2. Add errorLogger to backend `sync_task_results` - Python logging to structured log
3. Check database directly after sync to confirm rows exist
4. Monitor browser console + backend logs during next sync operation

**Next Steps**:
1. Add errorLogger to sync operations (HIGH PRIORITY)
2. Verify transaction commit in backend
3. Check if there are any swallowed exceptions

## Cache-to-DB Flow Analysis (2026-01-21)

### Question: Does cached data eventually get saved to DB?

**Answer**: **NO** - Cached data (IndexedDB) is NOT automatically saved to the database.

**Flow Details**:

#### 1. `useResultDataLoader` (Initial Load on Page Open)
- **Path**: `hooks/useResultDataLoader.ts:44-68`
- **Flow**:
  1. Try IDB cache first → If found, returns cached data **WITHOUT DB save**
  2. If no cache, calls `syncMutation.mutateAsync({ forceSync: false })`
  3. `forceSync: false` → Backend checks DB first, returns if exists
  4. Backend auto-transforms and saves to DB (via `save_to_db=True`)

#### 2. `useSyncTaskResults` ("サーバー取得" button)
- **Path**: `hooks.ts:646-764`
- **Flow**:
  1. If `forceSync: false` → Check IDB cache first
  2. If cache hit → Returns cached data **WITHOUT calling backend**
  3. If `forceSync: true` → Skip cache, call backend API
  4. Backend sync API (`sync_task_results`) → Downloads from SmartRead → Transforms → **Saves to DB**
  5. Frontend caches the result to IDB

#### 3. `useTransformToLong` (Manual "縦変換" button in dev mode)
- **Path**: `hooks/useTransformToLong.ts:119-136`
- **Flow**:
  1. Frontend transforms wide → long data
  2. Saves to IDB cache
  3. **Explicitly calls `saveToDatabase()`** → Saves to DB

### Summary: When is DB Save Triggered?

| Scenario | DB Save? | Notes |
|----------|----------|-------|
| Initial page load (cache hit) | ❌ NO | Returns IDB cache, no backend call |
| Initial page load (cache miss) | ✅ YES | Backend auto-saves via `save_to_db=True` |
| "サーバー取得" button (`forceSync: false`) | ❌ Maybe | If cache exists, no backend call → no save |
| "サーバー取得" button (`forceSync: true`) | ✅ YES | Backend sync → transform → save to DB |
| Manual "縦変換" button (dev mode) | ✅ YES | Frontend transform → explicit DB save |

### Issue: Inconsistency in Save Logic

**Problem**: If user views cached data, that data is NOT guaranteed to be in the DB!

**Recommendation**:
1. **OPTION A**: Always save cached data to DB on load (if not already saved)
2. **OPTION B**: Change `forceSync` default to `true` in `useResultDataLoader`
3. **OPTION C**: Add a flag to IDB cache to track if data is saved to DB or not

## Files to Modify

1. `frontend/src/features/rpa/smartread/api.ts` - Add logging to API functions
2. `frontend/src/features/rpa/smartread/hooks.ts` - Add logging to hooks
3. `frontend/src/features/rpa/smartread/components/SmartReadResultView.tsx` - Add logging to user actions
4. Create `docs/standards/smartread-logging.md` - Document event names and conventions

## References
- PR #454 - Original errorLogger integration
- `frontend/src/services/error-logger.ts` - Error logger implementation
- `backend/app/application/services/smartread/smartread_service.py` - Backend service with logging


---

# Cache Inconsistency Issues

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
