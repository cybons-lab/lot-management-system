import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { type Maker, type MakerCreateRequest, type MakerUpdateInput } from "../api";
import { createMakerColumns } from "../components/MakerColumns";
import { MakerDialogs } from "../components/MakerDialogs";
import { MakerStats } from "../components/MakerStats";
import { useCreateMaker, useDeleteMaker, useMakers, useUpdateMaker } from "../hooks/useMakers";

import { Button } from "@/components/ui";
import { type SortConfig } from "@/shared/components/data/DataTable";
import { MasterPageTemplate } from "@/shared/components/layout/MasterPageTemplate";

const makersPageHeader = {
  title: "メーカーマスタ",
  subtitle: "製造元（層別コード統合）の管理",
  backLink: { to: "/masters", label: "マスタ管理" },
} as const;

function useFilteredAndSortedMakers(makers: Maker[], searchQuery: string, sort: SortConfig) {
  const filteredMakers = useMemo(() => {
    if (!searchQuery.trim()) return makers;
    const q = searchQuery.toLowerCase();
    return makers.filter(
      (maker) =>
        maker.maker_code.toLowerCase().includes(q) ||
        maker.maker_name.toLowerCase().includes(q) ||
        maker.display_name?.toLowerCase().includes(q) ||
        maker.short_name?.toLowerCase().includes(q),
    );
  }, [makers, searchQuery]);

  return useMemo(() => {
    const sorted = [...filteredMakers];
    sorted.sort((a, b) => {
      const aVal = a[sort.column as keyof Maker] ?? "";
      const bVal = b[sort.column as keyof Maker] ?? "";
      const cmp = String(aVal).localeCompare(String(bVal), "ja");
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredMakers, sort]);
}

function useMakersPageModel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "maker_code", direction: "asc" });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMaker, setEditingMaker] = useState<Maker | null>(null);
  const [deletingMaker, setDeletingMaker] = useState<Maker | null>(null);

  const { data: makers = [], isLoading, isError, error, refetch } = useMakers();
  const createMutation = useCreateMaker();
  const updateMutation = useUpdateMaker();
  const deleteMutation = useDeleteMaker();

  const sortedMakers = useFilteredAndSortedMakers(makers, searchQuery, sort);
  const columns = useMemo(
    () => createMakerColumns({ onEdit: setEditingMaker, onDelete: setDeletingMaker }),
    [],
  );

  const handleCreate = useCallback(
    (data: MakerCreateRequest) =>
      createMutation.mutate(data, { onSuccess: () => setIsCreateOpen(false) }),
    [createMutation],
  );

  const handleUpdate = useCallback(
    (data: MakerUpdateInput) => {
      if (!editingMaker) return;
      updateMutation.mutate(
        { id: editingMaker.id, data: { ...data, version: editingMaker.version } },
        { onSuccess: () => setEditingMaker(null) },
      );
    },
    [editingMaker, updateMutation],
  );

  const handleDelete = useCallback(() => {
    if (!deletingMaker) return;
    deleteMutation.mutate(
      { id: deletingMaker.id, version: deletingMaker.version },
      { onSuccess: () => setDeletingMaker(null) },
    );
  }, [deleteMutation, deletingMaker]);

  return {
    makers,
    isLoading,
    isError,
    error,
    refetch,
    searchQuery,
    setSearchQuery,
    sort,
    setSort,
    isCreateOpen,
    setIsCreateOpen,
    editingMaker,
    setEditingMaker,
    deletingMaker,
    setDeletingMaker,
    sortedMakers,
    columns,
    handleCreate,
    handleUpdate,
    handleDelete,
    isCreatePending: createMutation.isPending,
    isUpdatePending: updateMutation.isPending,
  };
}

export default function MakersPage() {
  const model = useMakersPageModel();

  return (
    <MasterPageTemplate
      header={makersPageHeader}
      headerActions={
        <Button onClick={() => model.setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新規登録
        </Button>
      }
      stats={<MakerStats count={model.makers.length} />}
      tableTitle="メーカー一覧"
      searchQuery={model.searchQuery}
      onSearchQueryChange={model.setSearchQuery}
      data={model.sortedMakers}
      columns={model.columns}
      sort={model.sort}
      onSortChange={model.setSort}
      getRowId={(row) => row.id.toString()}
      isLoading={model.isLoading}
      isError={model.isError}
      error={model.error instanceof Error ? model.error : null}
      onRetry={model.refetch}
      emptyMessage="メーカーが登録されていません"
      dialogContext={
        <MakerDialogs
          isCreateOpen={model.isCreateOpen}
          setIsCreateOpen={model.setIsCreateOpen}
          editingMaker={model.editingMaker}
          setEditingMaker={model.setEditingMaker}
          deletingMaker={model.deletingMaker}
          setDeletingMaker={model.setDeletingMaker}
          onCreate={model.handleCreate}
          onUpdate={model.handleUpdate}
          onDelete={model.handleDelete}
          isCreatePending={model.isCreatePending}
          isUpdatePending={model.isUpdatePending}
        />
      }
    />
  );
}
