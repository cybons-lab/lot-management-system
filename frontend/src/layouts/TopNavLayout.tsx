/**
 * TopNavLayout.tsx
 *
 * 上部水平ナビゲーションレイアウト
 * - Sticky ヘッダー（スクロール時も固定）
 * - モダン＋ポップなデザイン
 * - 左サイドバーなし
 */

import { useLocation } from "react-router-dom";

import * as styles from "./TopNavLayout.styles";

import { GlobalNavigation } from "@/components/layouts/GlobalNavigation";

// ============================================
// メインコンポーネント
// ============================================

interface TopNavLayoutProps {
  children: React.ReactNode;
}

export function TopNavLayout({ children }: TopNavLayoutProps) {
  const location = useLocation();

  return (
    <div className={styles.root}>
      <GlobalNavigation currentPath={location.pathname} />

      {/* メインコンテンツ */}
      <main className={styles.main}>{children}</main>
    </div>
  );
}
