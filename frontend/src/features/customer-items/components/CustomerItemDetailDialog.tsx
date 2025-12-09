/**
 * CustomerItemDetailDialog
 * 得意先品番マッピングの詳細ダイアログ（納入先別設定タブ含む）
 */

import type { CustomerItem } from "../api";
import { DeliverySettingsSection } from "../delivery-settings";

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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>得意先品番詳細</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="basic" className="flex-1">
              基本情報
            </TabsTrigger>
            <TabsTrigger value="delivery" className="flex-1">
              納入先別設定
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500">得意先</div>
                <div className="font-medium">
                  {item.customer_code} - {item.customer_name}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">得意先品番</div>
                <div className="font-medium">{item.external_product_code}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">製品</div>
                <div className="font-medium">
                  {item.product_name} (ID: {item.product_id})
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">仕入先</div>
                <div className="font-medium">
                  {item.supplier_name ? `${item.supplier_code} - ${item.supplier_name}` : "-"}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">基本単位</div>
                <div className="font-medium">{item.base_unit}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">包装単位 / 数量</div>
                <div className="font-medium">
                  {item.pack_unit || "-"} / {item.pack_quantity || "-"}
                </div>
              </div>
            </div>
            {item.special_instructions && (
              <div>
                <div className="text-xs text-slate-500">特記事項</div>
                <div className="mt-1 rounded bg-slate-50 p-2 text-sm">
                  {item.special_instructions}
                </div>
              </div>
            )}
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
