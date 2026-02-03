import { Search } from "lucide-react";
import { useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/form/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Customer } from "@/features/customers/api";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import type { DeliveryPlace } from "@/features/delivery-places/api";
import { useDeliveryPlaces } from "@/features/delivery-places/hooks/useDeliveryPlaces";
import type { ApiResponse } from "@/shared/api/http-client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (deliveryPlaceId: number) => void;
  existingDestinationIds?: number[];
}

/* eslint-disable max-lines-per-function */
export function AddDestinationDialog({
  open,
  onOpenChange,
  onConfirm,
  existingDestinationIds = [],
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const customersHook = useCustomers();
  const { data: customersResponse } = (
    customersHook as { useList: () => { data: ApiResponse<Customer[]> | Customer[] } }
  ).useList();
  const { data: deliveryPlacesResponse } = useDeliveryPlaces();

  const customers = useMemo(() => {
    const rawData =
      (customersResponse as unknown as { items: Customer[] })?.items ||
      (customersResponse as Customer[]) ||
      [];
    return Array.isArray(rawData) ? rawData : [];
  }, [customersResponse]);

  const deliveryPlaces = useMemo(() => {
    const rawData =
      (deliveryPlacesResponse as unknown as { items: DeliveryPlace[] })?.items ||
      (deliveryPlacesResponse as DeliveryPlace[]) ||
      [];
    return Array.isArray(rawData) ? rawData : [];
  }, [deliveryPlacesResponse]);

  // Map customer names for display
  const customerMap = useMemo(() => {
    const map = new Map<number, string>();
    customers.forEach((c) => map.set(c.id, c.customer_name));
    return map;
  }, [customers]);

  // Filter and group delivery places
  const filteredDPs = useMemo(() => {
    if (!deliveryPlaces) return [];

    const getCustomerName = (customerId: number) => {
      const customer = customers.find((c) => c.id === customerId);
      return customer?.customer_name || "不明な得意先";
    };

    return deliveryPlaces
      .filter((dp) => {
        // Exclude already added
        if (existingDestinationIds.includes(dp.id)) return false;

        // Search filter
        const query = searchQuery.toLowerCase();
        const customerName = getCustomerName(dp.customer_id).toLowerCase();
        return (
          dp.delivery_place_name.toLowerCase().includes(query) ||
          dp.delivery_place_code.toLowerCase().includes(query) ||
          customerName.includes(query)
        );
      })
      .sort((a, b) => a.delivery_place_name.localeCompare(b.delivery_place_name, "ja"));
  }, [deliveryPlaces, searchQuery, existingDestinationIds, customers]); // Added 'customers' to dependencies

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>納入先を追加</DialogTitle>
          <DialogDescription>
            このロットを割り当てる新しい納入先を選択してください。
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="得意先名、納入先名、コードで検索..."
              className="pl-8"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[300px] border rounded-md p-2">
            {filteredDPs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                該当する納入先が見つかりません
              </div>
            ) : (
              <div className="space-y-1">
                {filteredDPs.map((dp) => (
                  <button
                    key={dp.id}
                    className="w-full text-left p-2 rounded hover:bg-slate-100 transition-colors group flex flex-col"
                    onClick={() => {
                      onConfirm(dp.id);
                      onOpenChange(false);
                      setSearchQuery("");
                    }}
                  >
                    <span className="font-medium text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                      {dp.delivery_place_name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {customerMap.get(dp.customer_id) || `得意先ID: ${dp.customer_id}`} (
                      {dp.delivery_place_code})
                    </span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
