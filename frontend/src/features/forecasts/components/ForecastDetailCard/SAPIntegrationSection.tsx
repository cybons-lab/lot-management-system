/**
 * SAPIntegrationSection - SAP order registration UI (dummy implementation)
 */

import { useState } from "react";

import { Badge, Button, Card, CardContent, CardHeader } from "@/components/ui";

interface OrderItem {
  id: number;
  order_number?: string;
  quantity: number | string;
  unit?: string;
  delivery_date: string;
  allocation_status?: string;
  sap_order_number?: string | null;
}

interface SAPIntegrationSectionProps {
  relatedOrders?: OrderItem[];
}

export function SAPIntegrationSection({ relatedOrders }: SAPIntegrationSectionProps) {
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);

  // SAP未登録の受注のみフィルタ
  const unregisteredOrders = (relatedOrders || []).filter((order) => !order.sap_order_number);

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

  if (unregisteredOrders.length === 0) {
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
          {unregisteredOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center gap-3 rounded-md border border-orange-200 bg-white p-2"
            >
              <input
                type="checkbox"
                checked={selectedOrders.includes(order.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedOrders([...selectedOrders, order.id]);
                  } else {
                    setSelectedOrders(selectedOrders.filter((id) => id !== order.id));
                  }
                }}
                className="h-4 w-4"
              />
              <div className="flex-1 text-sm">
                <div className="font-medium">
                  受注番号: {order.order_number || `ID: ${order.id}`}
                </div>
                <div className="text-xs text-gray-600">
                  数量: {Number(order.quantity).toLocaleString()} {order.unit || "EA"} | 納期:{" "}
                  {new Date(order.delivery_date).toLocaleDateString("ja-JP")}
                </div>
              </div>
              <Badge
                variant={order.allocation_status === "ALLOCATED" ? "default" : "secondary"}
                className="text-xs"
              >
                {order.allocation_status === "ALLOCATED" ? "引当済" : "未引当"}
              </Badge>
            </div>
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
