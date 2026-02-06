/**
 * DB Browser hooks
 */

import { useQuery } from "@tanstack/react-query";

import type { DbRowsParams } from "./api";
import { getDbDefinition, getDbObjects, getDbRelations, getDbRows, getDbSchema } from "./api";

export const dbBrowserKeys = {
  all: ["db-browser"] as const,
  objects: (columnQ?: string) => [...dbBrowserKeys.all, "objects", { columnQ }] as const,
  schema: (schema: string, name: string) => [...dbBrowserKeys.all, "schema", schema, name] as const,
  rows: (schema: string, name: string, params: DbRowsParams) =>
    [...dbBrowserKeys.all, "rows", schema, name, params] as const,
  definition: (schema: string, name: string) =>
    [...dbBrowserKeys.all, "definition", schema, name] as const,
  relations: (schema: string, name: string) =>
    [...dbBrowserKeys.all, "relations", schema, name] as const,
};

export const useDbObjects = (columnQ?: string) =>
  useQuery({
    queryKey: dbBrowserKeys.objects(columnQ),
    queryFn: () => getDbObjects(columnQ),
    staleTime: 60 * 1000,
  });

export const useDbSchema = (schema: string | undefined, name: string | undefined) =>
  useQuery({
    queryKey: schema && name ? dbBrowserKeys.schema(schema, name) : ["db-browser", "schema"],
    queryFn: () => getDbSchema(schema!, name!),
    enabled: Boolean(schema && name),
  });

export const useDbRows = (
  schema: string | undefined,
  name: string | undefined,
  params: DbRowsParams,
) =>
  useQuery({
    queryKey: schema && name ? dbBrowserKeys.rows(schema, name, params) : ["db-browser", "rows"],
    queryFn: () => getDbRows(schema!, name!, params),
    enabled: Boolean(schema && name),
    placeholderData: (previousData: unknown) => previousData,
  });

export const useDbDefinition = (
  schema: string | undefined,
  name: string | undefined,
  enabled: boolean,
) =>
  useQuery({
    queryKey:
      schema && name ? dbBrowserKeys.definition(schema, name) : ["db-browser", "definition"],
    queryFn: () => getDbDefinition(schema!, name!),
    enabled: Boolean(schema && name && enabled),
  });

export const useDbRelations = (schema: string | undefined, name: string | undefined) =>
  useQuery({
    queryKey: schema && name ? dbBrowserKeys.relations(schema, name) : ["db-browser", "relations"],
    queryFn: () => getDbRelations(schema!, name!),
    enabled: Boolean(schema && name),
  });
