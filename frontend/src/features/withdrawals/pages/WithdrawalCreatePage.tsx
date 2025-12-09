/**
 * WithdrawalCreatePage
 *
 * 出庫登録ページ
 */

import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import type { WithdrawalCreateRequest } from "../api";
import { WithdrawalFormFiltered } from "../components/WithdrawalFormFiltered";
import { useWithdrawals } from "../hooks";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { useLotsQuery } from "@/hooks/api";

export function WithdrawalCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lotIdParam = searchParams.get("lotId");

  const { useCreate } = useWithdrawals();
  const { mutateAsync: createWithdrawal, isPending } = useCreate();

  // ロット一覧取得
  const { data: lots = [], isLoading: isLoadingLots } = useLotsQuery({});

  // 事前選択されたロット（lotId URLパラメータから）
  const preselectedLot = lotIdParam ? lots.find((l) => l.lot_id === Number(lotIdParam)) : null;

  const handleSubmit = async (data: WithdrawalCreateRequest) => {
    try {
      const result = await createWithdrawal(data);
      toast.success(`出庫を登録しました: ${result.lot_number}`);
      navigate("/inventory/withdrawals");
    } catch (error) {
      console.error("Create withdrawal failed:", error);
      toast.error(
        `出庫登録に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      );
    }
  };

  const handleCancel = () => {
    if (lotIdParam) {
      navigate(`/inventory/lots/${lotIdParam}`);
    } else {
      navigate("/inventory");
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>出庫登録</CardTitle>
          <CardDescription>
            既存ロットから在庫を出庫します（受注手動、社内使用、廃棄、返品、サンプル、その他）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WithdrawalFormFiltered
            preselectedLot={preselectedLot ?? undefined}
            lots={lots}
            isLoadingLots={isLoadingLots}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
