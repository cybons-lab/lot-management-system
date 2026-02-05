# Phase 10-11 ロギング・エラーハンドリング・テスト追加タスク

**作成日**: 2026-02-05
**ブランチ**: `feature/excel-view-phase9-11`
**担当**: AI Assistant（実装） → Claude（レビュー）

---

## 📋 タスク概要

Phase 10-11で実装した新機能に対して、以下を追加してください：

1. **ロギングの追加**（P0 - 必須）
2. **エラーハンドリングの強化**（P0 - 必須）
3. **ユニットテストの追加**（P1 - 推奨）

---

## 🎯 対象機能

### Phase 10.3: スマート分割（割付転送機能）

**ファイル**: `backend/app/application/services/inventory/lot_service.py`
**メソッド**: `smart_split_lot_with_allocations()` (Line 1337-1450)

### Phase 11: 理由付き入庫数調整

**ファイル**: `backend/app/application/services/inventory/lot_service.py`
**メソッド**: `update_lot_receipt_quantity_with_reason()` (Line 1271-1321)

---

## 📝 タスク1: ロギングの追加（P0）

### 要件

CLAUDE.mdの「Logging Guidelines」に従い、以下のログを追加してください：

#### Phase 10.3: スマート分割

**必須ログポイント**:

1. **分割開始**（INFO）
   ```python
   logger.info(
       "Smart split started",
       extra={
           "lot_id": lot_receipt_id,
           "lot_number": original_lot.lot_number,
           "split_count": split_count,
           "allocation_count": len(allocation_transfers),
           "user_id": user_id,
       },
   )
   ```

2. **数量計算結果**（DEBUG）
   ```python
   logger.debug(
       "Split quantities calculated",
       extra={
           "lot_id": lot_receipt_id,
           "split_quantities": [str(q) for q in split_quantities],
           "total_allocated": str(total_allocated),
           "remaining": str(remaining),
       },
   )
   ```

3. **割り当て転送完了**（INFO）
   ```python
   logger.info(
       "Allocation transfer completed",
       extra={
           "lot_id": lot_receipt_id,
           "transferred_count": transferred_count,
           "new_lot_ids": new_lot_ids,
       },
   )
   ```

4. **エラー発生時**（ERROR）
   ```python
   logger.error(
       "Smart split failed",
       extra={
           "lot_id": lot_receipt_id,
           "split_count": split_count,
           "error": str(exc)[:500],
       },
       exc_info=True,
   )
   ```

#### Phase 11: 理由付き入庫数調整

**必須ログポイント**:

1. **調整開始**（INFO）
   ```python
   logger.info(
       "Lot quantity adjustment started",
       extra={
           "lot_id": lot_receipt_id,
           "lot_number": lot_receipt.lot_number,
           "old_quantity": str(old_quantity),
           "new_quantity": str(new_quantity),
           "adjustment_amount": str(adjustment_amount),
           "reason": reason[:100],  # 最初の100文字のみ
           "user_id": user_id,
       },
   )
   ```

2. **調整完了**（INFO）
   ```python
   logger.info(
       "Lot quantity adjustment completed",
       extra={
           "lot_id": lot_receipt_id,
           "adjustment_id": adjustment.id,
           "new_quantity": str(new_quantity),
       },
   )
   ```

3. **エラー発生時**（ERROR）
   ```python
   logger.error(
       "Lot quantity adjustment failed",
       extra={
           "lot_id": lot_receipt_id,
           "new_quantity": str(new_quantity),
           "reason": reason[:100],
           "error": str(exc)[:500],
       },
       exc_info=True,
   )
   ```

### 実装箇所

**ファイル**: `backend/app/application/services/inventory/lot_service.py`

**インポート追加**:
```python
import logging

logger = logging.getLogger(__name__)
```

**注意事項**:
- すべてのログは構造化ログ（`extra` 辞書を使用）
- センシティブデータ（トークン、パスワード等）は含めない
- エラーメッセージは最大500文字に制限
- 理由（reason）は最大100文字に制限してログに記録

---

## 🛡️ タスク2: エラーハンドリングの強化（P0）

### 要件

現在のエラーハンドリングを強化し、以下を追加してください：

#### Phase 10.3: スマート分割

**追加すべきエラーハンドリング**:

1. **IntegrityError**（割り当て重複など）
   ```python
   from sqlalchemy.exc import IntegrityError, SQLAlchemyError

   try:
       # ... existing code ...
       self.db.commit()
   except IntegrityError as exc:
       self.db.rollback()
       logger.error(
           "Database integrity error during smart split",
           extra={
               "lot_id": lot_receipt_id,
               "error": str(exc.orig)[:500] if exc.orig else str(exc)[:500],
           },
       )
       raise HTTPException(
           status_code=400,
           detail="データ整合性エラー: 割り当ての重複または制約違反が発生しました"
       )
   except SQLAlchemyError as exc:
       self.db.rollback()
       logger.error(
           "Database operation failed during smart split",
           extra={
               "lot_id": lot_receipt_id,
               "error": str(exc)[:500],
           },
       )
       raise HTTPException(
           status_code=500,
           detail="データベース操作に失敗しました"
       )
   ```

2. **バリデーションエラーの詳細化**
   - 現在の `ValueError` に加えて、より具体的なエラーメッセージを追加

#### Phase 11: 理由付き入庫数調整

**追加すべきエラーハンドリング**:

1. **IntegrityError**（調整レコード作成失敗など）
   ```python
   try:
       # ... existing code ...
       self.db.flush()
   except IntegrityError as exc:
       self.db.rollback()
       logger.error(
           "Database integrity error during quantity adjustment",
           extra={
               "lot_id": lot_receipt_id,
               "error": str(exc.orig)[:500] if exc.orig else str(exc)[:500],
           },
       )
       raise HTTPException(
           status_code=400,
           detail="調整レコードの作成に失敗しました"
       )
   except SQLAlchemyError as exc:
       self.db.rollback()
       logger.error(
           "Database operation failed during quantity adjustment",
           extra={
               "lot_id": lot_receipt_id,
               "error": str(exc)[:500],
           },
       )
       raise HTTPException(
           status_code=500,
           detail="データベース操作に失敗しました"
       )
   ```

2. **数量バリデーションの強化**
   - 負の数量チェック（`new_quantity < 0`）
   - 極端に大きい数量チェック（業務ルールに応じて）

### 実装箇所

**ファイル**: `backend/app/application/services/inventory/lot_service.py`

**インポート追加**:
```python
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
```

---

## 🧪 タスク3: ユニットテストの追加（P1）

### 要件

以下のテストケースを追加してください：

#### Phase 10.3: スマート分割

**ファイル**: `backend/tests/services/test_lot_service_smart_split.py`（新規作成）

**テストケース**:

1. **正常系: 2分割**
   - 2つのロットに分割
   - 割り当てが正しく転送される
   - 数量が正しく計算される

2. **正常系: 3分割**
   - 3つのロットに分割
   - 複数の納品先が正しく振り分けられる

3. **異常系: ロットが存在しない**
   - `LotNotFoundError` が発生する

4. **異常系: 数量超過**
   - 割り当て合計が現在在庫を超える場合に `ValueError` が発生する

5. **異常系: 空の分割**
   - すべての分割ロットに数量0が割り当てられた場合に `ValueError` が発生する

#### Phase 11: 理由付き入庫数調整

**ファイル**: `backend/tests/services/test_lot_service_quantity_adjustment.py`（新規作成）

**テストケース**:

1. **正常系: 数量増加**
   - 入庫数が正しく更新される
   - `Adjustment` レコードが作成される
   - `adjusted_quantity` が正の値

2. **正常系: 数量減少**
   - 入庫数が正しく更新される
   - `adjusted_quantity` が負の値

3. **異常系: ロットが存在しない**
   - `LotNotFoundError` が発生する

4. **異常系: 理由が空**
   - `ValueError` が発生する

5. **異常系: 負の数量**
   - `ValueError` または適切なバリデーションエラーが発生する

### テストファイルのテンプレート

```python
"""Tests for LotService smart split functionality."""

import pytest
from decimal import Decimal
from app.application.services.inventory.lot_service import LotService
from app.core.exceptions import LotNotFoundError


class TestLotServiceSmartSplit:
    """Test smart split with allocation transfer."""

    def test_smart_split_2_lots_success(self, db, sample_lot_receipt, sample_user):
        """Test successful 2-way split with allocation transfer."""
        service = LotService(db)

        allocation_transfers = [
            {
                "lot_id": sample_lot_receipt.id,
                "delivery_place_id": 1,
                "customer_id": 1,
                "forecast_period": "2026-02-10",
                "quantity": Decimal("100"),
                "target_lot_index": 0,
                "coa_issue_date": None,
                "comment": None,
                "manual_shipment_date": None,
            },
            {
                "lot_id": sample_lot_receipt.id,
                "delivery_place_id": 2,
                "customer_id": 1,
                "forecast_period": "2026-02-15",
                "quantity": Decimal("150"),
                "target_lot_index": 1,
                "coa_issue_date": None,
                "comment": None,
                "manual_shipment_date": None,
            },
        ]

        new_lot_ids, split_quantities, transferred_count = service.smart_split_lot_with_allocations(
            lot_receipt_id=sample_lot_receipt.id,
            split_count=2,
            allocation_transfers=allocation_transfers,
            user_id=sample_user.id,
        )

        assert len(new_lot_ids) == 2
        assert len(split_quantities) == 2
        assert split_quantities[1] == Decimal("150")
        assert transferred_count == 2

    def test_smart_split_lot_not_found(self, db, sample_user):
        """Test error when lot doesn't exist."""
        service = LotService(db)

        with pytest.raises(LotNotFoundError):
            service.smart_split_lot_with_allocations(
                lot_receipt_id=99999,
                split_count=2,
                allocation_transfers=[],
                user_id=sample_user.id,
            )

    def test_smart_split_quantity_exceeds(self, db, sample_lot_receipt, sample_user):
        """Test error when allocation total exceeds current quantity."""
        service = LotService(db)

        allocation_transfers = [
            {
                "lot_id": sample_lot_receipt.id,
                "delivery_place_id": 1,
                "customer_id": 1,
                "forecast_period": "2026-02-10",
                "quantity": Decimal("999999"),  # Exceeds current quantity
                "target_lot_index": 1,
                "coa_issue_date": None,
                "comment": None,
                "manual_shipment_date": None,
            },
        ]

        with pytest.raises(ValueError, match="を超えています"):
            service.smart_split_lot_with_allocations(
                lot_receipt_id=sample_lot_receipt.id,
                split_count=2,
                allocation_transfers=allocation_transfers,
                user_id=sample_user.id,
            )
```

### テスト実行

```bash
# 新しいテストのみ実行
docker compose exec backend pytest tests/services/test_lot_service_smart_split.py -v
docker compose exec backend pytest tests/services/test_lot_service_quantity_adjustment.py -v

# すべてのテスト実行
docker compose exec backend pytest -v
```

---

## ✅ 完了チェックリスト

### タスク1: ロギング
- [ ] Phase 10.3: 分割開始/完了/エラーのログを追加
- [ ] Phase 11: 調整開始/完了/エラーのログを追加
- [ ] ログレベルが適切（INFO, DEBUG, ERROR）
- [ ] 構造化ログ（`extra` 辞書）を使用
- [ ] センシティブデータをマスク

### タスク2: エラーハンドリング
- [ ] Phase 10.3: IntegrityError と SQLAlchemyError のハンドリング追加
- [ ] Phase 11: IntegrityError と SQLAlchemyError のハンドリング追加
- [ ] エラーメッセージがユーザーフレンドリー
- [ ] ロールバック処理が適切
- [ ] エラーログが記録される

### タスク3: テスト
- [ ] Phase 10.3: 正常系テスト（2分割、3分割）
- [ ] Phase 10.3: 異常系テスト（ロット不存在、数量超過、空の分割）
- [ ] Phase 11: 正常系テスト（数量増加、数量減少）
- [ ] Phase 11: 異常系テスト（ロット不存在、理由空、負の数量）
- [ ] すべてのテストがパス

### 品質チェック
- [ ] `make backend-test` でテスト通過（552+ passed）
- [ ] `make backend-lint` で0エラー
- [ ] `make backend-format` でフォーマット済み
- [ ] コミットメッセージが明確

---

## 📂 対象ファイル

### 修正対象
```
backend/app/application/services/inventory/lot_service.py
  - Line 1271-1321: update_lot_receipt_quantity_with_reason()
  - Line 1337-1450: smart_split_lot_with_allocations()
```

### 新規作成
```
backend/tests/services/test_lot_service_smart_split.py
backend/tests/services/test_lot_service_quantity_adjustment.py
```

---

## 🔍 参考情報

### CLAUDE.mdの関連セクション

**Logging Guidelines** (Line 8-82):
- P0: External API calls（今回は該当なし）
- P0: Database operations（IntegrityError, SQLAlchemyError）
- P1: Business logic decision points（分割数量計算、調整理由）
- P1: Background tasks（今回は該当なし）
- P2: Return None cases（今回は該当なし）

**Error Handling Guidelines** (Line 83-287):
- Exception hierarchy（specific → general）
- Database error handling
- Safe error responses（no exception leakage）

### 既存のテスト例

参考にできる既存テスト:
- `backend/tests/services/test_lot_service.py`: LotServiceの既存テスト
- `backend/tests/services/test_adjustment_service.py`: Adjustmentのテスト例

---

## 🚀 実装手順

### Step 1: ロギング追加（30分）

1. `lot_service.py` の先頭に `logger` をインポート
2. `update_lot_receipt_quantity_with_reason()` にログを追加（開始、完了、エラー）
3. `smart_split_lot_with_allocations()` にログを追加（開始、数量計算、完了、エラー）
4. コミット: `feat(lot-service): Phase 10-11にロギングを追加`

### Step 2: エラーハンドリング強化（30分）

1. `IntegrityError` と `SQLAlchemyError` のインポート
2. 両メソッドに try-except ブロックを追加
3. エラーログとHTTPExceptionを追加
4. コミット: `feat(lot-service): Phase 10-11のエラーハンドリングを強化`

### Step 3: テスト追加（60分）

1. `test_lot_service_smart_split.py` を作成
2. 正常系テスト3件、異常系テスト3件を実装
3. `test_lot_service_quantity_adjustment.py` を作成
4. 正常系テスト2件、異常系テスト3件を実装
5. すべてのテストがパスすることを確認
6. コミット: `test(lot-service): Phase 10-11のユニットテストを追加`

### Step 4: 品質チェック（10分）

```bash
make backend-test
make backend-lint
make backend-format
```

---

## 💬 レビューポイント

実装完了後、以下をレビューしてください：

### ロギング
- [ ] 構造化ログになっているか
- [ ] ログレベルが適切か
- [ ] センシティブデータが含まれていないか
- [ ] エラー時のコンテキストが十分か

### エラーハンドリング
- [ ] 例外の順序が正しいか（specific → general）
- [ ] ロールバックが適切か
- [ ] エラーメッセージがユーザーフレンドリーか
- [ ] エラーログが記録されているか

### テスト
- [ ] テストケースが網羅的か
- [ ] テストが独立しているか（他のテストに依存しない）
- [ ] アサーションが適切か
- [ ] エッジケースをカバーしているか

---

## 📌 注意事項

1. **既存コードを破壊しない**
   - 既存のメソッドシグネチャを変更しない
   - 既存のテストが引き続きパスすることを確認

2. **CLAUDE.mdに従う**
   - ロギングパターンを厳守
   - エラーハンドリングパターンを厳守

3. **コミットを分ける**
   - ロギング、エラーハンドリング、テストで別々にコミット
   - コミットメッセージは明確に

4. **品質チェックを必ず実行**
   - すべてのテストがパスすること
   - Lintエラーが0件であること

---

## 🎯 期待される成果物

1. **ロギング追加**
   - 各メソッドに開始/完了/エラーログが追加されている
   - 構造化ログで重要な情報が記録されている

2. **エラーハンドリング強化**
   - IntegrityError と SQLAlchemyError が適切にハンドリングされている
   - エラー時にロールバックとログ記録が行われている

3. **ユニットテスト**
   - Phase 10.3: 最低6件のテストケース
   - Phase 11: 最低5件のテストケース
   - すべてのテストがパス

4. **品質チェック**
   - `make backend-test`: 558+ passed（既存552 + 新規6+）
   - `make backend-lint`: 0 errors
   - コードフォーマット済み

---

**実装完了後、このドキュメントと実装コードをClaudeにレビュー依頼してください。Good luck! 🚀**
