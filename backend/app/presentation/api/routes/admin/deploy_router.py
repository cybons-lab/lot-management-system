import json
import logging
import shutil
import zipfile
from datetime import datetime
from pathlib import PurePosixPath, PureWindowsPath
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.core.config import settings
from app.presentation.api.routes.auth.auth_router import get_current_admin


router = APIRouter(prefix="/deploy", tags=["admin", "deploy"])
logger = logging.getLogger(__name__)


class Manifest(BaseModel):
    app_name: str
    version: str
    built_at: str
    backend_changed: bool
    frontend_changed: bool
    requires_restart: bool
    notes: str | None = None


class DeployStatus(BaseModel):
    current_release: str | None = None
    last_deploy_at: str | None = None
    history: list[dict[str, Any]] = []


def _save_history(history: list[dict[str, Any]]):
    history_file = settings.DEPLOY_BASE_DIR / "deploy_history.json"
    settings.DEPLOY_BASE_DIR.mkdir(parents=True, exist_ok=True)
    with open(history_file, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def _load_history() -> list[dict[str, Any]]:
    history_file = settings.DEPLOY_BASE_DIR / "deploy_history.json"
    if not history_file.exists():
        return []
    try:
        with open(history_file, encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception:
        return []


@router.post("/upload")
async def upload_bundle(
    file: UploadFile = File(...),
    current_admin=Depends(get_current_admin),
):
    """デプロイ用ZIPファイルをアップロードし、展開する."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    release_dir = settings.RELEASES_DIR / timestamp

    # 1. 保存先の準備
    settings.UPLOAD_TEMP_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = settings.UPLOAD_TEMP_DIR / f"bundle_{timestamp}.zip"

    try:
        # 2. ZIPの保存
        with open(zip_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # 3. ZIPの検証と展開
        with zipfile.ZipFile(zip_path, "r") as z:
            # Zip Slip 対策 (Windowsの絶対パスも拒否)
            for name in z.namelist():
                posix_path = PurePosixPath(name)
                windows_path = PureWindowsPath(name)
                if (
                    ".." in posix_path.parts
                    or ".." in windows_path.parts
                    or posix_path.is_absolute()
                    or windows_path.is_absolute()
                    or windows_path.drive
                ):
                    raise HTTPException(
                        status_code=400, detail=f"不正なファイルパスが含まれています: {name}"
                    )

            release_dir.mkdir(parents=True, exist_ok=True)
            z.extractall(release_dir)

        # 4. manifest.json の確認
        manifest_path = release_dir / "manifest.json"
        if not manifest_path.exists():
            shutil.rmtree(release_dir)
            raise HTTPException(status_code=400, detail="manifest.json が見つかりません")

        with open(manifest_path, encoding="utf-8") as f:
            manifest_data = json.load(f)
            manifest = Manifest(**manifest_data)

        # 5. current.txt の更新
        settings.CURRENT_PATH_FILE.write_text(str(release_dir), encoding="utf-8")

        # 6. フロントエンドの反映 (固定パスへのコピー)
        if manifest.frontend_changed:
            source_dist = release_dir / "frontend" / "dist"
            if source_dist.exists():
                target_dist = settings.FRONTEND_DIST
                target_dist.parent.mkdir(parents=True, exist_ok=True)

                # 既存のディレクトリを削除してコピー (Windowsでの上書き問題を避ける)
                if target_dist.exists():
                    shutil.rmtree(target_dist)
                shutil.copytree(source_dist, target_dist)
                logger.info(f"Frontend dist updated at: {target_dist}")

        # 7. 履歴の更新
        history = _load_history()
        history.insert(
            0,
            {
                "timestamp": timestamp,
                "version": manifest.version,
                "deployed_at": datetime.now().isoformat(),
                "backend_changed": manifest.backend_changed,
                "requires_restart": manifest.requires_restart,
                "notes": manifest.notes,
            },
        )
        _save_history(history[:50])  # 直近50件を保持

        return {
            "status": "success",
            "release": timestamp,
            "version": manifest.version,
            "requires_restart": manifest.requires_restart,
        }

    except HTTPException:
        if release_dir.exists():
            shutil.rmtree(release_dir)
        raise
    except Exception as e:
        logger.exception("デプロイ中にエラーが発生しました")
        if release_dir.exists():
            shutil.rmtree(release_dir)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", response_model=DeployStatus)
async def get_deploy_status(current_admin=Depends(get_current_admin)):
    """現在のデプロイステータスと履歴を取得する."""
    current_release = None
    if settings.CURRENT_PATH_FILE.exists():
        current_release = settings.CURRENT_PATH_FILE.read_text(encoding="utf-8").strip()

    history = _load_history()
    last_deploy_at = history[0]["deployed_at"] if history else None

    return DeployStatus(
        current_release=current_release, last_deploy_at=last_deploy_at, history=history
    )
