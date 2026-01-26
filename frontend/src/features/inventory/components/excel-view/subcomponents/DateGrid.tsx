import { type DestinationRowData } from "../types";

const hHeader = "h-8";
const hRow = "h-10";
const hFooter = "h-10";

interface Props {
  dateColumns: string[];
  destinations: DestinationRowData[];
  lotId: number;
  isEditing?: boolean;
  localChanges?: Record<string, number>;
  onQtyChange?: (lotId: number, dpId: number, date: string, value: number) => void;
}

interface CellProps {
  date: string;
  lotId: number;
  dest: DestinationRowData;
  isEditing?: boolean;
  localChanges?: Record<string, number>;
  onQtyChange?: (lotId: number, dpId: number, date: string, value: number) => void;
}

function DateCell({ date, lotId, dest, isEditing, localChanges, onQtyChange }: CellProps) {
  const changeKey = `${lotId}:${dest.deliveryPlaceId}:${date}`;
  const currentValue =
    localChanges && localChanges[changeKey] !== undefined
      ? localChanges[changeKey]
      : dest.shipmentQtyByDate[date] || 0;

  const isChanged = localChanges && localChanges[changeKey] !== undefined;

  return (
    <div className="w-16 p-0 flex items-center justify-center">
      {isEditing ? (
        <input
          type="number"
          className={`w-full h-full bg-transparent text-right pr-2 focus:bg-blue-50 outline-none transition-colors font-medium border-0 ${
            isChanged ? "text-blue-600 font-bold" : "text-slate-600"
          }`}
          value={currentValue || ""}
          onChange={(e) =>
            onQtyChange?.(lotId, dest.deliveryPlaceId, date, parseInt(e.target.value, 10) || 0)
          }
        />
      ) : (
        <div className="w-full text-right pr-2 text-sm font-medium text-slate-600">
          {currentValue || ""}
        </div>
      )}
    </div>
  );
}

export function DateGrid({
  dateColumns,
  destinations,
  lotId,
  isEditing,
  localChanges,
  onQtyChange,
}: Props) {
  return (
    <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 bg-slate-50/5">
      <div className="min-w-max flex flex-col">
        {/* Header */}
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

        {/* Rows */}
        <div className="flex-1 flex flex-col divide-y divide-slate-100">
          {destinations.map((dest, i) => (
            <div key={i} className={`${hRow} flex divide-x divide-slate-100 hover:bg-slate-50`}>
              {dateColumns.map((date) => (
                <DateCell
                  key={date}
                  date={date}
                  lotId={lotId}
                  dest={dest}
                  isEditing={isEditing}
                  localChanges={localChanges}
                  onQtyChange={onQtyChange}
                />
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

        {/* Footer */}
        <div
          className={`${hFooter} flex border-t border-slate-300 bg-slate-100 font-bold divide-x divide-slate-200`}
        >
          {dateColumns.map((date) => {
            const dayTotal = destinations.reduce((sum, d) => {
              const changeKey = `${lotId}:${d.deliveryPlaceId}:${date}`;
              const val =
                localChanges && localChanges[changeKey] !== undefined
                  ? localChanges[changeKey]
                  : d.shipmentQtyByDate[date] || 0;
              return sum + val;
            }, 0);
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
