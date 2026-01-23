import type { DefaultError, Query, QueryKey } from "@tanstack/react-query";

import { isAuthExpired } from "@/shared/auth/auth-status";

export type RefetchInterval<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> =
  | number
  | false
  | ((query: Query<TQueryFnData, TError, TData, TQueryKey>) => number | false | undefined);

export function authAwareRefetchInterval<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(interval: RefetchInterval<TQueryFnData, TError, TData, TQueryKey>) {
  return (query: Query<TQueryFnData, TError, TData, TQueryKey>) => {
    if (isAuthExpired()) {
      return false;
    }

    if (typeof interval === "function") {
      return interval(query);
    }

    return interval;
  };
}
