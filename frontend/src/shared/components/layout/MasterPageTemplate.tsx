import { ReactNode, ChangeEvent } from "react";
import { PageContainer } from "./PageContainer";
import { PageHeader, type PageHeaderProps } from "./PageHeader";
import { Input } from "@/components/ui/input";
import { DataTable, type SortConfig, type Column } from "@/shared/components/data/DataTable";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { cn } from "@/shared/libs/utils";

interface MasterPageTemplateProps<T> {
    // Header props
    header: Omit<PageHeaderProps, "actions" | "className">;
    headerActions?: ReactNode;

    // Stats props (optional)
    stats?: ReactNode;

    // Search/Table props
    tableTitle?: string;
    searchQuery?: string;
    onSearchQueryChange?: (value: string) => void;
    searchPlaceholder?: string;

    // Custom toolbar controls
    leftToolbarControls?: ReactNode;
    rightToolbarControls?: ReactNode;

    // Slots
    beforeTable?: ReactNode;
    afterTable?: ReactNode;

    // DataTable props
    data: T[];
    columns: Column<T>[];
    sort?: SortConfig;
    onSortChange?: (sort: SortConfig) => void;
    getRowId?: (row: T) => string | number;
    onRowClick?: (row: T) => void;
    isLoading?: boolean;
    emptyMessage?: string;
    selectable?: boolean;
    selectedIds?: (string | number)[];
    onSelectionChange?: (selectedIds: (string | number)[]) => void;

    // Error handling
    isError?: boolean;
    error?: Error | null;
    onRetry?: () => void;

    // Dialogs
    dialogContext?: ReactNode;

    // Optional styling
    className?: string;
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
    searchPlaceholder = "検索...",
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
                <PageHeader
                    title={header.title}
                    {...(header.subtitle ? { subtitle: header.subtitle } : {})}
                    {...(header.backLink ? { backLink: header.backLink } : {})}
                    {...(headerActions ? { actions: headerActions } : {})}
                />
                <QueryErrorFallback error={error || null} {...(onRetry ? { resetError: onRetry } : {})} />
            </PageContainer>
        );
    }

    return (
        <PageContainer className={cn("space-y-6", className)}>
            <PageHeader
                title={header.title}
                {...(header.subtitle ? { subtitle: header.subtitle } : {})}
                {...(header.backLink ? { backLink: header.backLink } : {})}
                {...(headerActions ? { actions: headerActions } : {})}
            />

            {/* Stats Section */}
            {stats && <div className="flex flex-wrap gap-4">{stats}</div>}

            {/* Main Table Content */}
            <div className="space-y-4">
                {/* Bulk actions or messages */}
                {beforeTable}

                <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
                    {(tableTitle || onSearchQueryChange || leftToolbarControls || rightToolbarControls) && (
                        <div className="flex items-center justify-between border-b px-4 py-3 bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                {tableTitle && <h3 className="text-sm font-semibold text-slate-900">{tableTitle}</h3>}
                                {leftToolbarControls}
                            </div>
                            <div className="flex items-center gap-4">
                                {rightToolbarControls}
                                {onSearchQueryChange && (
                                    <Input
                                        type="search"
                                        placeholder={searchPlaceholder}
                                        value={searchQuery}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                            onSearchQueryChange(e.target.value)
                                        }
                                        className="w-64 bg-white"
                                    />
                                )}
                            </div>
                        </div>
                    )}
                    <DataTable
                        data={data}
                        columns={columns}
                        {...(sort ? { sort } : {})}
                        {...(onSortChange ? { onSortChange } : {})}
                        {...(getRowId ? { getRowId } : {})}
                        {...(onRowClick ? { onRowClick } : {})}
                        {...(isLoading !== undefined ? { isLoading } : {})}
                        {...(emptyMessage ? { emptyMessage } : {})}
                        {...(selectable !== undefined ? { selectable } : {})}
                        {...(selectedIds ? { selectedIds } : {})}
                        {...(onSelectionChange ? { onSelectionChange } : {})}
                        className="border-none shadow-none rounded-none"
                    />
                    {afterTable && <div className="border-t">{afterTable}</div>}
                </div>
            </div>

            {/* Dialog Context (Modals, etc.) */}
            {dialogContext}
        </PageContainer>
    );
}
