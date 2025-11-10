// frontend/src/features/orders/components/WarehouseBadges.tsx

type Props = {
  warehouses: string[];
};

export function WarehouseBadges({ warehouses }: Props) {
  if (warehouses.length === 0) {
    return <div className="text-sm text-gray-500">倉庫: 未配分</div>;
  }

  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-gray-600">出荷倉庫:</div>
      <div className="flex flex-wrap gap-1">
        {warehouses.map((wh) => (
          <span key={wh} className="rounded bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700">
            {wh}
          </span>
        ))}
      </div>
    </div>
  );
}
