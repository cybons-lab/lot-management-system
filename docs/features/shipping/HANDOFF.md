# OCR受注登録機能 引き継ぎプロンプト

トークンが切れた場合、以下のプロンプトで作業を再開してください。

---

## 再開プロンプト

```
docs/shipping/ 配下のドキュメントを確認して、OCR受注登録機能の実装を継続してください。

- docs/shipping/ocr_order_register_ai_handoff.md - 業務要件・ヘッダ定義
- docs/shipping/implementation_plan.md - 実装計画
- docs/shipping/task.md - タスクリスト

現在の状況:
- ブランチ: feature/shipping-master
- 完了: docs/shipping 配下にドキュメント整備済み

次のステップ:
1. task.md の進捗を確認
2. 未完了のタスクから実装を再開
3. Phase 1 から順番に実装

重要な設計方針:
- 出荷用マスタデータは既存マスタ（得意先・仕入先など）と独立動作
- ForeignKey制約なし、コードが既存マスタになくてもOK
- 縦持ちデータは既存の smartread_long_data を使用
```

---

## 関連ファイル

### バックエンド
- `backend/app/infrastructure/persistence/models/smartread_models.py` - 既存OCRモデル
- `backend/app/infrastructure/persistence/models/shipping_master_models.py` - 新規作成予定

### フロントエンド
- `frontend/src/features/masters/` - 既存マスタページ
- `frontend/src/features/shipping-master/` - 新規作成予定
- `frontend/src/features/ocr-result/` - 新規作成予定
