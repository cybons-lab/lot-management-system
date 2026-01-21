# SmartRead Logging Gaps - errorLogger Integration

## Status
- **Created**: 2026-01-21
- **Priority**: Medium
- **Related PR**: feature/smartread-vertical-conversion-fix

## Background
PR #454 added `errorLogger` to main features for success/error logging. However, SmartRead feature lacks consistent logging across all operations.

## Current Status

### ✅ Completed
- `useTransformToLong` - Added errorLogger for:
  - `smartread_transform_start` - Transform begins
  - `smartread_transform_complete` - Transform completes
  - `smartread_save_success` - DB save succeeds
  - `smartread_save_failed` - DB save fails
  - `smartread_transform_failed` - Transform fails

### ❌ Missing Logging

#### API Operations (`frontend/src/features/rpa/smartread/api.ts`)
- `syncTaskResults()` - Sync from SmartRead API
- `saveLongData()` - Save transformed data to DB
- `uploadFile()` - Upload file for OCR
- `createConfig()`, `updateConfig()`, `deleteConfig()` - Config management
- Other API calls

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

## Files to Modify

1. `frontend/src/features/rpa/smartread/api.ts` - Add logging to API functions
2. `frontend/src/features/rpa/smartread/hooks.ts` - Add logging to hooks
3. `frontend/src/features/rpa/smartread/components/SmartReadResultView.tsx` - Add logging to user actions
4. Create `docs/standards/smartread-logging.md` - Document event names and conventions

## References
- PR #454 - Original errorLogger integration
- `frontend/src/services/error-logger.ts` - Error logger implementation
- `backend/app/application/services/smartread/smartread_service.py` - Backend service with logging
