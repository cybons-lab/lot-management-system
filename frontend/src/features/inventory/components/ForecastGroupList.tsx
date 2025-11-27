import { fmt } from "@/shared/utils/number";

interface ForecastGroupListProps {
    forecastData: any;
}

export function ForecastGroupList({ forecastData }: ForecastGroupListProps) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="mb-3 font-semibold">予測グループ一覧</h4>
            <div className="space-y-2">
                {forecastData.items.slice(0, 5).map((group: any, idx: number) => (
                    <div
                        key={idx}
                        className="flex items-center justify-between border-b border-gray-100 pb-2"
                    >
                        <div className="text-sm">
                            <span className="font-medium">
                                {group.group_key.customer_name || `顧客${group.group_key.customer_id}`}
                            </span>
                            {" → "}
                            <span>
                                {group.group_key.delivery_place_name ||
                                    `納入先${group.group_key.delivery_place_id}`}
                            </span>
                        </div>
                        <div className="text-sm font-semibold text-blue-600">
                            {fmt(
                                (group.forecasts ?? []).reduce(
                                    (s: any, f: any) => s + Number(f.forecast_quantity),
                                    0,
                                ),
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {forecastData.items.length > 5 && (
                <p className="mt-3 text-sm text-gray-500">他 {forecastData.items.length - 5} グループ</p>
            )}
        </div>
    );
}
