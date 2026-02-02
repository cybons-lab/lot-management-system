# Phase1 ビュー修正ガイド（管理画面版）

## 概要

本番環境で `v_lot_receipt_stock` ビューに `supplier_item_id` 列が存在しないため、在庫関連ページで 500 エラーが発生する問題を修正するツールです。

**新機能:** 管理画面から簡単に診断・修正できるようになりました！

---

## 🎯 推奨方法: 管理画面から実行

### 手順

1. **管理者でログイン**
   - ユーザー名: `admin`
   - パスワード: `admin123`（本番環境では変更してください）

2. **システム設定ページへ移動**
   - URL: `http://localhost:3000/system-settings`
   - または、グローバルナビゲーション → 「システム設定」

3. **「デバッグ・開発設定」セクションを開く**
   - 一番下に「ビュー定義診断（Phase1対応）」セクションがあります

4. **ビューをチェック**
   - 「ビューをチェック」ボタンをクリック
   - ✅ **正常です** → 修正不要
   - ❌ **修正が必要です** → 次のステップへ

5. **ビューを修正**
   - 「ビューを修正」ボタンをクリック
   - 成功メッセージが表示されたら完了

6. **動作確認**
   - 在庫ページ (`/inventory`) にアクセス
   - エラーが出ないことを確認

---

## 📋 管理画面のメリット

| 項目 | 管理画面 | Pythonスクリプト |
|------|---------|----------------|
| 環境変数 | ✅ 自動取得 | ❌ 手動で指定 |
| パスワード入力 | ✅ 不要 | ❌ 毎回必要 |
| 認証 | ✅ ログイン済み | ❌ 別途トークン取得 |
| Windows対応 | ✅ ブラウザのみ | ⚠️ Python環境必要 |
| エラー表示 | ✅ わかりやすい | ❌ コンソール出力 |

---

## 🛠️ 代替方法: APIを直接呼び出す

curlでも実行できます（管理画面が使えない場合）:

```bash
# 1. トークン取得
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

# 2. ビューチェック
curl -s http://localhost:8000/api/admin/diagnostics/view-check \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# 3. ビュー修正（必要な場合）
curl -s -X POST http://localhost:8000/api/admin/diagnostics/view-fix \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

---

## 📦 API仕様

### GET /api/admin/diagnostics/view-check

**説明:** ビュー定義を診断

**認証:** Admin権限必要

**レスポンス例:**
```json
{
  "view_name": "v_lot_receipt_stock",
  "has_supplier_item_id": true,
  "column_count": 47,
  "columns": ["lot_id", "supplier_item_id", ...],
  "message": "OK: supplier_item_id column exists"
}
```

### POST /api/admin/diagnostics/view-fix

**説明:** ビュー定義を修正

**認証:** Admin権限必要

**レスポンス例:**
```json
{
  "success": true,
  "message": "View recreated successfully",
  "view_name": "v_lot_receipt_stock",
  "has_supplier_item_id": true,
  "columns_before": [...],
  "columns_after": [...]
}
```

---

## 🔧 技術詳細

### バックエンド実装

**ファイル:** `backend/app/presentation/api/routes/admin/admin_router.py`

**追加したエンドポイント:**
- `GET /api/admin/diagnostics/view-check` - ビュー診断
- `POST /api/admin/diagnostics/view-fix` - ビュー修正

**特徴:**
- 環境変数から自動的にDB接続情報を取得
- `engine.connect()` でダイレクトSQL実行
- トランザクション管理（`engine.begin()`）
- 修正前後の列情報を返却

### フロントエンド実装

**ファイル:** `frontend/src/features/admin/pages/SystemSettingsPage.tsx`

**追加したUI:**
- ビューチェックボタン
- ビュー修正ボタン（エラー時のみ表示）
- ステータス表示（idle / checking / ok / error）

**特徴:**
- `http.get()` / `http.post()` で認証付きリクエスト
- `toast` で結果をユーザーに通知
- アイコンで視覚的にステータス表示

---

## ⚠️ 注意事項

1. **本番環境でも実行可能**
   - ビューの再作成はデータ削除を伴いません
   - ただし、念のためバックアップ推奨

2. **冪等性**
   - 何度実行しても同じ結果になります
   - 既に正常な場合は「正常です」と表示されます

3. **権限**
   - Admin権限が必要です
   - 一般ユーザーでは実行できません

---

## 📝 旧スクリプトとの比較

### 削除可能なファイル（管理画面で代替済み）

以下のファイルは、管理画面で同等の機能を提供するため削除してOKです:

- `backend/dump_view_definition.py` - 診断スクリプト
- `backend/check_and_fix_view.py` - 修正スクリプト
- `backend/verify_view_fix.py` - 検証スクリプト
- `backend/fix_phase1_production.py` - 旧版（UTF-8問題あり）
- `scripts/fix_phase1_views.py` - Docker前提
- `scripts/fix_phase1_views.sh` - Bash（Windows不可）
- `backend/fix_view_direct.sql` - 手動SQL
- `backend/PRODUCTION_VIEW_FIX.md` - 旧ドキュメント
- `backend/VIEW_FIX_README.md` - 旧クイックスタート

**理由:**
- 管理画面からワンクリックで実行可能
- パスワード入力不要
- エラー表示がわかりやすい
- Windows環境でも確実に動作

---

## 🎉 まとめ

**本番環境でエラーが出た場合:**

1. `http://your-domain.com/system-settings` にアクセス
2. 「ビューをチェック」ボタンをクリック
3. エラーなら「ビューを修正」ボタンをクリック
4. 完了！

**たったこれだけです。**

Pythonスクリプトやコマンドライン操作は不要になりました。
