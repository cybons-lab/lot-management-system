/**
 * useWithdrawalForm
 *
 * WithdrawalForm Logic Hook
 * Extracts form management and data fetching logic from the UI component.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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

// eslint-disable-next-line max-lines-per-function -- AbortControllerとエラー処理の追加により行数増加
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
  const deliveryPlaceId = watch("delivery_place_id");
  const quantity = watch("quantity");

  // Effect: Update lot_id if preselectedLot changes
  useEffect(() => {
    if (preselectedLot) {
      setValue("lot_id", preselectedLot.lot_id);
    }
  }, [preselectedLot, setValue]);

  // Effect: Fetch Delivery Places when Customer changes
  // Use ref to track current customerId for race condition prevention
  const customerIdRef = useRef(customerId);
  const deliveryPlaceIdRef = useRef(deliveryPlaceId);
  const deliveryPlacesRequestIdRef = useRef(0);
  customerIdRef.current = customerId;

  useEffect(() => {
    deliveryPlaceIdRef.current = deliveryPlaceId;
  }, [deliveryPlaceId]);

  useEffect(() => {
    if (!customerId) {
      setDeliveryPlaces([]);
      setValue("delivery_place_id", 0);
      return;
    }

    const abortController = new AbortController();
    const currentCustomerId = customerId;
    const requestId = deliveryPlacesRequestIdRef.current + 1;
    deliveryPlacesRequestIdRef.current = requestId;
    setIsLoadingDeliveryPlaces(true);

    http
      .get<DeliveryPlace[]>(`masters/delivery-places?customer_id=${currentCustomerId}`, {
        signal: abortController.signal,
      })
      .then((places) => {
        // Check if customerId hasn't changed during the request
        if (
          deliveryPlacesRequestIdRef.current === requestId &&
          customerIdRef.current === currentCustomerId
        ) {
          setDeliveryPlaces(places);
          if (!places.some((place) => place.id === deliveryPlaceIdRef.current)) {
            setValue("delivery_place_id", 0);
          }
        }
      })
      .catch((error) => {
        // Ignore AbortError (expected when component unmounts or customerId changes)
        if ((error as Error).name !== "AbortError") {
          console.error("納入先取得エラー:", error);
          toast.error("納入先の取得に失敗しました");
          if (
            deliveryPlacesRequestIdRef.current === requestId &&
            customerIdRef.current === currentCustomerId
          ) {
            setDeliveryPlaces([]);
          }
        }
      })
      .finally(() => {
        if (
          deliveryPlacesRequestIdRef.current === requestId &&
          customerIdRef.current === currentCustomerId
        ) {
          setIsLoadingDeliveryPlaces(false);
        }
      });

    return () => {
      abortController.abort();
    };
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
