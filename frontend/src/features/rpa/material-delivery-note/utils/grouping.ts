/**
 * Step3 グルーピングアルゴリズム
 *
 * Step2で選択されたアイテム（issue_flag=true）を
 * 指定されたグルーピング方法とmax件数でRunに分割する
 */
import { startOfWeek, format } from "date-fns";
import { ja } from "date-fns/locale";

import type { RpaRunItem } from "../api";

/** グルーピング方法 */
export type GroupingMethod = "supplier" | "period" | "user" | "custom";

/** 計画されたRun */
export interface PlannedRun {
  /** Run識別子 (A, B, C, ..., Z, AA, AB, ...) */
  id: string;
  /** グループキー（メーカー名、期間ラベルなど） */
  groupKey: string;
  /** このRunに含まれるアイテム */
  items: RpaRunItem[];
  /** 推定実行時間（分） */
  estimatedMinutes: number;
}

/** グルーピング結果 */
export interface GroupingResult {
  /** 計画されたRun一覧 */
  runs: PlannedRun[];
  /** 総アイテム数 */
  totalItems: number;
  /** 総推定時間（分） */
  totalEstimatedMinutes: number;
}

/** 推定時間の係数: 1件あたり0.9分（100件=90分の実績ベース） */
const MINUTES_PER_ITEM = 0.9;

/**
 * Run IDを生成（A, B, ..., Z, AA, AB, ...）
 */
function getRunId(index: number): string {
  if (index < 26) {
    return String.fromCharCode(65 + index);
  }
  return getRunId(Math.floor(index / 26) - 1) + String.fromCharCode(65 + (index % 26));
}

/**
 * 配列をチャンクに分割
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  if (size <= 0) return [array];
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * delivery_dateから週のキーを取得
 */
function getWeekKey(dateStr: string | null): string {
  if (!dateStr) return "日付なし";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "日付不正";
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // 月曜始まり
    return format(weekStart, "MM/dd週", { locale: ja });
  } catch {
    return "日付不正";
  }
}

/**
 * 配列をキーでグループ化
 */
function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce(
    (acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}

/**
 * グルーピング方法に応じてアイテムをグループ化
 */
function groupByMethod(items: RpaRunItem[], method: GroupingMethod): Record<string, RpaRunItem[]> {
  switch (method) {
    case "supplier":
      return groupBy(items, (item) => item.maker_name || "不明");
    case "period":
      return groupBy(items, (item) => getWeekKey(item.delivery_date));
    case "user":
      // 実行ユーザーはRun単位のため、全アイテムを1グループにまとめる
      return { 全件: items };
    case "custom":
      // カスタムは未実装、全アイテムを1グループにまとめる
      return { 全件: items };
    default:
      return { 全件: items };
  }
}

/**
 * グループ化されたRunを計算
 *
 * @param items - issue_flag=true のアイテム一覧
 * @param method - グルーピング方法
 * @param maxItemsPerRun - 1Runあたりの最大件数（0または未指定の場合は分割なし）
 * @returns グルーピング結果
 */
export function computeGroupedRuns(
  items: RpaRunItem[],
  method: GroupingMethod,
  maxItemsPerRun: number | null,
): GroupingResult {
  // issue_flag=true のアイテムのみを対象
  const issueItems = items.filter((item) => item.issue_flag);

  if (issueItems.length === 0) {
    return {
      runs: [],
      totalItems: 0,
      totalEstimatedMinutes: 0,
    };
  }

  // グルーピング
  const groups = groupByMethod(issueItems, method);

  // グループをキーでソート（安定した出力のため）
  const sortedGroupKeys = Object.keys(groups).sort();

  // Runを作成
  const runs: PlannedRun[] = [];
  let runIndex = 0;

  for (const groupKey of sortedGroupKeys) {
    const groupItems = groups[groupKey] || [];

    // max件数が指定されている場合はチャンク分割
    const effectiveMax = maxItemsPerRun && maxItemsPerRun > 0 ? maxItemsPerRun : groupItems.length;
    const chunks = chunkArray(groupItems, effectiveMax);

    for (const chunk of chunks) {
      runs.push({
        id: getRunId(runIndex++),
        groupKey,
        items: chunk,
        estimatedMinutes: Math.round(chunk.length * MINUTES_PER_ITEM),
      });
    }
  }

  // 合計を計算
  const totalItems = issueItems.length;
  const totalEstimatedMinutes = runs.reduce((sum, run) => sum + run.estimatedMinutes, 0);

  return {
    runs,
    totalItems,
    totalEstimatedMinutes,
  };
}

/**
 * グルーピング方法の表示名を取得
 */
export function getGroupingMethodLabel(method: GroupingMethod): string {
  switch (method) {
    case "supplier":
      return "仕入先ごと";
    case "period":
      return "対象期間ごと";
    case "user":
      return "実行ユーザーごと";
    case "custom":
      return "カスタム";
    default:
      return method;
  }
}
