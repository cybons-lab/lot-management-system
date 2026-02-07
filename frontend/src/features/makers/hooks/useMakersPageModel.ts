import { useCallback } from "react";

import { type Maker, type MakerCreateRequest, type MakerUpdateInput } from "../api";
import { useCreateMaker, useDeleteMaker, useMakers, useUpdateMaker } from "../hooks/useMakers";

import { useMasterListPage } from "@/hooks/ui/useMasterListPage";

/**
 * メーカーマスタ一覧ページ用のモデルフック
 * useMasterListPage を利用して共通ロジックを標準化
 */
// eslint-disable-next-line max-lines-per-function -- メーカーマスタ一覧ページの状態管理を1箇所で管理するため
export function useMakersPageModel() {
  const master = useMasterListPage<Maker>({
    featureName: "Makers",
    defaultSort: { column: "maker_code", direction: "asc" },
    getRowId: (m) => m.id.toString(),
    filterFn: (items, q) => {
      if (!q.trim()) return items;
      const query = q.toLowerCase();
      return items.filter(
        (m) =>
          m.maker_code.toLowerCase().includes(query) ||
          m.maker_name.toLowerCase().includes(query) ||
          m.display_name?.toLowerCase().includes(query) ||
          m.short_name?.toLowerCase().includes(query),
      );
    },
    sortFn: (data, sort) => {
      const s = [...data];
      s.sort((a, b) => {
        const av = a[sort.column as keyof Maker] ?? "";
        const bv = b[sort.column as keyof Maker] ?? "";
        const comp = String(av).localeCompare(String(bv), "ja");
        return sort.direction === "asc" ? comp : -comp;
      });
      return s;
    },
  });

  // -- Resource Hooks --
  const { data: makers = [], isLoading, isError, error, refetch } = useMakers();
  const createMutation = useCreateMaker();
  const updateMutation = useUpdateMaker();
  const deleteMutation = useDeleteMaker();

  // -- Handlers --
  const handleCreate = useCallback(
    (data: MakerCreateRequest) =>
      createMutation.mutate(data, {
        onSuccess: () => {
          master.log("Create success");
          master.dlgs.close();
        },
      }),
    [createMutation, master],
  );

  const handleUpdate = useCallback(
    (data: MakerUpdateInput) => {
      if (!master.dlgs.selectedItem) return;
      updateMutation.mutate(
        {
          id: master.dlgs.selectedItem.id,
          data: { ...data, version: master.dlgs.selectedItem.version },
        },
        {
          onSuccess: () => {
            master.log("Update success");
            master.dlgs.close();
          },
        },
      );
    },
    [master, updateMutation],
  );

  const handleDelete = useCallback(() => {
    if (!master.dlgs.deletingItem) return;
    deleteMutation.mutate(
      { id: master.dlgs.deletingItem.id, version: master.dlgs.deletingItem.version },
      {
        onSuccess: () => {
          master.log("Delete success");
          master.dlgs.close();
        },
      },
    );
  }, [master, deleteMutation]);

  return {
    ...master,
    makers,
    isLoading,
    isError,
    error: error instanceof Error ? error : null,
    refetch,
    handleCreate,
    handleUpdate,
    handleDelete,
    // UI 互換性のためのエイリアス
    isCreatePending: createMutation.isPending,
    isUpdatePending: updateMutation.isPending,
  };
}
