/**
 * Order context section for allocation header.
 * Displays supplier, delivery place, and delivery date.
 */

interface OrderContextSectionProps {
  supplierName?: string;
  deliveryPlaceName: string;
  deliveryDate: string;
}

export function OrderContextSection({
  supplierName,
  deliveryPlaceName,
  deliveryDate,
}: OrderContextSectionProps) {
  return (
    <div className="col-span-4 flex flex-col gap-3">
      {/* Supplier */}
      {supplierName && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
            仕入元
          </span>
          <div className="flex items-center gap-2">
            <span className="i-lucide-truck h-3.5 w-3.5 text-gray-400" />
            <span className="font-medium text-gray-800">{supplierName}</span>
          </div>
        </div>
      )}

      {/* Delivery Place */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">納入先</span>
        <div className="flex items-center gap-2">
          <span className="i-lucide-map-pin h-3.5 w-3.5 text-gray-400" />
          <span className="font-medium text-gray-800">{deliveryPlaceName}</span>
        </div>
      </div>

      {/* Delivery Date */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">納期</span>
        <div className="flex items-center gap-2">
          <span className="i-lucide-calendar h-3.5 w-3.5 text-gray-400" />
          <span className="font-bold text-gray-800">{deliveryDate}</span>
        </div>
      </div>
    </div>
  );
}
