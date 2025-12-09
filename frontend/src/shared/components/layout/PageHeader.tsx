/**
 * ページヘッダーコンポーネント
 *
 * ページのタイトルとアクションボタンを表示
 */

import React from "react";

interface PageHeaderProps {
  /** ページタイトル */
  title: string;
  /** サブタイトル */
  subtitle?: string;
  /** 右側のアクションボタン */
  actions?: React.ReactNode;
  /** 追加のクラス名 */
  className?: string;
}

/**
 * ページヘッダーコンポーネント
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="ロット管理"
 *   subtitle="在庫ロットの一覧と登録"
 *   actions={
 *     <button onClick={handleCreate}>新規登録</button>
 *   }
 * />
 * ```
 */
export function PageHeader({ title, subtitle, actions, className = "" }: PageHeaderProps) {
  return (
    <div
      className={`mb-4 flex items-center justify-between border-b border-gray-200 pb-4 ${className}`}
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-gray-600">{subtitle}</p>}
      </div>

      {actions && <div className="flex items-center space-x-3">{actions}</div>}
    </div>
  );
}
