/**
 * SmartRead Query Keys
 *
 * TanStack Query用のクエリキー定義。
 * 一元管理することでキャッシュ無効化の整合性を保証。
 */

type QueryKeyPart = string | number;
type QueryKey = readonly QueryKeyPart[];

export const SMARTREAD_QUERY_KEYS = {
  all: ["smartread"] as const,
  configs: () => [...SMARTREAD_QUERY_KEYS.all, "configs"] as const,
  config: (id: number) => [...SMARTREAD_QUERY_KEYS.configs(), id] as const,
  tasks: (id: number) => [...SMARTREAD_QUERY_KEYS.config(id), "tasks"] as const,
  managedTasks: (id: number) => [...SMARTREAD_QUERY_KEYS.config(id), "managed-tasks"] as const,
  longData: (id: number, taskId?: string) => {
    const key: QueryKeyPart[] = [...SMARTREAD_QUERY_KEYS.config(id), "long-data"];
    return (taskId ? [...key, taskId] : key) as QueryKey;
  },
  requests: (id: number) => [...SMARTREAD_QUERY_KEYS.config(id), "requests"] as const,
  files: (id: number) => [...SMARTREAD_QUERY_KEYS.config(id), "files"] as const,
  // PAD Runner
  padRuns: (id: number) => [...SMARTREAD_QUERY_KEYS.config(id), "pad-runs"] as const,
  padRun: (id: number, runId: string) => [...SMARTREAD_QUERY_KEYS.padRuns(id), runId] as const,
};
