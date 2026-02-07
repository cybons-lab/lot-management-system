import { useSuppliers } from "../hooks";

/**
 * 仕入先リスト用リソースを管理するフック
 */
export function useSupplierListResources(showInactive: boolean) {
  const { useList, useCreate, useSoftDelete, usePermanentDelete, useRestore } = useSuppliers();
  return {
    list: useList(showInactive),
    create: useCreate(),
    softDel: useSoftDelete(),
    permDel: usePermanentDelete(),
    rest: useRestore(),
  };
}
