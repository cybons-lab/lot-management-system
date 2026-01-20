/**
 * DeliverySettingsSection
 * 得意先品番-納入先別設定の一覧と編集セクション
 */
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { fetchDeliveryPlaces } from "../../delivery-places/api";

import type { CreateDeliverySettingRequest, CustomerItemDeliverySetting } from "./api";
import { useDeliverySettings } from "./useDeliverySettings";

import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";

interface DeliverySettingsSectionProps {
  customerId: number;
  customerItemId: number;
}

export function DeliverySettingsSection({
  customerId,
  customerItemId,
}: DeliverySettingsSectionProps) {
  const { settings, isLoading, create, remove, isCreating, isDeleting } = useDeliverySettings(
    customerItemId,
  );

  const { data: deliveryPlaces = [] } = useQuery({
    queryKey: ["delivery-places", customerId],
    queryFn: () => fetchDeliveryPlaces({ customerId }),
    enabled: Boolean(customerId),
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateDeliverySettingRequest>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create({
      customer_item_id: customerItemId,
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
        <SettingsTable settings={settings} onDelete={remove} isDeleting={isDeleting} />
      )}

      <AddSettingDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isCreating={isCreating}
        deliveryPlaces={deliveryPlaces}
      />
    </div>
  );
}

// --- Sub-components ---

interface SettingsTableProps {
  settings: CustomerItemDeliverySetting[];
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

function SettingsTable({ settings, onDelete, isDeleting }: SettingsTableProps) {
  return (
    <div className="rounded-lg border">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">納入先名</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">次区コード</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">出荷テキスト</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">デフォルト</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {settings.map((setting) => (
            <tr key={setting.id} className="hover:bg-slate-50">
              <td className="px-4 py-2 text-sm">
                {setting.delivery_place_name || setting.delivery_place_id || "-"}
              </td>
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
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Yes</span>
                ) : (
                  "-"
                )}
              </td>
              <td className="px-4 py-2 text-right">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(setting.id)}
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
  );
}

// In AddSettingDialogProps and DeliverySettingFormProps interfaces, add deliveryPlaces
interface AddSettingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: Partial<CreateDeliverySettingRequest>;
  setFormData: (data: Partial<CreateDeliverySettingRequest>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isCreating: boolean;
  deliveryPlaces: { id: number; delivery_place_name: string }[];
}

interface DeliverySettingFormProps {
  formData: Partial<CreateDeliverySettingRequest>;
  setFormData: (data: Partial<CreateDeliverySettingRequest>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isCreating: boolean;
  deliveryPlaces: { id: number; delivery_place_name: string }[];
}

function AddSettingDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  isCreating,
  deliveryPlaces,
}: AddSettingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>納入先別設定を追加</DialogTitle>
        </DialogHeader>
        <DeliverySettingForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isCreating={isCreating}
          deliveryPlaces={deliveryPlaces}
        />
      </DialogContent>
    </Dialog>
  );
}

// eslint-disable-next-line max-lines-per-function -- Form fields are best kept together
function DeliverySettingForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isCreating,
  deliveryPlaces,
}: DeliverySettingFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="delivery_place_id" className="mb-1 block text-sm">
          納入先
        </Label>
        <select
          id="delivery_place_id"
          value={formData.delivery_place_id ?? ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              delivery_place_id: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">（選択なし：デフォルト設定）</option>
          {deliveryPlaces.map((place) => (
            <option key={place.id} value={place.id}>
              {place.delivery_place_name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          ※選択しない場合は、次区に一致するすべての納入先に適用されます
        </p>
      </div>
      <div>
        <Label htmlFor="jiku_code" className="mb-1 block text-sm">
          次区コード <span className="text-red-500">*</span>
        </Label>
        <Input
          id="jiku_code"
          type="text"
          value={formData.jiku_code ?? ""}
          onChange={(e) => setFormData({ ...formData, jiku_code: e.target.value || null })}
          placeholder="次区コードを入力"
          required
        />
      </div>
      <div>
        <Label htmlFor="shipment_text" className="mb-1 block text-sm">
          出荷表テキスト
        </Label>
        <textarea
          id="shipment_text"
          value={formData.shipment_text ?? ""}
          onChange={(e) => setFormData({ ...formData, shipment_text: e.target.value || null })}
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
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isCreating}>
          {isCreating ? "作成中..." : "作成"}
        </Button>
      </div>
    </form>
  );
}
