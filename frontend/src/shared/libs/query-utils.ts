import type { Query } from "@tanstack/react-query";

import { isAuthExpired } from "@/shared/auth/auth-status";

export type RefetchInterval = number | false | ((query: Query) => number | false);

export function authAwareRefetchInterval(interval: RefetchInterval) {
  return (query: Query) => {
    if (isAuthExpired()) {
      return false;
    }

    if (typeof interval === "function") {
      return interval(query);
    }

    return interval;
  };
}
