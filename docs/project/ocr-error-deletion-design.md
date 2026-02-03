# OCR結果エラー削除機能 設計書

**Document Version:** 1.0
**Created:** 2026-02-03
**Status:** 設計完了（実装待ち）

---

## 1. 背景と目的

### 1.1 現状の課題

OCR結果処理システムでは、以下の仕様により運用上の問題が発生している:

- **エラーがある場合、アーカイブ（完了）できない**
  - `error_flags` に1つでも `true` が含まれる場合、完了処理がブロックされる
  - エラーデータが永久に `SmartReadLongData` および `OcrResultEdit` に残り続ける
  - データベースが肥大化し、パフォーマンスに影響を与える可能性がある

- **削除機能が存在しない**
  - 現在のAPIには削除エンドポイントが存在しない
  - アーカイブと復元のみが可能な状態
  - 誤ったOCR読み取りや不要なデータを除去できない

### 1.2 目的

本設計は、以下の要件を満たす削除機能を提供する:

1. **エラーがある場合のみ削除可能** - データ整合性を保つため、エラーのないデータは保護
2. **エラーがない場合は削除不可** - 誤削除を防ぐガード処理を実装
3. **監査証跡の保持** - 削除操作の記録を残す
4. **ユーザー確認フロー** - 削除前の明示的な確認ダイアログ

---

## 2. 現状分析

### 2.1 データモデル

| モデル | 説明 | エラー管理 |
|--------|------|------------|
| `SmartReadLongData` | アクティブなOCR結果 | `status` (PENDING/IMPORTED/ERROR), `error_reason` |
| `OcrResultEdit` | 手動編集データ | **`error_flags`** (JSONB) - `master_not_found`, `jiku_format_error`, `date_format_error` |
| `SmartReadLongDataCompleted` | アーカイブ済みOCR結果 | 読み取り専用（削除対象外） |
| `OcrResultEditCompleted` | アーカイブ済み編集データ | 読み取り専用（削除対象外） |

**ビュー:** `v_ocr_results` - `has_error` 計算フィールドを提供

### 2.2 既存エンドポイント

| エンドポイント | メソッド | 機能 | エラー制約 |
|----------------|----------|------|------------|
| `/ocr-results/complete` | POST | アーカイブ | **エラーがある場合、処理をスキップ** |
| `/ocr-results/restore` | POST | 復元 | 制約なし |
| `/ocr-results/completed` | GET | アーカイブ一覧取得 | - |

**削除エンドポイント:** ❌ **存在しない**

### 2.3 エラー検証ロジック

**バックエンド** (`ocr_results_router.py:858-898`):
```python
error_flags = {
    "master_not_found": bool,      # 出荷先マスタ存在チェック
    "jiku_format_error": bool,     # 軸コード形式チェック (例: A123)
    "date_format_error": bool      # 日付形式チェック (YYYY-MM-DD)
}
```

**フロントエンド** (`useOcrStatusOperations.ts:46-79`):
```typescript
const validItems = selectedItems.filter((i) => !i.has_error);
// エラーがある項目は完了処理から除外
```

---

## 3. 要件定義

### 3.1 機能要件

#### FR-1: エラーデータ削除
- **優先度:** P0 (必須)
- **説明:** エラーフラグが1つでも `true` の場合、削除を許可する
- **入力:** OCR結果ID（単一または複数）
- **出力:** 削除件数
- **前提条件:**
  - 対象がアクティブテーブル (`SmartReadLongData`, `OcrResultEdit`) に存在
  - **`has_error = true`** であること
- **事後条件:**
  - 対象レコードが物理削除される
  - 削除操作が監査ログに記録される

#### FR-2: エラーなしデータの削除ガード
- **優先度:** P0 (必須)
- **説明:** エラーフラグがすべて `false` の場合、削除を拒否する
- **エラーレスポンス:** HTTP 400 Bad Request
  ```json
  {
    "detail": "エラーのない項目は削除できません。完了処理を使用してください。"
  }
  ```

#### FR-3: 一括削除
- **優先度:** P1 (推奨)
- **説明:** 複数のエラーデータを一度に削除可能
- **動作:**
  - エラーがある項目のみ削除
  - エラーがない項目はスキップし、警告メッセージを返す

#### FR-4: 削除確認UI
- **優先度:** P0 (必須)
- **説明:** フロントエンドで削除前に確認ダイアログを表示
- **表示内容:**
  - 削除対象件数
  - 削除が取り消し不可であることの警告
  - OK/キャンセルボタン

### 3.2 非機能要件

#### NFR-1: セキュリティ
- **認証:** 削除操作には認証が必要
- **認可:** `admin` または `user` ロール（ゲストは削除不可）
- **監査:** すべての削除操作を `stock_history` または専用の監査ログに記録

#### NFR-2: パフォーマンス
- **一括削除:** 最大100件まで（過度な負荷を防ぐ）
- **タイムアウト:** 削除処理は10秒以内に完了

#### NFR-3: データ整合性
- **トランザクション:** 削除は単一トランザクション内で実行
- **カスケード:** 関連レコード（`SmartReadLongData` ↔ `OcrResultEdit`）を同時削除
- **ロールバック:** エラー時は全削除をロールバック

---

## 4. 設計詳細

### 4.1 APIエンドポイント設計

#### DELETE /api/ocr-results

**概要:** エラーのあるOCR結果を削除

**リクエスト:**
```json
{
  "ids": [1, 2, 3]
}
```

**レスポンス (成功):**
```json
{
  "deleted_count": 3,
  "skipped_count": 0,
  "skipped_ids": []
}
```

**レスポンス (一部スキップ):**
```json
{
  "deleted_count": 2,
  "skipped_count": 1,
  "skipped_ids": [3],
  "message": "1件の項目にエラーがないため削除がスキップされました。"
}
```

**エラーレスポンス:**

| HTTPステータス | 条件 | メッセージ |
|----------------|------|------------|
| 400 Bad Request | すべての項目にエラーがない | `選択された項目はすべてエラーがないため、削除できません。完了処理を使用してください。` |
| 404 Not Found | 指定されたIDが存在しない | `指定されたOCR結果が見つかりません: [ID一覧]` |
| 401 Unauthorized | 未認証 | `認証が必要です` |
| 403 Forbidden | 権限不足 | `この操作を実行する権限がありません` |

**権限要件:**
- ロール: `admin` または `user`
- ゲストは削除不可

### 4.2 バックエンド実装方針

#### 4.2.1 ルーター実装

**ファイル:** `backend/app/presentation/api/routes/ocr_results_router.py`

```python
from app.presentation.api.routes.auth.auth_router import get_current_user

@router.delete("")
def delete_ocr_results(
    request: SmartReadDeletionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)  # 認証必須
):
    """
    エラーのあるOCR結果を削除する

    エラーフラグが1つでもtrueの項目のみ削除可能。
    エラーのない項目は削除がブロックされる。

    Args:
        request: 削除対象IDリスト
        db: データベースセッション
        current_user: 認証済みユーザー（admin/user）

    Returns:
        SmartReadDeletionResponse: 削除結果

    Raises:
        HTTPException 400: すべての項目にエラーがない
        HTTPException 404: 指定IDが存在しない
        HTTPException 403: ゲストユーザー
    """
    # ゲストは削除不可
    if "guest" in current_user.roles and len(current_user.roles) == 1:
        raise HTTPException(status_code=403, detail="ゲストユーザーは削除できません")

    result = delete_ocr_results_service(db, request.ids, current_user.id)

    if result.deleted_count == 0 and result.skipped_count > 0:
        raise HTTPException(
            status_code=400,
            detail="選択された項目はすべてエラーがないため、削除できません。完了処理を使用してください。"
        )

    return result
```

#### 4.2.2 サービス層実装

**ファイル:** `backend/app/application/services/ocr_results_service.py`

```python
from typing import List
from sqlalchemy.orm import Session
from app.infrastructure.persistence.models.smartread_models import (
    SmartReadLongData,
    OcrResultEdit
)
from app.core.logging import get_logger

logger = get_logger(__name__)

def delete_ocr_results_service(
    db: Session,
    ids: List[int],
    user_id: int
) -> SmartReadDeletionResponse:
    """
    エラーのあるOCR結果を削除する（トランザクション管理）

    Args:
        db: データベースセッション
        ids: 削除対象IDリスト
        user_id: 削除実行ユーザーID

    Returns:
        SmartReadDeletionResponse: 削除結果

    Raises:
        HTTPException 404: 指定IDが存在しない
    """
    deleted_count = 0
    skipped_count = 0
    skipped_ids = []

    try:
        for ocr_id in ids:
            # 1. OCR結果を取得
            ocr_result = db.query(SmartReadLongData).filter(
                SmartReadLongData.id == ocr_id
            ).first()

            if not ocr_result:
                logger.warning(
                    "OCR result not found for deletion",
                    extra={"ocr_id": ocr_id, "user_id": user_id}
                )
                raise HTTPException(
                    status_code=404,
                    detail=f"OCR結果が見つかりません: ID={ocr_id}"
                )

            # 2. 編集データを取得してエラーフラグをチェック
            edit = db.query(OcrResultEdit).filter(
                OcrResultEdit.task_id == ocr_result.task_id
            ).first()

            has_error = False
            if edit and edit.error_flags:
                has_error = any(edit.error_flags.values())

            # 3. エラーがない場合はスキップ
            if not has_error:
                logger.info(
                    "OCR result skipped (no error)",
                    extra={
                        "ocr_id": ocr_id,
                        "task_id": ocr_result.task_id,
                        "user_id": user_id
                    }
                )
                skipped_count += 1
                skipped_ids.append(ocr_id)
                continue

            # 4. 削除実行（カスケード）
            if edit:
                db.delete(edit)
                logger.info(
                    "OCR edit deleted",
                    extra={
                        "ocr_id": ocr_id,
                        "task_id": ocr_result.task_id,
                        "error_flags": edit.error_flags,
                        "user_id": user_id
                    }
                )

            db.delete(ocr_result)
            logger.info(
                "OCR result deleted",
                extra={
                    "ocr_id": ocr_id,
                    "task_id": ocr_result.task_id,
                    "user_id": user_id
                }
            )

            deleted_count += 1

        # 5. コミット
        db.commit()

        logger.info(
            "OCR deletion completed",
            extra={
                "deleted_count": deleted_count,
                "skipped_count": skipped_count,
                "user_id": user_id
            }
        )

        return SmartReadDeletionResponse(
            deleted_count=deleted_count,
            skipped_count=skipped_count,
            skipped_ids=skipped_ids,
            message=(
                f"{skipped_count}件の項目にエラーがないため削除がスキップされました。"
                if skipped_count > 0 else None
            )
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.exception(
            "OCR deletion failed",
            extra={"ids": ids, "user_id": user_id, "error": str(exc)[:500]}
        )
        raise HTTPException(
            status_code=500,
            detail="OCR結果の削除に失敗しました"
        )
```

#### 4.2.3 スキーマ定義

**ファイル:** `backend/app/presentation/schemas/ocr_result_schema.py`

```python
from pydantic import BaseModel, Field
from typing import List, Optional

class SmartReadDeletionRequest(BaseModel):
    """OCR結果削除リクエスト"""
    ids: List[int] = Field(..., min_length=1, max_length=100, description="削除対象IDリスト（最大100件）")

class SmartReadDeletionResponse(BaseModel):
    """OCR結果削除レスポンス"""
    deleted_count: int = Field(..., description="削除件数")
    skipped_count: int = Field(..., description="スキップ件数")
    skipped_ids: List[int] = Field(default_factory=list, description="スキップされたIDリスト")
    message: Optional[str] = Field(None, description="警告メッセージ")
```

### 4.3 フロントエンド実装方針

#### 4.3.1 API Client実装

**ファイル:** `frontend/src/features/ocr-results/api.ts`

```typescript
import { httpClient } from "@/shared/api/http-client";

export interface OcrDeletionRequest {
  ids: number[];
}

export interface OcrDeletionResponse {
  deleted_count: number;
  skipped_count: number;
  skipped_ids: number[];
  message?: string;
}

/**
 * エラーのあるOCR結果を削除
 *
 * エラーフラグが1つでもtrueの項目のみ削除可能。
 * エラーのない項目は自動的にスキップされる。
 */
export async function deleteOcrResults(
  request: OcrDeletionRequest
): Promise<OcrDeletionResponse> {
  const response = await httpClient.delete("ocr-results", {
    json: request,
  });
  return response.json<OcrDeletionResponse>();
}
```

#### 4.3.2 React Query Hook実装

**ファイル:** `frontend/src/features/ocr-results/hooks/useOcrStatusOperations.ts`

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteOcrResults } from "../api";
import { toast } from "@/hooks/useToast";

export function useOcrStatusOperations() {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteOcrResults,
    onSuccess: (data) => {
      // キャッシュ無効化
      queryClient.invalidateQueries({ queryKey: ["ocrResults"] });

      // 成功トースト
      toast.success(`${data.deleted_count}件のOCR結果を削除しました`);

      // スキップ警告
      if (data.skipped_count > 0 && data.message) {
        toast.warning(data.message);
      }
    },
    onError: (error: any) => {
      // エラーハンドリング
      const status = error.response?.status;
      const detail = error.response?.data?.detail;

      if (status === 400) {
        toast.error(detail || "削除できない項目が含まれています");
      } else if (status === 403) {
        toast.error("削除する権限がありません");
      } else if (status === 404) {
        toast.error("指定されたOCR結果が見つかりません");
      } else {
        toast.error("OCR結果の削除に失敗しました");
      }
    },
  });

  return {
    deleteOcrResults: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
```

#### 4.3.3 削除確認ダイアログ実装

**ファイル:** `frontend/src/features/ocr-results/components/DeleteConfirmDialog.tsx`

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemCount: number;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  itemCount,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>OCR結果の削除</AlertDialogTitle>
          <AlertDialogDescription>
            選択された{itemCount}件のOCR結果を削除します。
            <br />
            <br />
            <strong className="text-destructive">
              この操作は取り消せません。
            </strong>
            <br />
            エラーのない項目は自動的にスキップされます。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

#### 4.3.4 ActionButtons拡張

**ファイル:** `frontend/src/features/ocr-results/components/ActionButtons.tsx`

```typescript
// 既存コードに追加

export function ActionButtons({ viewMode, selectedIds, ... }: ActionButtonsProps) {
  const { deleteOcrResults, isDeleting } = useOcrStatusOperations();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // エラーがある項目のみフィルタリング
  const errorItems = selectedItems.filter((item) => item.has_error);
  const canDelete = errorItems.length > 0;

  const handleDeleteClick = () => {
    if (!canDelete) {
      toast.error("削除できる項目がありません（エラーがある項目のみ削除可能）");
      return;
    }
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    deleteOcrResults({ ids: selectedIds });
    setDeleteDialogOpen(false);
  };

  return (
    <div className="flex gap-2">
      {/* 既存のボタン */}

      {/* 削除ボタン（currentビューのみ） */}
      {viewMode === "current" && (
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDeleteClick}
          disabled={selectedIds.length === 0 || !canDelete || isDeleting}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          削除 ({errorItems.length})
        </Button>
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemCount={errorItems.length}
      />
    </div>
  );
}
```

### 4.4 セキュリティとガード処理

#### 4.4.1 バックエンドガード

| ガード種別 | 実装箇所 | 条件 | アクション |
|------------|----------|------|------------|
| 認証ガード | ルーター | `Depends(get_current_user)` | 401 Unauthorized |
| 認可ガード | ルーター | ロールが `guest` のみ | 403 Forbidden |
| エラーガード | サービス | `has_error = False` | スキップまたは 400 Bad Request |
| 存在チェック | サービス | OCR結果が存在しない | 404 Not Found |

#### 4.4.2 フロントエンドガード

| ガード種別 | 実装箇所 | 条件 | アクション |
|------------|----------|------|------------|
| 選択チェック | ActionButtons | `selectedIds.length === 0` | ボタン無効化 |
| エラーチェック | ActionButtons | `errorItems.length === 0` | ボタン無効化 + トースト |
| 確認ダイアログ | DeleteConfirmDialog | 削除ボタンクリック | 確認ダイアログ表示 |

#### 4.4.3 ロギング

すべての削除操作で以下をログに記録:

```python
logger.info(
    "OCR result deleted",
    extra={
        "ocr_id": ocr_id,
        "task_id": task_id,
        "error_flags": error_flags,  # どのエラーがあったか
        "user_id": user_id,          # 誰が削除したか
        "timestamp": datetime.utcnow().isoformat()
    }
)
```

ログレベル:
- `INFO`: 正常な削除
- `WARNING`: スキップされた項目
- `ERROR`: 削除失敗
- `EXCEPTION`: 予期しないエラー

---

## 5. 実装チェックリスト

### 5.1 バックエンド

- [ ] **スキーマ定義** (`ocr_result_schema.py`)
  - [ ] `SmartReadDeletionRequest` 作成
  - [ ] `SmartReadDeletionResponse` 作成
  - [ ] バリデーション追加（ids: 1-100件）

- [ ] **サービス層** (`ocr_results_service.py`)
  - [ ] `delete_ocr_results_service` 関数実装
  - [ ] エラーフラグチェックロジック
  - [ ] トランザクション管理
  - [ ] カスケード削除（`OcrResultEdit` + `SmartReadLongData`）
  - [ ] ロギング追加（INFO/WARNING/ERROR）

- [ ] **ルーター** (`ocr_results_router.py`)
  - [ ] `DELETE /ocr-results` エンドポイント追加
  - [ ] 認証ガード（`get_current_user`）
  - [ ] 認可ガード（ゲスト拒否）
  - [ ] エラーハンドリング（400/403/404/500）

- [ ] **テスト** (`test_ocr_results.py`)
  - [ ] エラーあり削除成功テスト
  - [ ] エラーなし削除拒否テスト
  - [ ] 一括削除（混在）テスト
  - [ ] 認証/認可テスト
  - [ ] 存在しないID削除テスト

### 5.2 フロントエンド

- [ ] **API Client** (`api.ts`)
  - [ ] `deleteOcrResults` 関数実装
  - [ ] 型定義追加（`OcrDeletionRequest`, `OcrDeletionResponse`）

- [ ] **React Query Hook** (`useOcrStatusOperations.ts`)
  - [ ] `deleteMutation` 追加
  - [ ] エラーハンドリング（400/403/404/500）
  - [ ] キャッシュ無効化
  - [ ] トースト通知

- [ ] **UI コンポーネント**
  - [ ] `DeleteConfirmDialog.tsx` 作成
  - [ ] `ActionButtons.tsx` 拡張（削除ボタン追加）
  - [ ] エラー件数バッジ表示

- [ ] **型定義更新**
  - [ ] `make frontend-typegen` 実行（OpenAPI型再生成）

### 5.3 品質チェック

- [ ] **Backend**
  - [ ] `make backend-lint-fix` 実行
  - [ ] `make backend-format` 実行
  - [ ] `make backend-test` 実行（全テストパス）

- [ ] **Frontend**
  - [ ] `make frontend-lint-fix` 実行
  - [ ] `make frontend-format` 実行
  - [ ] `make frontend-typecheck` 実行（0 errors）

- [ ] **統合テスト**
  - [ ] 開発環境で動作確認
  - [ ] エラーあり削除フロー確認
  - [ ] エラーなし削除ガード確認
  - [ ] 一括削除確認

---

## 6. テスト計画

### 6.1 単体テスト（Backend）

#### テストケース1: エラーあり削除成功

```python
def test_delete_ocr_results_with_error(db_session, admin_user):
    """エラーがある場合、削除が成功する"""
    # Setup
    ocr = create_ocr_with_error(db_session)

    # Execute
    response = client.delete(
        "/api/ocr-results",
        json={"ids": [ocr.id]},
        headers=auth_header(admin_user)
    )

    # Assert
    assert response.status_code == 200
    assert response.json()["deleted_count"] == 1
    assert response.json()["skipped_count"] == 0

    # Verify deletion
    assert db_session.query(SmartReadLongData).filter_by(id=ocr.id).first() is None
```

#### テストケース2: エラーなし削除拒否

```python
def test_delete_ocr_results_without_error_blocked(db_session, admin_user):
    """エラーがない場合、削除が拒否される"""
    # Setup
    ocr = create_ocr_without_error(db_session)

    # Execute
    response = client.delete(
        "/api/ocr-results",
        json={"ids": [ocr.id]},
        headers=auth_header(admin_user)
    )

    # Assert
    assert response.status_code == 400
    assert "エラーがないため" in response.json()["detail"]

    # Verify not deleted
    assert db_session.query(SmartReadLongData).filter_by(id=ocr.id).first() is not None
```

#### テストケース3: 一括削除（混在）

```python
def test_delete_ocr_results_mixed(db_session, admin_user):
    """エラーありとエラーなしが混在する場合、エラーありのみ削除"""
    # Setup
    ocr_with_error = create_ocr_with_error(db_session)
    ocr_without_error = create_ocr_without_error(db_session)

    # Execute
    response = client.delete(
        "/api/ocr-results",
        json={"ids": [ocr_with_error.id, ocr_without_error.id]},
        headers=auth_header(admin_user)
    )

    # Assert
    assert response.status_code == 200
    assert response.json()["deleted_count"] == 1
    assert response.json()["skipped_count"] == 1
    assert ocr_without_error.id in response.json()["skipped_ids"]
```

#### テストケース4: ゲストユーザー拒否

```python
def test_delete_ocr_results_guest_forbidden(db_session, guest_user):
    """ゲストユーザーは削除できない"""
    # Setup
    ocr = create_ocr_with_error(db_session)

    # Execute
    response = client.delete(
        "/api/ocr-results",
        json={"ids": [ocr.id]},
        headers=auth_header(guest_user)
    )

    # Assert
    assert response.status_code == 403
    assert "ゲストユーザー" in response.json()["detail"]
```

### 6.2 E2Eテスト（Frontend）

#### シナリオ1: エラーあり削除フロー

1. OCR結果一覧ページを開く
2. エラーがある項目を選択
3. 削除ボタンをクリック
4. 確認ダイアログが表示される
5. 「削除する」をクリック
6. 成功トーストが表示される
7. 項目がリストから削除される

#### シナリオ2: エラーなし削除ガード

1. OCR結果一覧ページを開く
2. エラーがない項目のみを選択
3. 削除ボタンが無効化されている
4. クリックしても何も起きない

#### シナリオ3: 一括削除（混在）

1. エラーあり2件、エラーなし1件を選択
2. 削除ボタンに「削除 (2)」と表示
3. 削除実行
4. 成功トースト「2件のOCR結果を削除しました」
5. 警告トースト「1件の項目にエラーがないため削除がスキップされました」
6. エラーありの2件のみ削除される

---

## 7. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 誤削除 | High | 削除前の確認ダイアログ、エラーなしデータのガード |
| 監査証跡不足 | Medium | 削除操作を詳細にログに記録（user_id, task_id, error_flags） |
| パフォーマンス低下 | Low | 一括削除を最大100件に制限、トランザクション最適化 |
| 権限昇格 | High | 認証・認可ガードの徹底、ゲストユーザー拒否 |

---

## 8. 今後の拡張案

### 8.1 ソフトデリート対応（オプション）

現在の設計は物理削除だが、監査要件に応じてソフトデリート（論理削除）に変更可能:

- `deleted_at` カラム追加
- `deleted_by` カラム追加（user_id）
- クエリに `WHERE deleted_at IS NULL` フィルタを追加

### 8.2 削除履歴テーブル（オプション）

削除されたデータの履歴を保持:

```python
class OcrResultDeletionLog(Base):
    __tablename__ = "ocr_result_deletion_log"

    id: int
    ocr_id: int                    # 削除されたOCR ID
    task_id: str                   # 削除されたタスクID
    error_flags: Dict[str, bool]   # 削除時のエラーフラグ
    deleted_by: int                # 削除実行ユーザーID
    deleted_at: datetime           # 削除日時
    content_snapshot: dict         # 削除時のコンテンツスナップショット（JSONB）
```

### 8.3 復元機能（オプション）

誤削除時の復元機能:

- 削除から24時間以内は復元可能
- `OcrResultDeletionLog` から復元
- adminロールのみ実行可能

---

## 9. 参考資料

- **現行コード:**
  - `backend/app/infrastructure/persistence/models/smartread_models.py:159-461`
  - `backend/app/presentation/api/routes/ocr_results_router.py:444-570`
  - `frontend/src/features/ocr-results/pages/OcrResultsListPage.tsx`

- **関連ドキュメント:**
  - `CLAUDE.md` - Logging Guidelines
  - `CLAUDE.md` - Error Handling Guidelines
  - `CLAUDE.md` - Guard Processing and Access Control
  - `docs/standards/security.md`

- **関連Issue:**
  - OCR結果アーカイブ機能（実装済み）
  - OCR結果復元機能（実装済み）

---

## 10. 変更履歴

| バージョン | 日付 | 著者 | 変更内容 |
|------------|------|------|----------|
| 1.0 | 2026-02-03 | Claude | 初版作成 |

---

**End of Document**
