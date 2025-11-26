/**
 * ReceiveModal (v2.2 - Phase C-3)
 * Modal for recording inbound receipt (auto-generates lots)
 */

import { useState } from "react";

import type { InboundPlanLine } from "../api";
import { useReceiveInbound } from "../hooks";

import { Button } from "@/components/ui";
import { Input } from "@/components/ui";

interface ReceiveModalProps {
  planId: number;
  lines: InboundPlanLine[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ReceiveModal({ planId, lines, onClose, onSuccess }: ReceiveModalProps) {
  // Initialize received quantities (default to planned quantity)
  const [receivedQuantities, setReceivedQuantities] = useState<Record<number, number>>(
    lines.reduce(
      (acc, line) => {
        acc[line.id] = line.quantity;
        return acc;
      },
      {} as Record<number, number>,
    ),
  );

  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    generatedLots?: Array<{ lot_number: string; product_id: number; quantity: number }>;
  } | null>(null);

  const receiveMutation = useReceiveInbound(planId);

  const handleQuantityChange = (lineId: number, value: string) => {
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setReceivedQuantities((prev) => ({
        ...prev,
        [lineId]: numValue,
      }));
    }
  };

  const handleSubmit = async () => {
    // Build request data
    const requestData = {
      lines: lines.map((line) => ({
        inbound_plan_line_id: line.id,
        received_quantity: receivedQuantities[line.id] || 0,
      })),
    };

    try {
      const response = await receiveMutation.mutateAsync(requestData);
      setResult({
        success: true,
        message: `入荷実績を登録しました。${response.generated_lots.length} 件のロットを自動生成しました。`,
        generatedLots: response.generated_lots,
      });
      // Call onSuccess after showing result
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error: unknown) {
      console.error("Receive failed:", error);
      const errorMessage =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "入荷実績登録に失敗しました";
      setResult({
        success: false,
        message: errorMessage,
      });
    }
  };

  const getTotalPlannedQty = () => {
    return lines.reduce((sum, line) => sum + line.quantity, 0);
  };

  const getTotalReceivedQty = () => {
    return Object.values(receivedQuantities).reduce((sum, qty) => sum + qty, 0);
  };

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-xl font-semibold">入荷実績登録</h3>

        {result ? (
          // Result display
          <div>
            <div
              className={`mb-4 rounded-lg p-4 ${
                result.success
                  ? "border border-green-300 bg-green-50 text-green-800"
                  : "border border-red-300 bg-red-50 text-red-800"
              }`}
            >
              {result.message}
            </div>

            {result.success && result.generatedLots && result.generatedLots.length > 0 && (
              <div className="mb-4 rounded-lg border p-4">
                <h4 className="mb-2 font-semibold">生成されたロット</h4>
                <ul className="space-y-1 text-sm">
                  {result.generatedLots.map((lot, index) => (
                    <li key={index}>
                      • ロット番号: <span className="font-mono">{lot.lot_number}</span> - 製品ID:{" "}
                      {lot.product_id} - 数量: {lot.quantity}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={onSuccess}>閉じる</Button>
            </div>
          </div>
        ) : (
          // Input form
          <div>
            <div className="mb-4 text-sm text-gray-600">
              各明細の実績数量を入力してください。入荷実績登録時にロットが自動生成されます。
            </div>

            {/* Lines table */}
            <div className="mb-4 max-h-96 overflow-auto rounded-lg border">
              <table className="w-full">
                <thead className="sticky top-0 border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      行番号
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">製品</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      計画数量
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      実績数量
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">差異</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line) => {
                    const receivedQty = receivedQuantities[line.id] || 0;
                    const diff = receivedQty - line.quantity;
                    const hasWarning = diff !== 0;

                    return (
                      <tr key={line.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{line.line_number}</td>
                        <td className="px-4 py-3 text-sm">
                          {line.product_name || line.product_code || `ID: ${line.product_id}`}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{line.quantity}</td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="0"
                            value={receivedQty}
                            onChange={(e) => handleQuantityChange(line.id, e.target.value)}
                            className="w-24"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {hasWarning ? (
                            <span
                              className={`font-medium ${diff > 0 ? "text-yellow-600" : "text-red-600"}`}
                            >
                              {diff > 0 ? "+" : ""}
                              {diff}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-semibold">
                      合計
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">{getTotalPlannedQty()}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{getTotalReceivedQty()}</td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {getTotalReceivedQty() - getTotalPlannedQty() > 0 ? "+" : ""}
                      {getTotalReceivedQty() - getTotalPlannedQty()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Warning for quantity differences */}
            {getTotalReceivedQty() !== getTotalPlannedQty() && (
              <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                ⚠️ 実績数量が計画数量と異なります。このまま登録してもよろしいですか？
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={receiveMutation.isPending}>
                キャンセル
              </Button>
              <Button onClick={handleSubmit} disabled={receiveMutation.isPending}>
                {receiveMutation.isPending ? "登録中..." : "入荷実績を登録"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
