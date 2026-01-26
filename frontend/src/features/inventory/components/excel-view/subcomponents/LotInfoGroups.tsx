import { type LotInfo } from "../types";

const hHeader = "h-8";
const hRow = "h-10";
const hFooter = "h-10";

interface Props {
  lotInfo: LotInfo;
}

export function LotInfoGroups({ lotInfo }: Props) {
  return (
    <div className="flex border-r border-slate-300">
      <div className="w-28 bg-slate-100 border-r border-slate-200 flex flex-col font-bold">
        <div
          className={`${hHeader} p-2 bg-slate-200/50 border-b border-slate-300 flex items-center`}
        >
          入荷情報
        </div>
        <div
          className={`${hRow} p-2 flex items-center border-b border-slate-100 whitespace-nowrap`}
        >
          入荷日
        </div>
        <div className={`${hRow} p-2 flex items-center border-b border-slate-100`}>Lot</div>
        <div
          className={`${hRow} p-2 flex items-center border-b border-slate-100 whitespace-nowrap`}
        >
          入庫No.
        </div>
        <div
          className={`${hRow} p-2 flex items-center border-b border-slate-100 whitespace-nowrap`}
        >
          発注NO.
        </div>
        <div className={`${hRow} p-2 flex items-center text-slate-500`}>消費期限</div>
        <div className="flex-1 bg-slate-50/50"></div>
        <div className={`${hFooter} bg-slate-100 border-t border-slate-300`}></div>
      </div>
      <div className="w-36 flex flex-col">
        <div
          className={`${hHeader} border-b border-slate-300 bg-slate-50 font-bold flex items-center px-2 text-slate-400`}
        >
          VALUES
        </div>
        <div
          className={`${hRow} p-2 flex items-center border-b border-slate-100 text-sm font-medium`}
        >
          {lotInfo.inboundDate}
        </div>
        <div
          className={`${hRow} p-2 flex items-center border-b border-slate-100 text-sm font-mono font-bold text-slate-700`}
        >
          {lotInfo.lotNo}
        </div>
        <div
          className={`${hRow} p-2 flex items-center border-b border-slate-100 text-xs font-mono`}
        >
          {lotInfo.inboundNo}
        </div>
        <div
          className={`${hRow} p-2 flex items-center border-b border-slate-100 text-xs font-mono`}
        >
          {lotInfo.orderNo}
        </div>
        <div className={`${hRow} p-2 flex items-center text-xs text-slate-500`}>
          {lotInfo.expiryDate}
        </div>
        <div className="flex-1"></div>
        <div className={`${hFooter} border-t border-slate-300 bg-slate-100`}></div>
      </div>
    </div>
  );
}
