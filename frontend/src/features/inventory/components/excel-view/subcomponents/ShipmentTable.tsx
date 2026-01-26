import { type DestinationRowData } from "../types";

const hHeader = "h-8";
const hRow = "h-10";
const hFooter = "h-10";

interface Props {
  destinations: DestinationRowData[];
  totalShipment: number;
}

export function ShipmentTable({ destinations, totalShipment }: Props) {
  return (
    <div className="flex flex-col border-r border-slate-300">
      <div
        className={`${hHeader} flex border-b border-slate-300 font-bold bg-slate-50 divide-x divide-slate-200`}
      >
        <div className="w-48 p-2 flex items-center">納入先</div>
        <div className="w-16 p-2 flex items-center justify-center text-[10px] text-slate-500">
          成績書
        </div>
        <div className="w-20 p-2 flex items-center justify-end pr-2 text-slate-700 text-[10px]">
          出荷計
        </div>
      </div>
      <div className="flex-1 flex flex-col divide-y divide-slate-100">
        {destinations.map((dest, i) => (
          <div key={i} className={`${hRow} flex group hover:bg-slate-50 divide-x divide-slate-100`}>
            <div
              className="w-48 p-2 flex items-center truncate text-sm"
              title={dest.destination.deliveryPlaceName}
            >
              {dest.destination.deliveryPlaceName}
            </div>
            <div className="w-16 p-2 flex items-center justify-center text-slate-400 text-[10px]">
              {dest.coaIssueDate ? "済" : "-"}
            </div>
            <div className="w-20 p-2 flex items-center justify-end font-bold text-blue-600 pr-2 text-sm">
              {dest.totalShipmentQty || ""}
            </div>
          </div>
        ))}
        {destinations.length < 5 &&
          Array.from({ length: 5 - destinations.length }).map((_, i) => (
            <div key={i} className={`${hRow} flex divide-x divide-slate-100`}>
              <div className="w-48"></div>
              <div className="w-16"></div>
              <div className="w-20"></div>
            </div>
          ))}
      </div>
      <div
        className={`${hFooter} flex border-t border-slate-300 bg-slate-100 font-bold divide-x divide-slate-200`}
      >
        <div className="w-64 p-2 flex items-center text-slate-700">出荷日計</div>
        <div className="w-20 p-2 flex items-center justify-end pr-2 text-sm">{totalShipment}</div>
      </div>
    </div>
  );
}
