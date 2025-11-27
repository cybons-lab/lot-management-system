import { ForecastFileUploadCard } from "@/features/forecasts/components/ForecastFileUploadCard";

export function ForecastImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Forecast インポート</h2>
        <p className="text-muted-foreground">需要予測データをCSVファイルからインポートします</p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <ForecastFileUploadCard />
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h3 className="mb-4 text-lg font-semibold">CSVフォーマット (v2.5)</h3>
        <div className="bg-muted rounded-lg p-4 font-mono text-sm">
          <div>
            customer_code,delivery_place_code,product_code,forecast_date,forecast_quantity,unit,forecast_period
          </div>
          <div>CUST-001,DP-001,PROD-001,2025-01-01,100,EA,2025-01</div>
          <div>CUST-001,DP-001,PROD-002,2025-01-01,200,EA,2025-01</div>
        </div>
        <p className="text-muted-foreground mt-4 text-sm">
          ※ forecast_period は必須項目です（YYYY-MM形式）
        </p>
      </div>
    </div>
  );
}
