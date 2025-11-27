/**
 * SAPIntegrationSection - SAP order registration UI (dummy implementation)
 */

import { useState } from "react";

import { SAPOrderItem } from "./SAPOrderItem";

import { Badge, Button, Card, CardContent, CardHeader } from "@/components/ui";
import type { OrderWithLinesResponse } from "@/shared/types/aliases";

interface SAPIntegrationSectionProps {
  relatedOrders?: OrderWithLinesResponse[];
}

export function SAPIntegrationSection({ relatedOrders }: SAPIntegrationSectionProps) {
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);

  // すべての受注を表示（SAP登録機能はダミー実装のためフィルタなし）
  const orders = relatedOrders || [];

  const handleRegisterToSAP = async () => {
    setIsRegistering(true);
    try {
      // TODO: SAP登録APIの実装（現在はダミー）
      console.log("SAP登録:", selectedOrders);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert(`SAP登録（ダミー実装）\n登録対象: ${selectedOrders.length}件`);
      setSelectedOrders([]);
    } finally {
      setIsRegistering(false);
    }
  };

  if (orders.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-orange-800">💼 SAP受注登録</h4>
          <Badge variant="outline" className="bg-orange-100 text-orange-700">
            ダミー実装
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-orange-700">
          フォーキャストに紐づく受注明細をSAP ERPに登録します。
        </p>

        <div className="space-y-2">
          {orders.map((order) => (
            <SAPOrderItem
              key={order.id}
              order={order as any}
              isSelected={selectedOrders.includes(order.id)}
              onToggle={(checked) => {
                if (checked) {
                  setSelectedOrders([...selectedOrders, order.id]);
                } else {
                  setSelectedOrders(selectedOrders.filter((id) => id !== order.id));
                }
              }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-orange-200 pt-3">
          <div className="text-xs text-gray-600">{selectedOrders.length}件選択中</div>
          <Button
            onClick={handleRegisterToSAP}
            disabled={selectedOrders.length === 0 || isRegistering}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isRegistering ? "登録中..." : "SAP受注登録"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
