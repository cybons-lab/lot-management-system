# TODO

このドキュメントには、今後実装が必要なタスクをまとめています。

## テストデータ生成の問題

### inventory_scenarios のデータが正しく表示されない

**優先度: 高**

**問題:**
- [x] 管理画面の「テストデータ生成」実行後、在庫一覧で inventory-scenario のロットが以下の状態になっている：
  - 利用可能数量: 0（期待値: 100など）
  - 確定引当数量: 0（期待値: 30など）
  - 現在在庫が consumed_quantity により減少している

**原因調査:**
1. ✅ `inventory_scenarios.py` の outbound テーブルエラーを修正（outbound テーブルが存在しない場合でもスキップ）
2. ✅ `withdrawals.py` で inventory-scenario ロットを除外するフィルタを追加
3. ✅ `v_lot_details` と `v_inventory_summary` ビューを修正し、`current_quantity` を `received - consumed` から動的に計算するように変更（物理カラムの不整合を解消）

**解決:** 
- 2026-01-18: マイグレーション `b77dcffc2d98` によりビュー定義を修正し、消費（consumed）が現在在庫に即座に反映されるようになりました。

**備考 (Schema Notes):**
- `outbound_instructions`, `outbound_allocations`:
  - これらはコード上（テストデータ生成スクリプト等）に一部名称が登場しますが、現時点のデータベース・スキーマには存在しません。
  - おそらく将来的な出荷指示・引当管理機能のために予約されている名称であり、現状は無視して問題ありません（存在しない場合はスキップされます）。

**関連ファイル:**
- `backend/app/application/services/test_data/inventory_scenarios.py`
- `backend/app/application/services/test_data/withdrawals.py`
- `docs/testing/inventory-test-data-scenarios.md`（期待される仕様）

**参考:**
```sql
-- inventory-scenario ロットの現在の状態を確認
SELECT lr.id, lm.lot_number, lr.received_quantity, lr.consumed_quantity,
       lr.locked_quantity, (lr.received_quantity - lr.consumed_quantity) as current_qty,
       COALESCE(SUM(res.reserved_qty) FILTER (WHERE res.status = 'confirmed'), 0) as confirmed
FROM lot_receipts lr
JOIN lot_master lm ON lm.id = lr.lot_master_id
LEFT JOIN lot_reservations res ON res.lot_id = lr.id
WHERE lr.origin_reference LIKE '%inventory-scenario%'
GROUP BY lr.id, lm.lot_number, lr.received_quantity, lr.consumed_quantity, lr.locked_quantity
ORDER BY lr.id;
```

---

## 未実装 API エンドポイント

以下のPOSTエンドポイントはテストコード（`tests/error_scenarios/`）に記載がありますが、まだ実装されていません。

### 優先度: 中

| エンドポイント | 説明 | 関連テスト |
|---------------|------|-----------|
| `POST /api/roles/` | ロール作成API | `test_constraints.py::test_duplicate_role_code` |
| `POST /api/orders/` | 受注作成API | `test_validation_errors.py::test_create_order_validation_error` |
| `POST /api/inbound-plans/` | 入荷計画作成API | `test_validation_errors.py::test_create_inbound_plan_validation_error` |
| `POST /api/adjustments/` | 在庫調整作成API | `test_validation_errors.py::test_create_adjustment_validation_error` |

> **Note**: これらのテストは現在 `@pytest.mark.skip` でスキップされています。
> 実装完了後、スキップマーカーを削除してテストを有効化してください。

---

*最終更新: 2026-01-10*
