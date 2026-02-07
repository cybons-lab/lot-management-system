import type { Customer } from "../api";

interface CustomerDetailViewProps {
  customer: Customer;
}

export function CustomerDetailView({ customer }: CustomerDetailViewProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-muted-foreground">得意先コード</span>
            <p className="font-mono text-lg font-medium">{customer.customer_code}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">得意先名</span>
            <p className="text-lg font-medium">{customer.customer_name}</p>
          </div>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">短縮名</span>
          <p className="text-lg">{customer.short_name || "-"}</p>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">住所</span>
          <p className="text-lg">{customer.address || "-"}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-muted-foreground">担当者名</span>
            <p className="text-lg">{customer.contact_name || "-"}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">電話番号</span>
            <p className="text-lg">{customer.phone || "-"}</p>
          </div>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">メールアドレス</span>
          <p className="text-lg">{customer.email || "-"}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-muted-foreground">作成日時</span>
            <p className="text-sm text-gray-600">
              {new Date(customer.created_at).toLocaleString("ja-JP")}
            </p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">更新日時</span>
            <p className="text-sm text-gray-600">
              {new Date(customer.updated_at).toLocaleString("ja-JP")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
