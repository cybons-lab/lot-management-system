import { Plus } from "lucide-react";
import { useMemo } from "react";

import { createMakerColumns } from "../components/MakerColumns";
import { MakerDialogs } from "../components/MakerDialogs";
import { MakerStats } from "../components/MakerStats";
import { useMakersPageModel } from "../hooks/useMakersPageModel";

import { Button } from "@/components/ui";
import { MasterPageTemplate } from "@/shared/components/layout/MasterPageTemplate";

const makersPageHeader = {
  title: "メーカーマスタ",
  subtitle: "製造元（層別コード統合）の管理",
  backLink: { to: "/masters", label: "マスタ管理" },
} as const;

/**
 * メーカーマスタ一覧ページ
 * useMakersPageModel を使用してロジックを共通化
 */
export default function MakersPage() {
  const model = useMakersPageModel();
  const { paginated, sorted } = model.processData(model.makers);

  const columns = useMemo(
    () =>
      createMakerColumns({
        onEdit: model.dlgs.openEdit,
        onDelete: model.dlgs.openPermanentDelete, // メーカーは直接削除
      }),
    [model.dlgs],
  );

  return (
    <MasterPageTemplate
      header={makersPageHeader}
      headerActions={
        <Button onClick={model.dlgs.openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新規登録
        </Button>
      }
      stats={<MakerStats count={model.makers.length} />}
      tableTitle="メーカー一覧"
      searchQuery={model.searchQuery}
      onSearchQueryChange={model.setSearchQuery}
      data={paginated}
      columns={columns}
      sort={model.sort}
      onSortChange={model.setSort}
      getRowId={(row) => row.id.toString()}
      isLoading={model.isLoading}
      isError={model.isError}
      error={model.error}
      onRetry={model.refetch}
      emptyMessage="メーカーが登録されていません"
      dialogContext={
        <MakerDialogs
          isCreateOpen={model.dlgs.isCreateOpen}
          setIsCreateOpen={(o) => !o && model.dlgs.close()}
          editingMaker={model.dlgs.selectedItem}
          setEditingMaker={(m) => (m ? model.dlgs.openEdit(m) : model.dlgs.close())}
          deletingMaker={model.dlgs.deletingItem}
          setDeletingMaker={(m) => (m ? model.dlgs.openPermanentDelete(m) : model.dlgs.close())}
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
