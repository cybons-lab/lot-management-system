/**
 * InventoryLayout.tsx
 *
 * 在庫管理のルートレイアウトコンポーネント
 * - TopNavLayoutの下層なので、シンプルなラッパーのみ
 * - タブUIは使用せず、ページ遷移はルーティングで実現
 */

import { Outlet } from "react-router-dom";

// ============================================
// メインコンポーネント
// ============================================

export function InventoryLayout() {
  return <Outlet />;
}
