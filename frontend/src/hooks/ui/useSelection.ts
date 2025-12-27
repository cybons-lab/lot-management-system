/**
 * 選択状態管理フック
 *
 * テーブルやリストでの複数選択機能を提供
 *
 * 【設計意図】useSelection の設計判断:
 *
 * 1. なぜ Set<string | number> を使うのか（L33）
 *    理由: O(1) の検索・追加・削除パフォーマンス
 *    代替案との比較:
 *    - Array: isSelected() が O(n) で遅い（includes()）
 *    - Object: 数値IDが文字列に変換されるため型安全性が低い
 *    - Set: has(), add(), delete() が全て O(1)、型も保持
 *    業務シナリオ:
 *    - 1000件の受注明細リスト → 各行のチェック状態を高速判定
 *    - 「全選択」操作 → 1000個のIDを一括追加
 *    → Set なら高速、Array だと遅延が発生
 *
 * 2. useCallback でメモ化する理由（L35-71）
 *    理由: 子コンポーネントの不要な再レンダリング防止
 *    Reactの動作:
 *    - 親コンポーネントが再レンダリング → 関数が再生成される
 *    → 子コンポーネントに props として渡した関数が「変わった」と判定
 *    → 子コンポーネントも再レンダリング
 *    useCallback の効果:
 *    - 依存配列が変わらない限り、同じ関数オブジェクトを返す
 *    → 子コンポーネントの React.memo が効く
 *    業務影響:
 *    - 1000行のテーブル → 親の再レンダリングで全行が再レンダリング
 *    → useCallback で最適化すると、変更のある行だけ再レンダリング
 *
 * 3. toggle() の実装パターン（L37-47）
 *    理由: 不変性を保ちつつ状態更新（Reactのベストプラクティス）
 *    実装:
 *    ```typescript
 *    setSelectedIds((prev) => {
 *      const next = new Set(prev);  // 新しいSetを生成
 *      if (next.has(id)) {
 *        next.delete(id);
 *      } else {
 *        next.add(id);
 *      }
 *      return next;  // 新しいオブジェクトを返す
 *    });
 *    ```
 *    なぜ prev.delete(id) ではダメなのか:
 *    - prev を直接変更すると、React が変更を検知できない
 *    - 新しい Set を返すことで、React が「状態が変わった」と認識
 *    → 再レンダリングがトリガーされる
 *
 * 4. toggleAll() の「全選択済み判定」ロジック（L76）
 *    理由: UX的に直感的な動作
 *    動作:
 *    - 全ての行が選択済み → 「全解除」
 *    - 一部のみ選択済み → 「全選択」
 *    業務シナリオ:
 *    - 営業担当者が受注20件のうち18件を選択済み
 *    → 「全選択」チェックボックスをクリック → 残り2件も選択される
 *    - 再度クリック → 全て解除される
 *    実装:
 *    ```typescript
 *    const allSelected = allIds.every((id) => selectedIds.has(id));
 *    if (allSelected) {
 *      deselectAll();  // 全解除
 *    } else {
 *      selectAll(items);  // 全選択
 *    }
 *    ```
 *
 * 5. selectedArray を useMemo で最適化（L88）
 *    理由: Set → Array 変換のコスト削減
 *    必要性:
 *    - Set は高速だが、多くのAPIは配列を期待する
 *    - 例: 一括削除API に選択IDの配列を渡す
 *    問題:
 *    - Array.from(selectedIds) を毎回実行するとコストが高い
 *    解決:
 *    - useMemo で selectedIds が変わった時だけ変換
 *    → 同じ selectedIds なら、キャッシュされた配列を再利用
 *
 * 6. idKey をジェネリックで受け取る理由（L32）
 *    理由: 型安全性と柔軟性の両立
 *    業務データの多様性:
 *    - 受注明細: id (number)
 *    - 製品マスタ: product_id (number)
 *    - 得意先マスタ: customer_code (string)
 *    → idKey パラメータで任意のキーを指定可能
 *    型安全性:
 *    ```typescript
 *    type OrderLine = { id: number; product_id: number; ... };
 *    const selection = useSelection<OrderLine>('id');
 *    // → idKey は 'id' | 'product_id' | ... のみ受け付ける（型チェック）
 *    ```
 */

import { useState, useCallback, useMemo } from "react";

/**
 * 選択状態管理フック
 *
 * @param idKey - アイテムのID キー
 * @returns 選択状態と操作関数
 *
 * @example
 * ```tsx
 * const selection = useSelection('id');
 *
 * return (
 *   <Table>
 *     {items.map(item => (
 *       <TableRow
 *         key={item.id}
 *         selected={selection.isSelected(item.id)}
 *         onClick={() => selection.toggle(item.id)}
 *       />
 *     ))}
 *   </Table>
 * );
 * ```
 */
export function useSelection<T extends Record<string, unknown>>(idKey: keyof T = "id") {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  const isSelected = useCallback((id: string | number) => selectedIds.has(id), [selectedIds]);

  const toggle = useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const select = useCallback((id: string | number) => {
    setSelectedIds((prev) => new Set(prev).add(id));
  }, []);

  const deselect = useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(
    (items: T[]) => {
      const ids = items.map((item) => item[idKey] as string | number);
      setSelectedIds(new Set(ids));
    },
    [idKey],
  );

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleAll = useCallback(
    (items: T[]) => {
      const allIds = items.map((item) => item[idKey] as string | number);
      const allSelected = allIds.every((id) => selectedIds.has(id));

      if (allSelected) {
        deselectAll();
      } else {
        selectAll(items);
      }
    },
    [selectedIds, idKey, selectAll, deselectAll],
  );

  const selectedCount = selectedIds.size;
  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

  return {
    selectedIds,
    selectedArray,
    selectedCount,
    isSelected,
    toggle,
    select,
    deselect,
    selectAll,
    deselectAll,
    toggleAll,
  };
}
