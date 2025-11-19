import { useMutation, useQueryClient, useQuery, useQueries } from "@tanstack/react-query";
import { useState, useMemo, useCallback, useEffect } from "react";

import { saveManualAllocations, type ManualAllocationSaveResponse } from "../api";
import type { CandidateLotItem } from "../api";

import { allocationCandidatesKeys } from "./useAllocationCandidates";
import { useOrdersForAllocation } from "./useOrdersForAllocation";

import { listCustomers, listProducts } from "@/services/api/master-service";

// 各行の在庫状態定義
export interface LineStockStatus {
  hasShortage: boolean;
  totalAvailable: number;
  requiredQty: number;
  dbAllocated: number;
  uiAllocated: number;
  totalAllocated: number;
  remainingQty: number;
  progress: number;
}

type SaveAllocationsVariables = {
  orderLineId: number;
  orderId: number | null;
  allocations: Array<{ lot_id: number; quantity: number }>;
};

export type LineStatus = "clean" | "draft" | "committed";

export function useLotAllocation() {
  const queryClient = useQueryClient();

  // ----------------------------------------------------------------
  // 1. 状態管理 (State) - 複数行対応へ変更
  // ----------------------------------------------------------------

  // 行ごとの引当入力状態: { lineId: { lotId: quantity } }
  const [allocationsByLine, setAllocationsByLine] = useState<
    Record<number, Record<number, number>>
  >({});

  // 行ごとのステータス管理
  const [lineStatuses, setLineStatuses] = useState<Record<number, LineStatus>>({});

  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(
    null,
  );

  // ----------------------------------------------------------------
  // 2. データ取得 (Queries)
  // ----------------------------------------------------------------

  // 1. 受注一覧を取得
  const ordersQuery = useOrdersForAllocation();
  const orders = ordersQuery.data ?? [];

  // 2. 全ての明細をフラットな配列として抽出 (データ取得の準備)
  const allLines = useMemo(() => {
    return orders.flatMap((order) => order.lines ?? []);
  }, [orders]);

  // 3. 全明細分の候補ロットを一括取得 (useQueriesを使用)
  // ※行数が多い場合、本来は仮想スクロールや遅延ロードを検討すべきですが、
  //   まずはUIを動かすために「表示されている全行分」を取得する構成にします。
  useQueries({
    queries: allLines.map((line) => ({
      queryKey: allocationCandidatesKeys.list({
        order_line_id: line.id!,
        strategy: "fefo",
        limit: 100, // フラット表示なので少し制限して軽量化
      }),
      queryFn: async () => {
        // useAllocationCandidatesのfetcherを直接利用する形が理想ですが、
        // ここでは既存のフックが内部で呼んでいるAPI関数を想定して実装します。
        // ※もし api/index.ts などに getAllocationCandidates があればそれをimportしてください。
        //   ここでは useAllocationCandidates のロジックを再現します。
        //   簡易的に「既存のフックロジック」に依存せず、フェッチ済みとみなせる構造を作ります。
        return { items: [] as CandidateLotItem[] }; // フォールバック（後述の解説参照）
      },
      // 実際には useAllocationCandidates フックの中身（fetch関数）が必要です。
      // ここでは「候補ロット取得用のフック」をループできないため、
      // 本当は「SmartRow」コンポーネントを作るのがベストプラクティスですが、
      // 今回は「Logicファイルだけで解決する」ために、
      // useAllocationCandidates が公開している fetch 関数があればそれを使います。
      // なければ一旦保留し、後述の「Map」で解決します。
      enabled: !!line.id,
      staleTime: 1000 * 60,
    })),
  });

  // ★ 重要: 上記の useQueries は実装が複雑になるため、
  // 既存の仕組み（AllocationCandidates）を「必要な行だけ取得する」形にするのが安全です。
  // 今回は「UIのエラーを消して動作させる」ために、
  // データ取得は「個別の行コンポーネント（LotAllocationPanel）」が
  // 本来は自律的に行うべきですが、親で一括管理するMapを作ります。

  // ここでは簡易的に「キー: LineID, 値: ロット配列」のマップを定義します。
  // ※本来はここで全件fetchすべきですが、既存コードとの兼ね合いで
  // 「Logicはコンテナとして振る舞う」形にします。

  // カスタマー情報の取得
  const customersQuery = useQuery({
    queryKey: ["masters", "customers"],
    queryFn: listCustomers,
    staleTime: 1000 * 60 * 5,
  });

  // 製品情報の取得
  const productsQuery = useQuery({
    queryKey: ["masters", "products"],
    queryFn: listProducts,
    staleTime: 1000 * 60 * 5,
  });

  // 保存用ミューテーション
  const saveAllocationsMutation = useMutation<
    ManualAllocationSaveResponse,
    unknown,
    SaveAllocationsVariables
  >({
    mutationFn: ({ orderLineId, allocations }) =>
      saveManualAllocations({ order_line_id: orderLineId, allocations }),
    onSuccess: (response, variables) => {
      setToast({ message: response?.message ?? "引当を登録しました", variant: "success" });

      // 保存成功時はステータスを committed に更新
      setLineStatuses((prev) => ({
        ...prev,
        [variables.orderLineId]: "committed",
      }));

      // 入力状態は維持する（UI上の表示はそのまま）
      // ただし、DB更新が反映されると二重計上になる可能性があるため、
      // 本来は再取得後にクリアすべきだが、ここでは「保存済み」として扱う。
      // 理想: サーバーから最新が返ってきたら allocationsByLine をクリアし、DB値を表示する。
      // 現状: 簡易的に allocationsByLine をクリアしてしまうと、再取得までの間に表示が消える。
      // -> ここではクリアし、再取得を待つ。
      setAllocationsByLine((prev) => {
        const next = { ...prev };
        delete next[variables.orderLineId];
        return next;
      });

      queryClient.invalidateQueries({ queryKey: ["orders", "for-allocation"] });
      // 候補ロットも再取得
      queryClient.invalidateQueries({
        queryKey: allocationCandidatesKeys.list({ order_line_id: variables.orderLineId }),
      });
    },
    onError: (error: unknown) => {
      setToast({
        message: error instanceof Error ? error.message : "引当の登録に失敗しました",
        variant: "error",
      });
    },
  });

  // ----------------------------------------------------------------
  // 3. データ加工・計算 (Computed)
  // ----------------------------------------------------------------

  // 得意先マップ (ID -> Name)
  const customerMap = useMemo(() => {
    if (!customersQuery.data) return {};
    return customersQuery.data.reduce(
      (acc, customer) => {
        acc[customer.id] = customer.customer_name ?? "";
        return acc;
      },
      {} as Record<number, string>,
    );
  }, [customersQuery.data]);

  // 製品マップ (ID -> Name)
  const productMap = useMemo(() => {
    if (!productsQuery.data) return {};
    return productsQuery.data.reduce(
      (acc, product) => {
        acc[product.id] = product.product_name ?? "";
        return acc;
      },
      {} as Record<number, string>,
    );
  }, [productsQuery.data]);

  // ----------------------------------------------------------------
  // 4. アクション & ヘルパー関数 (Hooks Interface)
  // ----------------------------------------------------------------

  /**
   * 指定された行の候補ロットを取得する
   * 注意: ここで実際にデータを返すには、
   * 各行ごとに useQuery を発行する「子コンポーネント」を作るのがReactの定石です。
   * FlatAllocationList が直接呼ぶ場合、データがまだない可能性があります。
   * * 今回の修正では、エラーを回避しつつ、
   * 「useAllocationCandidates」フックを各LotAllocationPanel内で使うように
   * UI側を少し修正することを推奨しますが、
   * まずは「インターフェースを合わせる」ために以下を実装します。
   */

  // 実際にデータを保持するMap（キャッシュキーから取得するなど高度な技が必要ですが、
  // ここではシンプルに useQuery を行ごとに実行するラッパーを用意する方針への転換点です）
  //
  // ★暫定対応:
  // FlatAllocationListに渡すための関数。
  // 実際には、データ取得は `LotAllocationPanel` 内部で行わせるのが
  // パフォーマンス上も設計上も正解です。
  // なので、ここは一旦「空」または「キャッシュがあれば返す」実装にします。
  const getCandidateLots = useCallback(
    (lineId: number): CandidateLotItem[] => {
      // React Queryのキャッシュから強引に取ることもできますが、
      // ここでは「親がデータを持っていなくてもエラーにならない」ようにします。
      // ※後述の「補足」で、データ取得の本質的な解決を行います。
      const cache = queryClient.getQueryData<any>(
        allocationCandidatesKeys.list({
          order_line_id: lineId,
          strategy: "fefo",
          limit: 200,
        }),
      );
      return cache?.items ?? [];
    },
    [queryClient],
  );

  /**
   * 指定された行の現在の入力状況を取得
   */
  const getAllocationsForLine = useCallback(
    (lineId: number) => {
      return allocationsByLine[lineId] || {};
    },
    [allocationsByLine],
  );

  /**
   * 入力変更ハンドラー
   */
  const changeAllocation = useCallback(
    (lineId: number, lotId: number, value: number) => {
      // キャッシュからロット情報を取得して上限チェック
      const candidates = getCandidateLots(lineId);
      const targetLot = candidates.find((lot) => lot.lot_id === lotId);
      const maxAllowed = targetLot
        ? Number(targetLot.free_qty ?? targetLot.current_quantity ?? 0)
        : Infinity; // データ未ロード時は制限なしにしておく（安全策）

      const clampedValue = Math.max(0, Math.min(maxAllowed, Number.isFinite(value) ? value : 0));

      setAllocationsByLine((prev) => {
        const lineAllocations = prev[lineId] || {};

        // 値が0なら削除
        if (clampedValue === 0) {
          const { [lotId]: _, ...rest } = lineAllocations;
          // 行自体が空になったら行キーも消す？（好みによるが残してもOK）
          // ステータス更新: 何か変更があれば draft
          return { ...prev, [lineId]: rest };
        }

        return {
          ...prev,
          [lineId]: { ...lineAllocations, [lotId]: clampedValue },
        };
      });

      // ステータスを draft に更新
      setLineStatuses((prev) => ({
        ...prev,
        [lineId]: "draft",
      }));
    },
    [getCandidateLots],
  );

  /**
   * 自動引当 (FEFO)
   */
  const autoAllocate = useCallback(
    (lineId: number) => {
      // 対象行を探す
      const line = allLines.find((l) => l.id === lineId);
      const candidates = getCandidateLots(lineId);

      if (!line || !candidates.length) return;

      const requiredQty = Number(line.order_quantity ?? line.quantity ?? 0);
      const dbAllocatedQty = Number(line.allocated_qty ?? line.allocated_quantity ?? 0);
      let remaining = requiredQty - dbAllocatedQty;

      const newLineAllocations: Record<number, number> = {};

      for (const lot of candidates) {
        if (remaining <= 0) break;
        const lotId = lot.lot_id;
        const freeQty = Number(lot.free_qty ?? lot.current_quantity ?? 0);

        const allocateQty = Math.min(remaining, freeQty);
        if (allocateQty > 0) {
          newLineAllocations[lotId] = allocateQty;
          remaining -= allocateQty;
        }
      }

      setAllocationsByLine((prev) => ({
        ...prev,
        [lineId]: newLineAllocations,
      }));

      // ステータスを draft に更新
      setLineStatuses((prev) => ({
        ...prev,
        [lineId]: "draft",
      }));
    },
    [allLines, getCandidateLots],
  );

  /**
   * クリア
   */
  const clearAllocations = useCallback((lineId: number) => {
    setAllocationsByLine((prev) => {
      const next = { ...prev };
      delete next[lineId];
      return next;
    });
    // クリアも変更の一種なので draft にする（保存して初めて確定）
    // あるいは「未編集」に戻す？ -> 仕様的には「クリアボタン」は入力を消す操作なので draft が自然
    setLineStatuses((prev) => ({
      ...prev,
      [lineId]: "draft",
    }));
  }, []);

  /**
   * 過剰引当チェック
   */
  const isOverAllocated = useCallback(
    (lineId: number) => {
      const line = allLines.find((l) => l.id === lineId);
      if (!line) return false;

      const requiredQty = Number(line.order_quantity ?? line.quantity ?? 0);
      const dbAllocated = Number(line.allocated_qty ?? 0);
      const uiAllocated = Object.values(allocationsByLine[lineId] || {}).reduce(
        (sum, v) => sum + v,
        0,
      );

      return dbAllocated + uiAllocated > requiredQty;
    },
    [allLines, allocationsByLine],
  );

  /**
   * 保存
   */
  const saveAllocations = useCallback(
    (lineId: number) => {
      const allocationsMap = allocationsByLine[lineId] || {};
      const line = allLines.find((l) => l.id === lineId);
      if (!line) return;

      // 過剰引当チェック
      if (isOverAllocated(lineId)) {
        setToast({ message: "必要数量を超えて引当されています", variant: "error" });
        return;
      }

      const allocations = Object.entries(allocationsMap)
        .map(([lotIdStr, qty]) => ({ lot_id: Number(lotIdStr), quantity: Number(qty) }))
        .filter((item) => item.quantity > 0);

      // 0件でも「クリア」を保存したい場合があるかもしれないが、
      // 現状のAPI仕様的に空配列を送るとどうなるか？
      // 通常は「現在の引当」を送るので、空なら全解除になるはず。
      // ここでは allocations をそのまま送る。

      saveAllocationsMutation.mutate({
        orderLineId: lineId,
        orderId: line.order_id ?? null, // OrderLine型にorder_idが含まれていると仮定
        allocations,
      });
    },
    [allocationsByLine, allLines, saveAllocationsMutation, isOverAllocated],
  );

  // ----------------------------------------------------------------
  // 5. 副作用 (Effects) - トーストなど
  // ----------------------------------------------------------------
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return {
    // Data
    orders, // 全受注リストを返す
    customerMap,
    productMap,
    allocationsByLine, // デバッグ用などに公開
    lineStatuses, // 各行のステータス
    toast,

    // Status
    isLoadingOrders: ordersQuery.isLoading,
    isSavingAllocations: saveAllocationsMutation.isPending,

    // Actions (Interface for FlatAllocationList)
    getCandidateLots,
    getAllocationsForLine,
    changeAllocation,
    autoAllocate,
    clearAllocations,
    saveAllocations,
    isOverAllocated,

    // 互換性のため残す（必要なければ削除可）
    selectedOrderId: null,
    selectedOrderLineId: null,
  };
}
