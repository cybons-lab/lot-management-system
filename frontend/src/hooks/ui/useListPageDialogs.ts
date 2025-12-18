/**
 * useListPageDialogs.ts
 *
 * リストページで共通のダイアログ状態管理を提供するカスタムフック
 * - 作成/編集/削除/インポート/復元ダイアログを一元管理
 * - useState 5-9個を1つのhook呼び出しに集約
 */

import { useState, useCallback, useMemo } from "react";

type DialogType = "create" | "edit" | "import" | "softDelete" | "permanentDelete" | "restore";

interface DialogState<T> {
  type: DialogType | null;
  item: T | null;
}

/**
 * リストページのダイアログ管理フック
 *
 * @example
 * ```tsx
 * const {
 *   isCreateOpen,
 *   isImportOpen,
 *   isSoftDeleteOpen,
 *   isPermanentDeleteOpen,
 *   isRestoreOpen,
 *   selectedItem,
 *   openCreate,
 *   openImport,
 *   openSoftDelete,
 *   openPermanentDelete,
 *   openRestore,
 *   close,
 *   switchToPermanentDelete,
 * } = useListPageDialogs<Warehouse>();
 * ```
 */
export function useListPageDialogs<T>() {
  const [state, setState] = useState<DialogState<T>>({
    type: null,
    item: null,
  });

  // ダイアログを開くアクション
  const openCreate = useCallback(() => {
    setState({ type: "create", item: null });
  }, []);

  const openEdit = useCallback((item: T) => {
    setState({ type: "edit", item });
  }, []);

  const openImport = useCallback(() => {
    setState({ type: "import", item: null });
  }, []);

  const openSoftDelete = useCallback((item: T) => {
    setState({ type: "softDelete", item });
  }, []);

  const openPermanentDelete = useCallback((item: T) => {
    setState({ type: "permanentDelete", item });
  }, []);

  const openRestore = useCallback((item: T) => {
    setState({ type: "restore", item });
  }, []);

  // ダイアログを閉じる
  const close = useCallback(() => {
    setState({ type: null, item: null });
  }, []);

  // ソフト削除から完全削除に切り替え（アイテムを維持）
  const switchToPermanentDelete = useCallback(() => {
    setState((prev) => ({ ...prev, type: "permanentDelete" }));
  }, []);

  // 派生状態
  const dialogs = useMemo(
    () => ({
      isCreateOpen: state.type === "create",
      isEditOpen: state.type === "edit",
      isImportOpen: state.type === "import",
      isSoftDeleteOpen: state.type === "softDelete",
      isPermanentDeleteOpen: state.type === "permanentDelete",
      isRestoreOpen: state.type === "restore",
      selectedItem: state.item,
      // 互換性のため: deletingItem（soft/permanent両方でアイテムにアクセス）
      deletingItem:
        state.type === "softDelete" || state.type === "permanentDelete" ? state.item : null,
      restoringItem: state.type === "restore" ? state.item : null,
    }),
    [state],
  );

  return {
    ...dialogs,
    openCreate,
    openEdit,
    openImport,
    openSoftDelete,
    openPermanentDelete,
    openRestore,
    close,
    switchToPermanentDelete,
  };
}
