import { type DestinationRowData } from "../types";

const hHeader = "h-8";
const hRow = "h-10";
const hFooter = "h-10";

interface Props {
  dateColumns: string[];
  destinations: DestinationRowData[];
}

export function DateGrid({ dateColumns, destinations }: Props) {
  return (
    <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 bg-slate-50/5">
      <div className="min-w-max flex flex-col">
        <div
          className={`${hHeader} flex border-b border-slate-300 font-bold bg-slate-50 divide-x divide-slate-200`}
        >
          {dateColumns.map((date) => (
            <div
              key={date}
              className="w-16 p-2 flex items-center justify-center text-center text-[10px] text-slate-500"
            >
              {date.substring(5).replace("-", "/")}
            </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col divide-y divide-slate-100">
          {destinations.map((dest, i) => (
            <div key={i} className={`${hRow} flex divide-x divide-slate-100 hover:bg-slate-50`}>
              {dateColumns.map((date) => (
                <div
                  key={date}
                  className="w-16 p-2 flex items-center justify-end text-sm font-medium pr-2 text-slate-600"
                >
                  {dest.shipmentQtyByDate[date] || ""}
                </div>
              ))}
            </div>
          ))}
          {destinations.length < 5 &&
            Array.from({ length: 5 - destinations.length }).map((_, i) => (
              <div key={i} className={`${hRow} flex divide-x divide-slate-100`}>
                {dateColumns.map((d) => (
                  <div key={d} className="w-16"></div>
                ))}
              </div>
            ))}
        </div>
        <div
          className={`${hFooter} flex border-t border-slate-300 bg-slate-100 font-bold divide-x divide-slate-200`}
        >
          {dateColumns.map((date) => {
            const dayTotal = destinations.reduce(
              (sum, d) => sum + (d.shipmentQtyByDate[date] || 0),
              0,
            );
            return (
              <div
                key={date}
                className="w-16 p-2 flex items-center justify-end pr-2 text-sm text-slate-800"
              >
                {dayTotal > 0 ? dayTotal : ""}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
