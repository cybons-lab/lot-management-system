/**
 * DB Browser Page
 */

import { Copy, Database, Table } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type {
  DbObject,
  DbObjectType,
  DbRowsColumn,
  DbSchemaColumn,
} from "../api";
import { useDbDefinition, useDbObjects, useDbRelations, useDbRows, useDbSchema } from "../hooks";

import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Column, SortConfig } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { PageContainer, PageHeader } from "@/shared/components/layout";
import { cn } from "@/shared/libs/utils";

type ActiveTab = "schema" | "rows" | "definition" | "relations";

const TYPE_LABELS: Record<DbObjectType, string> = {
  table: "Table",
  view: "View",
  materialized_view: "Mat View",
};

const TYPE_BADGE_STYLE: Record<DbObjectType, string> = {
  table: "bg-blue-100 text-blue-700",
  view: "bg-purple-100 text-purple-700",
  materialized_view: "bg-amber-100 text-amber-700",
};

const truncateString = (value: string, maxLength = 120) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;

const renderValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">NULL</span>;
  }

  if (typeof value === "string") {
    if (value.length > 120) {
      return (
        <details className="cursor-pointer">
          <summary className="text-gray-700">{truncateString(value)}</summary>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-600">{value}</pre>
        </details>
      );
    }
    return <span className="text-gray-700">{value}</span>;
  }

  if (typeof value === "object") {
    return (
      <details className="cursor-pointer">
        <summary className="text-gray-600">JSON</summary>
        <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-600">
          {JSON.stringify(value, null, 2)}
        </pre>
      </details>
    );
  }

  return <span className="text-gray-700">{String(value)}</span>;
};

const buildRowColumns = (columns: DbRowsColumn[]): Column<Record<string, unknown>>[] =>
  columns.map((col) => ({
    id: col.name,
    header: (
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900">{col.name}</span>
        <span className="text-[11px] text-gray-500">{col.type}</span>
      </div>
    ),
    accessor: (row) => row[col.name],
    cell: (row) => renderValue(row[col.name]),
    sortable: true,
    minWidth: 160,
  }));

const buildSchemaTableColumns = (): Column<DbSchemaColumn>[] => [
  { id: "column_name", header: "Column", accessor: (row) => row.column_name, sortable: true },
  { id: "data_type", header: "Type", accessor: (row) => row.data_type },
  { id: "is_nullable", header: "Nullable", accessor: (row) => row.is_nullable },
  {
    id: "default",
    header: "Default",
    accessor: (row) => row.column_default ?? "-",
    cell: (row) => renderValue(row.column_default),
  },
  {
    id: "comment",
    header: "Comment",
    accessor: (row) => row.comment ?? "-",
    cell: (row) => renderValue(row.comment),
  },
];

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

  const offset = (page - 1) * pageSize;

  const { data: rowsInfo, isLoading: isRowsLoading } = useDbRows(selectedSchema, selectedName, {
    limit: pageSize,
    offset,
    order_by: sort?.column,
    order_dir: sort?.direction,
    q: searchQuery || undefined,
  });

  const rowColumns = useMemo(() => buildRowColumns(rowsInfo?.columns ?? []), [rowsInfo?.columns]);

  const tableRows = useMemo(
    () =>
      (rowsInfo?.rows ?? []).map((row, index) => ({
        ...row,
        __rowIndex: offset + index,
      })),
    [rowsInfo?.rows, offset],
  );

  const totalEstimate = rowsInfo?.total_estimate ?? offset + (rowsInfo?.rows?.length ?? 0);

  const handleRowCopy = (row: Record<string, unknown>) => {
    const { __rowIndex, ...payload } = row as Record<string, unknown>;
    void navigator.clipboard
      .writeText(JSON.stringify(payload, null, 2))
      .then(() => toast.success("行データをコピーしました"))
      .catch(() => toast.error("コピーに失敗しました"));
  };

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="DB Browser"
        description="PostgreSQL のテーブル/ビューを確認する開発用ツール"
      />

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Database className="h-4 w-4" />
              DB Objects
            </div>
            <div className="mt-3 space-y-2">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="検索 (schema / name)"
              />
              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as DbObjectType | "all")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="種類" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="materialized_view">Materialized View</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="h-[600px]">
            <div className="divide-y divide-gray-100">
              {isObjectsLoading && (
                <div className="p-4 text-sm text-gray-500">読み込み中...</div>
              )}
              {!isObjectsLoading && filteredObjects.length === 0 && (
                <div className="p-4 text-sm text-gray-500">該当するオブジェクトがありません</div>
              )}
              {filteredObjects.map((obj) => {
                const isActive =
                  selected?.schema_name === obj.schema_name &&
                  selected?.object_name === obj.object_name;
                return (
                  <button
                    key={`${obj.schema_name}.${obj.object_name}`}
                    type="button"
                    onClick={() => {
                      setSelected(obj);
                      setPage(1);
                      setSort(undefined);
                    }}
                    className={cn(
                      "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors",
                      isActive ? "bg-blue-50" : "hover:bg-gray-50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Table className="h-4 w-4 text-gray-500" />
                        <span>
                          {obj.schema_name}.{obj.object_name}
                        </span>
                      </div>
                      <Badge className={TYPE_BADGE_STYLE[obj.object_type]}>
                        {TYPE_LABELS[obj.object_type]}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      {obj.comment || "コメントなし"}
                    </div>
                    <div className="text-xs text-gray-400">
                      行数推定: {obj.row_estimate?.toLocaleString() ?? "-"}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {selectedSchema && selectedName
                    ? `${selectedSchema}.${selectedName}`
                    : "オブジェクトを選択"}
                </div>
                <div className="text-sm text-gray-500">{selected?.comment || ""}</div>
              </div>
              {selected && (
                <Badge className={TYPE_BADGE_STYLE[selected.object_type]}>
                  {TYPE_LABELS[selected.object_type]}
                </Badge>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)}>
            <TabsList className="flex w-full flex-wrap justify-start gap-2">
              <TabsTrigger value="schema">Schema</TabsTrigger>
              <TabsTrigger value="rows">Rows</TabsTrigger>
              <TabsTrigger value="definition" disabled={!selected || selected.object_type === "table"}>
                Definition
              </TabsTrigger>
              <TabsTrigger value="relations">Relations</TabsTrigger>
            </TabsList>

            <TabsContent value="schema" className="rounded-lg border border-gray-200 bg-white p-4">
              {isSchemaLoading && <div className="text-sm text-gray-500">読み込み中...</div>}
              {!isSchemaLoading && schemaInfo && (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-700">Columns</div>
                    <DataTable
                      data={schemaInfo.columns}
                      columns={buildSchemaTableColumns()}
                      isLoading={isSchemaLoading}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="text-sm font-semibold text-gray-700">Constraints</div>
                      <ul className="mt-2 space-y-2 text-sm text-gray-600">
                        {schemaInfo.constraints.length === 0 && (
                          <li className="text-gray-400">制約がありません</li>
                        )}
                        {schemaInfo.constraints.map((constraint) => (
                          <li key={constraint.constraint_name} className="rounded bg-white p-2">
                            <div className="font-medium text-gray-800">
                              {constraint.constraint_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {constraint.constraint_type.toUpperCase()} |{" "}
                              {constraint.columns.join(", ")}
                            </div>
                            {constraint.foreign_table && (
                              <div className="text-xs text-gray-500">
                                → {constraint.foreign_schema}.{constraint.foreign_table} (
                                {constraint.foreign_columns?.join(", ")})
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="text-sm font-semibold text-gray-700">Indexes</div>
                      <ul className="mt-2 space-y-2 text-sm text-gray-600">
                        {schemaInfo.indexes.length === 0 && (
                          <li className="text-gray-400">インデックスがありません</li>
                        )}
                        {schemaInfo.indexes.map((idx) => (
                          <li key={idx.index_name} className="rounded bg-white p-2">
                            <div className="font-medium text-gray-800">{idx.index_name}</div>
                            <div className="text-xs text-gray-500">
                              {idx.unique ? "Unique" : "Non-Unique"} / {idx.method}
                            </div>
                            <div className="text-xs text-gray-500">
                              {idx.columns.join(", ")}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="rows" className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">検索 (text columns)</span>
                    <Input
                      value={searchQuery}
                      onChange={(event) => {
                        setSearchQuery(event.target.value);
                        setPage(1);
                      }}
                      placeholder="ILIKE 検索"
                      className="w-64"
                    />
                  </div>
                  <div className="text-xs text-gray-400">
                    ※ 上限200件まで / ソートは1カラムのみ
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white">
                <DataTable
                  data={tableRows}
                  columns={rowColumns}
                  sort={sort}
                  onSortChange={(nextSort) => {
                    setSort(nextSort);
                    setPage(1);
                  }}
                  isLoading={isRowsLoading}
                  emptyMessage="データがありません"
                  getRowId={(row) => (row as Record<string, unknown>).__rowIndex as number}
                  rowActions={(row) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleRowCopy(row)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                />
                <TablePagination
                  currentPage={page}
                  pageSize={pageSize}
                  totalCount={totalEstimate}
                  onPageChange={(nextPage) => setPage(nextPage)}
                  onPageSizeChange={(nextSize) => {
                    setPageSize(nextSize);
                    setPage(1);
                  }}
                  pageSizeOptions={[25, 50, 100, 200]}
                />
              </div>
            </TabsContent>

            <TabsContent
              value="definition"
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="text-sm font-semibold text-gray-700">View Definition</div>
              <pre className="mt-3 whitespace-pre-wrap text-sm text-gray-600">
                {definitionInfo?.definition_sql || "View 定義がありません"}
              </pre>
            </TabsContent>

            <TabsContent
              value="relations"
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="text-sm font-semibold text-gray-700">Outgoing FK</div>
                  <ul className="mt-2 space-y-2 text-sm text-gray-600">
                    {relationsInfo?.outgoing_fks.length === 0 && (
                      <li className="text-gray-400">参照関係がありません</li>
                    )}
                    {relationsInfo?.outgoing_fks.map((fk) => (
                      <li key={fk.constraint_name} className="rounded bg-white p-2">
                        <div className="font-medium text-gray-800">{fk.constraint_name}</div>
                        <div className="text-xs text-gray-500">
                          {fk.from} → {fk.to}
                        </div>
                        <div className="text-xs text-gray-500">
                          {fk.columns.map(([from, to]) => `${from} → ${to}`).join(", ")}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="text-sm font-semibold text-gray-700">Incoming FK</div>
                  <ul className="mt-2 space-y-2 text-sm text-gray-600">
                    {relationsInfo?.incoming_fks.length === 0 && (
                      <li className="text-gray-400">参照されていません</li>
                    )}
                    {relationsInfo?.incoming_fks.map((fk) => (
                      <li key={fk.constraint_name} className="rounded bg-white p-2">
                        <div className="font-medium text-gray-800">{fk.constraint_name}</div>
                        <div className="text-xs text-gray-500">
                          {fk.from} → {fk.to}
                        </div>
                        <div className="text-xs text-gray-500">
                          {fk.columns.map(([from, to]) => `${from} → ${to}`).join(", ")}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="text-sm font-semibold text-gray-700">View Dependencies</div>
                  <ul className="mt-2 space-y-2 text-sm text-gray-600">
                    {relationsInfo?.view_dependencies.length === 0 && (
                      <li className="text-gray-400">依存関係がありません</li>
                    )}
                    {relationsInfo?.view_dependencies.map((dep, idx) => (
                      <li key={`${dep.from}-${dep.to}-${idx}`} className="rounded bg-white p-2">
                        <div className="text-xs text-gray-500">
                          {dep.from} → {dep.to} ({dep.ref_type})
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="text-sm font-semibold text-gray-700">View Dependents</div>
                  <ul className="mt-2 space-y-2 text-sm text-gray-600">
                    {relationsInfo?.view_dependents.length === 0 && (
                      <li className="text-gray-400">参照されていません</li>
                    )}
                    {relationsInfo?.view_dependents.map((dep, idx) => (
                      <li key={`${dep.from}-${dep.to}-${idx}`} className="rounded bg-white p-2">
                        <div className="text-xs text-gray-500">
                          {dep.from} → {dep.to} ({dep.ref_type})
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageContainer>
  );
}
