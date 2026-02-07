import { useWarehouses } from "../hooks";

/**
 * 倉庫リスト用リソースを管理するフック
 */
export function useWarehouseListResources(showInactive: boolean) {
  const { useList, useCreate, useSoftDelete, usePermanentDelete, useRestore } = useWarehouses();
  return {
    list: useList(showInactive),
    create: useCreate(),
    softDel: useSoftDelete(),
    permDel: usePermanentDelete(),
    rest: useRestore(),
  };
}
