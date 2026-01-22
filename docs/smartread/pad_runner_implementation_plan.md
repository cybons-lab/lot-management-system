# SmartRead PAD互換ランナー 実装計画

## 作成日: 2026-01-22

## 1. 目的

PAD互換スクリプトの手順（task → request → poll → export → download → CSV後処理）を、サーバ側で「一本道」として確実に実行し、以下を実現する:

1. **exportが確実に叩かれる**ことを保証
2. **本番でしかAPIが動かない制約**のもとでも工程を追跡可能に
3. **別コードパスに逃げる**ことを防止

## 2. 設計方針

### 2.1 非同期化プラン（PENDING返す）との違い

| 観点 | 非同期化プラン | PAD互換ランナー（本計画） |
|-----|--------------|------------------------|
| 目的 | ワーカー占有/タイムアウト回避 | PAD手順の再現性を上げる |
| exportの扱い | 別ジョブや別画面に分離されがち | フロー内に必ず含める |
| 本番でしか叩けない問題 | 進捗把握にログ依存 | **DB工程で確実に追跡** |
| 別コードへ逃げる問題 | 起きやすい（抽象化） | 起きにくい（一本道） |

### 2.2 コア設計

```
[フロントエンド]
     │
     │ POST /rpa/smartread/pad-runs
     ▼
[FastAPI Router]
     │
     │ 即座に run_id を返す（202 Accepted）
     │ バックグラウンドタスク開始
     ▼
[SmartReadPadRunnerService]  ← 新規作成
     │
     │ PADスクリプトと同じ順序で実行
     │ 各工程でDB更新（証跡）
     │
     ├─ 1. create_task        → step = TASK_CREATED
     ├─ 2. upload_request     → step = UPLOADED
     ├─ 3. poll_request       → step = REQUEST_DONE
     ├─ 4. poll_task          → step = TASK_DONE
     ├─ 5. start_export       → step = EXPORT_STARTED  ★重要
     ├─ 6. poll_export        → step = EXPORT_DONE
     ├─ 7. download_zip       → step = DOWNLOADED
     └─ 8. csv_postprocess    → step = POSTPROCESSED
     │
     ▼
[SmartReadPadRun（DB）]
     │
     │ GET /rpa/smartread/pad-runs/{run_id}
     ▼
[フロントエンド]
     ポーリングで進捗確認
```

## 3. 実装内容

### 3.1 DBモデル: SmartReadPadRun

**ファイル:** `backend/app/infrastructure/persistence/models/smartread_models.py`

```python
class SmartReadPadRun(Base):
    """PAD互換フローの実行記録（工程追跡用）."""

    __tablename__ = "smartread_pad_runs"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String(36), unique=True, nullable=False, index=True)  # UUID
    config_id = Column(Integer, ForeignKey("smartread_configs.id"), nullable=False)

    # 状態管理
    status = Column(
        Enum("RUNNING", "SUCCEEDED", "FAILED", name="pad_run_status"),
        default="RUNNING",
        nullable=False,
    )
    step = Column(
        Enum(
            "CREATED",
            "TASK_CREATED",
            "UPLOADED",
            "REQUEST_DONE",
            "TASK_DONE",
            "EXPORT_STARTED",
            "EXPORT_DONE",
            "DOWNLOADED",
            "POSTPROCESSED",
            name="pad_run_step",
        ),
        default="CREATED",
        nullable=False,
    )

    # SmartRead API のID
    task_id = Column(String(64), nullable=True)
    export_id = Column(String(64), nullable=True)

    # 入力情報
    filenames = Column(JSON, nullable=True)  # 処理対象ファイル名リスト

    # 結果
    wide_data_count = Column(Integer, default=0)
    long_data_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)

    # タイムスタンプ
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    completed_at = Column(DateTime, nullable=True)
```

### 3.2 サービス: SmartReadPadRunnerService

**ファイル:** `backend/app/application/services/smartread/pad_runner_service.py`

```python
class SmartReadPadRunnerService:
    """PAD互換フローのオーケストレータ."""

    def __init__(self, session: Session):
        self.session = session
        self.logger = logging.getLogger(__name__)

    async def start_run(
        self,
        config_id: int,
        filenames: list[str] | None = None,
        file_content: bytes | None = None,
        single_filename: str | None = None,
    ) -> str:
        """PAD互換フローを開始し、run_id を返す."""
        run_id = str(uuid.uuid4())

        # DBに記録
        run = SmartReadPadRun(
            run_id=run_id,
            config_id=config_id,
            status="RUNNING",
            step="CREATED",
            filenames=filenames or ([single_filename] if single_filename else []),
        )
        self.session.add(run)
        self.session.commit()

        return run_id

    async def execute_run(self, run_id: str) -> None:
        """PAD互換フローを実行（バックグラウンドで呼ばれる）."""
        run = self._get_run(run_id)
        if not run:
            return

        config = self._get_config(run.config_id)
        if not config:
            self._fail_run(run, "設定が見つかりません")
            return

        try:
            session = self._create_api_session(config.api_key)

            # 1. タスク作成
            self._update_step(run, "TASK_CREATED")
            task_id = self._create_task(session, config)
            run.task_id = task_id
            self.session.commit()

            # 2. ファイルアップロード
            self._update_step(run, "UPLOADED")
            request_ids = self._upload_files(session, config, task_id, run.filenames)

            # 3. リクエスト完了待ち
            self._update_step(run, "REQUEST_DONE")
            self._poll_requests_until_done(session, config, request_ids)

            # 4. タスク完了待ち
            self._update_step(run, "TASK_DONE")
            self._poll_task_until_completed(session, config, task_id)

            # 5. Export開始 ★PADスクリプトと同じ
            self._update_step(run, "EXPORT_STARTED")
            export_id = self._start_export(session, config, task_id)
            run.export_id = export_id
            self.session.commit()
            self.logger.info(f"[PAD Run {run_id}] Export started: {export_id}")

            # 6. Export完了待ち
            self._update_step(run, "EXPORT_DONE")
            self._poll_export_until_completed(session, config, task_id, export_id)

            # 7. ZIPダウンロード
            self._update_step(run, "DOWNLOADED")
            zip_content = self._download_export_zip(session, config, task_id, export_id)

            # 8. CSV後処理（縦持ち変換）
            self._update_step(run, "POSTPROCESSED")
            wide_data, long_data = self._process_csv(zip_content, config)

            # 結果をDBに保存
            self._save_results(run, wide_data, long_data)

            # 成功
            run.status = "SUCCEEDED"
            run.completed_at = datetime.now()
            self.session.commit()

        except Exception as e:
            self.logger.exception(f"[PAD Run {run_id}] Failed: {e}")
            self._fail_run(run, str(e))

    def get_run_status(self, run_id: str) -> dict | None:
        """実行状態を取得."""
        run = self._get_run(run_id)
        if not run:
            return None

        return {
            "run_id": run.run_id,
            "status": run.status,
            "step": run.step,
            "task_id": run.task_id,
            "export_id": run.export_id,
            "wide_data_count": run.wide_data_count,
            "long_data_count": run.long_data_count,
            "error_message": run.error_message,
            "created_at": run.created_at.isoformat(),
            "updated_at": run.updated_at.isoformat(),
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        }
```

### 3.3 APIエンドポイント

**ファイル:** `backend/app/presentation/api/routes/rpa/smartread_router.py`

```python
# --- PAD互換ランナー ---

@router.post("/pad-runs", status_code=status.HTTP_202_ACCEPTED)
async def start_pad_run(
    background_tasks: BackgroundTasks,
    config_id: int = Query(..., description="設定ID"),
    filenames: list[str] | None = Query(default=None, description="処理対象ファイル"),
    uow: UnitOfWork = Depends(get_uow),
    _current_user: User = Depends(get_current_user),
) -> dict:
    """PAD互換フローを開始.

    即座にrun_idを返し、バックグラウンドで処理を実行。
    進捗は GET /pad-runs/{run_id} で確認可能。
    """
    service = SmartReadPadRunnerService(uow.session)
    run_id = await service.start_run(config_id, filenames=filenames)
    uow.session.commit()

    # バックグラウンドで実行
    background_tasks.add_task(_execute_pad_run_background, run_id)

    return {
        "run_id": run_id,
        "status": "RUNNING",
        "message": "PAD互換フローを開始しました",
    }


@router.get("/pad-runs/{run_id}")
async def get_pad_run_status(
    run_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> dict:
    """PAD互換フローの進捗を取得."""
    service = SmartReadPadRunnerService(db)
    result = service.get_run_status(run_id)

    if not result:
        raise HTTPException(status_code=404, detail="実行が見つかりません")

    return result


@router.get("/pad-runs")
async def list_pad_runs(
    config_id: int = Query(..., description="設定ID"),
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> list[dict]:
    """PAD互換フローの実行履歴を取得."""
    runs = (
        db.query(SmartReadPadRun)
        .filter(SmartReadPadRun.config_id == config_id)
        .order_by(SmartReadPadRun.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "run_id": r.run_id,
            "status": r.status,
            "step": r.step,
            "filenames": r.filenames,
            "created_at": r.created_at.isoformat(),
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        }
        for r in runs
    ]


async def _execute_pad_run_background(run_id: str) -> None:
    """バックグラウンドでPAD互換フローを実行."""
    from app.core.database import SessionLocal

    with SessionLocal() as session:
        service = SmartReadPadRunnerService(session)
        await service.execute_run(run_id)
```

### 3.4 フロントエンド更新

**ファイル:** `frontend/src/features/rpa/smartread/api.ts`

```typescript
// PAD互換ランナーAPI
export async function startPadRun(
  configId: number,
  filenames?: string[]
): Promise<{ run_id: string; status: string; message: string }> {
  const searchParams: Record<string, string> = { config_id: String(configId) };
  if (filenames) {
    searchParams.filenames = filenames.join(",");
  }

  return http
    .post("rpa/smartread/pad-runs", { searchParams })
    .json<{ run_id: string; status: string; message: string }>();
}

export async function getPadRunStatus(runId: string): Promise<PadRunStatus> {
  return http.get(`rpa/smartread/pad-runs/${runId}`).json<PadRunStatus>();
}

export interface PadRunStatus {
  run_id: string;
  status: "RUNNING" | "SUCCEEDED" | "FAILED";
  step: string;
  task_id: string | null;
  export_id: string | null;
  wide_data_count: number;
  long_data_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}
```

**フック:** `frontend/src/features/rpa/smartread/hooks/pad-run-hooks.ts`

```typescript
export function usePadRunStatus(runId: string | null) {
  return useQuery({
    queryKey: SMARTREAD_QUERY_KEYS.padRun(runId),
    queryFn: () => (runId ? getPadRunStatus(runId) : null),
    enabled: !!runId,
    refetchInterval: (query) => {
      // RUNNING中は5秒ごとにポーリング
      const data = query.state.data;
      if (data?.status === "RUNNING") {
        return 5000;
      }
      return false;
    },
  });
}

export function useStartPadRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ configId, filenames }: { configId: number; filenames?: string[] }) =>
      startPadRun(configId, filenames),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.padRuns() });
    },
  });
}
```

## 4. 既存エンドポイントの扱い

### 4.1 廃止候補

| エンドポイント | 理由 | 対応 |
|--------------|------|-----|
| `POST /tasks/{id}/sync` | ハンドラ内300秒ブロック | PAD Run に置き換え |
| `POST /analyze` | export無し、120秒ブロック | 削除 or 警告付きで残す |

### 4.2 維持するエンドポイント

| エンドポイント | 理由 |
|--------------|------|
| `POST /analyze-simple` | バックグラウンド処理、安全 |
| `POST /configs/{id}/process` | バックグラウンド処理、安全 |
| `GET /tasks/{id}/export/{exportId}` | ステータス確認のみ、ブロックなし |
| `GET /tasks/{id}/export/{exportId}/csv` | データ取得のみ、ブロックなし |

### 4.3 移行ガイド

1. フロントエンドの `SmartReadResultView.tsx` を更新
   - `useSyncTaskResults()` → `usePadRunStatus()` + `useStartPadRun()`

2. 進捗表示UIの追加
   - ステップ表示（TASK_CREATED → ... → POSTPROCESSED）
   - エラー時のメッセージ表示

## 5. テスト戦略

### 5.1 FakeSmartReadClient

本番APIなしで「exportが叩かれた」を断定するため、Fakeクライアントを使用:

```python
class FakeSmartReadClient:
    """テスト用のSmartReadクライアント."""

    def __init__(self):
        self.call_history: list[tuple[str, dict]] = []

    def create_task(self, **kwargs) -> str:
        self.call_history.append(("create_task", kwargs))
        return "fake-task-id"

    def start_export(self, task_id: str, **kwargs) -> str:
        self.call_history.append(("start_export", {"task_id": task_id, **kwargs}))
        return "fake-export-id"

    # ... 他のメソッド

    def assert_export_called(self) -> None:
        """exportが呼ばれたことを検証."""
        export_calls = [c for c in self.call_history if c[0] == "start_export"]
        assert len(export_calls) > 0, "start_export was not called"
```

### 5.2 テストケース

```python
async def test_pad_runner_calls_export():
    """PADランナーがexportを叩くことを検証."""
    fake_client = FakeSmartReadClient()
    runner = SmartReadPadRunnerService(session, client=fake_client)

    run_id = await runner.start_run(config_id=1, filenames=["test.pdf"])
    await runner.execute_run(run_id)

    # exportが呼ばれたことを検証
    fake_client.assert_export_called()

    # ステップがPOSTPROCESSEDまで進んだことを検証
    status = runner.get_run_status(run_id)
    assert status["status"] == "SUCCEEDED"
    assert status["step"] == "POSTPROCESSED"
```

### 5.3 Fixture ZIP

成功したZIPを保存し、CSV後処理までテスト:

```
backend/tests/fixtures/smartread/
├── sample_export.zip  # 個人情報なしのサンプル
└── expected_output.json  # 期待される縦持ちデータ
```

## 6. 実装順序

### Phase 1: DBモデル・基盤（1日目）

1. `SmartReadPadRun` モデル追加
2. Alembicマイグレーション作成
3. 基本的なCRUD

### Phase 2: ランナーサービス（2-3日目）

1. `SmartReadPadRunnerService` 実装
2. 既存の `simple_sync_service.py` からロジック移植
3. ステップ更新の実装

### Phase 3: APIエンドポイント（4日目）

1. `/pad-runs` エンドポイント追加
2. バックグラウンドタスク連携
3. スキーマ定義

### Phase 4: フロントエンド（5-6日目）

1. API関数追加
2. フック追加
3. `SmartReadResultView` の更新
4. 進捗表示UI

### Phase 5: テスト・移行（7日目）

1. FakeClient実装
2. ユニットテスト
3. 既存エンドポイントの廃止検討

## 7. 成功基準

1. **PAD互換フローが一本道で実行される**
   - exportステップが必ず実行される
   - DBに工程が記録される

2. **APIハンドラのブロッキングがない**
   - 即座に202レスポンス
   - バックグラウンドで処理

3. **進捗が追跡可能**
   - フロントエンドからポーリングで確認可能
   - エラー時も原因が分かる

4. **テストで検証可能**
   - FakeClientでexport呼び出しを検証
   - CI/CDで自動テスト

## 8. 注意事項

- 既存の `/analyze-simple` と `/configs/{id}/process` は維持（壊さない）
- フロントエンドの移行は段階的に（既存UIを壊さない）
- 本番デプロイ前に工程追跡の動作確認を徹底

## 9. 参考: PADスクリプトの該当箇所

```python
# PADスクリプト main() より抜粋

# Export 実行 → 監視 → ダウンロード
try:
    export_id = start_export(session, endpoint, task_id, exportType, aggregationType)  # ★ここ
    exp_status = poll_export_until_completed(session, endpoint, task_id, export_id, timeout_sec=600)
    if exp_status.get("state") != "COMPLETED":
        print("Export処理でエラーが発生しました。", file=sys.stderr)
        return 1
    zip_path = exportDir / f"{task_name}.zip"
    download_export_zip(session, endpoint, task_id, export_id, zip_path)
except Exception as e:
    print(f"Export/ダウンロードでエラー: {e}", file=sys.stderr)
    return 1
```

この `start_export()` が確実に呼ばれることが、本実装計画の最重要ポイント。
