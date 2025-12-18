/**
 * useWithdrawalForm
 *
 * WithdrawalForm Logic Hook
 * Extracts form management and data fetching logic from the UI component.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";

import {
  withdrawalFormSchema,
  WITHDRAWAL_FORM_DEFAULTS,
  type WithdrawalFormData,
} from "../components/withdrawalFormSchema";

import { useAuth } from "@/features/auth/AuthContext";
import { useCustomers } from "@/features/customers/hooks";
import { http } from "@/shared/api/http-client";
import type { LotUI } from "@/shared/libs/normalize";

interface DeliveryPlace {
  id: number;
  delivery_place_code: string;
  delivery_place_name: string;
  customer_id: number;
}

interface UseWithdrawalFormProps {
  preselectedLot?: LotUI | null;
  lots: LotUI[];
}

export function useWithdrawalForm({ preselectedLot, lots }: UseWithdrawalFormProps) {
  const { user } = useAuth();

  // Customers Data
  const { useList: useCustomerList } = useCustomers();
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomerList();

  // Delivery Places State
  const [deliveryPlaces, setDeliveryPlaces] = useState<DeliveryPlace[]>([]);
  const [isLoadingDeliveryPlaces, setIsLoadingDeliveryPlaces] = useState(false);

  // Form Initialization
  const form = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalFormSchema),
    defaultValues: {
      ...WITHDRAWAL_FORM_DEFAULTS,
      lot_id: preselectedLot?.lot_id ?? 0,
    },
  });

  const { watch, setValue } = form;

  // Watch fields
  const lotId = watch("lot_id");
  const customerId = watch("customer_id");
  const quantity = watch("quantity");

  // Effect: Update lot_id if preselectedLot changes
  useEffect(() => {
    if (preselectedLot) {
      setValue("lot_id", preselectedLot.lot_id);
    }
  }, [preselectedLot, setValue]);

  // Effect: Fetch Delivery Places when Customer changes
  useEffect(() => {
    if (customerId) {
      setIsLoadingDeliveryPlaces(true);
      http
        .get<DeliveryPlace[]>(`masters/delivery-places?customer_id=${customerId}`)
        .then((places) => {
          setDeliveryPlaces(places);
          // Reset delivery place selection if current selection is invalid for new customer
          // For UX, simple reset to 0 is often safest when switching parents
          setValue("delivery_place_id", 0);
        })
        .catch(() => {
          setDeliveryPlaces([]);
        })
        .finally(() => {
          setIsLoadingDeliveryPlaces(false);
        });
    } else {
      setDeliveryPlaces([]);
      setValue("delivery_place_id", 0);
    }
  }, [customerId, setValue]);

  // Calculated Values
  const selectedLot = useMemo(() => {
    return lots.find((l) => l.lot_id === lotId) ?? preselectedLot;
  }, [lots, lotId, preselectedLot]);

  const availableQuantity = useMemo(() => {
    return selectedLot
      ? Number(selectedLot.current_quantity) -
          Number(selectedLot.allocated_quantity) -
          Number(selectedLot.locked_quantity || 0)
      : 0;
  }, [selectedLot]);

  // Custom Validation Logic helper
  const isQuantityValid = quantity <= availableQuantity;
  const quantityError = !isQuantityValid
    ? `利用可能数量（${availableQuantity}）を超えています`
    : form.formState.errors.quantity?.message;

  return {
    form,
    customers,
    isLoadingCustomers,
    deliveryPlaces,
    isLoadingDeliveryPlaces,
    selectedLot,
    availableQuantity,
    user,
    quantityError,
  };
}
