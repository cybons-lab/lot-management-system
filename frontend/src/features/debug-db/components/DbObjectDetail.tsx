import { Copy } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import {
  type DbObject,
  type DbObjectType,
  type DbRowsColumn,
  type DbSchemaColumn,
  type DbSchemaResponse,
  type DbRelationsResponse,
  type DbDefinitionResponse,
  type DbRowsResponse,
} from "../api";

import { Badge, Button, Input, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { DataTable, type Column, type SortConfig } from "@/shared/components/data/DataTable";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { cn } from "@/shared/libs/utils";

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
    accessor: (row) => row[col.name] as React.ReactNode,
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

interface DbObjectDetailProps {
  selected: DbObject | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isSchemaLoading: boolean;
  schemaInfo?: DbSchemaResponse;
  isRowsLoading: boolean;
  rowsInfo?: DbRowsResponse;
  definitionInfo?: DbDefinitionResponse;
  relationsInfo?: DbRelationsResponse;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  page: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  sort?: SortConfig;
  onSortChange: (sort?: SortConfig) => void;
}

// eslint-disable-next-line max-lines-per-function, complexity -- 関連する画面ロジックを1箇所で管理するため
export function DbObjectDetail({
  selected,
  activeTab,
  onTabChange,
  isSchemaLoading,
  schemaInfo,
  isRowsLoading,
  rowsInfo,
  definitionInfo,
  relationsInfo,
  searchQuery,
  onSearchQueryChange,
  page,
  onPageChange,
  pageSize,
  onPageSizeChange,
  sort,
  onSortChange,
}: DbObjectDetailProps) {
  const rowColumns = useMemo(() => buildRowColumns(rowsInfo?.columns ?? []), [rowsInfo?.columns]);

  const offset = (page - 1) * pageSize;
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
    const { __rowIndex, ...payload } = row;
    navigator.clipboard
      .writeText(JSON.stringify(payload, null, 2))
      .then(() => toast.success("行データをコピーしました"))
      .catch((err) => {
        console.error("Copy failed:", err);
        toast.error("コピーに失敗しました");
      });
  };

  if (!selected) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-gray-500">
        オブジェクトを選択してください
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {selected.schema_name}.{selected.object_name}
            </div>
            <div className="text-sm text-gray-500">{selected.comment || ""}</div>
          </div>
          <Badge className={cn("font-normal", TYPE_BADGE_STYLE[selected.object_type])}>
            {TYPE_LABELS[selected.object_type]}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="flex w-full flex-wrap justify-start gap-2">
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="rows">Rows</TabsTrigger>
          <TabsTrigger value="definition" disabled={selected.object_type === "table"}>
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
                  getRowId={(row) => row.column_name}
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
                      <li
                        key={`${constraint.constraint_name}-${constraint.constraint_type}`}
                        className="rounded bg-white p-2"
                      >
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
                      <li key={`${idx.index_name}-${idx.method}`} className="rounded bg-white p-2">
                        <div className="font-medium text-gray-800">{idx.index_name}</div>
                        <div className="text-xs text-gray-500">
                          {idx.unique ? "Unique" : "Non-Unique"} / {idx.method}
                        </div>
                        <div className="text-xs text-gray-500">{idx.columns.join(", ")}</div>
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
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  placeholder="ILIKE 検索"
                  className="w-64"
                />
              </div>
              <div className="text-xs text-gray-400">※ 上限200件まで / ソートは1カラムのみ</div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <DataTable
              data={tableRows}
              columns={rowColumns}
              {...(sort !== undefined ? { sort } : {})}
              onSortChange={onSortChange}
              isLoading={isRowsLoading}
              emptyMessage="データがありません"
              getRowId={(row) => (row as Record<string, unknown>).__rowIndex as number}
              rowActions={(row) => (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleRowCopy(row as Record<string, unknown>)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            />
            <TablePagination
              currentPage={page}
              pageSize={pageSize}
              totalCount={totalEstimate}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              pageSizeOptions={[25, 50, 100, 200]}
            />
          </div>
        </TabsContent>

        <TabsContent value="definition" className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-700">View Definition</div>
          <pre className="mt-3 whitespace-pre-wrap text-sm text-gray-600 font-mono bg-gray-50 p-3 rounded">
            {definitionInfo?.definition_sql || "View 定義がありません"}
          </pre>
        </TabsContent>

        <TabsContent value="relations" className="rounded-lg border border-gray-200 bg-white p-4">
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
  );
}
