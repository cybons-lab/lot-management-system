import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Pages
import { AdminPage } from "@/features/admin/pages/AdminPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { ForecastImportPage } from "@/features/forecasts/pages/ForecastImportPage";
import { ForecastListPage } from "@/features/forecasts/pages/ForecastListPage";
import { InventoryPage } from "@/features/inventory/pages/InventoryPage";
import { OrdersListPage } from "@/features/orders/pages/OrdersListPage";
import { LotAllocationPage } from "@/pages/LotAllocationPage";

function AppTabs() {
  return (
    <div className="bg-background min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">ロット管理システム (MVP)</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
            <TabsTrigger value="inventory">在庫管理</TabsTrigger>
            {/* <TabsTrigger value="orders">受注管理</TabsTrigger> */}
            <TabsTrigger value="orders-card">ロット引当処理</TabsTrigger>
            <TabsTrigger value="forecast-list">Forecast一覧</TabsTrigger>

            <TabsTrigger value="forecast">Forecast</TabsTrigger>
            <TabsTrigger value="admin" className="text-destructive">
              管理
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders-card">
            <LotAllocationPage />
          </TabsContent>
          <TabsContent value="forecast-list">
            <ForecastListPage />
          </TabsContent>
          <TabsContent value="dashboard" className="space-y-4">
            <DashboardPage />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <InventoryPage />
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <OrdersListPage />
          </TabsContent>

          <TabsContent value="forecast" className="space-y-4">
            <ForecastImportPage />
          </TabsContent>

          <TabsContent value="admin" className="space-y-4">
            <AdminPage />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default AppTabs;
