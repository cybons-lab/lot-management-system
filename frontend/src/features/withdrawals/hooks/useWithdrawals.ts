/**
 * useWithdrawals hook
 *
 * 出庫のReact Query hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  WithdrawalCancelRequest,
  WithdrawalCreateRequest,
  WithdrawalListParams,
  WithdrawalListResponse,
  WithdrawalResponse,
} from "../api";
import { cancelWithdrawal, createWithdrawal, getWithdrawal, getWithdrawals } from "../api";

const QUERY_KEY = "withdrawals";

export function useWithdrawals() {
  const queryClient = useQueryClient();

  /**
   * 出庫履歴一覧を取得
   */
  const useList = (params?: WithdrawalListParams) =>
    useQuery<WithdrawalListResponse>({
      queryKey: [QUERY_KEY, params],
      queryFn: () => getWithdrawals(params),
    });

  /**
   * 出庫詳細を取得
   */
  const useGet = (withdrawalId: number) =>
    useQuery<WithdrawalResponse>({
      queryKey: [QUERY_KEY, withdrawalId],
      queryFn: () => getWithdrawal(withdrawalId),
      enabled: !!withdrawalId,
    });

  /**
   * 出庫を登録
   */
  const useCreate = () =>
    useMutation({
      mutationFn: (data: WithdrawalCreateRequest) => createWithdrawal(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        // ロット一覧も更新（数量が変わるため）
        queryClient.invalidateQueries({ queryKey: ["lots"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      },
    });

  /**
   * 出庫を取消（反対仕訳方式）
   */
  const useCancel = () =>
    useMutation({
      mutationFn: ({
        withdrawalId,
        data,
      }: {
        withdrawalId: number;
        data: WithdrawalCancelRequest;
      }) => cancelWithdrawal(withdrawalId, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        // ロット一覧も更新（数量が戻るため）
        queryClient.invalidateQueries({ queryKey: ["lots"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      },
    });

  return {
    useList,
    useGet,
    useCreate,
    useCancel,
  };
}
