import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardStats } from "@/components/DashboardStats"; // 1. DashboardStats をインポート
import InventoryPage from "@/pages/InventoryPage";
import AdminPage from "@/pages/AdminPage";
import OrderPage from "@/pages/OrderPage";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">ロット管理システム (v2.0)</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* 2. DashboardStats をここに追加 */}
          <div className="mb-8">
            <DashboardStats />
          </div>

          <Tabs defaultValue="inventory" className="space-y-4">
            <TabsList>
              <TabsTrigger value="inventory">在庫管理</TabsTrigger>
              {/* 2. 「shipping」を「order」に変更 */}
              <TabsTrigger value="order">受注管理</TabsTrigger>
              <TabsTrigger value="alerts">アラート</TabsTrigger>
              <TabsTrigger value="admin" className="text-destructive">
                管理
              </TabsTrigger>
            </TabsList>

            <TabsContent value="inventory" className="space-y-4">
              <InventoryPage />
            </TabsContent>

            <TabsContent value="order" className="space-y-4">
              <OrderPage />
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-lg font-medium">アラート</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  アラート機能は開発中です
                </p>
              </div>
            </TabsContent>

            {/* 3. 管理タブのコンテンツを追加 */}
            <TabsContent value="admin" className="space-y-4">
              <AdminPage />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
