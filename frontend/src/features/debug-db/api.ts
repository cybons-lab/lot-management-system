/**
 * DB Browser API client
 */

import { http } from "@/shared/api/http-client";

export type DbObjectType = "table" | "view" | "materialized_view";

export interface DbObject {
  schema_name: string;
  object_name: string;
  object_type: DbObjectType;
  comment?: string | null;
  row_estimate?: number | null;
}

export interface DbSchemaColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  char_max_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  comment: string | null;
}

export interface DbConstraint {
  constraint_name: string;
  constraint_type: "p" | "u" | "f";
  columns: string[];
  foreign_schema?: string | null;
  foreign_table?: string | null;
  foreign_columns?: string[] | null;
}

export interface DbIndex {
  index_name: string;
  unique: boolean;
  method: string;
  columns: string[];
}

export interface DbSchemaResponse {
  columns: DbSchemaColumn[];
  constraints: DbConstraint[];
  indexes: DbIndex[];
  primary_key_columns: string[];
}

export interface DbRowsColumn {
  name: string;
  type: string;
}

export interface DbRowsResponse {
  columns: DbRowsColumn[];
  rows: Record<string, unknown>[];
  total_estimate?: number | null;
}

export interface DbDefinitionResponse {
  definition_sql: string;
}

export interface DbGraphNode {
  id: string;
  schema: string;
  name: string;
  type: DbObjectType;
}

export interface DbGraphEdge {
  type: "fk" | "view_dependency";
  from: string;
  to: string;
  columns?: [string, string][];
  ref_type?: "table" | "view";
}

export interface DbGraphResponse {
  nodes: DbGraphNode[];
  edges: DbGraphEdge[];
}

export interface DbRelationsResponse {
  outgoing_fks: {
    constraint_name: string;
    from: string;
    to: string;
    columns: [string, string][];
  }[];
  incoming_fks: {
    constraint_name: string;
    from: string;
    to: string;
    columns: [string, string][];
  }[];
  view_dependencies: {
    from: string;
    to: string;
    ref_type: "table" | "view";
  }[];
  view_dependents: {
    from: string;
    to: string;
    ref_type: "table" | "view";
  }[];
}

export interface DbRowsParams {
  limit?: number;
  offset?: number;
  order_by?: string;
  order_dir?: "asc" | "desc";
  q?: string;
  filters?: string[];
}

export const getDbObjects = (columnQ?: string) => {
  const params = new URLSearchParams();
  if (columnQ) params.set("column_q", columnQ);
  const query = params.toString();
  return http.get<DbObject[]>(`debug/db/objects${query ? `?${query}` : ""}`);
};

export const getDbSchema = (schema: string, name: string) =>
  http.get<DbSchemaResponse>(`debug/db/objects/${schema}/${name}/schema`);

export const getDbRows = (schema: string, name: string, params: DbRowsParams) => {
  const searchParams = new URLSearchParams();
  if (params.limit !== undefined) searchParams.set("limit", params.limit.toString());
  if (params.offset !== undefined) searchParams.set("offset", params.offset.toString());
  if (params.order_by) searchParams.set("order_by", params.order_by);
  if (params.order_dir) searchParams.set("order_dir", params.order_dir);
  if (params.q) searchParams.set("q", params.q);
  params.filters?.forEach((filter) => searchParams.append("filters", filter));

  const query = searchParams.toString();
  return http.get<DbRowsResponse>(
    `debug/db/objects/${schema}/${name}/rows${query ? `?${query}` : ""}`,
  );
};

export const getDbDefinition = (schema: string, name: string) =>
  http.get<DbDefinitionResponse>(`debug/db/objects/${schema}/${name}/definition`);

export const getDbGraph = () => http.get<DbGraphResponse>("debug/db/graph");

export const getDbRelations = (schema: string, name: string) =>
  http.get<DbRelationsResponse>(`debug/db/objects/${schema}/${name}/relations`);
