/**
 * Utility functions for className merging
 *
 * 【設計意図】cn() 関数の設計判断:
 *
 * 1. なぜ cn() 関数が必要なのか
 *    理由: Tailwind CSS のクラス名を安全に結合
 *    問題:
 *    - Tailwind CSS: 複数のクラス名が競合する場合がある
 *    - 例: "bg-red-500 bg-blue-500" → 両方が適用され、最後のものが優先
 *    → しかし、ビルド時の最適化で順序が変わる可能性
 *    解決:
 *    - twMerge(): Tailwind のクラス名を賢く結合
 *    → 競合するクラスを自動的に解決
 *
 * 2. clsx の役割
 *    理由: 条件付きクラス名を簡潔に記述
 *    使用例:
 *    ```typescript
 *    clsx("base-class", isActive && "active-class", isDisabled && "disabled-class")
 *    // → isActive=true, isDisabled=false の場合
 *    // → "base-class active-class"
 *    ```
 *    メリット:
 *    - 三項演算子を使わずに条件分岐を記述
 *    - 複数の条件を組み合わせやすい
 *
 * 3. twMerge の役割
 *    理由: Tailwind クラスの重複・競合を解決
 *    問題:
 *    - "p-4 p-6" → どちらが優先されるか不明
 *    - "text-red-500 text-blue-500" → 色が競合
 *    解決:
 *    - twMerge("p-4 p-6") → "p-6"（後者が優先）
 *    - twMerge("text-red-500 text-blue-500") → "text-blue-500"
 *    メリット:
 *    - デフォルトクラスとオーバーライドを安全に組み合わせ可能
 *
 * 4. cn() の使用例
 *    shadcn/ui コンポーネントでの典型的な使い方:
 *    ```typescript
 *    function Button({ className, variant, ...props }: ButtonProps) {
 *      return (
 *        <button
 *          className={cn(
 *            "px-4 py-2 rounded", // デフォルトクラス
 *            variant === "primary" && "bg-blue-500 text-white",
 *            variant === "secondary" && "bg-gray-500 text-white",
 *            className // 外部から渡されたクラス（オーバーライド可能）
 *          )}
 *          {...props}
 *        />
 *      );
 *    }
 *
 *    // 使用時
 *    <Button variant="primary" className="px-8" />
 *    // → "px-8 py-2 rounded bg-blue-500 text-white"
 *    // → px-4 は px-8 にオーバーライドされる
 *    ```
 *
 * 5. なぜ ClassValue 型を使うのか
 *    理由: 柔軟な入力形式をサポート
 *    受け入れ可能な型:
 *    - string: "class1 class2"
 *    - string[]: ["class1", "class2"]
 *    - object: { "class1": true, "class2": false }
 *    - undefined/null: 無視される
 *    例:
 *    ```typescript
 *    cn("base", isActive && "active", { "disabled": isDisabled })
 *    // 全て有効な入力
 *    ```
 *
 * 6. shadcn/ui との統合
 *    理由: shadcn/ui の標準パターン
 *    背景:
 *    - shadcn/ui: Tailwind CSS ベースのコンポーネントライブラリ
 *    - 全コンポーネントで cn() を使用
 *    → プロジェクト全体で統一されたパターン
 *    メリット:
 *    - コンポーネントの className を柔軟に上書き可能
 *    - Tailwind の競合を心配せずにスタイル拡張
 *
 * 7. パフォーマンス考慮
 *    理由: ビルド時最適化
 *    動作:
 *    - clsx: ランタイムでクラス名を結合
 *    - twMerge: Tailwind クラスの競合を解決
 *    → 両方とも高速（ミリ秒オーダー）
 *    影響:
 *    - レンダリングパフォーマンスへの影響は微小
 *    - className 生成の利便性 > わずかなオーバーヘッド
 *
 * 8. 代替アプローチとの比較
 *    代替案1: 文字列テンプレート
 *    ```typescript
 *    className={`base ${isActive ? "active" : ""}`}
 *    ```
 *    → 条件が増えると読みにくい、競合解決なし
 *
 *    代替案2: classnames ライブラリのみ
 *    ```typescript
 *    className={classnames("p-4", "p-6")}
 *    ```
 *    → Tailwind の競合解決がない
 *
 *    cn() 関数:
 *    → clsx + twMerge の組み合わせで両方のメリット
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
