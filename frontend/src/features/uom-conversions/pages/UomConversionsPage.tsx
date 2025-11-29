import { Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { http } from "@/shared/api/http-client";

export function UomConversionsPage() {
  const { data: conversions = [], isLoading } = useQuery({
    queryKey: ["uom-conversions"],
    queryFn: async () => {
      const response = await http.get<any[]>("masters/uom-conversions");
      return response;
    },
  });

  if (isLoading) {
    return <div className="p-6">読み込み中...</div>;
  }

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">単位換算</h1>
        <p className="mt-1 text-sm text-slate-600">製品単位の換算情報を管理します</p>
      </div>

      {/* テーブル */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-700 uppercase">
                製品コード
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-700 uppercase">
                製品名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-700 uppercase">
                外部単位
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-700 uppercase">
                換算係数
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-700 uppercase">
                備考
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {conversions.map((conversion: any) => (
              <tr key={conversion.conversion_id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-900">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-green-600" />
                    {conversion.product_code}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-900">{conversion.product_name}</td>
                <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-indigo-600">
                  {conversion.external_unit}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-900">
                  {conversion.conversion_factor}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{conversion.remarks || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 件数表示 */}
      <div className="text-sm text-slate-600">{conversions.length} 件の単位換算</div>
    </div>
  );
}
