/**
 * ロット操作のmutationとダイアログ管理
 *
 * 【設計意図】ロット操作管理の設計判断:
 *
 * 1. 各操作ごとにダイアログを分離
 *    理由: 作成、編集、ロックは異なるフォーム・確認UIが必要
 *    → createDialog: 新規作成フォーム
 *    → editDialog: 編集フォーム（既存データをプリフィル）
 *    → lockDialog: ロック理由入力フォーム
 *    メリット: 各ダイアログが独立して開閉できる（複数同時表示も可能）
 *
 * 2. selectedLot 状態の管理
 *    理由: 編集・ロック操作では、対象ロットの情報が必要
 *    → handleEdit/handleLock で selectedLot をセット
 *    → ダイアログ内のフォームで selectedLot を参照
 *    → 操作完了後、setSelectedLot(null) でクリア
 *    用途: ダイアログ内のフォームに初期値を渡す
 *
 * 3. グローバルMutationCacheでエラーハンドリング
 *    理由: query-client.ts で設定したグローバルエラーハンドラーが実行される
 *    → 各mutationでonErrorを個別に書く必要がない
 *    → コメント「// onError is handled by global MutationCache」で明示
 *    メリット: エラーハンドリングロジックの重複を防ぐ、統一された UX
 *
 * 4. アンロック操作に confirm() を使用（L74）
 *    理由: ロック解除は重要な操作（誤操作防止）
 *    → ダイアログではなく、シンプルなブラウザ標準のconfirmで確認
 *    → ロック操作はダイアログで理由を入力するが、解除は即座に実行
 *    業務上の理由: ロックは慎重に行うが、解除は迅速に行いたいケースが多い
 *
 * 5. allLots を引数で受け取る理由
 *    用途: handleEdit/handleLock で、最新のロットデータを取得
 *    → lot.id だけでなく、lot全体の情報（current_quantity等）が必要
 *    → allLots.find() で最新データを検索し、selectedLotにセット
 *    → これにより、画面に表示されているロット情報と、フォームに渡すロット情報が一致
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useCreateLot, useUpdateLot, useLockLot, useUnlockLot } from "@/hooks/mutations";
import { useDialog } from "@/hooks/ui";
import type { LotUI } from "@/shared/libs/normalize";

export function useLotMutations(allLots: LotUI[]) {
  const createDialog = useDialog();
  const editDialog = useDialog();
  const lockDialog = useDialog();
  const [selectedLot, setSelectedLot] = useState<LotUI | null>(null);

  const createLotMutation = useCreateLot({
    onSuccess: () => {
      toast.success("ロットを作成しました");
      createDialog.close();
    },
    // onError is handled by global MutationCache
  });

  const updateLotMutation = useUpdateLot(selectedLot?.id ?? 0, {
    onSuccess: () => {
      toast.success("ロットを更新しました");
      editDialog.close();
      setSelectedLot(null);
    },
    // onError is handled by global MutationCache
  });

  const lockLotMutation = useLockLot({
    onSuccess: () => {
      toast.success("ロットをロックしました");
      lockDialog.close();
      setSelectedLot(null);
    },
    // onError is handled by global MutationCache
  });

  const unlockLotMutation = useUnlockLot({
    onSuccess: () => {
      toast.success("ロットのロックを解除しました");
    },
    // onError is handled by global MutationCache
  });

  const handleEdit = useCallback(
    (lot: LotUI) => {
      const lotData = allLots.find((l) => l.id === lot.id);
      if (lotData) {
        setSelectedLot(lotData);
        editDialog.open();
      }
    },
    [allLots, editDialog],
  );

  const handleLock = useCallback(
    (lot: LotUI) => {
      const lotData = allLots.find((l) => l.id === lot.id);
      if (lotData) {
        setSelectedLot(lotData);
        lockDialog.open();
      }
    },
    [allLots, lockDialog],
  );

  const handleUnlock = useCallback(
    async (lot: LotUI) => {
      if (confirm(`ロット ${lot.lot_number} のロックを解除しますか？`)) {
        await unlockLotMutation.mutateAsync({ id: lot.id });
      }
    },
    [unlockLotMutation],
  );

  return {
    selectedLot,
    createDialog,
    editDialog,
    lockDialog,
    createLotMutation,
    updateLotMutation,
    lockLotMutation,
    unlockLotMutation,
    handleEdit,
    handleLock,
    handleUnlock,
    setSelectedLot,
  };
}
