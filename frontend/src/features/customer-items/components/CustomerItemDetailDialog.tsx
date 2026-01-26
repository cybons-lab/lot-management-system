/**
 * CustomerItemDetailDialog
 * 得意先品番マッピングの詳細ダイアログ（納入先別設定タブ含む）
 * Simplified version - OCR/SAP fields removed
 */

import { Pencil } from "lucide-react";

import type { CustomerItem } from "../api";
import { DeliverySettingsSection } from "../delivery-settings";

import { CustomerItemBasicTab } from "./CustomerItemBasicTab";

import { Button } from "@/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs";

interface CustomerItemDetailDialogProps {
  item: CustomerItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (item: CustomerItem) => void;
}

export function CustomerItemDetailDialog({
  item,
  open,
  onOpenChange,
  onEdit,
}: CustomerItemDetailDialogProps) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>得意先品番詳細</span>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(item);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                編集
              </Button>
            )}
          </DialogTitle>
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

          <TabsContent value="basic" className="mt-4">
            <CustomerItemBasicTab item={item} />
          </TabsContent>

          <TabsContent value="delivery" className="mt-4">
            <DeliverySettingsSection
              customerItemId={item.id}
              customerId={item.customer_id}
              customerPartNo={item.customer_part_no}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
