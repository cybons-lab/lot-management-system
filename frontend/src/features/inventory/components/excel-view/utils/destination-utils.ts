/**
 * ExcelView での納入先表示順序を制御するためのユーティリティ
 */

/**
 * localStorage から表示順序を読み込む
 */
export const readDestinationOrder = (key: string): number[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value) => Number.isFinite(value)).map(Number);
  } catch {
    return [];
  }
};

/**
 * localStorage に表示順序を書き込む
 */
export const writeDestinationOrder = (key: string, order: number[]): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(order));
};

/**
 * 保存済みの順位と利用可能な納入先 ID をマージする
 */
export const mergeDestinationOrder = (current: number[], available: number[]): number[] => {
  if (available.length === 0) return [];
  const merged: number[] = [];
  const availableSet = new Set(available);

  // 保存済みの ID がまだ利用可能なら追加
  current.forEach((id) => {
    if (availableSet.has(id)) {
      merged.push(id);
    }
  });

  // 新しく追加された ID があれば末尾に追加
  available.forEach((id) => {
    if (!merged.includes(id)) {
      merged.push(id);
    }
  });

  return merged;
};

/**
 * 納入先配列を指定された順序で並べ替える
 */
export const reorderDestinations = <T extends { deliveryPlaceId: number }>(
  items: T[],
  order: number[],
): T[] => {
  if (order.length === 0 || items.length === 0) return items;
  const itemMap = new Map(items.map((item) => [item.deliveryPlaceId, item]));
  const ordered: T[] = [];
  const used = new Set<number>();

  // 指定された順序で配置
  order.forEach((id) => {
    const item = itemMap.get(id);
    if (item) {
      ordered.push(item);
      used.add(id);
    }
  });

  // 順序リストに含まれていないアイテムを末尾に配置
  items.forEach((item) => {
    if (!used.has(item.deliveryPlaceId)) {
      ordered.push(item);
    }
  });

  return ordered;
};

/**
 * 順序リスト内で特定の ID を移動させる
 */
export const moveDestinationId = (order: number[], fromId: number, toId: number): number[] => {
  const next = order.slice();
  const fromIndex = next.indexOf(fromId);
  const toIndex = next.indexOf(toId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return next;
  }
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, fromId);
  return next;
};
