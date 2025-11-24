/**
 * InboundPlanDetailPage (v2.2 - Phase C-3)
 * Inbound plan detail page with receive functionality
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { ReceiveModal } from "../components/ReceiveModal";
import { useInboundPlan } from "../hooks";

import { Button } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { FileBarChart, MoreHorizontal, Package } from "lucide-react";

export function InboundPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const planId = Number(id);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);

  // Fetch inbound plan with lines
  const { data: plan, isLoading, isError, refetch } = useInboundPlan(planId);

  const handleBack = () => {
    navigate(ROUTES.INBOUND_PLANS.LIST);
  };

  const handleReceiveSuccess = () => {
    setIsReceiveModalOpen(false);
    refetch();
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

  const canReceive = plan.status === "pending";

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
          {canReceive && <Button onClick={() => setIsReceiveModalOpen(true)}>入荷実績登録</Button>}
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
                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${plan.status === "pending"
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
              {new Date(plan.updated_at).toLocaleString("ja-JP")}
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
                  <tr key={line.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{line.line_number}</td>
                    <td className="px-4 py-3 text-sm">
                      {line.product_name || line.product_code || `ID: ${line.product_id}`}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{line.quantity}</td>
                    <td className="px-4 py-3 text-sm">
                      {line.warehouse_name || `ID: ${line.warehouse_id}`}
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
                              navigate(
                                `${ROUTES.FORECASTS.LIST}?product_id=${line.product_id}`
                              )
                            }
                          >
                            <FileBarChart className="mr-2 h-4 w-4" />
                            需要予測を確認
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(
                                ROUTES.INVENTORY.ITEMS.DETAIL(line.product_id, line.warehouse_id)
                              )
                            }
                          >
                            <Package className="mr-2 h-4 w-4" />
                            在庫を確認
                          </DropdownMenuItem>
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

      {/* Receive Modal */}
      {isReceiveModalOpen && plan.lines && plan.lines.length > 0 && (
        <ReceiveModal
          planId={plan.id}
          lines={plan.lines}
          onClose={() => setIsReceiveModalOpen(false)}
          onSuccess={handleReceiveSuccess}
        />
      )}
    </div>
  );
}
