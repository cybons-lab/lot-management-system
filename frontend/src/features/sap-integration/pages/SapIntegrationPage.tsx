import { useState } from "react";

import { ConnectionsTab } from "../components/ConnectionsTab";
import { DataFetchTab } from "../components/DataFetchTab";
import { LogsTab } from "../components/LogsTab";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function SapIntegrationPage() {
  const [activeTab, setActiveTab] = useState("connections");

  return (
    <div className="container mx-auto space-y-6 p-6">
      <PageHeader title="SAP連携管理" subtitle="SAP接続設定・データ取得・ログ確認" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="connections">接続設定</TabsTrigger>
          <TabsTrigger value="fetch">データ取得</TabsTrigger>
          <TabsTrigger value="logs">取得ログ</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="mt-4">
          <ConnectionsTab />
        </TabsContent>

        <TabsContent value="fetch" className="mt-4">
          <DataFetchTab />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <LogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
