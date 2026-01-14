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

import { KeyboardShortcutsHelp } from "@/components/common/KeyboardShortcutsHelp";
import { GlobalNavigation } from "@/components/layouts/GlobalNavigation";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { MockIndicator } from "@/shared/components/MockIndicator";

// ============================================
// メインコンポーネント
// ============================================

interface TopNavLayoutProps {
  children: React.ReactNode;
}

export function TopNavLayout({ children }: TopNavLayoutProps) {
  const location = useLocation();
  const { showHelp, setShowHelp } = useKeyboardShortcuts();

  return (
    <div className={styles.root}>
      <GlobalNavigation currentPath={location.pathname} />

      {/* メインコンテンツ */}
      <main className={styles.main}>{children}</main>

      <MockIndicator />
      <KeyboardShortcutsHelp open={showHelp} onOpenChange={setShowHelp} />
    </div>
  );
}
