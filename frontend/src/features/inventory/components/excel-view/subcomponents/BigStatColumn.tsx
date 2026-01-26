const hHeader = "h-8";
const hFooter = "h-10";

interface Props {
  label: string;
  value: number;
  unit: string;
  variant: "blue" | "emerald";
}

export function BigStatColumn({ label, value, unit, variant }: Props) {
  const bgClass = variant === "blue" ? "bg-blue-50/10" : "bg-emerald-50/10";
  const headerBg = variant === "blue" ? "bg-blue-100/30" : "bg-emerald-100/30";
  const textClass = variant === "blue" ? "text-slate-900" : "text-emerald-600";
  const headerText = variant === "blue" ? "text-slate-700" : "text-emerald-800";

  return (
    <div className={`w-28 border-r border-slate-300 flex flex-col items-center ${bgClass}`}>
      <div
        className={`${hHeader} ${headerBg} border-b border-slate-300 w-full text-center p-1 font-bold ${headerText} text-[10px]`}
      >
        {label}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center font-black px-1">
        <span className={`text-xl ${textClass} leading-none break-all text-center`}>{value}</span>
        <span className="text-[10px] text-slate-500 mt-2 font-normal">{unit}</span>
      </div>
      <div className={`${hFooter} border-t border-slate-300 bg-slate-100 w-full`}></div>
    </div>
  );
}
