import { Plus } from "lucide-react";
import { useState, useMemo, useCallback } from "react";

import { type Maker, type MakerCreateRequest, type MakerUpdateInput } from "../api";
import { createMakerColumns } from "../components/MakerColumns";
import { MakerDialogs } from "../components/MakerDialogs";
import { MakerStats } from "../components/MakerStats";
import { useMakers, useCreateMaker, useUpdateMaker, useDeleteMaker } from "../hooks/useMakers";

import { Button, Input } from "@/components/ui";
import { DataTable, type SortConfig } from "@/shared/components/data/DataTable";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { PageHeader } from "@/shared/components/layout/PageHeader";

// eslint-disable-next-line max-lines-per-function
export default function MakersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "maker_code", direction: "asc" });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMaker, setEditingMaker] = useState<Maker | null>(null);
  const [deletingMaker, setDeletingMaker] = useState<Maker | null>(null);

  const { data: makers = [], isLoading, isError, error, refetch } = useMakers();
  const createMutation = useCreateMaker();
  const updateMutation = useUpdateMaker();
  const deleteMutation = useDeleteMaker();

  const filteredMakers = useMemo(() => {
    if (!searchQuery.trim()) return makers;
    const q = searchQuery.toLowerCase();
    return makers.filter(
      (m) =>
        m.maker_code.toLowerCase().includes(q) ||
        m.maker_name.toLowerCase().includes(q) ||
        m.display_name?.toLowerCase().includes(q) ||
        m.short_name?.toLowerCase().includes(q),
    );
  }, [makers, searchQuery]);

  const sortedMakers = useMemo(() => {
    const sorted = [...filteredMakers];
    sorted.sort((a, b) => {
      const aVal = a[sort.column as keyof Maker] ?? "";
      const bVal = b[sort.column as keyof Maker] ?? "";
      const cmp = String(aVal).localeCompare(String(bVal), "ja");
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredMakers, sort]);

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
    (data: MakerUpdateInput) =>
      editingMaker &&
      updateMutation.mutate(
        { id: editingMaker.id, data: { ...data, version: editingMaker.version } },
        { onSuccess: () => setEditingMaker(null) },
      ),
    [updateMutation, editingMaker],
  );

  const handleDelete = useCallback(
    () =>
      deletingMaker &&
      deleteMutation.mutate(
        { id: deletingMaker.id, version: deletingMaker.version },
        { onSuccess: () => setDeletingMaker(null) },
      ),
    [deleteMutation, deletingMaker],
  );

  if (isError) {
    return (
      <div className="space-y-6 px-6 py-6 md:px-8">
        <PageHeader
          title="メーカーマスタ"
          subtitle="製造元（層別コード統合）の管理"
          backLink={{ to: "/masters", label: "マスタ管理" }}
        />
        <QueryErrorFallback error={error} resetError={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader
        title="メーカーマスタ"
        subtitle="製造元（層別コード統合）の管理"
        backLink={{ to: "/masters", label: "マスタ管理" }}
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新規登録
          </Button>
        }
      />

      <MakerStats count={makers.length} />

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">メーカー一覧</h3>
          <Input
            type="search"
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
        </div>
        <DataTable
          data={sortedMakers}
          columns={columns}
          sort={sort}
          onSortChange={setSort}
          getRowId={(row) => row.id.toString()}
          isLoading={isLoading}
          emptyMessage="メーカーが登録されていません"
        />
      </div>

      <MakerDialogs
        isCreateOpen={isCreateOpen}
        setIsCreateOpen={setIsCreateOpen}
        editingMaker={editingMaker}
        setEditingMaker={setEditingMaker}
        deletingMaker={deletingMaker}
        setDeletingMaker={setDeletingMaker}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        isCreatePending={createMutation.isPending}
        isUpdatePending={updateMutation.isPending}
      />
    </div>
  );
}
