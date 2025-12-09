/**
 * DeliverySettingsSection
 * 得意先品番-納入先別設定の一覧と編集セクション
 */

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { useDeliverySettings } from "./useDeliverySettings";

import type { CreateDeliverySettingRequest, CustomerItemDeliverySetting } from "./api";

import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";

interface DeliverySettingsSectionProps {
  customerId: number;
  externalProductCode: string;
}

export function DeliverySettingsSection({
  customerId,
  externalProductCode,
}: DeliverySettingsSectionProps) {
  const { settings, isLoading, create, remove, isCreating, isDeleting } = useDeliverySettings(
    customerId,
    externalProductCode,
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateDeliverySettingRequest>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create({
      customer_id: customerId,
      external_product_code: externalProductCode,
      ...formData,
    });
    setIsFormOpen(false);
    setFormData({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-slate-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">納入先別設定</h3>
        <Button size="sm" variant="outline" onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          追加
        </Button>
      </div>

      {settings.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
          納入先別設定がありません
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">納入先ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                  次区コード
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                  出荷テキスト
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                  デフォルト
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {settings.map((setting: CustomerItemDeliverySetting) => (
                <tr key={setting.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-sm">{setting.delivery_place_id ?? "-"}</td>
                  <td className="px-4 py-2 text-sm">{setting.jiku_code ?? "-"}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className="max-w-xs truncate" title={setting.shipment_text ?? undefined}>
                      {setting.shipment_text
                        ? setting.shipment_text.substring(0, 30) +
                          (setting.shipment_text.length > 30 ? "..." : "")
                        : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {setting.is_default ? (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                        Yes
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(setting.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 追加フォームダイアログ */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>納入先別設定を追加</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="delivery_place_id" className="mb-1 block text-sm">
                納入先ID
              </Label>
              <Input
                id="delivery_place_id"
                type="number"
                value={formData.delivery_place_id ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    delivery_place_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="省略時はデフォルト設定"
              />
            </div>
            <div>
              <Label htmlFor="jiku_code" className="mb-1 block text-sm">
                次区コード
              </Label>
              <Input
                id="jiku_code"
                type="text"
                value={formData.jiku_code ?? ""}
                onChange={(e) => setFormData({ ...formData, jiku_code: e.target.value || null })}
                placeholder="省略時は全次区共通"
              />
            </div>
            <div>
              <Label htmlFor="shipment_text" className="mb-1 block text-sm">
                出荷表テキスト
              </Label>
              <textarea
                id="shipment_text"
                value={formData.shipment_text ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, shipment_text: e.target.value || null })
                }
                placeholder="SAP連携用テキスト"
                rows={2}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="packing_note" className="mb-1 block text-sm">
                梱包・注意書き
              </Label>
              <textarea
                id="packing_note"
                value={formData.packing_note ?? ""}
                onChange={(e) => setFormData({ ...formData, packing_note: e.target.value || null })}
                placeholder="梱包時の注意事項"
                rows={2}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default ?? false}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="rounded border-slate-300"
              />
              <Label htmlFor="is_default" className="text-sm">
                デフォルト設定として使用
              </Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "作成中..." : "作成"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
