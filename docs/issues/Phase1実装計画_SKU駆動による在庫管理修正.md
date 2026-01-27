# Phase1実装計画: SKU駆動による在庫管理修正

**作成日**: 2026-01-27
**目的**: 「仕入→在庫→引当→出荷」フローをSKUベース(supplier_id + maker_part_no)で確実に動作させる
**スコープ**: Phase1 - 最小限の修正で基本フローを確立（グルーピング・ルーティングは除外）

---

## 1. 前提と定義（Phase1確定版）

### 1.1 SKU定義（確定）

```
SKU = supplier_items テーブル
ビジネスキー = (supplier_id, maker_part_no)
SSOT（唯一の真実の情報源） = supplier_items
```

**Phase1の鉄則:**
- `supplier_items.maker_part_no` は必須入力（UI・DB両方）
- `supplier_items.product_id` はオプション（Phase2以降のグルーピング用）
- 在庫管理（lots）、引当、出荷は全て `supplier_item_id` で動作
- `customer_items.supplier_item_id` は必須（マッピング未登録時は出荷ブロック）

### 1.2 確定事項（デフォルト回答反映済み）

以下の10の質問については、Phase1のデフォルト回答で確定しています:

**Q1. マイグレーション前の既存データ対応**
→ **回答A**: 100%のマッピング完了を待つ（Phase1移行前の必須条件）

**Q2. Phase1適用範囲**
→ **回答A**: 新規フローのみ適用（既存オーダーは旧ルートで処理継続）

**Q3. デプロイ環境**
→ **回答A**: テスト環境で先行検証後、本番デプロイ

**Q4. productsテーブルの扱い**
→ **回答A**: 凍結（Phase1では新規登録不可、Phase2で再設計）

**Q5. サンプルデータ作成**
→ **回答B**: 手動登録推奨（最小限のサンプルデータ修正のみ）

**Q6. UI警告表示**
→ **回答A**: 警告表示あり（ユーザーにPhase1制約を明示）

**Q7. 出荷ブロックの厳密性**
→ **回答A**: 厳密に強制（マッピング未登録時は出荷不可）

**Q8. テストカバレッジ**
→ **回答A**: DB制約・API・UIの全てでテスト実施

**Q9. ドキュメント作成**
→ **回答A**: 運用手順書を作成（マッピング登録手順、エラー対応）

**Q10. ロールバック計画**
→ **回答A**: 準備する（Alembic downgradeスクリプト + データバックアップ）

---

## 2. データモデル変更（Phase1）

### 2.1 supplier_items テーブル

**変更内容:**

| カラム | 現状 | Phase1 | 理由 |
|--------|------|--------|------|
| `maker_part_no` | `VARCHAR(100)` (nullable) | `VARCHAR(100) NOT NULL` | SKUの必須キー |
| `product_id` | `BIGINT` (FK, nullable) | `BIGINT` (FK, nullable) | Phase2用グルーピング（変更なし） |

**Alembic Migration 1: maker_part_no制約チェック**

```python
"""Check maker_part_no nulls before NOT NULL constraint

Revision ID: check_maker_part_no_001
Revises: <previous_revision>
Create Date: 2026-01-27
"""

from alembic import op
import sqlalchemy as sa


def upgrade():
    # Step 1: 空文字・NULL をチェック
    conn = op.get_bind()
    result = conn.execute(
        sa.text("""
            SELECT id, supplier_id, product_id
            FROM supplier_items
            WHERE maker_part_no IS NULL OR maker_part_no = ''
        """)
    )
    rows = result.fetchall()

    if rows:
        raise Exception(
            f"Cannot proceed: {len(rows)} rows have empty maker_part_no. "
            f"Fix data first. IDs: {[r.id for r in rows]}"
        )


def downgrade():
    pass  # No rollback needed for check
```

**Alembic Migration 2: NOT NULL制約追加**

```python
"""Add NOT NULL constraint to maker_part_no

Revision ID: maker_part_no_not_null_002
Revises: check_maker_part_no_001
Create Date: 2026-01-27
"""

from alembic import op


def upgrade():
    # PostgreSQL: ALTER COLUMN
    op.alter_column(
        'supplier_items',
        'maker_part_no',
        nullable=False,
        existing_type=sa.String(100)
    )


def downgrade():
    op.alter_column(
        'supplier_items',
        'maker_part_no',
        nullable=True,
        existing_type=sa.String(100)
    )
```

### 2.2 customer_items テーブル

**変更内容:**

| カラム | 現状 | Phase1 | 理由 |
|--------|------|--------|------|
| `supplier_item_id` | `BIGINT` (FK, nullable) | `BIGINT NOT NULL` (FK) | 必須マッピング |
| `supplier_id` | `BIGINT` (FK, nullable, deprecated) | 削除予定（Phase2） | 非正規化カラム |

**Alembic Migration 3: supplier_item_id制約チェック**

```python
"""Check supplier_item_id nulls before NOT NULL constraint

Revision ID: check_supplier_item_id_003
Revises: maker_part_no_not_null_002
Create Date: 2026-01-27
"""

from alembic import op
import sqlalchemy as sa


def upgrade():
    conn = op.get_bind()
    result = conn.execute(
        sa.text("""
            SELECT id, customer_id, customer_part_no
            FROM customer_items
            WHERE supplier_item_id IS NULL
        """)
    )
    rows = result.fetchall()

    if rows:
        raise Exception(
            f"Cannot proceed: {len(rows)} customer_items have no supplier_item_id. "
            f"Complete mapping first. IDs: {[r.id for r in rows]}"
        )


def downgrade():
    pass
```

**Alembic Migration 4: NOT NULL制約追加**

```python
"""Add NOT NULL constraint to supplier_item_id

Revision ID: supplier_item_id_not_null_004
Revises: check_supplier_item_id_003
Create Date: 2026-01-27
"""

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.alter_column(
        'customer_items',
        'supplier_item_id',
        nullable=False,
        existing_type=sa.BigInteger()
    )


def downgrade():
    op.alter_column(
        'customer_items',
        'supplier_item_id',
        nullable=True,
        existing_type=sa.BigInteger()
    )
```

---

## 3. API変更（Phase1）

### 3.1 仕入先品目API（SupplierItem）

**ファイル**: `backend/app/presentation/schemas/masters/supplier_items_schema.py`

**変更前:**
```python
class SupplierItemCreate(BaseModel):
    product_id: int = Field(..., description="製品ID（必須）")
    supplier_id: int = Field(..., description="仕入先ID")
    maker_part_no: str | None = Field(None, max_length=100)
    is_primary: bool = False
    lead_time_days: int | None = None
    display_name: str | None = None
    notes: str | None = None
```

**変更後:**
```python
class SupplierItemCreate(BaseModel):
    product_id: int | None = Field(None, description="製品ID（オプション、Phase2用）")
    supplier_id: int = Field(..., description="仕入先ID（必須）")
    maker_part_no: str = Field(..., max_length=100, description="メーカー品番（必須）")
    is_primary: bool = False
    lead_time_days: int | None = None
    display_name: str | None = None
    notes: str | None = None
```

**変更点:**
- `product_id`: `int` → `int | None` (オプション化)
- `maker_part_no`: `str | None` → `str` (必須化)

### 3.2 出荷API（Withdrawal）

**ファイル**: `backend/app/application/services/inventory/withdrawal_service.py`

**追加バリデーション:**
```python
def create_withdrawal(self, data: WithdrawalCreate) -> Withdrawal:
    """出荷登録（Phase1: マッピング未登録時はブロック）"""

    # Phase1: customer_item_id のマッピングチェック
    customer_item = self.db.query(CustomerItem).filter(
        CustomerItem.id == data.customer_item_id
    ).first()

    if not customer_item:
        raise HTTPException(
            status_code=404,
            detail="得意先品番マッピングが見つかりません"
        )

    # Phase1制約: supplier_item_id が必須
    if not customer_item.supplier_item_id:
        raise HTTPException(
            status_code=400,
            detail=(
                f"得意先品番 '{customer_item.customer_part_no}' は "
                f"メーカー品番とのマッピングが未設定です。"
                f"マスタ管理から設定してください。"
            )
        )

    # 既存の出荷処理を続行
    ...
```

---

## 4. UI変更（Phase1）

### 4.1 メーカー品番マスタ登録フォーム

**ファイル**: `frontend/src/features/supplier-products/components/SupplierProductForm.tsx`

**変更前:**
```tsx
const schema = z.object({
  product_id: z.coerce.number().min(1, "商品を選択してください"),
  supplier_id: z.coerce.number().min(1, "仕入先を選択してください"),
  maker_part_no: z.string().optional(),
  is_primary: z.boolean().default(false),
  lead_time_days: z.number().nullable(),
});
```

**変更後:**
```tsx
const schema = z.object({
  product_id: z.coerce.number().optional().nullable(),  // オプション化
  supplier_id: z.coerce.number().min(1, "仕入先を選択してください"),
  maker_part_no: z.string().min(1, "メーカー品番を入力してください"),  // 必須化
  is_primary: z.boolean().default(false),
  lead_time_days: z.number().nullable(),
  display_name: z.string().optional(),
  notes: z.string().optional(),
});
```

**フォームフィールド変更:**

```tsx
{/* 仕入先（必須） */}
<FormField
  control={form.control}
  name="supplier_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel>仕入先 <span className="text-red-500">*</span></FormLabel>
      <Select onValueChange={field.onChange} value={field.value?.toString()}>
        {/* 仕入先リスト */}
      </Select>
    </FormItem>
  )}
/>

{/* メーカー品番（必須・Phase1重要） */}
<FormField
  control={form.control}
  name="maker_part_no"
  render={({ field }) => (
    <FormItem>
      <FormLabel>メーカー品番 <span className="text-red-500">*</span></FormLabel>
      <Input
        {...field}
        placeholder="例: ABC-12345"
        className="font-mono"
      />
      <FormDescription>
        仕入先が使用している品番を入力してください（在庫管理の基準）
      </FormDescription>
    </FormItem>
  )}
/>

{/* 商品構成（オプション・Phase2用） */}
<FormField
  control={form.control}
  name="product_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel>商品構成 <span className="text-gray-400">(オプション)</span></FormLabel>
      <Select
        onValueChange={field.onChange}
        value={field.value?.toString()}
      >
        <SelectTrigger>
          <SelectValue placeholder="Phase2で設定（省略可）" />
        </SelectTrigger>
        {/* 商品リスト */}
      </Select>
      <FormDescription>
        Phase1では省略可能。複数メーカー品番をまとめる場合のみ設定。
      </FormDescription>
    </FormItem>
  )}
/>
```

### 4.2 得意先品番マッピングフォーム

**ファイル**: `frontend/src/features/customer-items/components/CustomerItemFormBasicSection.tsx`

**追加バリデーション表示:**

```tsx
<FormField
  control={form.control}
  name="supplier_item_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel>
        メーカー品番 <span className="text-red-500">*</span>
      </FormLabel>
      <Select onValueChange={field.onChange} value={field.value?.toString()}>
        {/* メーカー品番リスト */}
      </Select>
      <FormDescription className="text-amber-600">
        ⚠️ Phase1必須: マッピング未設定の場合は出荷できません
      </FormDescription>
      {!field.value && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            メーカー品番の設定は必須です。設定しない場合、この得意先品番での出荷処理がブロックされます。
          </AlertDescription>
        </Alert>
      )}
    </FormItem>
  )}
/>
```

### 4.3 出荷エラー表示

**ファイル**: `frontend/src/features/withdrawals/components/WithdrawalForm.tsx`

**エラーハンドリング追加:**

```tsx
const handleSubmit = async (data: WithdrawalFormData) => {
  try {
    await createWithdrawal(data);
    toast.success("出荷を登録しました");
  } catch (error) {
    if (error.response?.status === 400) {
      const detail = error.response?.data?.detail;
      if (detail?.includes("マッピングが未設定")) {
        toast.error(
          "この得意先品番はメーカー品番とのマッピングが未設定です。" +
          "マスタ管理から設定してください。",
          { duration: 5000 }
        );
        return;
      }
    }
    toast.error(`出荷登録に失敗しました: ${error.message}`);
  }
};
```

---

## 5. データ移行戦略（Phase1）

### 5.1 既存データの分類

**A. そのまま使えるデータ（理想）**
- `supplier_items.maker_part_no` が正しく入力済み
- `customer_items.supplier_item_id` が設定済み

**B. 修正可能なデータ**
- `supplier_items.maker_part_no` が空だが、`products.maker_part_code` から復元可能
- `customer_items.supplier_item_id` が未設定だが、`customer_items.supplier_id` + ビジネスロジックで補完可能

**C. 要再作成データ**
- `supplier_items.maker_part_no` が完全に欠損
- `customer_items` のマッピングが不明

### 5.2 移行手順（確定版）

**前提**: 100%のマッピング完了を待つ（回答A採用）

**Step 1: データ監査スクリプト実行**

```bash
# 移行前チェック（全数調査）
docker compose exec backend python -m app.scripts.phase1_audit
```

**期待される出力:**
```
=== Phase1 Data Audit Report ===
[supplier_items]
- Total: 1,234 rows
- maker_part_no NULL/empty: 0 rows  ← 0であることを確認
- product_id NULL: 567 rows (OK, Phase1では許容)

[customer_items]
- Total: 2,345 rows
- supplier_item_id NULL: 0 rows  ← 0であることを確認
- Active mappings: 2,345 rows

[OK] Ready for Phase1 migration
```

**Step 2: Alembic Migration実行（本番）**

```bash
# バックアップ取得
docker compose exec postgres pg_dump -U postgres lot_management > backup_before_phase1.sql

# Migration実行
docker compose exec backend alembic upgrade head

# 結果確認
docker compose exec backend alembic current
```

**Step 3: 動作確認テスト**

```bash
# テストスイート実行
docker compose exec backend pytest tests/integration/phase1/ -v

# 手動テスト項目:
# 1. メーカー品番マスタで maker_part_no 未入力時にエラー
# 2. 得意先品番マッピングで supplier_item_id 未選択時にエラー
# 3. マッピング未設定の得意先品番で出荷時にエラー
```

---

## 6. テスト計画（Phase1）

### 6.1 DB制約テスト

**ファイル**: `backend/tests/integration/test_phase1_constraints.py`

```python
def test_supplier_item_maker_part_no_required(db_session):
    """maker_part_no が NULL の場合は INSERT 失敗"""
    with pytest.raises(IntegrityError):
        si = SupplierItem(
            supplier_id=1,
            product_id=None,  # OK
            maker_part_no=None,  # NG
        )
        db_session.add(si)
        db_session.commit()


def test_customer_item_supplier_item_id_required(db_session):
    """supplier_item_id が NULL の場合は INSERT 失敗"""
    with pytest.raises(IntegrityError):
        ci = CustomerItem(
            customer_id=1,
            customer_part_no="CUST-001",
            supplier_item_id=None,  # NG
        )
        db_session.add(ci)
        db_session.commit()
```

### 6.2 APIバリデーションテスト

**ファイル**: `backend/tests/api/test_phase1_withdrawal_validation.py`

```python
def test_withdrawal_blocks_unmapped_customer_item(client, auth_headers):
    """マッピング未設定の customer_item で出荷がブロックされる"""
    # Setup: customer_item with supplier_item_id = NULL
    # (この時点でDB制約があるため、実際には作成不可)

    response = client.post(
        "/api/withdrawals",
        json={
            "customer_item_id": 999,  # 存在しないID
            "quantity": 10,
        },
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert "マッピングが未設定" in response.json()["detail"]
```

### 6.3 UIテスト（手動）

**チェックリスト:**

- [ ] メーカー品番マスタ登録時、`maker_part_no` が必須入力であることを確認
- [ ] メーカー品番マスタ登録時、`product_id` が省略可能であることを確認
- [ ] 得意先品番マッピング登録時、`supplier_item_id` が必須であることを確認
- [ ] マッピング未設定の得意先品番で出荷時にエラートーストが表示されることを確認
- [ ] エラーメッセージが日本語で明確であることを確認

---

## 7. デプロイ手順（Phase1）

### 7.1 テスト環境デプロイ（先行検証）

```bash
# 1. テスト環境のバックアップ取得
ssh test-server
cd /app/lot-management-system
docker compose exec postgres pg_dump -U postgres lot_management > backup_test_$(date +%Y%m%d).sql

# 2. コードデプロイ
git pull origin feature/phase1-sku-enforcement
docker compose build
docker compose up -d

# 3. Migration実行
docker compose exec backend alembic upgrade head

# 4. 動作確認
docker compose exec backend pytest tests/integration/phase1/ -v
```

### 7.2 本番環境デプロイ

**前提条件:**
- [ ] テスト環境で1週間以上の運用実績
- [ ] 全ての既存データのマッピングが完了（100%）
- [ ] ロールバック手順の確認完了

**デプロイ手順:**

```bash
# 1. メンテナンスモード ON（推奨）
# - ユーザーへの事前通知（1週間前）

# 2. 本番バックアップ取得
ssh prod-server
cd /app/lot-management-system
docker compose exec postgres pg_dump -U postgres lot_management > backup_prod_phase1_$(date +%Y%m%d_%H%M%S).sql

# 3. コードデプロイ
git pull origin main  # feature/phase1-sku-enforcement がマージ済み
docker compose build
docker compose up -d

# 4. Migration実行
docker compose exec backend alembic upgrade head

# 5. スモークテスト
curl http://localhost:8000/api/health
docker compose exec backend pytest tests/integration/phase1/test_smoke.py -v

# 6. メンテナンスモード OFF
# - ユーザーへの完了通知
```

### 7.3 ロールバック手順

**Phase1 Migration のロールバック:**

```bash
# 1. Alembic downgrade
docker compose exec backend alembic downgrade -1  # 1つ前のリビジョンに戻す

# 2. コードロールバック
git checkout <previous_commit>
docker compose build
docker compose up -d

# 3. データ復元（最悪の場合）
docker compose exec postgres psql -U postgres lot_management < backup_prod_phase1_<timestamp>.sql

# 4. 動作確認
curl http://localhost:8000/api/health
```

---

## 8. 運用手順書（Phase1）

### 8.1 新規メーカー品番の登録手順

**対象ユーザー**: マスタ管理者

1. **マスタ管理** → **メーカー品番マスタ** を開く
2. **新規登録** ボタンをクリック
3. 以下を入力:
   - **仕入先** (必須): プルダウンから選択
   - **メーカー品番** (必須): 仕入先の品番を入力（例: `ABC-12345`）
   - **商品構成** (オプション): Phase1では省略可（Phase2で設定）
   - **表示名** (オプション): 社内呼称があれば入力
   - **リードタイム** (オプション): 日数を入力
4. **登録** ボタンをクリック
5. 成功メッセージを確認

**注意事項:**
- `メーカー品番` は仕入先内で一意である必要があります
- 同じ仕入先で同じメーカー品番を登録するとエラーになります

### 8.2 得意先品番マッピングの登録手順

**対象ユーザー**: マスタ管理者

1. **マスタ管理** → **得意先品番マスタ** を開く
2. **新規登録** ボタンをクリック
3. 以下を入力:
   - **得意先** (必須): プルダウンから選択
   - **得意先品番** (必須): 得意先の品番を入力
   - **メーカー品番** (必須): プルダウンから選択
   - **納入先** (オプション): 必要に応じて選択
4. **登録** ボタンをクリック
5. 成功メッセージを確認

**Phase1の重要事項:**
- **メーカー品番の設定は必須です**
- 設定しない場合、この得意先品番での出荷処理がブロックされます
- 警告メッセージが表示された場合は、必ずメーカー品番を選択してください

### 8.3 出荷エラー時の対応手順

**エラーメッセージ例:**
```
得意先品番 'CUST-001' はメーカー品番とのマッピングが未設定です。
マスタ管理から設定してください。
```

**対応手順:**

1. **マスタ管理** → **得意先品番マスタ** を開く
2. 検索バーでエラーメッセージの得意先品番（例: `CUST-001`）を検索
3. 該当レコードをクリックして詳細を開く
4. **編集** ボタンをクリック
5. **メーカー品番** を選択（未設定の場合）
6. **更新** ボタンをクリック
7. 出荷処理を再試行

---

## 9. Phase1完了基準

### 9.1 技術的完了基準

- [ ] Alembic Migration 4本が全て成功
- [ ] `supplier_items.maker_part_no` が NOT NULL 制約付き
- [ ] `customer_items.supplier_item_id` が NOT NULL 制約付き
- [ ] APIバリデーションテストが全て PASS
- [ ] UIテストチェックリストが全て完了
- [ ] テスト環境で1週間以上の運用実績

### 9.2 運用的完了基準

- [ ] 運用手順書が作成され、管理者に共有済み
- [ ] マッピング未設定の customer_items が 0件
- [ ] メーカー品番マスタの maker_part_no が 100% 入力済み
- [ ] ユーザーからのPhase1関連問い合わせが 0件（1週間）

### 9.3 Phase2移行準備

- [ ] productsテーブルの再設計が文書化済み
- [ ] グルーピング機能の要件定義が完了
- [ ] Phase1運用で発見された課題がBacklogに記録済み

---

## 10. 参考資料

- **問題分析**: `docs/issues/品番マスタ設計の矛盾と問題点.md`
- **CHANGELOG**: `CHANGELOG.md`
- **プロジェクト概要**: `CLAUDE.md`
- **Backlog**: `docs/project/BACKLOG.md`

---

**次のステップ**: このドキュメントを承認後、以下の順で実装を開始します:

1. Backend: Alembic Migration 4本を作成
2. Backend: API Schema変更（supplier_items_schema.py）
3. Backend: 出荷APIバリデーション追加（withdrawal_service.py）
4. Frontend: メーカー品番マスタフォーム修正（SupplierProductForm.tsx）
5. Frontend: 得意先品番マッピングフォーム修正（CustomerItemFormBasicSection.tsx）
6. テスト: DB制約テスト + APIテスト実装
7. 運用手順書: 最終版作成
8. テスト環境デプロイ + 1週間検証

**作成者**: Claude Sonnet 4.5
**最終更新**: 2026-01-27
