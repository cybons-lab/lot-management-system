# リファクタリング概要と実施報告 (2025-11-29)

## 1. 目的
本プルリクエストは、以下の主要な目的のために実施されました。
1.  **フロントエンドのアーキテクチャ標準化**: 機能ごとのディレクトリ構成（`features/*`）への移行と、データフェッチロジックの統一。
2.  **HTTPクライアントの刷新**: `axios` から軽量でモダンな `ky` への移行。
3.  **バックエンドの型安全性向上**: `BaseService` のジェネリクス強化による型エラーの解消。

## 2. 主な変更点

### バックエンド
*   **`BaseService` の型定義修正**: `IDType` ジェネリクスを追加し、IDの型（`int` vs `UUID`）を明示的に指定できるようにしました。これに伴い、全ての継承サービス（`ProductService`, `UserService` 等）を修正しました。
*   **サービスのリネーム**: `AssignmentService` を `UserSupplierAssignmentService` に変更し、実態に即した名前にしました。

### フロントエンド
*   **APIパスの修正**: バックエンドのルーティング（`/api/masters/*`）に合わせて、フロントエンドのAPI呼び出しパスを修正しました。
*   **`ky` への移行**: `http-client.ts` を `ky` ベースに書き換え、`prefixUrl` を設定しました。
*   **API呼び出しの標準化**: `useMasterApi` フックを作成し、マスターデータのCRUD操作を共通化しました。

## 3. 直面した課題と解決策

### 課題1: APIパスの不一致による404エラー
**現象**: フロントエンドから `/products` などを呼び出していたが、バックエンドは `/api/masters/products` で待ち受けていたため、404エラーが発生。
**解決策**: `useProducts` などのフック内で、パスを `masters/products` に修正しました。また、レガシーな `master-service.ts` の `BASE_PATH` も `/masters` に変更しました。

### 課題2: `ky` の `prefixUrl` 仕様によるエラー
**現象**: `ky` の `prefixUrl` オプションを使用している場合、入力URLの先頭に `/` があるとエラー（`'input' must not begin with a slash`）が発生したり、絶対パスとして扱われて `prefixUrl` が無視されたりする問題が発生。
**解決策**: 全ての `api.ts` および `master-service.ts` から、APIパスの先頭のスラッシュを削除しました（例: `/orders` -> `orders`）。

### 課題3: 既存コンポーネントの依存関係とリファクタリングの複雑さ
**現象**: `BulkImportDialog` などのコンポーネントが、古い `useXXXMutations` フックに強く依存しており、新しい `useMasterApi` ベースへの移行が難航。型エラーが多発し、機能停止のリスクがあった。
**解決策**: **一時的な妥協**として、削除した `useXXXMutations.ts` ファイルを復元し、内部で新しい `api.ts` の関数を呼び出す形に修正しました。これにより、既存機能を維持しつつ、API呼び出し部分のみを共通化することに成功しました。

## 4. 残存する課題 (Technical Debt) と今後の対応

今回の対応でシステムは正常に動作するようになりましたが、以下の技術的負債が残っています。これらは別途タスクとして解消することを推奨します。

1.  **[解消済み] `master-service.ts` の完全廃止**:
    *   `src/services/api/master-service.ts` は削除され、`useMastersQuery.ts` や `useLotAllocationLogic.ts` は新しい `ky` クライアントを使用するようにリファクタリングされました。
2.  **[解消済み] `useXXXMutations.ts` のリファクタリング**:
    *   `useProductMutations.ts` および `useCustomerMutations.ts` は削除され、コンポーネントは直接 `useMutation` を使用するように修正されました。
3.  **[解消済み] 型定義の厳密化**:
    *   `SupplierProductResponse` や `UomConversionResponse` などの型定義を追加し、`any` 型の使用を排除しました。

## 5. 結論
本PRにより、フロントエンドとバックエンドの基本的な連携エラーは解消され、主要な機能（受注管理、在庫管理、マスター管理、需要予測、ロット引当）は正常に動作する状態になりました。アーキテクチャの移行は道半ばですが、基盤となる部分は整備されました。
