import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { useState } from "react";

import { type ProductHeaderInfo, type DestinationInfo } from "./types";

interface Props {
  data: ProductHeaderInfo;
  involvedDestinations: DestinationInfo[];
}

function DestinationCard({ dest }: { dest: DestinationInfo }) {
  return (
    <div className="flex flex-col p-2 bg-slate-50 rounded border border-slate-200 text-[11px]">
      <div className="flex justify-between border-b border-slate-200 pb-1 mb-1">
        <span className="font-bold text-slate-800">{dest.customerName}</span>
        <span className="text-slate-500">{dest.customerCode}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex justify-between">
          <span className="text-slate-400">納入先:</span>
          <span className="text-slate-700 font-medium">{dest.deliveryPlaceName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">納入先コード:</span>
          <span className="text-slate-500">{dest.deliveryPlaceCode}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">先方品番:</span>
          <span className="text-slate-500">{dest.customerPartNo}</span>
        </div>
      </div>
    </div>
  );
}

function ProductInfoHeaderRow() {
  return (
    <div className="grid grid-cols-12 border-b border-slate-300">
      <div className="col-span-1 border-r border-slate-300 bg-slate-200 p-1 font-bold">仕入先</div>
      <div className="col-span-2 border-r border-slate-300 bg-slate-200 p-1 font-bold">
        仕入先名称
      </div>
      <div className="col-span-1 border-r border-slate-300 bg-slate-200 p-1 font-bold">
        荷受倉庫
      </div>
      <div className="col-span-1 border-r border-slate-300 bg-slate-200 p-1 font-bold">
        倉庫名称
      </div>
      <div className="col-span-1 border-r border-slate-300 bg-slate-200 p-1 font-bold">単位</div>
      <div className="col-span-1 border-r border-slate-300 bg-slate-200 p-1 font-bold">収容数</div>
      <div className="col-span-1 border-r border-slate-300 bg-slate-200 p-1 font-bold">
        保証期間
      </div>
      <div className="col-span-2 border-r border-slate-300 bg-slate-200 p-1 font-bold">
        メーカー品番
      </div>
      <div className="col-span-2 bg-slate-200 p-1 font-bold">商品名</div>
    </div>
  );
}

function ProductInfoValueRow({ data }: { data: ProductHeaderInfo }) {
  return (
    <div className="grid grid-cols-12 border-b border-slate-300 bg-white">
      <div className="col-span-1 border-r border-slate-300 p-1">{data.supplierCode}</div>
      <div className="col-span-2 truncate border-r border-slate-300 p-1" title={data.supplierName}>
        {data.supplierName}
      </div>
      <div className="col-span-1 border-r border-slate-300 p-1">{data.warehouseCode}</div>
      <div className="col-span-1 border-r border-slate-300 p-1">{data.warehouseName}</div>
      <div className="col-span-1 border-r border-slate-300 p-1">{data.unit}</div>
      <div className="col-span-1 border-r border-slate-300 p-1">{data.capacity}</div>
      <div className="col-span-1 border-r border-slate-300 p-1">{data.warrantyPeriod}</div>
      <div
        className="col-span-2 border-r border-slate-300 p-1 font-mono text-slate-700"
        title={data.productCode}
      >
        {data.productCode}
      </div>
      <div className="col-span-2 truncate p-1" title={data.productName}>
        {data.productName}
      </div>
    </div>
  );
}

function CustomerInfoRow({ data }: { data: ProductHeaderInfo }) {
  if (!data.customerName) return null;

  return (
    <div className="grid grid-cols-12 border-b border-slate-300 bg-emerald-50/50">
      <div className="col-span-1 border-r border-slate-300 bg-emerald-100 p-1 font-bold text-emerald-800">
        得意先
      </div>
      <div className="col-span-2 truncate border-r border-slate-300 p-1" title={data.customerName}>
        {data.customerName}
      </div>
      <div className="col-span-1 border-r border-slate-300 bg-emerald-100 p-1 font-bold text-emerald-800">
        得意先CD
      </div>
      <div className="col-span-1 border-r border-slate-300 p-1">{data.customerCode}</div>
      <div className="col-span-1 border-r border-slate-300 bg-emerald-100 p-1 font-bold text-emerald-800">
        先方品番
      </div>
      <div className="col-span-6 p-1 font-mono">{data.customerPartNo}</div>
    </div>
  );
}

function DestinationsSection({
  involvedDestinations,
}: {
  involvedDestinations: DestinationInfo[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 bg-slate-50/50 p-1.5 text-slate-600 transition-colors hover:bg-slate-100"
      >
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Users className="h-3.5 w-3.5" />
        <span className="text-[11px] font-bold tracking-wider uppercase">
          得意先情報 ({involvedDestinations.length})
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200 bg-white p-2">
          {involvedDestinations.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {involvedDestinations.map((dest) => (
                <DestinationCard key={dest.deliveryPlaceId} dest={dest} />
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-slate-400 italic">
              関連する得意先情報はありません
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProductHeader({ data, involvedDestinations }: Props) {
  return (
    <div className="overflow-hidden rounded-t-lg border border-slate-300 bg-slate-50 text-sm shadow-sm">
      <ProductInfoHeaderRow />
      <ProductInfoValueRow data={data} />
      <CustomerInfoRow data={data} />
      <DestinationsSection involvedDestinations={involvedDestinations} />
    </div>
  );
}
