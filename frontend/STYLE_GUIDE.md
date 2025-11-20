# Frontend Style Guide

Lot Management System (React + TypeScript)

本ガイドは、フロントエンド実装時の統一ルールです。  
特に「Tailwind クラスの肥大化を避け、可読性を最大化する」ことを目的とします。

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

# 📁 2. Style Modules（\*.styles.ts）の作成ルール

## 2-1. 各コンポーネント専用にスタイルファイルを作る

例：

```
src/features/allocations/components/LotAllocationPanel/
 ├── LotAllocationPanel.tsx
 └── LotAllocationPanel.styles.ts

```

## 2-2. Tailwind はすべて `.styles.ts` に逃がす

```ts
// LotAllocationPanel.styles.ts
export const wrapper = "flex flex-col gap-3 p-2";
```

## 2-3. JSX からは className に直接 Tailwind を書かない

```tsx
// ❌ Bad
<div className="flex flex-col gap-3 p-2">...</div>;

// ✅ Good
import * as styles from "./LotAllocationPanel.styles";

<div className={styles.wrapper}>...</div>;
```

---

# ⚙ 3. class-variance-authority (cva) の利用ルール

## 3-1. 状態・バリアントがある場合は cva を必ず使う

例：アクティブ状態・エラー状態・サイズなど

```ts
import { cva } from "class-variance-authority";

export const lotCard = cva("rounded-md border p-3 shadow-sm transition-colors", {
  variants: {
    active: {
      true: "border-primary bg-primary/10",
      false: "border-muted bg-background",
    },
    error: {
      true: "border-destructive bg-destructive/10",
      false: "",
    },
  },
  defaultVariants: {
    active: false,
    error: false,
  },
});
```

## 3-2. JSX 側での使用

```tsx
<div className={styles.lotCard({ active: isSelected, error })}>...</div>
```

---

# 🔄 4. Class 結合は `clsx` 推奨

Tailwind の要素追加が必要な場合は以下のようにする：

```ts
import clsx from "clsx";
export const row = clsx(
  "flex items-center h-10 px-2",
  "hover:bg-muted transition-colors"
);
<div className={styles.row}>...</div>
```

---

# 📦 5. 禁止事項

以下は禁止：

- JSX に長い Tailwind クラスを直接書く
- 状態に応じて JSX 内で文字列連結する (`isActive ? "...": "..."`)
- インライン style を常用する
- デザインに影響するクラスをコンポーネント内にハードコードする

---

# 📚 6. 推奨ツール

- **class-variance-authority**（状態別スタイル）
- **clsx**（クラス結合）
- **TailwindCSS**（ユーティリティベースの記述）
- **shadcn/ui**（統一感のある UI コンポーネント構築）

---

# 📁 7. ディレクトリ構成の原則

```
ComponentName/
  ComponentName.tsx
  ComponentName.styles.ts
  ComponentName.types.ts      ← 使う場合のみ
  ComponentName.test.tsx      ← テスト（任意）
```

---

# 🧪 8. テスト部分（任意）

スタイルに依存するテストは不要。
ロジック部分のみ対象。

---

# 🧭 9. 変更時

- スタイルガイドを修正した場合は PR に理由を書くこと
- Claude Code / Gemini に依頼する場合は
  **「STYLE_GUIDE に従って」** と指示すること

---

# ✔ 以上

これに基づいてフロントを実装してください。
