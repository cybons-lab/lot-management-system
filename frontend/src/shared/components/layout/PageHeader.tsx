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
    <div className={`mb-6 flex items-start justify-between ${className}`}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      </div>

      {actions && <div className="flex items-center space-x-2">{actions}</div>}
    </div>
  );
}
