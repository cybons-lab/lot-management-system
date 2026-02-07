/**
 * QuickMappingSetupDialog
 */

import { Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

import type { DeliveryPlace } from "../hooks/useWithdrawalFormState";

import {
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import { createDeliverySetting } from "@/features/customer-items/delivery-settings/api";
import { useCreateCustomerItem } from "@/features/customer-items/hooks";
import { useCustomersQuery } from "@/hooks/api/useMastersQuery";
import { http } from "@/shared/api/http-client";

const CustomerSelect = ({
  customers,
  customerId,
  onChange,
  isLoading,
  disabled,
}: {
  customers: { id: number; customer_code: string; customer_name: string }[];
  customerId: number;
  onChange: (id: number) => void;
  isLoading: boolean;
  disabled: boolean;
}) => {
  const options = useMemo(
    () =>
      customers.map((c) => ({
        value: String(c.id),
        label: `${c.customer_code} - ${c.customer_name}`,
      })),
    [customers],
  );
  return (
    <div className="space-y-2">
      <Label>
        得意先 <span className="text-red-500">*</span>
      </Label>
      <SearchableSelect
        options={options}
        value={customerId ? String(customerId) : ""}
        onChange={(v) => onChange(Number(v))}
        placeholder={isLoading ? "読み込み中..." : "得意先を選択..."}
        disabled={disabled}
      />
    </div>
  );
};

const DeliveryPlaceSelect = ({
  customerId,
  deliveryPlaceId,
  deliveryPlaces,
  onChange,
  isLoading,
  disabled,
}: {
  customerId: number;
  deliveryPlaceId: number;
  deliveryPlaces: DeliveryPlace[];
  onChange: (id: number) => void;
  isLoading: boolean;
  disabled: boolean;
}) => (
  <div className="space-y-2">
    <Label>
      納入先 <span className="text-red-500">*</span>
    </Label>
    <Select
      value={deliveryPlaceId ? String(deliveryPlaceId) : ""}
      onValueChange={(v) => onChange(Number(v))}
      disabled={!customerId || isLoading || disabled}
    >
      <SelectTrigger>
        <SelectValue
          placeholder={
            !customerId ? "入力待機中..." : isLoading ? "読み込み中..." : "納入先を選択..."
          }
        />
      </SelectTrigger>
      <SelectContent>
        {deliveryPlaces.map((dp) => (
          <SelectItem key={dp.id} value={String(dp.id)}>
            {dp.delivery_place_code} - {dp.delivery_place_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

interface HookParams {
  productId: number;
  productCode: string;
  defaultUnit: string;
  customerPartNo: string;
  onSuccess: (cid: number, dpid: number) => void;
}

function useQuickMappingForm({
  productId: _productId,
  productCode,
  defaultUnit,
  customerPartNo,
  onSuccess,
}: HookParams) {
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomersQuery();
  const { mutateAsync: createCustomerItem } = useCreateCustomerItem();
  const [customerId, setCustomerId] = useState(0);
  const [partNo, setPartNo] = useState(customerPartNo || productCode);
  const [dpId, setDpId] = useState(0);
  const [dps, setDps] = useState<DeliveryPlace[]>([]);
  const [loadingDps, setLoadingDps] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!customerId) return (setDps([]), setDpId(0), undefined);
    const ctrl = new AbortController();
    setLoadingDps(true);
    http
      .get<DeliveryPlace[]>(`masters/delivery-places?customer_id=${customerId}`, {
        signal: ctrl.signal,
      })
      .then((ps) => (setDps(ps), setDpId(ps.length === 1 ? (ps[0]?.id ?? 0) : 0)))
      .catch((e) => e.name !== "AbortError" && toast.error("納入先取得失敗"))
      .finally(() => setLoadingDps(false));
    return () => ctrl.abort();
  }, [customerId]);

  const onSave = async () => {
    if (!customerId || !partNo || !dpId) return toast.error("入力不足です");
    setSubmitting(true);
    try {
      // Phase1: supplier_item_idが必須
      // TODO: supplier_item_id選択UIを追加
      const createdItem = await createCustomerItem({
        customer_id: customerId,
        customer_part_no: partNo,
        base_unit: defaultUnit || "CAN",
        supplier_item_id: 1, // FIXME: 仮の値
      });
      await createDeliverySetting({
        customer_item_id: createdItem.id,
        delivery_place_id: dpId,
        is_default: true,
      });
      toast.success("登録完了");
      onSuccess(customerId, dpId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "登録失敗");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    customers,
    isLoadingCustomers,
    customerId,
    setCustomerId,
    partNo,
    setPartNo,
    dpId,
    setDpId,
    dps,
    loadingDps,
    submitting,
    onSave,
  };
}

const QuickMappingForm = ({
  productId,
  productCode,
  defaultUnit,
  customerPartNo,
  onSuccess,
  onCancel,
}: {
  productId: number;
  productCode: string;
  defaultUnit: string;
  customerPartNo: string;
  onSuccess: (cid: number, dpid: number) => void;
  onCancel: () => void;
}) => {
  const f = useQuickMappingForm({ productId, productCode, defaultUnit, customerPartNo, onSuccess });

  return (
    <>
      <div className="space-y-4 py-4">
        <Alert className="border-blue-200 bg-blue-50 text-blue-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            自動選択設定をマスタに登録します。
          </AlertDescription>
        </Alert>
        <CustomerSelect
          customers={f.customers}
          customerId={f.customerId}
          onChange={f.setCustomerId}
          isLoading={f.isLoadingCustomers}
          disabled={f.submitting}
        />
        <div className="space-y-2">
          <Label>先方品番</Label>
          <Input
            value={f.partNo}
            onChange={(e) => f.setPartNo(e.target.value)}
            disabled={f.submitting}
          />
        </div>
        <DeliveryPlaceSelect
          customerId={f.customerId}
          deliveryPlaceId={f.dpId}
          deliveryPlaces={f.dps}
          onChange={f.setDpId}
          isLoading={f.loadingDps}
          disabled={f.submitting}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={f.submitting}>
          閉じる
        </Button>
        <Button onClick={f.onSave} disabled={f.submitting || !f.customerId || !f.dpId}>
          {f.submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          設定保存
        </Button>
      </DialogFooter>
    </>
  );
};

export function QuickMappingSetupDialog({
  productId,
  productName,
  productCode,
  defaultUnit,
  customerPartNo = "",
  open,
  onOpenChange,
  onSuccess,
}: {
  productId: number;
  productName: string;
  productCode: string;
  defaultUnit: string;
  customerPartNo?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (customerId: number, deliveryPlaceId: number) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>マッピング設定</DialogTitle>
          <DialogDescription>「{productName}」のデフォルト先を設定します。</DialogDescription>
        </DialogHeader>
        <QuickMappingForm
          productId={productId}
          productCode={productCode}
          defaultUnit={defaultUnit}
          customerPartNo={customerPartNo}
          onSuccess={(cid, dpid) => (onSuccess(cid, dpid), onOpenChange(false))}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
