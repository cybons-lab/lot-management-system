# Frontend Style Guide

Lot Management System (React + TypeScript)

本ガイドは、フロントエンド実装時の統一ルールです。  
特に **「Tailwind クラスを JSX から追い出し、可読性と再利用性を高める」** ことを目的とします。

---

# 🎨 1. Styling Strategy（スタイル方針）

## 1-1. TailwindCSS は継続利用（ただし JSX には書かない）

Tailwind は引き続き利用しますが、  
**JSX 内にクラスを直接ベタ書きすることは禁止** とします。

理由：

- JSX の可読性が著しく低下するため
- 状態によるクラス分岐が複雑化するため
- 再利用不能な記述が増えるため

---

# 📍 2. スタイルファイルの置き場所ルール

> 「1コンポーネント = 1フォルダ」を強制しない。  
> **フォルダ内のコンポーネント数に応じてスタイルファイルの形を変える。**

## 2-1. フォルダ内にコンポーネントが 1 ファイルだけのとき

**同じ名前のスタイルファイルを隣に置く。**

```text
// 例: 1コンポーネントだけのフォルダ
src/features/allocations/components/LotAllocationPane/
  LotAllocationPane.tsx
  LotAllocationPane.styles.ts
```

- `.tsx` が 1つだけなら、同名の `*.styles.ts` を作成する
- 追加でコンポーネントが増えたら、後述の 2-2 の形に移行してもよい

## 2-2. フォルダ内にコンポーネントが複数あるとき

**フォルダ共通の `styles.ts` にまとめる。**

```text
// 例: 複数コンポーネントをまとめたフォルダ
src/features/allocations/components/LotAllocationPage/
  LotAllocationPane.tsx
  LotAllocationPanel.tsx
  LotList.tsx
  styles.ts
```

- フォルダ単位（画面単位 / 機能単位）で `styles.ts` を1つだけ置く
- export 名で「どのコンポーネント用か」が分かるようにする
  例: `paneRoot`, `panelRoot`, `lotList`, `lotRow` など

## 2-3. 既存コードからの移行方針

- まずは **既存の .tsx の横にスタイルファイルを増やすだけ** でOK
  - 1ファイルだけのフォルダ → `ComponentName.styles.ts` を追加
  - 複数ファイルあるフォルダ → `styles.ts` を追加

- 新規画面や大幅リファクタ時に、フォルダ構成を整理する

---

# 📁 3. Style Modules（\*.styles.ts / styles.ts）の書き方

## 3-1. Tailwind はすべてスタイルファイルに逃がす

```ts
// LotAllocationPane.styles.ts または styles.ts
export const paneRoot = "flex flex-col gap-3 p-3";
```

## 3-2. JSX からは className に直接 Tailwind を書かない

```tsx
// ❌ Bad
<div className="flex flex-col gap-3 p-3">...</div>;

// ✅ Good
import * as styles from "./LotAllocationPane.styles";
// または import * as styles from "./styles";

<div className={styles.paneRoot}>...</div>;
```

## 3-3. export 名の付け方

- コンポーネント構造がイメージできる名前にする
  - `root`, `header`, `body`, `footer`
  - `paneRoot`, `panelRoot`, `lotList`, `lotRow` など

- `styles.xxx` を見ただけで、DOM の役割が分かることを目指す

---

# ⚙ 4. class-variance-authority (cva) の利用ルール

## 4-1. 状態・バリアントがある場合は cva を使う

例：アクティブ状態・エラー状態・サイズなど

```ts
// styles.ts
import { cva } from "class-variance-authority";

export const lotRow = cva("flex items-center h-9 px-2 cursor-pointer transition-colors", {
  variants: {
    active: {
      true: "bg-primary/10 border-l-2 border-primary",
      false: "hover:bg-muted",
    },
    disabled: {
      true: "opacity-50 cursor-not-allowed",
      false: "",
    },
  },
  defaultVariants: {
    active: false,
    disabled: false,
  },
});
```

## 4-2. JSX 側での使用

```tsx
// LotList.tsx
import * as styles from "./styles";

<div
  className={styles.lotRow({
    active: lot.id === selectedLotId,
    disabled: lot.available_quantity === 0,
  })}
>
  ...
</div>;
```

---

# 🔄 5. Class 結合は `clsx` 推奨

Tailwind の要素追加が必要な場合は `clsx` をスタイルファイル側で使う。

```ts
// styles.ts
import clsx from "clsx";

export const tableRow = clsx("flex items-center h-10 px-2", "hover:bg-muted transition-colors");
```

- **JSX では `styles.tableRow` のみを参照**し、`clsx` 呼び出しは `.styles.ts` / `styles.ts` に閉じ込める

---

# 🚫 6. 禁止事項

以下は禁止とする：

- JSX に長い Tailwind クラスを直接書く
- 状態に応じて JSX 内で文字列連結する
  例: `className={isActive ? "..." : "..."}` をベタ書き
- インライン style を常用する（緊急の一時的対応を除く）
- デザインに影響するクラス（色・レイアウト・余白）をコンポーネント内にハードコードする

---

# 🎯 7. 推奨ディレクトリ構成

## 7-1. 画面・機能単位でフォルダをまとめる

```text
src/features/allocations/components/lots/
  LotAllocationPage/
    LotAllocationPane.tsx
    LotAllocationPanel.tsx
    LotList.tsx
    styles.ts
```

- ロット引き当てのような「1画面に複数コンポーネント」がある場合は、この形を推奨
- スタイルは `styles.ts` に集約し、コンポーネントは `styles.xxx` を参照する

## 7-2. 小さい単機能コンポーネントの場合

```text
src/shared/components/
  IconButton.tsx
  IconButton.styles.ts
```

- フォルダを切るほどでもない小さな UI 部品は、
  `.tsx` と `.styles.ts` を横に並べるだけでも良い

---

# 🎨 8. 共通スタイル・トークンの扱い

## 8-1. トークンは `src/shared/styles` に置く

```text
src/shared/styles/
  theme.ts        // 色、スペース、radius など
  table.styles.ts // 汎用テーブルのクラスなど（必要なら）
```

- コンポーネント側の `styles.ts` からは、必要であれば `theme` の値だけ参照する
- 具体的な Tailwind クラスは、基本的に各 feature の `*.styles.ts` / `styles.ts` に閉じ込める

---

# 🧪 9. テスト方針（任意）

- スタイルそのものに依存するテストは基本的に書かない
- テスト対象は「状態管理・イベントハンドラ・表示条件（表示/非表示）」などロジック部分
- 見た目の差異は Storybook や実画面で確認する

---

# 🧭 10. ガイド変更時のルール

- スタイルガイドを修正した場合は PR に理由を書くこと
- Claude Code / Gemini / 他 AI に依頼する場合は、
  **「このリポジトリの STYLE_GUIDE.md に従って」** と必ず指示すること
- 画面単位のリファクタ（例：ロット引き当てページ）を行う前に、このガイドを読み直すこと

---

# ✔ 以上

このガイドに従ってフロントエンドの実装・リファクタリングを行ってください。
