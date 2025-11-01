import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import InventoryPage from '@/pages/InventoryPage'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">ロット管理システム</h1>
          </div>
        </header>
        
        <main className="container mx-auto px-4 py-8">
          <Tabs defaultValue="inventory" className="space-y-4">
            <TabsList>
              <TabsTrigger value="inventory">在庫管理</TabsTrigger>
              <TabsTrigger value="shipping">出荷管理</TabsTrigger>
              <TabsTrigger value="alerts">アラート</TabsTrigger>
            </TabsList>
            
            <TabsContent value="inventory" className="space-y-4">
              <InventoryPage />
            </TabsContent>
            
            <TabsContent value="shipping" className="space-y-4">
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-lg font-medium">出荷管理</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  出荷管理機能は開発中です
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="alerts" className="space-y-4">
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-lg font-medium">アラート</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  アラート機能は開発中です
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </QueryClientProvider>
  )
}

export default App
