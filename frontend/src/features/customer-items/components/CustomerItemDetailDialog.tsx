/**
 * CustomerItemDetailDialog
 * 得意先品番マッピングの詳細ダイアログ（納入先別設定タブ含む）
 * OCR-SAP変換フィールド対応版
 */

import type { CustomerItem } from "../api";
import { DeliverySettingsSection } from "../delivery-settings";

import { CustomerItemBasicTab } from "./CustomerItemBasicTab";
import { CustomerItemOcrSapTab } from "./CustomerItemOcrSapTab";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs";

interface CustomerItemDetailDialogProps {
  item: CustomerItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerItemDetailDialog({
  item,
  open,
  onOpenChange,
}: CustomerItemDetailDialogProps) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>得意先品番詳細</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="basic" className="flex-1">
              基本情報
            </TabsTrigger>
            <TabsTrigger value="ocr-sap" className="flex-1">
              OCR-SAP変換
            </TabsTrigger>
            <TabsTrigger value="delivery" className="flex-1">
              納入先別設定
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-4">
            <CustomerItemBasicTab item={item} />
          </TabsContent>

          <TabsContent value="ocr-sap" className="mt-4">
            <CustomerItemOcrSapTab item={item} />
          </TabsContent>

          <TabsContent value="delivery" className="mt-4">
            <DeliverySettingsSection
              customerId={item.customer_id}
              externalProductCode={item.external_product_code}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
