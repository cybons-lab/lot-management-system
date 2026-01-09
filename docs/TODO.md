# TODO

このドキュメントには、今後実装が必要なタスクをまとめています。

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
