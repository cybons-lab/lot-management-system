/**
 * ThreeColumnLayout.tsx
 *
 * 業務システム向けの3カラムレイアウトコンポーネント
 *
 * 特徴:
 * - 左右のサイドバーと中央のメインコンテンツ
 * - レスポンシブ対応:
 *   - XL (1280px~): 3カラム表示
 *   - LG (1024px~): 2カラム表示（左サイドバー + メイン）
 *   - MD/SM: 1カラム表示（スタック）
 * - スクロール制御: 各カラムが独立してスクロール可能（h-screen - header）
 */

import React from "react";
import { cn } from "@/shared/libs/utils";

interface ThreeColumnLayoutProps {
  /** 左カラムのコンテンツ */
  leftContent?: React.ReactNode;
  /** 中央カラムのコンテンツ */
  centerContent: React.ReactNode;
  /** 右カラムのコンテンツ */
  rightContent?: React.ReactNode;
  /** 左カラムの幅 (デフォルト: w-80) */
  leftWidth?: string;
  /** 右カラムの幅 (デフォルト: w-96) */
  rightWidth?: string;
  /** コンテナのクラス名 */
  className?: string;
}

export function ThreeColumnLayout({
  leftContent,
  centerContent,
  rightContent,
  leftWidth = "w-80",
  rightWidth = "w-96",
  className,
}: ThreeColumnLayoutProps) {
  return (
    <div className={cn("flex h-[calc(100vh-4rem)] overflow-hidden bg-gray-50/50", className)}>
      {/* 左カラム (XL以上で表示) */}
      {leftContent && (
        <aside
          className={cn(
            "hidden border-r border-gray-200 bg-white xl:block",
            leftWidth,
            "flex flex-col overflow-hidden",
          )}
        >
          {leftContent}
        </aside>
      )}

      {/* メインコンテンツ (常に表示) */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">{centerContent}</main>

      {/* 右カラム (XL以上で表示) */}
      {rightContent && (
        <aside
          className={cn(
            "hidden border-l border-gray-200 bg-white xl:block",
            rightWidth,
            "flex flex-col overflow-hidden",
          )}
        >
          {rightContent}
        </aside>
      )}
    </div>
  );
}
