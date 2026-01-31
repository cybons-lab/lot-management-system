/**
 * 出荷用マスタフィルター
 */

import { Menu } from "lucide-react";
import { useState } from "react";

import {
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { cn } from "@/shared/libs/utils";

interface ShippingMasterFiltersProps {
  customerCode: string;
  materialCode: string;
  jikuCode: string;
  onCustomerCodeChange: (value: string) => void;
  onMaterialCodeChange: (value: string) => void;
  onJikuCodeChange: (value: string) => void;
}

export function ShippingMasterFilters({
  customerCode,
  materialCode,
  jikuCode,
  onCustomerCodeChange,
  onMaterialCodeChange,
  onJikuCodeChange,
}: ShippingMasterFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>フィルター</CardTitle>
            <CardDescription>得意先コード、材質コード、次区で絞り込み</CardDescription>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="lg:hidden flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            aria-label="フィルタを表示/非表示"
          >
            <Menu className="h-5 w-5" />
            <span className="text-xs text-gray-500">{isExpanded ? "閉じる" : "開く"}</span>
          </button>
        </div>
      </CardHeader>
      <CardContent className={cn("lg:block", !isExpanded && "hidden lg:block")}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="customer-code">得意先コード</Label>
            <Input
              id="customer-code"
              placeholder="例: C001"
              value={customerCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onCustomerCodeChange(e.target.value)
              }
            />
          </div>
          <div>
            <Label htmlFor="material-code">材質コード</Label>
            <Input
              id="material-code"
              placeholder="例: M001"
              value={materialCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onMaterialCodeChange(e.target.value)
              }
            />
          </div>
          <div>
            <Label htmlFor="jiku-code">次区</Label>
            <Input
              id="jiku-code"
              placeholder="例: J01"
              value={jikuCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onJikuCodeChange(e.target.value)
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
