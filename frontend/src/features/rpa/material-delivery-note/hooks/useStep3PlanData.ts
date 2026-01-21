/**
 * Step3 Plan Data Hook
 *
 * Step3 発行リスト作成ページ用のデータ取得フック
 * step2_confirmed ステータスのRunからissue_flag=trueのアイテムを集約
 */

import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

import { getRun, type RpaRunItem, type RpaRunSummary } from "../api";

import { useRuns } from "./index";

/**
 * 開発用モックフラグ
 * 開発中にAPIが利用できない場合にtrueに設定
 */
const USE_MOCK_STEP3_PLAN = import.meta.env.DEV && false;

/**
 * モックデータ（開発用）
 */
const mockItems: RpaRunItem[] = [
  {
    id: 1,
    row_no: 1,
    status: null,
    jiku_code: "J001",
    layer_code: "L001",
    external_product_code: "M001",
    delivery_date: "2025-01-20",
    delivery_quantity: 100,
    shipping_vehicle: "午前便",
    issue_flag: true,
    complete_flag: true,
    match_result: null,
    sap_registered: null,
    order_no: "ORD001",
    maker_name: "A社",
    result_status: null,
    lock_flag: false,
    item_no: "ITEM001",
    lot_no: null,
  },
  {
    id: 2,
    row_no: 2,
    status: null,
    jiku_code: "J002",
    layer_code: "L002",
    external_product_code: "M002",
    delivery_date: "2025-01-21",
    delivery_quantity: 50,
    shipping_vehicle: "午後便",
    issue_flag: true,
    complete_flag: true,
    match_result: null,
    sap_registered: null,
    order_no: "ORD002",
    maker_name: "B社",
    result_status: null,
    lock_flag: false,
    item_no: "ITEM002",
    lot_no: null,
  },
  {
    id: 3,
    row_no: 3,
    status: null,
    jiku_code: "J003",
    layer_code: "L001",
    external_product_code: "M003",
    delivery_date: "2025-01-20",
    delivery_quantity: 75,
    shipping_vehicle: "午前便",
    issue_flag: true,
    complete_flag: true,
    match_result: null,
    sap_registered: null,
    order_no: "ORD003",
    maker_name: "A社",
    result_status: null,
    lock_flag: false,
    item_no: "ITEM003",
    lot_no: null,
  },
];

const mockRuns: RpaRunSummary[] = [
  {
    id: 1,
    rpa_type: "material_delivery_note",
    status: "step2_confirmed",
    data_start_date: "2025-01-20",
    data_end_date: "2025-01-25",
    started_at: "2025-01-20T10:00:00Z",
    started_by_username: "test_user",
    step2_executed_at: null,
    external_done_at: null,
    step4_executed_at: null,
    created_at: "2025-01-20T09:00:00Z",
    updated_at: "2025-01-20T09:00:00Z",
    item_count: 3,
    complete_count: 3,
    issue_count: 3,
    all_items_complete: true,
  },
];

export interface Step3PlanData {
  /** step2_confirmed ステータスのRun一覧 */
  confirmedRuns: RpaRunSummary[];
  /** 全Runのissue_flag=trueアイテムを集約したリスト */
  allIssueItems: RpaRunItem[];
  /** データ読み込み中フラグ */
  isLoading: boolean;
  /** エラー */
  error: Error | null;
  /** issue_flag=trueの総件数 */
  totalIssueCount: number;
  /** データ再取得関数 */
  refetch: () => void;
}

/**
 * Step3 Plan用のデータを取得するフック
 *
 * 1. useRuns() で全Runを取得
 * 2. step2_confirmed のRunをフィルタ
 * 3. 各Runの詳細を取得
 * 4. issue_flag=true のアイテムを抽出・集約
 */
export function useStep3PlanData(): Step3PlanData {
  // 1. 全Run一覧を取得（モックモードでも呼び出す - hooksの順序を維持）
  const {
    data: runsData,
    isLoading: isLoadingRuns,
    error: runsError,
    refetch: refetchRuns,
  } = useRuns(0, 100, { enabled: !USE_MOCK_STEP3_PLAN });

  // 2. step2_confirmed のRunをフィルタ
  const confirmedRuns = useMemo(() => {
    if (USE_MOCK_STEP3_PLAN) return mockRuns;
    if (!runsData?.runs) return [];
    return runsData.runs.filter((run) => run.status === "step2_confirmed");
  }, [runsData?.runs]);

  // 3. 各Runの詳細を並列取得
  const runDetailQueries = useQueries({
    queries: USE_MOCK_STEP3_PLAN
      ? []
      : confirmedRuns.map((run) => ({
          queryKey: ["material-delivery-note-runs", run.id],
          queryFn: () => getRun(run.id),
          enabled: confirmedRuns.length > 0,
          staleTime: 30000, // 30秒間はキャッシュを使用
        })),
  });

  // 4. 全Runのissue_flag=trueアイテムを集約
  const allIssueItems = useMemo(() => {
    if (USE_MOCK_STEP3_PLAN) return mockItems;
    const items: RpaRunItem[] = [];
    for (const query of runDetailQueries) {
      if (query.data?.items) {
        const issueItems = query.data.items.filter((item) => item.issue_flag);
        items.push(...issueItems);
      }
    }
    return items;
  }, [runDetailQueries]);

  // モックモードの場合
  if (USE_MOCK_STEP3_PLAN) {
    return {
      confirmedRuns: mockRuns,
      allIssueItems: mockItems,
      isLoading: false,
      error: null,
      totalIssueCount: mockItems.length,
      refetch: () => {},
    };
  }

  // ローディング状態の判定
  const isLoading = isLoadingRuns || runDetailQueries.some((q) => q.isLoading);

  // エラーの判定（最初のエラーを返す）
  const error = runsError ?? runDetailQueries.find((q) => q.error)?.error ?? null;

  // 再取得関数
  const refetch = () => {
    refetchRuns();
    for (const query of runDetailQueries) {
      query.refetch();
    }
  };

  return {
    confirmedRuns,
    allIssueItems,
    isLoading,
    error: error as Error | null,
    totalIssueCount: allIssueItems.length,
    refetch,
  };
}
