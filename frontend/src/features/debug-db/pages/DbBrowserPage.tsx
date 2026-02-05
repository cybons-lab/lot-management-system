/**
 * DB Browser Page
 */

import { Settings2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { type DbObject, type DbObjectType } from "../api";
import { DbObjectDetail } from "../components/DbObjectDetail";
import { DbObjectList } from "../components/DbObjectList";
import { useDbObjects, useDbSchema, useDbDefinition, useDbRelations, useDbRows } from "../hooks";
import { useDbObjectFilter } from "../useDbObjectFilter";

import { type SortConfig } from "@/shared/components/data/DataTable";
import { PageContainer, PageHeader } from "@/shared/components/layout";

type ActiveTab = "schema" | "rows" | "definition" | "relations";

// eslint-disable-next-line max-lines-per-function, complexity -- 関連する画面ロジックを1箇所で管理するため
export function DbBrowserPage() {
  const { tab = "schema" } = useParams<{ tab: ActiveTab }>();
  const navigate = useNavigate();
  const activeTab = tab as ActiveTab;
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<DbObjectType | "all">("all");
  const [selected, setSelected] = useState<DbObject | null>(null);
  const [sort, setSort] = useState<SortConfig | undefined>(undefined);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: objects = [], isLoading: isObjectsLoading, error } = useDbObjects();

  useEffect(() => {
    if (!selected && objects.length > 0) {
      setSelected(objects[0]);
    }
  }, [objects, selected]);

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

  const { data: rowsInfo, isLoading: isRowsLoading } = useDbRows(selectedSchema, selectedName, {
    limit: pageSize,
    offset: (page - 1) * pageSize,
    order_by: sort?.column,
    order_dir: sort?.direction,
    q: searchQuery || undefined,
  });

  // Check if feature is disabled (403 Forbidden)
  const isForbidden =
    (error as { response?: { status?: number } } | null | undefined)?.response?.status === 403;

  if (isForbidden) {
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
          objects={objects}
          isLoading={isObjectsLoading}
          selected={selected}
          onSelect={(obj) => {
            setSelected(obj);
            setPage(1);
            setSort(undefined);
          }}
          search={search}
          onSearchChange={setSearch}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          filteredObjects={filteredObjects}
        />

        <DbObjectDetail
          selected={selected}
          activeTab={activeTab}
          onTabChange={(tab) => navigate(`../${tab}`)}
          isSchemaLoading={isSchemaLoading}
          schemaInfo={schemaInfo}
          isRowsLoading={isRowsLoading}
          rowsInfo={rowsInfo}
          definitionInfo={definitionInfo}
          relationsInfo={relationsInfo}
          searchQuery={searchQuery}
          onSearchQueryChange={(query) => {
            setSearchQuery(query);
            setPage(1);
          }}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          sort={sort}
          onSortChange={setSort}
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
      <div className="bg-card rounded-lg border p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="bg-muted p-4 rounded-full">
          <Settings2 className="h-10 w-10 text-muted-foreground" />
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
