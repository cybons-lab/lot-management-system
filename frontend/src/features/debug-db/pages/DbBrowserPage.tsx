/**
 * DB Browser Page
 */

import { Settings2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { type DbObject, type DbObjectType } from "../api";
import { DbObjectDetail } from "../components/DbObjectDetail";
import { DbObjectList } from "../components/DbObjectList";
import { useDbDefinition, useDbObjects, useDbRelations, useDbRows, useDbSchema } from "../hooks";
import { useDbObjectFilter } from "../useDbObjectFilter";

import { type SortConfig } from "@/shared/components/data/DataTable";
import { PageContainer, PageHeader } from "@/shared/components/layout";

type ActiveTab = "schema" | "rows" | "definition" | "relations";

function useDbBrowserViewState() {
  const { tab = "schema" } = useParams<{ tab: ActiveTab }>();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [columnSearch, setColumnSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<DbObjectType | "all">("all");
  const [selected, setSelected] = useState<DbObject | null>(null);
  const [sort, setSort] = useState<SortConfig | undefined>(undefined);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const rowQueryParams = useMemo(
    () => ({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      ...(sort?.column ? { order_by: sort.column } : {}),
      ...(sort?.direction ? { order_dir: sort.direction } : {}),
      ...(searchQuery ? { q: searchQuery } : {}),
    }),
    [page, pageSize, searchQuery, sort?.column, sort?.direction],
  );

  const handleSelectObject = useCallback((obj: DbObject) => {
    setSelected(obj);
    setPage(1);
    setSort(undefined);
  }, []);

  const handleTabChange = useCallback(
    (nextTab: string) => {
      navigate(`../${nextTab}`);
    },
    [navigate],
  );

  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  return {
    activeTab: tab as ActiveTab,
    selected,
    search,
    setSearch,
    columnSearch,
    setColumnSearch,
    typeFilter,
    setTypeFilter,
    searchQuery,
    handleSearchQueryChange,
    page,
    setPage,
    pageSize,
    handlePageSizeChange,
    sort,
    setSort,
    handleSelectObject,
    handleTabChange,
    rowQueryParams,
  };
}

function useDbBrowserPageModel() {
  const view = useDbBrowserViewState();
  const { selected, search, columnSearch, typeFilter, rowQueryParams, handleSelectObject } = view;
  const { data: objects = [], isLoading: isObjectsLoading, error } = useDbObjects(columnSearch);

  useEffect(() => {
    if (!selected && objects.length > 0 && objects[0]) {
      handleSelectObject(objects[0]);
    }
  }, [handleSelectObject, objects, selected]);

  const filteredObjects = useDbObjectFilter(objects, search, typeFilter);
  const selectedSchema = selected?.schema_name;
  const selectedName = selected?.object_name;
  const { data: schemaInfo, isLoading: isSchemaLoading } = useDbSchema(
    selectedSchema,
    selectedName,
  );
  const shouldFetchDefinition =
    selected?.object_type === "view" || selected?.object_type === "materialized_view";
  const { data: definitionInfo } = useDbDefinition(
    selectedSchema,
    selectedName,
    shouldFetchDefinition,
  );
  const { data: relationsInfo } = useDbRelations(selectedSchema, selectedName);
  const { data: rowsInfo, isLoading: isRowsLoading } = useDbRows(
    selectedSchema,
    selectedName,
    rowQueryParams,
  );
  const isForbidden =
    (error as { response?: { status?: number } } | null | undefined)?.response?.status === 403;

  return {
    ...view,
    objects,
    isObjectsLoading,
    filteredObjects,
    schemaInfo,
    isSchemaLoading,
    rowsInfo,
    isRowsLoading,
    definitionInfo,
    relationsInfo,
    isForbidden,
  };
}

export function DbBrowserPage() {
  const model = useDbBrowserPageModel();

  if (model.isForbidden) {
    return <ForbiddenView />;
  }

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="DB Browser"
        subtitle="PostgreSQL のテーブル/ビューを確認する開発用ツール"
      />

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <DbObjectList
          objects={model.objects}
          isLoading={model.isObjectsLoading}
          selected={model.selected}
          onSelect={model.handleSelectObject}
          search={model.search}
          onSearchChange={model.setSearch}
          columnSearch={model.columnSearch}
          onColumnSearchChange={model.setColumnSearch}
          typeFilter={model.typeFilter}
          onTypeFilterChange={model.setTypeFilter}
          filteredObjects={model.filteredObjects}
        />

        <DbObjectDetail
          selected={model.selected}
          activeTab={model.activeTab}
          onTabChange={model.handleTabChange}
          isSchemaLoading={model.isSchemaLoading}
          {...(model.schemaInfo ? { schemaInfo: model.schemaInfo } : {})}
          isRowsLoading={model.isRowsLoading}
          {...(model.rowsInfo ? { rowsInfo: model.rowsInfo } : {})}
          {...(model.definitionInfo ? { definitionInfo: model.definitionInfo } : {})}
          {...(model.relationsInfo ? { relationsInfo: model.relationsInfo } : {})}
          searchQuery={model.searchQuery}
          onSearchQueryChange={model.handleSearchQueryChange}
          page={model.page}
          onPageChange={model.setPage}
          pageSize={model.pageSize}
          onPageSizeChange={model.handlePageSizeChange}
          {...(model.sort ? { sort: model.sort } : {})}
          onSortChange={model.setSort}
        />
      </div>
    </PageContainer>
  );
}

function ForbiddenView() {
  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="DB Browser"
        subtitle="PostgreSQL のテーブル/ビューを確認する開発用ツール"
      />
      <div className="bg-card flex flex-col items-center justify-center space-y-4 rounded-lg border p-12 text-center">
        <div className="bg-muted rounded-full p-4">
          <Settings2 className="text-muted-foreground h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold">この機能は現在無効化されています</h3>
          <p className="text-muted-foreground max-w-md">
            DBブラウザの使用はシステム設定で停止されています。
            利用が必要な場合は、管理画面の「システム設定」から有効にしてください。
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
