/**
 * TemplateCard - テンプレートダウンロードカード
 */

import { Download, Loader2 } from "lucide-react";

import type { TemplateGroup } from "../types";

import { Button } from "@/components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";

interface TemplateCardProps {
  isDownloading: boolean;
  onDownload: (group: TemplateGroup) => void;
}

export function TemplateCard(props: TemplateCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          テンプレートダウンロード
        </CardTitle>
        <CardDescription>インポート用のテンプレートファイルをダウンロードできます</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="supply" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="supply">仕入系</TabsTrigger>
            <TabsTrigger value="customer">得意先系</TabsTrigger>
          </TabsList>
          <TabsContent value="supply" className="space-y-4">
            <TemplateInfo
              title="仕入系データ"
              description="仕入先マスタ、商品マスタ、仕入先-商品紐付けを一括登録"
              items={["suppliers (仕入先)", "products (商品)", "product_suppliers (仕入先-商品)"]}
              isDownloading={props.isDownloading}
              onDownload={() => props.onDownload("supply")}
            />
          </TabsContent>
          <TabsContent value="customer" className="space-y-4">
            <TemplateInfo
              title="得意先系データ"
              description="得意先マスタ、配送先、得意先商品マッピングを一括登録"
              items={["customers (得意先)", "delivery_places (配送先)", "customer_items (得意先商品)"]}
              isDownloading={props.isDownloading}
              onDownload={() => props.onDownload("customer")}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TemplateInfo(props: {
  title: string;
  description: string;
  items: string[];
  isDownloading: boolean;
  onDownload: () => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <h4 className="font-medium">{props.title}</h4>
      <p className="mt-1 text-sm text-gray-600">{props.description}</p>
      <ul className="mt-2 list-inside list-disc text-sm text-gray-500">
        {props.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={props.onDownload}
        disabled={props.isDownloading}
      >
        {props.isDownloading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        JSONテンプレート
      </Button>
    </div>
  );
}
