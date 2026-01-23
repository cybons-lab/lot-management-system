# ロット管理システム - フロントエンド

React + TypeScript + Vite + Tailwind CSS + shadcn/ui で構築されたロット管理システムのフロントエンドアプリケーションです。

## 🚀 技術スタック

- **React 19.2.0** - UIライブラリ
- **TypeScript** - 型安全性
- **Vite** - 高速なビルドツール
- **Tailwind CSS** - ユーティリティファーストCSSフレームワーク
- **shadcn/ui** - モダンなUIコンポーネント（Radix UI ベース）
- **TanStack Query** - サーバーステート管理
- **Lucide React** - アイコンライブラリ
- **date-fns** - 日付フォーマット

## 📦 セットアップ

### 前提条件

- Node.js 18以上
- npm または yarn

### インストール

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

開発サーバーは `http://localhost:5173` で起動します。

### ビルド

```bash
# プロダクションビルド
npm run build

# ビルドのプレビュー
npm run preview
```

## 📁 プロジェクト構造

```
src/
├── components/
│   └── ui/              # shadcn/ui コンポーネント
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       └── tabs.tsx
├── pages/
│   └── InventoryPage.tsx  # 在庫一覧ページ
├── lib/
│   ├── api-client.ts     # API通信クライアント
│   ├── query-client.ts   # React Query設定
│   └── utils.ts          # ユーティリティ関数
├── types/
│   └── index.ts          # TypeScript型定義
├── App.tsx               # メインアプリケーション
├── main.tsx              # エントリーポイント
└── index.css             # グローバルスタイル
```

## 🎨 実装済み機能

### ✅ 在庫管理

- ロット一覧表示（テーブル形式）
- 新規ロット登録（モーダルフォーム）
- 検索・フィルター機能
- ステータスバッジ表示
- 日付フォーマット

### 🚧 開発予定

- 出荷管理機能
- アラート機能
- ロット編集・削除
- データエクスポート

## 🔌 API連携

バックエンドAPI（`http://localhost:8000/api`）と連携します。

### エンドポイント

- `GET /api/lots` - ロット一覧取得
- `POST /api/lots` - 新規ロット作成
- `GET /api/lots/:id` - ロット詳細取得
- `PUT /api/lots/:id` - ロット更新
- `DELETE /api/lots/:id` - ロット削除

## 🎨 カスタマイズ

### カラーテーマの変更

`src/index.css` の CSS変数を編集してカラーテーマをカスタマイズできます：

```css
:root {
  --primary: 221.2 83.2% 53.3%; /* プライマリカラー */
  --secondary: 210 40% 96.1%; /* セカンダリカラー */
  /* ... その他の変数 */
}
```

### 新しいshadcn/uiコンポーネントの追加

1. [shadcn/ui ドキュメント](https://ui.shadcn.com/) からコンポーネントコードをコピー
2. `src/components/ui/` に新しいファイルを作成
3. 必要に応じてカスタマイズ

## 🐛 トラブルシューティング

### ビルドエラーが発生する

```bash
# node_modulesとキャッシュをクリア
rm -rf node_modules .vite
npm install
npm run dev
```

### APIリクエストが失敗する

1. バックエンドが起動しているか確認（`http://localhost:8000`）
2. CORS設定が正しいか確認
3. ネットワークタブでリクエストを確認

### スタイルが正しく適用されない

```bash
# Tailwindのキャッシュをクリア
rm -rf node_modules/.vite
npm run dev
```

## 📝 開発のヒント

### コンポーネントの追加

新しいページコンポーネントは `src/pages/` に作成し、`App.tsx` でルーティングを設定します。

### 型の追加

新しいAPIレスポンスの型は `src/types/index.ts` に追加します。

### APIクライアントの拡張

新しいAPIエンドポイントは `src/lib/api-client.ts` に関数を追加します。

## 🤝 コントリビューション

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 📄 ライセンス

MIT License
