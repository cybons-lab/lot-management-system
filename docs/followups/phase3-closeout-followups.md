# Phase 3 Close-out Followups

Phase 3 (商品構成マスタ「メーカー品番(旧)」撤去 / external_product_code完全撤去) の残件を記録する。

---

## A) openapi.json の stale 問題（このPRで対応済み）

### 現状
- Phase 3 のコード変更（router/schema）完了後、`openapi.json` が再生成されていなかった
- 結果として `external_product_code` / `maker_item_code` が openapi.json に残存

### 対応
- `openapi.json` を再生成し、コード（router/schema）と整合
- `npm run typegen` でフロントエンド型も同期

### Done定義
- [x] `external_product_code` が openapi.json から消えていること
- [x] `maker_item_code` が openapi.json から消えていること
- [x] `npm run typegen && npm run typecheck && npm run lint` がPASS

### 確認コマンド
```bash
rg -n "external_product_code" backend/app/openapi.json || echo "NOT FOUND"
rg -n "maker_item_code" backend/app/openapi.json || echo "NOT FOUND"
```

---

## B) maker_item_code の内部検索参照の整理（Phase 4）

### 背景
- `products.maker_item_code` は UI/API/CSV から撤去済み
- ただし内部検索（サービス層）で参照が残っている

### 残存箇所
| ファイル | 行 | 用途 |
|---------|-----|------|
| `backend/app/application/services/inventory/intake_history_service.py` | 118 | 検索条件（ilike） |
| `backend/app/application/services/inventory/withdrawal_service.py` | 181 | 検索条件（ilike） |

### リスク
- 外部露出はないため緊急度は低い
- ただしDB列DROPの前に解消が必要

### 対応方針
1. 検索条件から `maker_item_code` を除去、または `maker_part_code` に統一
2. 回帰テスト（検索機能）の動作確認

### Done定義
- [ ] `rg -n "maker_item_code" backend/app` で参照がモデル定義のみ
- [ ] intake_history / withdrawal の検索テストがPASS

### 確認コマンド
```bash
rg -n "maker_item_code" backend/app/application
```

### 今PRでは対応しない理由
- 影響範囲の調査と回帰テストが必要
- Phase 4 で DB列DROP と合わせて対応する方が効率的

---

## C) legacy DB列のDROP（Phase 4/5）

### 対象列
| テーブル | 列名 | 現状 |
|---------|------|------|
| `products` | `customer_part_no` | runtime参照ゼロ（SSOTは customer_items） |
| `products` | `maker_item_code` | 内部検索でのみ参照（B の解消後にDROP可能） |

### 前提条件
1. (B) の内部検索参照を先に解消
2. 参照がモデル定義のみになったことを確認

### 対応方針
1. Alembic マイグレーションで DROP COLUMN
2. SQLAlchemy モデルから列定義を削除
3. 既存データは削除されるため、バックアップ不要（既に使用されていない）

### Done定義
- [ ] `rg -n "maker_item_code" backend/app` が 0件
- [ ] `rg -n "Product\.customer_part_no" backend/app` が 0件
- [ ] マイグレーション適用後のテストがPASS

### 確認コマンド
```bash
rg -n "maker_item_code" backend/app
rg -n "Product\.customer_part_no" backend/app
rg -n "products\.customer_part_no" backend/app
```

### 今PRでは対応しない理由
- (B) の解消が先に必要
- DB スキーマ変更は影響範囲が大きいため、独立した PR で対応

---

## 対応順序

1. **Phase 3 (このPR)**: openapi.json 再生成、docs 記録
2. **Phase 4**: maker_item_code 内部検索参照の解消 → DB列DROP
3. **Phase 5** (optional): customer_part_no 列の DROP（必要に応じて）

---

## 関連ファイル

- `backend/app/presentation/schemas/masters/products_schema.py` - スキーマ定義
- `backend/app/infrastructure/persistence/models/masters_models.py` - DBモデル
- `backend/app/application/services/inventory/intake_history_service.py` - 検索サービス
- `backend/app/application/services/inventory/withdrawal_service.py` - 検索サービス

---

## 変更履歴

- 2026-01-25: 初版作成（Phase 3 close-out）
