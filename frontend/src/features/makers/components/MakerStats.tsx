import { Building2 } from "lucide-react";

interface MakerStatsProps {
  count: number;
}

export function MakerStats({ count }: MakerStatsProps) {
  return (
    <div className="group rounded-xl border border-gray-200 border-l-4 border-l-orange-500 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md min-w-[240px]">
      <div className="flex items-center gap-4">
        <Building2 className="h-8 w-8 text-orange-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-600 whitespace-nowrap">登録メーカー数</p>
          <p className="mt-1 text-3xl font-bold text-orange-600">{count}</p>
        </div>
      </div>
    </div>
  );
}
