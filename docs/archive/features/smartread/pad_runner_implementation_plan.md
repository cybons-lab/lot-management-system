# SmartRead PAD互換ランナー 実装計画

## 作成日: 2026-01-22
## 更新日: 2026-01-22（レビュー反映）

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
     │ POST /rpa/smartread/pad-runs (JSON body)
     ▼
[FastAPI Router]
     │
     │ 即座に run_id を返す（202 Accepted）
     │ バックグラウンドタスク開始
     ▼
[SmartReadPadRunnerService]  ← 新規作成
     │
     │ PADスクリプトと同じ順序で実行
     │ 各工程でDB更新（証跡 + heartbeat）
     │
     ├─ 1. create_task        → step = TASK_CREATED
     ├─ 2. upload_request     → step = UPLOADED
     ├─ 3. poll_request       → step = REQUEST_DONE
     ├─ 4. poll_task          → step = TASK_DONE
     ├─ 5. start_export       → step = EXPORT_STARTED  ★必須ゲート
     ├─ 6. poll_export        → step = EXPORT_DONE
     ├─ 7. download_zip       → step = DOWNLOADED
     └─ 8. csv_postprocess    → step = POSTPROCESSED
     │
     ▼
[SmartReadPadRun（DB）]
     │
     │ GET /rpa/smartread/pad-runs/{run_id}
     │ （heartbeat監視 + stale検出）
     ▼
[フロントエンド]
     ポーリングで進捗確認
```

### 2.3 レビュー指摘への対応（7点）

| 指摘 | 対応 |
|-----|-----|
| BackgroundTasks がプロセス再起動で消える | `heartbeat_at` フィールド追加、stale検出ロジック |
| async内でsync I/Oがイベントループを塞ぐ | `execute_run` を同期関数化 + threadingで直接実行 |
| filenames を Query CSV で渡すと壊れる | POST body (JSON) で `{ filenames: [...] }` を受ける |
| export保証はテストだけでなく実装でも担保 | `EXPORT_STARTED` を通過しないと成功にしないゲート |
| **BackgroundTasks + threading の二重化** | **threadingのみに統一**（BackgroundTasks不使用） |
| **poll中にheartbeatが更新されない** | **ポーリングループ内で定期的に更新**（30秒ごと） |
| **filenames / file_content_ref の整合** | **filenames（監視フォルダ）のみに限定**（アップロードは別フロー） |

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
        Enum("RUNNING", "SUCCEEDED", "FAILED", "STALE", name="pad_run_status"),
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
            "EXPORT_STARTED",  # ★この工程を通過しないと成功にならない
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
    # ★ filenames のみ（監視フォルダ内のファイル名）
    # ブラウザからの直接アップロードは /analyze-simple を使用（既存フロー維持）
    filenames = Column(JSON, nullable=True)  # 処理対象ファイル名リスト（監視フォルダ内）

    # 結果
    wide_data_count = Column(Integer, default=0)
    long_data_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)

    # タイムスタンプ
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    heartbeat_at = Column(DateTime, default=func.now(), nullable=False)  # ★追加: BG生存確認用
    completed_at = Column(DateTime, nullable=True)

    # リトライ
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
```

**ポイント:**
- `heartbeat_at`: バックグラウンドタスクが生きている証拠。定期的に更新される
- `STALE` status: heartbeat が一定時間更新されない場合に遷移
- `retry_count`: 失敗時のリトライ管理
- `filenames`: 監視フォルダ内のファイル名のみ（直接アップロード非対応）

### 3.1.1 入力設計の方針

| ユースケース | API | 入力 |
|------------|-----|-----|
| 監視フォルダのファイルを処理 | `POST /pad-runs` | `filenames`（フォルダ内のファイル名） |
| ブラウザから直接アップロード | `POST /analyze-simple` | `file`（multipart/form-data） |

**理由:**
- PAD互換ランナーは「監視フォルダ→SmartRead→DB」の自動化フローを再現する目的
- ブラウザからの直接アップロードは既存の `/analyze-simple` が安全に動作するので維持
- 責任を分離することで、それぞれのフローをシンプルに保つ

### 3.2 サービス: SmartReadPadRunnerService

**ファイル:** `backend/app/application/services/smartread/pad_runner_service.py`

```python
import logging
import time
import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.smartread_models import (
    SmartReadConfig,
    SmartReadPadRun,
)

# Stale判定の閾値（この時間heartbeatが更新されなければSTALE）
HEARTBEAT_STALE_THRESHOLD_SECONDS = 120
# ポーリング中のheartbeat更新間隔
HEARTBEAT_UPDATE_INTERVAL_SECONDS = 30


class SmartReadPadRunnerService:
    """PAD互換フローのオーケストレータ.

    重要: execute_run は同期関数。HTTP I/O や ZIP処理など重い処理を含むため、
    イベントループをブロックしないよう run_sync() でスレッド実行すること。
    """

    def __init__(self, session: Session, client=None):
        self.session = session
        self.client = client  # テスト時にFakeClientを注入可能
        self.logger = logging.getLogger(__name__)

    def start_run(
        self,
        config_id: int,
        filenames: list[str],  # ★ 必須（監視フォルダ内のファイル名）
    ) -> str:
        """PAD互換フローを開始し、run_id を返す（同期）.

        Args:
            config_id: SmartRead設定ID
            filenames: 監視フォルダ内のファイル名リスト

        Note:
            ブラウザからの直接アップロードは /analyze-simple を使用。
            このAPIは監視フォルダ内のファイルを指定して実行する用途。
        """
        run_id = str(uuid.uuid4())

        # DBに記録
        run = SmartReadPadRun(
            run_id=run_id,
            config_id=config_id,
            status="RUNNING",
            step="CREATED",
            filenames=filenames,
            heartbeat_at=datetime.now(),
        )
        self.session.add(run)
        self.session.commit()

        return run_id

    def execute_run(self, run_id: str) -> None:
        """PAD互換フローを実行（同期関数・スレッドで実行すること）.

        重要: この関数は同期I/O（requests, ZIP処理）を含むため、
        asyncio.to_thread() や run_in_executor() で呼び出すこと。
        """
        run = self._get_run(run_id)
        if not run:
            return

        config = self._get_config(run.config_id)
        if not config:
            self._fail_run(run, "設定が見つかりません")
            return

        try:
            # requests.Session を使用（同期HTTP）
            api_session = self._create_api_session(config.api_key)

            # 1. タスク作成
            self._update_step(run, "TASK_CREATED")
            task_id = self._create_task(api_session, config)
            run.task_id = task_id
            self._update_heartbeat(run)

            # 2. ファイルアップロード
            self._update_step(run, "UPLOADED")
            request_ids = self._upload_files(api_session, config, task_id, run)
            self._update_heartbeat(run)

            # 3. リクエスト完了待ち
            # ★ ポーリング中もHEARTBEAT_UPDATE_INTERVAL_SECONDSごとにheartbeat更新
            self._update_step(run, "REQUEST_DONE")
            self._poll_requests_until_done(api_session, config, request_ids, run)

            # 4. タスク完了待ち
            # ★ ポーリング中もHEARTBEAT_UPDATE_INTERVAL_SECONDSごとにheartbeat更新
            self._update_step(run, "TASK_DONE")
            self._poll_task_until_completed(api_session, config, task_id, run)

            # 5. Export開始 ★PADスクリプトと同じ・必須ゲート
            self._update_step(run, "EXPORT_STARTED")
            export_id = self._start_export(api_session, config, task_id)
            run.export_id = export_id
            self.session.commit()
            self.logger.info(f"[PAD Run {run_id}] Export started: {export_id}")
            self._update_heartbeat(run)

            # 6. Export完了待ち
            self._update_step(run, "EXPORT_DONE")
            self._poll_export_until_completed(api_session, config, task_id, export_id, run)
            self._update_heartbeat(run)

            # 7. ZIPダウンロード
            self._update_step(run, "DOWNLOADED")
            zip_content = self._download_export_zip(api_session, config, task_id, export_id)
            self._update_heartbeat(run)

            # 8. CSV後処理（縦持ち変換）
            self._update_step(run, "POSTPROCESSED")
            wide_data, long_data = self._process_csv(zip_content, config)
            self._update_heartbeat(run)

            # 結果をDBに保存
            self._save_results(run, wide_data, long_data)

            # ★★★ 成功判定: EXPORT_STARTEDを通過していることを確認 ★★★
            if not run.export_id:
                raise RuntimeError("Export工程を通過していません（export_idが未設定）")

            # 成功
            run.status = "SUCCEEDED"
            run.completed_at = datetime.now()
            self.session.commit()
            self.logger.info(f"[PAD Run {run_id}] Completed successfully")

        except Exception as e:
            self.logger.exception(f"[PAD Run {run_id}] Failed: {e}")
            self._fail_run(run, str(e))

    def get_run_status(self, run_id: str) -> dict[str, Any] | None:
        """実行状態を取得（stale検出含む）."""
        run = self._get_run(run_id)
        if not run:
            return None

        # ★ Stale検出: RUNNINGで一定時間heartbeatが更新されていない場合
        if run.status == "RUNNING":
            threshold = datetime.now() - timedelta(seconds=HEARTBEAT_STALE_THRESHOLD_SECONDS)
            if run.heartbeat_at < threshold:
                run.status = "STALE"
                run.error_message = (
                    f"バックグラウンド処理が応答なし（{HEARTBEAT_STALE_THRESHOLD_SECONDS}秒以上）"
                )
                self.session.commit()
                self.logger.warning(f"[PAD Run {run_id}] Marked as STALE")

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
            "heartbeat_at": run.heartbeat_at.isoformat(),
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "can_retry": run.status in ("FAILED", "STALE") and run.retry_count < run.max_retries,
        }

    def retry_run(self, run_id: str) -> str | None:
        """失敗/Staleの実行をリトライ（新しいrun_idを返す）."""
        run = self._get_run(run_id)
        if not run:
            return None

        if run.status not in ("FAILED", "STALE"):
            return None

        if run.retry_count >= run.max_retries:
            return None

        # 元のrunのリトライカウントを増やす
        run.retry_count += 1
        self.session.commit()

        # 新しいrunを作成（同じ入力で）
        new_run_id = self.start_run(
            config_id=run.config_id,
            filenames=run.filenames,
        )

        self.logger.info(f"[PAD Run {run_id}] Retrying as {new_run_id}")
        return new_run_id

    # --- Private methods ---

    def _get_run(self, run_id: str) -> SmartReadPadRun | None:
        return self.session.query(SmartReadPadRun).filter_by(run_id=run_id).first()

    def _get_config(self, config_id: int) -> SmartReadConfig | None:
        return self.session.query(SmartReadConfig).filter_by(id=config_id).first()

    def _update_step(self, run: SmartReadPadRun, step: str) -> None:
        run.step = step
        run.updated_at = datetime.now()
        self.session.commit()
        self.logger.info(f"[PAD Run {run.run_id}] Step: {step}")

    def _update_heartbeat(self, run: SmartReadPadRun) -> None:
        run.heartbeat_at = datetime.now()
        self.session.commit()

    def _fail_run(self, run: SmartReadPadRun, error_message: str) -> None:
        run.status = "FAILED"
        run.error_message = error_message
        run.completed_at = datetime.now()
        self.session.commit()

    def _create_api_session(self, api_key: str):
        """requests.Session を作成（SmartRead API用）."""
        import requests

        session = requests.Session()
        session.headers.update({
            "Authorization": f"apikey {api_key}",
            "User-Agent": "LotManagementSystem-PADRunner/1.0",
        })
        return session

    def _poll_with_heartbeat(
        self,
        run: SmartReadPadRun,
        poll_fn: callable,
        timeout_sec: float = 600,
        poll_interval: float = 2.0,
    ) -> Any:
        """ポーリング中もheartbeatを更新するラッパー.

        Args:
            run: 実行中のPadRun（heartbeat更新用）
            poll_fn: 1回のポーリングを行う関数（Trueを返したら完了）
            timeout_sec: タイムアウト（秒）
            poll_interval: ポーリング間隔（秒）

        ★ポイント:
            HEARTBEAT_UPDATE_INTERVAL_SECONDS ごとにheartbeatを更新するので、
            長いOCR処理中でもSTALE判定されない。
        """
        start_time = time.time()
        last_heartbeat = time.time()

        while True:
            elapsed = time.time() - start_time
            if elapsed > timeout_sec:
                raise TimeoutError(f"Polling timeout after {timeout_sec}s")

            # ★ 定期的にheartbeat更新
            if time.time() - last_heartbeat > HEARTBEAT_UPDATE_INTERVAL_SECONDS:
                self._update_heartbeat(run)
                last_heartbeat = time.time()

            # ポーリング実行
            result = poll_fn()
            if result is not None:
                return result

            time.sleep(poll_interval)

    # 以下、PADスクリプトからの移植メソッド
    # _create_task, _upload_files, _poll_requests_until_done,
    # _poll_task_until_completed, _start_export, _poll_export_until_completed,
    # _download_export_zip, _process_csv, _save_results
    # → simple_sync_service.py から移植
    #
    # ★ ポーリング系は _poll_with_heartbeat() を使って実装すること
```

### 3.3 APIエンドポイント

**ファイル:** `backend/app/presentation/api/routes/rpa/smartread_router.py`

```python
import threading
from pydantic import BaseModel


# --- スキーマ ---

class PadRunStartRequest(BaseModel):
    """PAD Run 開始リクエスト."""
    filenames: list[str]  # ★ 必須（監視フォルダ内のファイル名）


class PadRunResponse(BaseModel):
    """PAD Run レスポンス."""
    run_id: str
    status: str
    step: str
    task_id: str | None = None
    export_id: str | None = None
    wide_data_count: int = 0
    long_data_count: int = 0
    error_message: str | None = None
    created_at: str
    updated_at: str
    heartbeat_at: str
    completed_at: str | None = None
    can_retry: bool = False


# --- PAD互換ランナー ---

@router.post("/pad-runs", status_code=status.HTTP_202_ACCEPTED)
def start_pad_run(
    request: PadRunStartRequest,  # ★ body で受け取る（Query CSV 廃止）
    config_id: int = Query(..., description="設定ID"),
    uow: UnitOfWork = Depends(get_uow),
    _current_user: User = Depends(get_current_user),
) -> dict:
    """PAD互換フローを開始.

    即座にrun_idを返し、バックグラウンドで処理を実行。
    進捗は GET /pad-runs/{run_id} で確認可能。

    Note:
        ★ BackgroundTasks は使わず threading で直接起動。
        責任を一本化し、デバッグしやすくする。
    """
    service = SmartReadPadRunnerService(uow.session)
    run_id = service.start_run(config_id, filenames=request.filenames)
    uow.session.commit()

    # ★ threading で直接起動（BackgroundTasks不使用）
    _start_pad_run_thread(run_id)

    return {
        "run_id": run_id,
        "status": "RUNNING",
        "message": "PAD互換フローを開始しました",
    }


@router.get("/pad-runs/{run_id}", response_model=PadRunResponse)
async def get_pad_run_status(
    run_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> PadRunResponse:
    """PAD互換フローの進捗を取得.

    RUNNING状態で一定時間heartbeatが更新されていない場合、
    自動的にSTALE状態に遷移します。
    """
    service = SmartReadPadRunnerService(db)
    result = service.get_run_status(run_id)

    if not result:
        raise HTTPException(status_code=404, detail="実行が見つかりません")

    return PadRunResponse(**result)


@router.post("/pad-runs/{run_id}/retry", status_code=status.HTTP_202_ACCEPTED)
def retry_pad_run(
    run_id: str,
    uow: UnitOfWork = Depends(get_uow),
    _current_user: User = Depends(get_current_user),
) -> dict:
    """失敗/Staleの実行をリトライ."""
    service = SmartReadPadRunnerService(uow.session)
    new_run_id = service.retry_run(run_id)

    if not new_run_id:
        raise HTTPException(
            status_code=400,
            detail="リトライできません（成功済み、またはリトライ上限）",
        )

    uow.session.commit()

    # ★ threading で直接起動
    _start_pad_run_thread(new_run_id)

    return {
        "run_id": new_run_id,
        "original_run_id": run_id,
        "status": "RUNNING",
        "message": "リトライを開始しました",
    }


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


def _start_pad_run_thread(run_id: str) -> None:
    """PAD互換フローをバックグラウンドスレッドで開始.

    ★ BackgroundTasks は使わない（責任の一本化）。
    threading.Thread で直接起動し、デバッグしやすくする。

    Note:
        daemon=True なのでプロセス終了時にスレッドも終了する。
        途中で止まった場合は heartbeat 監視で STALE 検出される。
    """
    from app.core.database import SessionLocal

    def _run():
        with SessionLocal() as session:
            service = SmartReadPadRunnerService(session)
            service.execute_run(run_id)

    thread = threading.Thread(target=_run, name=f"pad-run-{run_id}", daemon=True)
    thread.start()
```

### 3.4 フロントエンド更新

**ファイル:** `frontend/src/features/rpa/smartread/api.ts`

```typescript
// PAD互換ランナーAPI

export interface PadRunStartRequest {
  filenames: string[];  // ★ 必須（監視フォルダ内のファイル名）
}

export interface PadRunStatus {
  run_id: string;
  status: "RUNNING" | "SUCCEEDED" | "FAILED" | "STALE";
  step: string;
  task_id: string | null;
  export_id: string | null;
  wide_data_count: number;
  long_data_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  heartbeat_at: string;
  completed_at: string | null;
  can_retry: boolean;
}

export async function startPadRun(
  configId: number,
  filenames: string[]  // ★ 必須（監視フォルダ内のファイル名）
): Promise<{ run_id: string; status: string; message: string }> {
  // ★ body で JSON を送信（Query CSV 廃止）
  return http
    .post("rpa/smartread/pad-runs", {
      searchParams: { config_id: String(configId) },
      json: { filenames },
    })
    .json<{ run_id: string; status: string; message: string }>();
}

export async function getPadRunStatus(runId: string): Promise<PadRunStatus> {
  return http.get(`rpa/smartread/pad-runs/${runId}`).json<PadRunStatus>();
}

export async function retryPadRun(
  runId: string
): Promise<{ run_id: string; original_run_id: string; status: string; message: string }> {
  return http
    .post(`rpa/smartread/pad-runs/${runId}/retry`)
    .json<{ run_id: string; original_run_id: string; status: string; message: string }>();
}

export async function listPadRuns(
  configId: number,
  limit: number = 20
): Promise<PadRunStatus[]> {
  return http
    .get("rpa/smartread/pad-runs", {
      searchParams: { config_id: String(configId), limit: String(limit) },
    })
    .json<PadRunStatus[]>();
}
```

**フック:** `frontend/src/features/rpa/smartread/hooks/pad-run-hooks.ts`

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPadRunStatus,
  listPadRuns,
  retryPadRun,
  startPadRun,
  type PadRunStartRequest,
  type PadRunStatus,
} from "../api";
import { SMARTREAD_QUERY_KEYS } from "./query-keys";

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
    mutationFn: ({
      configId,
      filenames,  // ★ 必須
    }: {
      configId: number;
      filenames: string[];
    }) => startPadRun(configId, filenames),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.padRuns() });
    },
  });
}

export function useRetryPadRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (runId: string) => retryPadRun(runId),
    onSuccess: (_, runId) => {
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.padRun(runId) });
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.padRuns() });
    },
  });
}

export function usePadRunList(configId: number | null, limit: number = 20) {
  return useQuery({
    queryKey: SMARTREAD_QUERY_KEYS.padRuns(configId),
    queryFn: () => (configId ? listPadRuns(configId, limit) : []),
    enabled: !!configId,
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
   - STALE/FAILED時のリトライボタン
   - エラー時のメッセージ表示

## 5. テスト戦略

### 5.1 FakeSmartReadClient

本番APIなしで「exportが叩かれた」を断定するため、Fakeクライアントを使用:

```python
class FakeSmartReadClient:
    """テスト用のSmartReadクライアント."""

    def __init__(self):
        self.call_history: list[tuple[str, dict]] = []
        self._task_counter = 0
        self._export_counter = 0

    def create_task(self, **kwargs) -> str:
        self._task_counter += 1
        task_id = f"fake-task-{self._task_counter}"
        self.call_history.append(("create_task", {"task_id": task_id, **kwargs}))
        return task_id

    def upload_file(self, task_id: str, **kwargs) -> str:
        request_id = f"fake-request-{task_id}"
        self.call_history.append(("upload_file", {"task_id": task_id, **kwargs}))
        return request_id

    def start_export(self, task_id: str, **kwargs) -> str:
        self._export_counter += 1
        export_id = f"fake-export-{self._export_counter}"
        self.call_history.append(("start_export", {"task_id": task_id, "export_id": export_id, **kwargs}))
        return export_id

    def download_export(self, task_id: str, export_id: str) -> bytes:
        self.call_history.append(("download_export", {"task_id": task_id, "export_id": export_id}))
        # Fixture ZIPを返す
        return self._load_fixture_zip()

    # ... 他のメソッド

    def assert_export_called(self) -> None:
        """exportが呼ばれたことを検証."""
        export_calls = [c for c in self.call_history if c[0] == "start_export"]
        assert len(export_calls) > 0, "start_export was not called"

    def assert_call_order(self, expected_order: list[str]) -> None:
        """呼び出し順序を検証."""
        actual_order = [c[0] for c in self.call_history]
        assert actual_order == expected_order, f"Expected {expected_order}, got {actual_order}"
```

### 5.2 テストケース

```python
import pytest
from datetime import datetime, timedelta

from app.application.services.smartread.pad_runner_service import (
    SmartReadPadRunnerService,
    HEARTBEAT_STALE_THRESHOLD_SECONDS,
)


class TestPadRunnerService:
    """PADランナーサービスのテスト."""

    def test_execute_run_calls_export(self, db_session, fake_client):
        """PADランナーがexportを叩くことを検証."""
        runner = SmartReadPadRunnerService(db_session, client=fake_client)

        run_id = runner.start_run(config_id=1, filenames=["test.pdf"])
        runner.execute_run(run_id)

        # ★ exportが呼ばれたことを検証
        fake_client.assert_export_called()

        # ステップがPOSTPROCESSEDまで進んだことを検証
        status = runner.get_run_status(run_id)
        assert status["status"] == "SUCCEEDED"
        assert status["step"] == "POSTPROCESSED"
        assert status["export_id"] is not None  # export_idが設定されている

    def test_execute_run_call_order(self, db_session, fake_client):
        """PADスクリプトと同じ順序で呼ばれることを検証."""
        runner = SmartReadPadRunnerService(db_session, client=fake_client)

        run_id = runner.start_run(config_id=1, filenames=["test.pdf"])
        runner.execute_run(run_id)

        # PADスクリプトと同じ順序
        fake_client.assert_call_order([
            "create_task",
            "upload_file",
            "poll_request",
            "poll_task",
            "start_export",  # ★ 必須
            "poll_export",
            "download_export",
        ])

    def test_stale_detection(self, db_session):
        """Stale検出のテスト."""
        runner = SmartReadPadRunnerService(db_session)

        run_id = runner.start_run(config_id=1, filenames=["test.pdf"])

        # heartbeatを古い時刻に設定
        run = runner._get_run(run_id)
        run.heartbeat_at = datetime.now() - timedelta(seconds=HEARTBEAT_STALE_THRESHOLD_SECONDS + 10)
        db_session.commit()

        # get_run_statusを呼ぶとSTALEになる
        status = runner.get_run_status(run_id)
        assert status["status"] == "STALE"
        assert status["can_retry"] is True

    def test_retry_creates_new_run(self, db_session, fake_client):
        """リトライで新しいrunが作成されることを検証."""
        runner = SmartReadPadRunnerService(db_session, client=fake_client)

        # 失敗するrunを作成
        run_id = runner.start_run(config_id=1, filenames=["test.pdf"])
        run = runner._get_run(run_id)
        run.status = "FAILED"
        run.error_message = "テストエラー"
        db_session.commit()

        # リトライ
        new_run_id = runner.retry_run(run_id)

        assert new_run_id is not None
        assert new_run_id != run_id

        # 元のrunのretry_countが増えている
        original_run = runner._get_run(run_id)
        assert original_run.retry_count == 1

    def test_success_requires_export_started(self, db_session, fake_client):
        """成功にはEXPORT_STARTED通過が必須."""
        # export_idが設定されていない状態で成功にならないことを検証
        runner = SmartReadPadRunnerService(db_session, client=fake_client)

        run_id = runner.start_run(config_id=1, filenames=["test.pdf"])

        # execute_run内でexport_idが設定されないとエラーになる
        # （FakeClientが正しく動作していれば問題ないが、念のため検証）
        runner.execute_run(run_id)

        status = runner.get_run_status(run_id)
        # 成功していればexport_idは必ず設定されている
        if status["status"] == "SUCCEEDED":
            assert status["export_id"] is not None
```

### 5.3 Fixture ZIP

成功したZIPを保存し、CSV後処理までテスト:

```
backend/tests/fixtures/smartread/
├── sample_export.zip       # 個人情報なしのサンプル
├── expected_wide.json      # 期待される横持ちデータ
└── expected_long.json      # 期待される縦持ちデータ
```

## 6. 実装順序（推奨）

### Phase 0: 入口の固定（半日）★最優先

**目的:** UIが `/tasks/{id}/sync` を叩く導線を塞ぐ

1. `SmartReadResultView.tsx` の修正
   - `useSyncTaskResults()` の呼び出しをコメントアウト or 削除
   - 一時的に「同期」ボタンを非表示にする
2. これで「危険なパスを叩けなくする」が先に入る

### Phase 1: DBモデル + step更新（1日）

**目的:** 工程の永続化で「どこまで進んだか」を見える化

1. `SmartReadPadRun` モデル追加（heartbeat_at含む）
2. Alembicマイグレーション作成
3. 基本的なCRUD

### Phase 2: ランナーサービス（1-2日）

**目的:** PAD互換フローの実装

1. `SmartReadPadRunnerService` 実装
2. 既存の `simple_sync_service.py` からロジック移植
3. heartbeat更新の実装
4. stale検出の実装
5. retry機能の実装

### Phase 3: APIエンドポイント + FE（1日）

**目的:** 一本道のAPI完成

1. `/pad-runs` エンドポイント追加
2. スキーマ定義（Pydantic）
3. フロントエンドAPI関数・フック追加
4. `SmartReadResultView` の更新（進捗表示UI）

### Phase 4: テスト + CI（半日）

**目的:** export呼び出しをCIで固定

1. FakeClient実装
2. ユニットテスト作成
3. CIで自動テスト

### Phase 5: 本番検証（本番で1回）

**目的:** 実データで完走確認

1. 本番環境でPAD Runを実行
2. DBのstepで完走確認（EXPORT_STARTED → POSTPROCESSED）
3. ログが無くても証跡がDBに残ることを確認

## 7. 成功基準

1. **PAD互換フローが一本道で実行される**
   - exportステップが必ず実行される（`export_id` が設定される）
   - DBに工程が記録される（step遷移）

2. **APIハンドラのブロッキングがない**
   - 即座に202レスポンス
   - バックグラウンドで処理（スレッド実行）

3. **進捗が追跡可能**
   - フロントエンドからポーリングで確認可能
   - STALE検出で「処理が止まった」も検知可能
   - エラー時も原因が分かる

4. **テストで検証可能**
   - FakeClientでexport呼び出しを検証
   - CI/CDで自動テスト

5. **リカバリー可能**
   - FAILED/STALEからリトライ可能
   - heartbeat監視で「消えた処理」を検知

## 8. 注意事項

- 既存の `/analyze-simple` と `/configs/{id}/process` は維持（壊さない）
- フロントエンドの移行は段階的に（既存UIを壊さない）
- 本番デプロイ前に工程追跡の動作確認を徹底
- **execute_run は必ずスレッドで実行**（threading.Thread）

### 8.1 スレッド方式の限界と許容範囲

**制約:**
- `daemon=True` のため、プロセス再起動/デプロイでスレッドは即座に終了する
- その場合、DBのステータスは `RUNNING` のまま止まる

**これは仕様として許容する。理由:**
1. 専用ワーカー（Celery等）を入れるより、運用コストが低い
2. heartbeat監視で `STALE` を自動検出できる
3. `retry` エンドポイントで復旧できる
4. 頻繁なデプロイ中のOCR処理は元々リスクがある（PADも同様）

**運用フロー:**
```
[デプロイ/再起動]
     ↓
[RUNNING のまま止まる]
     ↓
[120秒後、GET /pad-runs/{run_id} で STALE 検出]
     ↓
[UI にリトライボタン表示]
     ↓
[POST /pad-runs/{run_id}/retry で再実行]
```

**推奨:**
- デプロイは OCR処理が少ない時間帯（早朝・深夜）に行う
- デプロイ前に `GET /pad-runs?config_id=X` で RUNNING がないか確認

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
PADランナーでは `run.export_id` が設定されていないと成功にならないゲートを設けている。
