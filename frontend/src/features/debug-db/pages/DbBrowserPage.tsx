/**
 * DB Browser Page
 */

import { useState, useMemo, useEffect } from "react";

import { type DbObject, type DbObjectType } from "../api";
import { DbObjectDetail } from "../components/DbObjectDetail";
import { DbObjectList } from "../components/DbObjectList";
import { useDbObjects, useDbSchema, useDbDefinition, useDbRelations, useDbRows } from "../hooks";

import { type SortConfig } from "@/shared/components/data/DataTable";
import { PageContainer, PageHeader } from "@/shared/components/layout";

type ActiveTab = "schema" | "rows" | "definition" | "relations";

// eslint-disable-next-line max-lines-per-function
export function DbBrowserPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("schema");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<DbObjectType | "all">("all");
  const [selected, setSelected] = useState<DbObject | null>(null);
  const [sort, setSort] = useState<SortConfig | undefined>(undefined);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: objects = [], isLoading: isObjectsLoading } = useDbObjects();

  useEffect(() => {
    if (!selected && objects.length > 0) {
      setSelected(objects[0]);
    }
  }, [objects, selected]);

  const filteredObjects = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return objects.filter((obj) => {
      const matchesType = typeFilter === "all" || obj.object_type === typeFilter;
      const matchesSearch =
        !keyword ||
        obj.object_name.toLowerCase().includes(keyword) ||
        obj.schema_name.toLowerCase().includes(keyword);
      return matchesType && matchesSearch;
    });
  }, [objects, search, typeFilter]);

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
          onTabChange={(tab) => setActiveTab(tab as ActiveTab)}
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
