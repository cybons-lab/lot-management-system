/**
 * InboundPlanDetailPage (v2.2 - Phase C-3 + Phase 3)
 * Inbound plan detail page with receive functionality
 */

import { FileBarChart, MoreHorizontal, Package, Pencil } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { InboundPlanEditDialog } from "../components/InboundPlanEditDialog";
import { InboundReceiveDialog } from "../components/InboundReceiveDialog";

import { Button } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { useInboundPlan, useUpdateInboundPlan } from "@/features/inbound-plans/hooks";
import { useReceiveInboundPlan } from "@/shared/hooks/useInboundPlans";
import type { components } from "@/shared/types/openapi";

type InboundPlanDetailResponse = components["schemas"]["InboundPlanDetailResponse"];
type InboundPlanLineResponse = components["schemas"]["InboundPlanLineResponse"];

interface ExtendedInboundPlanLine extends InboundPlanLineResponse {
  product_name?: string;
  product_code?: string;
  warehouse_name?: string;
  warehouse_code?: string;
  notes?: string;
  line_number?: number;
  warehouse_id?: number; // Added as it was missing in base type but used in UI
}

interface ExtendedInboundPlan extends InboundPlanDetailResponse {
  supplier_name?: string;
  lines: ExtendedInboundPlanLine[];
}

export function InboundPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const planId = Number(id);
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch inbound plan with lines
  const { data: rawPlan, isLoading, isError, refetch } = useInboundPlan(planId);
  const plan = rawPlan as unknown as ExtendedInboundPlan | undefined;

  const receiveMutation = useReceiveInboundPlan();
  const updateMutation = useUpdateInboundPlan(planId);

  const handleBack = () => {
    navigate(ROUTES.INBOUND_PLANS.LIST);
  };

  const handleReceive = async (data: {
    lots: Array<{ expected_lot_id: number; lot_number: string }>;
  }) => {
    try {
      // Convert to backend format (lot_numbers dict)
      const lot_numbers = data.lots.reduce(
        (acc, lot) => ({
          ...acc,
          [lot.expected_lot_id]: lot.lot_number,
        }),
        {} as Record<string, string>,
      );

      await receiveMutation.mutateAsync({
        planId,
        data: {
          received_at: new Date().toISOString(),
          lot_numbers,
        },
      });

      toast.success("入庫確定しました");
      setIsReceiveDialogOpen(false);
      refetch();
    } catch (error) {
      console.error("Failed to receive inbound plan:", error);
      toast.error("入庫確定に失敗しました");
      throw error;
    }
  };

  const handleUpdate = async (data: { planned_arrival_date: string; notes?: string }) => {
    try {
      await updateMutation.mutateAsync({
        planned_arrival_date: data.planned_arrival_date,
        notes: data.notes,
      });
      toast.success("入荷予定を更新しました");
      setIsEditDialogOpen(false);
      refetch();
    } catch (error) {
      console.error("Failed to update inbound plan:", error);
      toast.error("更新に失敗しました");
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          読み込み中...
        </div>
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          入荷予定の取得に失敗しました
        </div>
        <Button onClick={handleBack} className="mt-4">
          一覧に戻る
        </Button>
      </div>
    );
  }

  const canReceive = plan.status === "planned";
  const canEdit = plan.status === "planned";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">入荷予定詳細</h2>
          <p className="mt-1 text-gray-600">{plan.plan_number}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBack}>
            一覧に戻る
          </Button>
          {canEdit && (
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              編集
            </Button>
          )}
          {canReceive && <Button onClick={() => setIsReceiveDialogOpen(true)}>入庫確定</Button>}
        </div>
      </div>

      {/* Plan Info */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">入荷予定情報</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm font-medium text-gray-500">入荷予定番号</div>
            <div className="mt-1 text-base">{plan.plan_number}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">ステータス</div>
            <div className="mt-1">
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${plan.status === "planned"
                  ? "bg-yellow-100 text-yellow-800"
                  : plan.status === "received"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                  }`}
              >
                {plan.status}
              </span>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">仕入先</div>
            <div className="mt-1 text-base">{plan.supplier_name || `ID: ${plan.supplier_id}`}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">入荷予定日</div>
            <div className="mt-1 text-base">
              {new Date(plan.planned_arrival_date).toLocaleDateString("ja-JP")}
            </div>
          </div>
          {plan.notes && (
            <div className="md:col-span-2">
              <div className="text-sm font-medium text-gray-500">備考</div>
              <div className="mt-1 text-base">{plan.notes}</div>
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-gray-500">作成日</div>
            <div className="mt-1 text-base">
              {new Date(plan.created_at).toLocaleString("ja-JP")}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">更新日</div>
            <div className="mt-1 text-base">
              {plan.updated_at ? new Date(plan.updated_at).toLocaleString("ja-JP") : "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Lines Table */}
      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">明細一覧</h3>
          <div className="text-sm text-gray-600">{plan.lines?.length || 0} 件の明細</div>
        </div>

        {!plan.lines || plan.lines.length === 0 ? (
          <div className="py-8 text-center text-gray-500">明細がありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">行番号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">製品</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">数量</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">倉庫</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">備考</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {plan.lines.map((line) => (
                  <tr key={line.inbound_plan_line_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {line.line_number || line.inbound_plan_line_id}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {line.product_name || line.product_code || `ID: ${line.product_id}`}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{line.planned_quantity}</td>
                    <td className="px-4 py-3 text-sm">
                      {line.warehouse_name ||
                        (line.warehouse_id ? `ID: ${line.warehouse_id}` : "-")}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{line.notes || "-"}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">メニューを開く</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`${ROUTES.FORECASTS.LIST}?product_id=${line.product_id}`)
                            }
                          >
                            <FileBarChart className="mr-2 h-4 w-4" />
                            需要予測を確認
                          </DropdownMenuItem>
                          {line.warehouse_id && (
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(
                                  ROUTES.INVENTORY.ITEMS.DETAIL(
                                    line.product_id,
                                    line.warehouse_id!,
                                  ),
                                )
                              }
                            >
                              <Package className="mr-2 h-4 w-4" />
                              在庫を確認
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receive Dialog */}
      <InboundReceiveDialog
        inboundPlan={plan}
        open={isReceiveDialogOpen}
        onOpenChange={setIsReceiveDialogOpen}
        onReceive={handleReceive}
      />

      {/* Edit Dialog */}
      <InboundPlanEditDialog
        plan={plan}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
