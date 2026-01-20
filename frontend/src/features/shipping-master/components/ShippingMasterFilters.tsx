/**
 * 出荷用マスタフィルター
 */

import {
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

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
  return (
    <Card>
      <CardHeader>
        <CardTitle>フィルター</CardTitle>
        <CardDescription>得意先コード、材質コード、次区で絞り込み</CardDescription>
      </CardHeader>
      <CardContent>
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
