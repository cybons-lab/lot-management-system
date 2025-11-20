import { Button, Input, Label } from "@/components/ui";

interface LotCreateFormProps {
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function LotCreateForm({ onSubmit, onCancel, isSubmitting }: LotCreateFormProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      lot_number: formData.get("lot_number") as string,
      product_code: formData.get("product_code") as string,
      supplier_code: formData.get("supplier_code") as string,
      delivery_place_code: formData.get("delivery_place_code") as string,
      quantity: Number(formData.get("quantity")),
      lot_unit: formData.get("lot_unit") as string,
      receipt_date: formData.get("receipt_date") as string,
      expiry_date: (formData.get("expiry_date") as string) || undefined,
    };

    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lot_number">ロット番号 *</Label>
          <Input id="lot_number" name="lot_number" required placeholder="例: LOT-2024-001" />
        </div>

        <div>
          <Label htmlFor="product_code">製品コード *</Label>
          <Input id="product_code" name="product_code" required placeholder="例: P001" />
        </div>

        <div>
          <Label htmlFor="supplier_code">仕入先コード *</Label>
          <Input id="supplier_code" name="supplier_code" required placeholder="例: S001" />
        </div>

        <div>
          <Label htmlFor="delivery_place_code">納品場所コード *</Label>
          <Input
            id="delivery_place_code"
            name="delivery_place_code"
            required
            placeholder="例: DP01"
          />
        </div>

        <div>
          <Label htmlFor="quantity">数量 *</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            required
            min="0"
            step="0.01"
            placeholder="例: 1000"
          />
        </div>

        <div>
          <Label htmlFor="lot_unit">単位 *</Label>
          <Input id="lot_unit" name="lot_unit" required placeholder="例: EA" defaultValue="EA" />
        </div>

        <div>
          <Label htmlFor="receipt_date">入荷日 *</Label>
          <Input id="receipt_date" name="receipt_date" type="date" required />
        </div>

        <div>
          <Label htmlFor="expiry_date">有効期限</Label>
          <Input id="expiry_date" name="expiry_date" type="date" />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "作成中..." : "作成"}
        </Button>
      </div>
    </form>
  );
}
