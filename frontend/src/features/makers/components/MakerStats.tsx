import { Building2 } from "lucide-react";

interface MakerStatsProps {
  count: number;
}

export function MakerStats({ count }: MakerStatsProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="group rounded-xl border border-gray-200 border-l-4 border-l-orange-500 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-orange-600" />
          <div>
            <p className="text-sm font-medium text-gray-600">登録メーカー数</p>
            <p className="mt-2 text-3xl font-bold text-orange-600">{count}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
