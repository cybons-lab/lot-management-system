# SmartRead 同期問題 調査レポート

## 作成日: 2026-01-20

## 1. 問題の概要

SmartReadのOCR処理で、横持ちデータ（wide_data）は正常に取得できるが、**バックエンドでの縦持ち変換（long_data）が0件になる**問題が発生している。

## 2. 調査結果

### 判明した事実

1. **横持ちデータは正常に取得できている**
   - コンソールログ: `Wide data count: 1`
   - SmartRead APIからのZIPダウンロード・CSV抽出は成功

2. **バックエンドの縦持ち変換が0件を返している**
   - コンソールログ: `Long data count from server: 0`
   - バックエンドログに変換ログが出力されない（ログレベル問題 or 変換前に失敗）

3. **フロントエンドの縦持ち変換は正常に動作する**
   - コンソールログ: `[TRANSFORM] Transformation complete: 1 wide rows → 1 long rows, 0 errors`
   - コンソールログ: `[SmartRead] Frontend transformation result: 1 long rows`
   - フォールバックとしてフロントエンド変換を使用するロジックが動作

4. **横持ちデータのカラム名**（コンソールログより）
   ```
   便, 単位3, 単位4, 単位5, 次区3, 次区4, 次区5, 購買3, 購買4, 購買5, 
   Lot No1-1, Lot No1-2, Lot No2-1, Lot No2-2, Lot No3-1, Lot No3-2, 
   Lot No4-1, Lot No4-2, Lot No5-1, Lot No5-2, 単位1, 単位2, 受注者, 
   次区1, 次区2, 発注者, 発行日, 納入日, 購買1, 購買2, 納入量3, 
   納入量4, 納入量5, 納品書No, 梱包数1-1, 梱包数1-2, 梱包数2-1, 梱包数2-2,
   梱包数3-1, 梱包数3-2, 梱包数4-1, 梱包数4-2, 梱包数5-1, 梱包数5-2,
   納入量1, 納入量2, アイテム3, アイテム4, アイテム5, アイテム1, アイテム2,
   ファイル名, ページ番号, 発注事業所, 材質コード3, 材質コード4, 材質コード5,
   材質サイズ3, 材質サイズ4, 材質サイズ5, 出荷場所名称, 材質コード1, 材質コード2,
   材質サイズ1, 材質サイズ2, テンプレート名
   ```

## 3. 問題の根本原因

**バックエンドの `csv_transformer.py` が正しく動作していない**

考えられる原因：
1. ログレベルが抑制されていてデバッグログが出力されない
2. `transform_to_long` メソッドが呼ばれる前に処理が失敗している
3. 変換ロジック自体に問題がある

## 4. 現在の暫定対応

`frontend/src/features/rpa/smartread/hooks.ts` に以下のフォールバックを実装済み：

```typescript
// サーバーが0件を返した場合、フロントエンドで変換を試みる
if (res.wide_data.length > 0 && res.long_data.length === 0) {
  const { SmartReadCsvTransformer } = await import("./utils/csv-transformer");
  const transformer = new SmartReadCsvTransformer();
  const frontendResult = transformer.transformToLong(res.wide_data, true);
  if (frontendResult.long_data.length > 0) {
    res.long_data = frontendResult.long_data;
    res.errors = frontendResult.errors;
  }
}
```

## 5. 必要な修正

### 高優先度

1. **バックエンドのログレベルを確認・修正**
   - `backend/app/application/services/smartread/csv_transformer.py` のログが出力されるようにする
   - `logging.DEBUG` レベルのログが抑制されている可能性

2. **バックエンドの `csv_transformer.py` を調査**
   - `transform_to_long` メソッドが正しく呼ばれているか
   - `_extract_details` メソッドで明細が抽出されているか
   - `_is_empty_detail` メソッドの判定条件

3. **バックエンドとフロントエンドの変換ロジックの差分を確認**
   - フロントエンド: `frontend/src/features/rpa/smartread/utils/csv-transformer.ts`
   - バックエンド: `backend/app/application/services/smartread/csv_transformer.py`
   - なぜフロントエンドは動作してバックエンドは動作しないのか

### 中優先度

4. **DBへのlong_data保存フローの確認**
   - `_save_wide_and_long_data` メソッドで再変換している箇所がある
   - そこで0件になっている可能性

5. **IDBキャッシュの整合性**
   - 古いキャッシュが残っていると問題が発生する
   - キャッシュクリア機能の追加を検討

## 6. 関連ファイル

### バックエンド
- `backend/app/application/services/smartread/smartread_service.py`
  - `sync_task_results` メソッド (L523-604)
  - `get_export_csv_data` メソッド (L650-777)
  - `_save_wide_and_long_data` メソッド (L792-906)
- `backend/app/application/services/smartread/csv_transformer.py`
  - `transform_to_long` メソッド (L80-127)
  - `_extract_details` メソッド (L137-185)
  - `_is_empty_detail` メソッド (L187-196)

### フロントエンド
- `frontend/src/features/rpa/smartread/hooks.ts`
  - `useSyncTaskResults` (L633-727) - フォールバック実装済み
- `frontend/src/features/rpa/smartread/utils/csv-transformer.ts`
  - 正常に動作している変換ロジック
- `frontend/src/features/rpa/smartread/db/export-cache.ts`
  - IDBキャッシュ

### UI
- `frontend/src/features/rpa/smartread/components/SmartReadResultView.tsx`
  - 横持ち・縦持ちデータの表示

## 7. 次のステップ

1. バックエンドの `csv_transformer.py` にログを追加してpush済み（`logger.info`レベル）
   - ただしログが出力されていない → ログレベル設定を確認

2. フロントエンドのフォールバックが動作しているため、暫定的にはデータ表示可能

3. **根本対応**: バックエンドの変換ロジックをフロントエンドと同じように動作させる

## 8. 確認用コマンド

```bash
# バックエンドのログレベル確認
grep -r "logging" backend/app/core/config.py

# csv_transformerのログ確認
grep -r "logger" backend/app/application/services/smartread/csv_transformer.py
```

## 9. 補足

- 開発環境ではテストデータで正常に動作している
- 本番環境のSmartRead APIからの実データで問題が発生
- ローカルでPythonを直接叩くとCSVは正常に取得できる
