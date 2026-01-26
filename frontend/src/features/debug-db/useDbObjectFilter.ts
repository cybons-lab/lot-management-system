import { useMemo } from "react";

import { type DbObject, type DbObjectType } from "./api";

export function useDbObjectFilter(
  objects: DbObject[],
  search: string,
  typeFilter: DbObjectType | "all",
) {
  return useMemo(() => {
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
}
