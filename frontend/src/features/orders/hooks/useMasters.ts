// features/orders/hooks/useMasters.ts

interface MasterOption {
  id: number | string;
  code: string;
  name: string;
}
/**
 * 得意先のデフォルト出荷倉庫を取得する将来拡張用フック。
 * 現状は API 未実装でも落ちないようにフェールセーフで空配列を返します。
 */
// 既存の取得ロジックからこの形にそろえる
export function useMasters() {
  // ここはプロジェクトの実装に合わせて取得（例：useMastersQueryの戻りを整形）

  const customers: MasterOption[] = [];
  const warehouses: MasterOption[] = [];

  return { customers, warehouses };
}
