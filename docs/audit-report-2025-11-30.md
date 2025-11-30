# コードベース監査レポート (2025-11-30)

## 概要
プロジェクト全体の健全性を確認するため、孤立ファイル（未使用ファイル）の検出とTODOコメントの集計を行いました。

## 1. 孤立ファイルの可能性が高いファイル

以下のファイルは、プロジェクト内の他のファイルからインポートされていない可能性があります。

### Frontend
*   **`features/inventory/components/LotListPanel.tsx`**: リファクタリング対象でしたが、現在どのページからも使用されていない可能性があります。
*   **`shared/utils/csv-parser.ts`**: `shared/libs/csv.ts` に機能が移行された可能性があります。
*   **`features/inventory/pages/LotsPage/columns.tsx`**: `LotsPage` コンポーネント自体が見当たらないため、孤立している可能性があります。

### Backend
*   **`services/allocations/tracing.py`**: リファクタリングにより不要になった可能性があります。
*   **`services/common/operation_log_service.py`**: 使用箇所が見当たりません。

## 2. TODO / FIXME 集計

*   **TODO**: 23箇所
*   **FIXME**: 0箇所

## 3. 推奨アクション

1.  **`LotListPanel.tsx` の確認**: 本当に不要であれば削除する。もし将来使う予定であれば、その旨をコメントに残すか、ストーリーブック等で管理する。
2.  **`csv-parser.ts` の削除**: `shared/libs/csv.ts` で代替できているなら削除する。
3.  **Backendの不要ファイル削除**: `tracing.py` など、リファクタリングの残骸を削除する。
4.  **TODOの消化**: 優先度の高いものから着手する。

## 4. 補足: 検出スクリプト
`tools/find_orphans.py` を使用して検出しました。
