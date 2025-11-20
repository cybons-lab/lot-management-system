type Props = {
  productName?: string;
  productCode?: string;
  status?: string;
  orderDate?: string;
};

const statusColors: Record<string, string> = {
  open: "bg-gray-100 text-gray-700",
  partial: "bg-yellow-100 text-yellow-700",
  allocated: "bg-green-100 text-green-700",
  shipped: "bg-blue-100 text-blue-700",
};

export function OrderLineHeader({ productName, productCode, status, orderDate }: Props) {
  return (
    <div className="flex items-center justify-between border-b bg-gradient-to-r from-sky-50 to-white px-6 py-4">
      <h2 className="text-lg font-semibold text-gray-900">
        {productName} <span className="text-gray-500">({productCode})</span>
      </h2>
      <div className="flex items-center gap-3">
        {status && (
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              statusColors[status] ?? statusColors.open
            }`}
          >
            {status}
          </span>
        )}
        {orderDate && <span className="text-sm text-gray-600">受注日: {orderDate}</span>}
      </div>
    </div>
  );
}
