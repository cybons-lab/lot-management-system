/**
 * ページコンテナコンポーネント
 *
 * ページ全体のレイアウトを統一
 */

import React from "react";

interface PageContainerProps {
  /** 子要素 */
  children: React.ReactNode;
  /** 最大幅を制限するか */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  /** 追加のクラス名 */
  className?: string;
}

/**
 * ページコンテナコンポーネント
 *
 * @example
 * ```tsx
 * <PageContainer maxWidth="2xl">
 *   <PageHeader title="ロット管理" />
 *   <div>コンテンツ...</div>
 * </PageContainer>
 * ```
 */
export function PageContainer({ children, maxWidth = "full", className = "" }: PageContainerProps) {
  const maxWidthClass = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    full: "max-w-full",
  }[maxWidth];

  return (
    <div className={`container mx-auto px-4 py-6 ${maxWidthClass} ${className}`}>{children}</div>
  );
}
