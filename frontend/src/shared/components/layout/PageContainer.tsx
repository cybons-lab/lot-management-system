/**
 * PageContainer.tsx
 *
 * アプリケーション全体の標準ページコンテナ
 * - 最大幅の制限 (1600px)
 * - 中央寄せ
 * - 標準的なパディング (px-6 py-6)
 */

import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string; // 追加のスタイルが必要な場合（背景色など）
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("mx-auto max-w-[1600px] space-y-6 px-6 py-6", className)}>{children}</div>
  );
}
