/**
 * セクションコンポーネント
 *
 * ページ内のセクション区切りを表示
 */

import React from "react";

interface SectionProps {
  /** セクションタイトル */
  title?: string;
  /** セクション説明 */
  description?: string;
  /** 右側のアクション */
  actions?: React.ReactNode;
  /** 子要素 */
  children: React.ReactNode;
  /** 追加のクラス名 */
  className?: string;
}

/**
 * セクションコンポーネント
 *
 * @example
 * ```tsx
 * <Section
 *   title="フィルター"
 *   description="検索条件を指定してください"
 *   actions={<button>クリア</button>}
 * >
 *   <FilterForm />
 * </Section>
 * ```
 */
export function Section({ title, description, actions, children, className = "" }: SectionProps) {
  return (
    <div className={`rounded-lg border bg-white p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between">
          <div>
            {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
            {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
          </div>

          {actions && <div className="flex items-center space-x-2">{actions}</div>}
        </div>
      )}

      <div>{children}</div>
    </div>
  );
}
