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
      </div>
    </div>
  );
}

/* eslint-disable max-lines-per-function */
export function ProductHeader({ data, involvedDestinations }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-slate-50 border border-slate-300 text-sm overflow-hidden rounded-t-lg shadow-sm">
      <div className="grid grid-cols-12 border-b border-slate-300">
        <div className="col-span-1 bg-slate-200 p-1 font-bold border-r border-slate-300">
          仕入先
        </div>
        <div className="col-span-2 bg-slate-200 p-1 font-bold border-r border-slate-300">
          仕入先名称
        </div>
        <div className="col-span-1 bg-slate-200 p-1 font-bold border-r border-slate-300">
          荷受倉庫
        </div>
        <div className="col-span-1 bg-slate-200 p-1 font-bold border-r border-slate-300">
          倉庫名称
        </div>
        <div className="col-span-1 bg-slate-200 p-1 font-bold border-r border-slate-300">単位</div>
        <div className="col-span-1 bg-slate-200 p-1 font-bold border-r border-slate-300">
          収容数
        </div>
        <div className="col-span-1 bg-slate-200 p-1 font-bold border-r border-slate-300">
          保証期間
        </div>
        <div className="col-span-4 bg-slate-200 p-1 font-bold">商品名</div>
      </div>
      <div className="grid grid-cols-12 border-b border-slate-300 bg-white">
        <div className="col-span-1 p-1 border-r border-slate-300">{data.supplierCode}</div>
        <div
          className="col-span-2 p-1 border-r border-slate-300 truncate"
          title={data.supplierName}
        >
          {data.supplierName}
        </div>
        <div className="col-span-1 p-1 border-r border-slate-300">{data.warehouseCode}</div>
        <div className="col-span-1 p-1 border-r border-slate-300">{data.warehouseName}</div>
        <div className="col-span-1 p-1 border-r border-slate-300">{data.unit}</div>
        <div className="col-span-1 p-1 border-r border-slate-300">{data.capacity}</div>
        <div className="col-span-1 p-1 border-r border-slate-300">{data.warrantyPeriod}</div>
        <div
          className="col-span-4 p-1 truncate"
          title={`${data.productName} (${data.productCode})`}
        >
          {data.productName} <span className="text-slate-400">({data.productCode})</span>
        </div>
      </div>

      {/* Customer Item Info (if filtering by customer_item) */}
      {data.customerName && (
        <div className="grid grid-cols-12 border-b border-slate-300 bg-emerald-50/50">
          <div className="col-span-1 bg-emerald-100 p-1 font-bold border-r border-slate-300 text-emerald-800">
            得意先
          </div>
          <div
            className="col-span-2 p-1 border-r border-slate-300 truncate"
            title={data.customerName}
          >
            {data.customerName}
          </div>
          <div className="col-span-1 bg-emerald-100 p-1 font-bold border-r border-slate-300 text-emerald-800">
            得意先CD
          </div>
          <div className="col-span-1 p-1 border-r border-slate-300">{data.customerCode}</div>
          <div className="col-span-1 bg-emerald-100 p-1 font-bold border-r border-slate-300 text-emerald-800">
            先方品番
          </div>
          <div className="col-span-6 p-1 font-mono">{data.customerPartNo}</div>
        </div>
      )}

      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-2 p-1.5 hover:bg-slate-100 transition-colors text-slate-600 bg-slate-50/50"
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Users className="h-3.5 w-3.5" />
          <span className="font-bold text-[11px] uppercase tracking-wider">
            得意先情報 ({involvedDestinations.length})
          </span>
        </button>

        {isExpanded && (
          <div className="p-2 bg-white border-t border-slate-200">
            {involvedDestinations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {involvedDestinations.map((dest, idx) => (
                  <DestinationCard key={idx} dest={dest} />
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-400 italic">
                関連する得意先情報はありません
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
