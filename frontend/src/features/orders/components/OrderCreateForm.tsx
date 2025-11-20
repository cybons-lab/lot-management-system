import { Button, Input, Label } from "@/components/ui";
import type { OrderCreate } from "@/utils/validators";

interface OrderCreateFormProps {
  onSubmit: (data: OrderCreate) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function OrderCreateForm({ onSubmit, onCancel, isSubmitting }: OrderCreateFormProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      order_no: formData.get("order_no") as string,
      customer_code: formData.get("customer_code") as string,
      order_date: formData.get("order_date") as string,
      status: "draft",
      lines: [], // 明細は後で追加
    };

    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="order_no">受注番号 *</Label>
          <Input id="order_no" name="order_no" required placeholder="例: ORD-2024-001" />
        </div>

        <div>
          <Label htmlFor="customer_code">得意先コード *</Label>
          <Input id="customer_code" name="customer_code" required placeholder="例: C001" />
        </div>

        <div>
          <Label htmlFor="order_date">受注日 *</Label>
          <Input id="order_date" name="order_date" type="date" required />
        </div>

        <div>
          <Label htmlFor="due_date">納期</Label>
          <Input id="due_date" name="due_date" type="date" />
        </div>

        <div>
          <Label htmlFor="ship_to">出荷先</Label>
          <Input id="ship_to" name="ship_to" placeholder="例: 東京営業所" />
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
