import { type ReactNode } from "react";

import { MasterPageTable } from "./MasterPageTable";
import { PageContainer } from "./PageContainer";
import { PageHeader, type PageHeaderProps } from "./PageHeader";

import { type Column, type SortConfig } from "@/shared/components/data/DataTable";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { cn } from "@/shared/libs/utils";

interface MasterPageTemplateProps<T> {
  // Header props
  header: Omit<PageHeaderProps, "actions" | "className">;
  headerActions?: ReactNode | undefined;

  // Stats props (optional)
  stats?: ReactNode | undefined;

  // Search/Table props
  tableTitle?: string | undefined;
  searchQuery?: string | undefined;
  onSearchQueryChange?: ((value: string) => void) | undefined;
  searchPlaceholder?: string | undefined;

  // Custom toolbar controls
  leftToolbarControls?: ReactNode | undefined;
  rightToolbarControls?: ReactNode | undefined;

  // Slots
  beforeTable?: ReactNode | undefined;
  afterTable?: ReactNode | undefined;

  // DataTable props
  data: T[];
  columns: Column<T>[];
  sort?: SortConfig | undefined;
  onSortChange?: ((sort: SortConfig) => void) | undefined;
  getRowId?: ((row: T) => string | number) | undefined;
  onRowClick?: ((row: T) => void) | undefined;
  isLoading?: boolean | undefined;
  emptyMessage?: string | undefined;
  selectable?: boolean | undefined;
  selectedIds?: (string | number)[] | undefined;
  onSelectionChange?: ((selectedIds: (string | number)[]) => void) | undefined;

  // Error handling
  isError?: boolean | undefined;
  error?: Error | null;
  onRetry?: (() => void) | undefined;

  // Dialogs
  dialogContext?: ReactNode | undefined;

  // Optional styling
  className?: string | undefined;
}

/**
 * マスタ一覧ページの共通テンプレートコンポーネント
 */
export function MasterPageTemplate<T>({
  header,
  headerActions,
  stats,
  tableTitle,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder,
  leftToolbarControls,
  rightToolbarControls,
  beforeTable,
  afterTable,
  data,
  columns,
  sort,
  onSortChange,
  getRowId,
  onRowClick,
  isLoading,
  emptyMessage,
  selectable,
  selectedIds,
  onSelectionChange,
  isError,
  error,
  onRetry,
  dialogContext,
  className,
}: MasterPageTemplateProps<T>) {
  if (isError) {
    return (
      <PageContainer className={cn("space-y-6", className)}>
        <PageHeader {...header} actions={headerActions} />
        <QueryErrorFallback error={error || null} resetError={onRetry} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className={cn("space-y-6", className)}>
      <PageHeader {...header} actions={headerActions} />

      {/* Stats Section */}
      {stats && <div className="flex flex-wrap gap-4">{stats}</div>}

      {/* Main Table Content */}
      <div className="space-y-4">
        {/* Bulk actions or messages */}
        {beforeTable}

        <MasterPageTable
          tableTitle={tableTitle}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          searchPlaceholder={searchPlaceholder}
          leftToolbarControls={leftToolbarControls}
          rightToolbarControls={rightToolbarControls}
          data={data}
          columns={columns}
          sort={sort}
          onSortChange={onSortChange}
          getRowId={getRowId}
          onRowClick={onRowClick}
          isLoading={isLoading}
          emptyMessage={emptyMessage}
          selectable={selectable}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
          afterTable={afterTable}
        />
      </div>

      {/* Dialog Context (Modals, etc.) */}
      {dialogContext}
    </PageContainer>
  );
}
