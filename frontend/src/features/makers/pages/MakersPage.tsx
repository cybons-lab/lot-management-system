import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { type Maker, type MakerCreateRequest, type MakerUpdateInput } from "../api";
import { createMakerColumns } from "../components/MakerColumns";
import { MakerDialogs } from "../components/MakerDialogs";
import { MakerStats } from "../components/MakerStats";
import { useCreateMaker, useDeleteMaker, useMakers, useUpdateMaker } from "../hooks/useMakers";

import { Button, Input } from "@/components/ui";
import { DataTable, type SortConfig } from "@/shared/components/data/DataTable";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { PageHeader } from "@/shared/components/layout/PageHeader";

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

function MakersErrorView({ error, refetch }: { error: unknown; refetch: () => unknown }) {
  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader {...makersPageHeader} />
      <QueryErrorFallback error={error} resetError={refetch} />
    </div>
  );
}

interface MakersTableCardProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  sortedMakers: Maker[];
  columns: ReturnType<typeof createMakerColumns>;
  sort: SortConfig;
  onSortChange: (sort: SortConfig) => void;
  isLoading: boolean;
}

function MakersTableCard({
  searchQuery,
  onSearchQueryChange,
  sortedMakers,
  columns,
  sort,
  onSortChange,
  isLoading,
}: MakersTableCardProps) {
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-lg font-semibold text-gray-900">メーカー一覧</h3>
        <Input
          type="search"
          placeholder="検索..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="w-64"
        />
      </div>
      <DataTable
        data={sortedMakers}
        columns={columns}
        sort={sort}
        onSortChange={onSortChange}
        getRowId={(row) => row.id.toString()}
        isLoading={isLoading}
        emptyMessage="メーカーが登録されていません"
      />
    </div>
  );
}

export default function MakersPage() {
  const model = useMakersPageModel();

  if (model.isError) {
    return <MakersErrorView error={model.error} refetch={model.refetch} />;
  }

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader
        {...makersPageHeader}
        actions={
          <Button onClick={() => model.setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新規登録
          </Button>
        }
      />

      <MakerStats count={model.makers.length} />

      <MakersTableCard
        searchQuery={model.searchQuery}
        onSearchQueryChange={model.setSearchQuery}
        sortedMakers={model.sortedMakers}
        columns={model.columns}
        sort={model.sort}
        onSortChange={model.setSort}
        isLoading={model.isLoading}
      />

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
    </div>
  );
}
