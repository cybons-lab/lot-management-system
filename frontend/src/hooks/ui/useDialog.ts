/**
 * ダイアログ状態管理フック
 * 
 * モーダルダイアログの開閉状態を管理
 */

import { useState, useCallback } from 'react';

/**
 * ダイアログ状態管理フック
 * 
 * @param defaultOpen - 初期表示状態
 * @returns ダイアログ状態と操作関数
 * 
 * @example
 * ```tsx
 * const dialog = useDialog();
 * 
 * return (
 *   <>
 *     <button onClick={dialog.open}>開く</button>
 *     <Dialog open={dialog.isOpen} onOpenChange={dialog.setIsOpen}>
 *       <DialogContent>
 *         <button onClick={dialog.close}>閉じる</button>
 *       </DialogContent>
 *     </Dialog>
 *   </>
 * );
 * ```
 */
export function useDialog(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  
  return {
    isOpen,
    setIsOpen,
    open,
    close,
    toggle,
  };
}

/**
 * データ付きダイアログ状態管理フック
 * 
 * @param defaultData - 初期データ
 * @returns ダイアログ状態と操作関数
 * 
 * @example
 * ```tsx
 * const editDialog = useDialogWithData<Lot>();
 * 
 * return (
 *   <>
 *     <button onClick={() => editDialog.open(selectedLot)}>編集</button>
 *     <Dialog open={editDialog.isOpen} onOpenChange={editDialog.setIsOpen}>
 *       <DialogContent>
 *         <LotForm 
 *           initialData={editDialog.data} 
 *           onSubmit={() => editDialog.close()} 
 *         />
 *       </DialogContent>
 *     </Dialog>
 *   </>
 * );
 * ```
 */
export function useDialogWithData<T = unknown>(defaultData?: T) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | undefined>(defaultData);
  
  const open = useCallback((newData?: T) => {
    if (newData !== undefined) {
      setData(newData);
    }
    setIsOpen(true);
  }, []);
  
  const close = useCallback(() => {
    setIsOpen(false);
    // ダイアログを閉じるときにデータをクリア
    setTimeout(() => setData(undefined), 300); // アニメーション完了後にクリア
  }, []);
  
  const toggle = useCallback((newData?: T) => {
    if (!isOpen && newData !== undefined) {
      setData(newData);
    }
    setIsOpen(prev => !prev);
  }, [isOpen]);
  
  return {
    isOpen,
    setIsOpen,
    data,
    setData,
    open,
    close,
    toggle,
  };
}

/**
 * 確認ダイアログ状態管理フック
 * 
 * @returns 確認ダイアログ状態と操作関数
 * 
 * @example
 * ```tsx
 * const confirmDialog = useConfirmDialog();
 * 
 * const handleDelete = async () => {
 *   const confirmed = await confirmDialog.confirm({
 *     title: '削除確認',
 *     message: '本当に削除しますか?',
 *   });
 *   
 *   if (confirmed) {
 *     // 削除処理
 *   }
 * };
 * ```
 */
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  } | null>(null);
  
  const confirm = useCallback(
    (options: {
      title: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
    }) => {
      return new Promise<boolean>((resolve) => {
        setConfig({
          ...options,
          onConfirm: () => {
            setIsOpen(false);
            resolve(true);
          },
          onCancel: () => {
            setIsOpen(false);
            resolve(false);
          },
        });
        setIsOpen(true);
      });
    },
    []
  );
  
  const close = useCallback(() => {
    setIsOpen(false);
    config?.onCancel?.();
  }, [config]);
  
  return {
    isOpen,
    config,
    confirm,
    close,
  };
}

/**
 * 複数ダイアログ状態管理フック
 * 
 * @param dialogNames - ダイアログ名の配列
 * @returns 各ダイアログの状態と操作関数
 * 
 * @example
 * ```tsx
 * const dialogs = useMultipleDialogs(['create', 'edit', 'delete']);
 * 
 * return (
 *   <>
 *     <button onClick={dialogs.create.open}>新規作成</button>
 *     <button onClick={dialogs.edit.open}>編集</button>
 *     <button onClick={dialogs.delete.open}>削除</button>
 *     
 *     <Dialog open={dialogs.create.isOpen} onOpenChange={dialogs.create.setIsOpen}>
 *       ...
 *     </Dialog>
 *   </>
 * );
 * ```
 */
export function useMultipleDialogs<T extends string>(
  dialogNames: readonly T[]
): Record<T, ReturnType<typeof useDialog>> {
  const dialogs = {} as Record<T, ReturnType<typeof useDialog>>;
  
  dialogNames.forEach((name) => {
     
    dialogs[name] = useDialog();
  });
  
  return dialogs;
}
