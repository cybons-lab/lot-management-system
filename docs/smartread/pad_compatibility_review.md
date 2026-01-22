# SmartRead PAD互換性 調査レポート

## 作成日: 2026-01-22

## 1. 背景・目的

Power Automate Desktop (PAD) で動作している SmartRead OCR フローを、サーバ側（FastAPI）でも「ほぼトレース」して確実に実行したい。

**PADスクリプトの正規フロー:**
```
task作成 → request（ファイルアップロード） → poll request → poll task
→ export開始 → poll export → download ZIP → CSV後処理（縦持ち変換）
```

## 2. 調査結果サマリ

### 2.1 発見した問題

| 問題 | 深刻度 | 影響 |
|-----|-------|-----|
| APIハンドラ内での長時間ポーリング | **致命的** | LB/Nginx タイムアウト、ワーカー占有、二重タスク作成 |
| PAD非互換のコードパス（`/analyze`） | **高** | exportステップをスキップ、PADフローと不一致 |
| フロントエンドが `/tasks/{id}/sync` を直接呼び出し | **高** | 300秒ブロッキングをUIから発生させる |

### 2.2 コードパス一覧

| パス | エンドポイント | exportを叩く？ | PAD互換？ | ハンドラ内ポーリング |
|-----|--------------|--------------|----------|---------------------|
| A | `POST /tasks/{taskId}/sync` | Yes | Yes | **300秒ブロック** |
| B | `POST /analyze` | **No** | **No** | **120秒ブロック** |
| C | `POST /analyze-simple` | Yes | Yes | バックグラウンド（安全） |
| D | `POST /configs/{id}/process` | Yes | Yes | バックグラウンド（安全） |

## 3. 詳細調査

### 3.1 APIハンドラ内での長時間ポーリング

#### 問題箇所1: `POST /tasks/{taskId}/sync`

**ファイル:** `backend/app/presentation/api/routes/rpa/smartread_router.py:567-642`

```python
@router.post("/tasks/{task_id}/sync", response_model=None)
async def sync_task_results(
    task_id: str,
    config_id: int = Query(...),
    ...
):
    result = await service.sync_task_results(config_id, task_id, force=force)
    # ← ここで最大300秒ブロック
```

**内部処理:** `backend/app/application/services/smartread/client_service.py:108-243`

```python
async def sync_task_results(
    self,
    config_id: int,
    task_id: str,
    ...
    timeout_sec: float = 240.0,  # 4分のポーリング
) -> dict[str, Any] | None:
    # 1. リクエスト完了までポーリング（最大240秒）
    request_summary = await self._poll_task_requests_until_ready(
        client=client,
        task_id=task_id,
        config_id=config_id,
        timeout_sec=timeout_sec,  # ← 長時間ブロック
    )

    # 2. Export作成
    export = await self._create_export_and_wait(client, config_id, task_id, ...)

    # 3. Export完了までポーリング（最大60秒）
    export_ready = await client.poll_export_until_ready(
        task_id, export.export_id, export_timeout  # ← さらにブロック
    )
```

**ポーリング実装:** `client_service.py:245-313`

```python
async def _poll_task_requests_until_ready(
    self,
    ...
    timeout_sec: float,
    poll_interval: float = 2.0,
) -> dict[str, Any]:
    start_time = time.time()
    while True:  # ← 無限ループ
        elapsed = time.time() - start_time
        if elapsed > timeout_sec:
            return {"state": "PENDING", ...}
        ...
        await asyncio.sleep(poll_interval)  # ← ここでブロック
```

#### 問題箇所2: `POST /analyze`

**ファイル:** `backend/app/presentation/api/routes/rpa/smartread_router.py:201-226`

```python
@router.post("/analyze", response_model=SmartReadAnalyzeResponse)
async def analyze_file(...):
    result = await service.analyze_file(config_id, file_content, filename)
    # ← ここで最大120秒ブロック（export無し）
```

**内部処理:** `backend/app/infrastructure/smartread/client.py:156-215`

- exportステップを**完全にスキップ**
- `/request/{requestId}/results` を直接取得
- PADスクリプトのフローと不一致

### 3.2 フロントエンドのAPI呼び出し状況

**調査ファイル:** `frontend/src/features/rpa/smartread/api.ts`

#### 使用されているエンドポイント

| エンドポイント | 用途 | タイムアウト設定 |
|--------------|------|----------------|
| `POST /analyze-simple` | ファイルアップロード | デフォルト（30秒）|
| `POST /tasks/{id}/sync` | タスク同期 | **5分（300秒）** |
| `POST /tasks/{id}/export` | Export作成 | デフォルト |
| `GET /tasks/{id}/export/{exportId}` | Export状態確認 | デフォルト（ポーリング） |
| `GET /tasks/{id}/export/{exportId}/csv` | CSVデータ取得 | デフォルト |

**フロントエンド api.ts:371-373 (syncTaskResults)**
```typescript
export async function syncTaskResults(
  configId: number,
  taskId: string,
  force: boolean = false
): Promise<SmartReadCsvDataResponse> {
  return http
    .post(`rpa/smartread/tasks/${taskId}/sync`, {
      searchParams: { config_id: String(configId), force: String(force) },
      timeout: 300000, // ← 5分のタイムアウト
    })
    .json<SmartReadCsvDataResponse>();
}
```

#### コンポーネント使用マップ

```
SmartReadPage.tsx
├── useSmartReadConfigs() → /configs
├── useWatchDirFiles() → /configs/{id}/files
└── useProcessFilesAuto() → /configs/{id}/process (バックグラウンド・安全)

SmartReadUploadPanel.tsx
└── useAnalyzeFile() → /analyze-simple (バックグラウンド・安全)

SmartReadResultView.tsx ← 問題あり
└── useSyncTaskResults() → /tasks/{id}/sync (300秒ブロック)

SmartReadManagedTaskList.tsx
├── useManagedTasks() → /managed-tasks
└── useUpdateSkipToday() → /tasks/{id}/skip-today
```

### 3.3 simple_sync_service.py の実装

**ファイル:** `backend/app/application/services/smartread/simple_sync_service.py`

PADスクリプトに最も近い実装だが、タイムアウトが長い:

| メソッド | タイムアウト |
|---------|-----------|
| `_poll_request_until_done` | 600秒（10分） |
| `_poll_task_until_completed` | 600秒（10分） |
| `_poll_export_until_completed` | 300-600秒 |

**この実装は `/analyze-simple` からバックグラウンドタスクとして呼ばれるため、APIハンドラのブロッキング問題は発生しない。**

### 3.4 PADスクリプトとサーバ実装の比較

| 処理ステップ | PADスクリプト | サーバ実装 |
|------------|--------------|-----------|
| 1. タスク作成 | `create_task()` | `client.create_task()` |
| 2. ファイルアップロード | `upload_request()` | `client.upload_file()` |
| 3. リクエスト完了待ち | `poll_request_until_done()` | `_poll_task_requests_until_ready()` |
| 4. タスク完了待ち | `poll_task_until_completed()` | （リクエスト完了で代用） |
| 5. Export開始 | `start_export()` | `client.create_export()` |
| 6. Export完了待ち | `poll_export_until_completed()` | `client.poll_export_until_ready()` |
| 7. ZIPダウンロード | `download_export_zip()` | `client.download_export()` |
| 8. CSV後処理 | `process_csv_files_vertical_merge()` | `csv_transformer.transform_to_long()` |

## 4. 問題の影響

### 4.1 Nginx/LBタイムアウト

一般的な設定:
- Nginx: `proxy_read_timeout 60s`
- AWS ALB: `idle_timeout 60s`

`/tasks/{id}/sync` の最大300秒ブロッキングは、これらのタイムアウトを大幅に超過する。

**結果:**
1. クライアントにタイムアウトエラーが返る
2. バックエンドは処理を継続（ゾンビ処理）
3. クライアントが再試行 → 二重タスク作成

### 4.2 ワーカー占有

FastAPIはデフォルトでスレッドプール（またはasyncio）で動作。
1つのリクエストが300秒ブロックすると、その間ワーカーが占有される。

### 4.3 ログによる追跡困難

本番環境でのみSmartRead APIが動作するため:
- テスト環境では「exportを叩いた証拠」を出せない
- 問題発生時の原因特定が困難

## 5. 現状の安全なパス

以下のエンドポイントはバックグラウンド処理を使用しており、安全:

| エンドポイント | 実装 |
|--------------|------|
| `POST /analyze-simple` | `background_tasks.add_task()` で非同期実行 |
| `POST /configs/{id}/process` | `background_tasks.add_task()` で非同期実行 |

これらは即座に202レスポンスを返し、バックグラウンドで処理を実行する。

## 6. 結論

1. **`POST /tasks/{id}/sync` はAPIハンドラ内で最大300秒のブロッキングポーリングを実行しており、本番環境では確実にタイムアウトを起こす**

2. **`POST /analyze` はexportステップをスキップしており、PAD互換フローと不一致**

3. **フロントエンドの `SmartReadResultView.tsx` が危険な `/tasks/{id}/sync` を直接呼び出している**

4. **安全なパス（`/analyze-simple`, `/configs/{id}/process`）は存在するが、結果の取得・確認フローが未整備**

## 7. 関連ファイル

### バックエンド
- `backend/app/presentation/api/routes/rpa/smartread_router.py` - APIルーター
- `backend/app/application/services/smartread/client_service.py` - 危険なポーリング実装
- `backend/app/application/services/smartread/simple_sync_service.py` - PAD互換実装（バックグラウンド用）
- `backend/app/infrastructure/smartread/client.py` - SmartRead APIクライアント

### フロントエンド
- `frontend/src/features/rpa/smartread/api.ts` - API呼び出し定義
- `frontend/src/features/rpa/smartread/hooks/sync-hooks.ts` - 同期フック
- `frontend/src/features/rpa/smartread/components/SmartReadResultView.tsx` - 結果表示（sync呼び出し）
