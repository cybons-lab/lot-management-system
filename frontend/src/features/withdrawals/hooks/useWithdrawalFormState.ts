/**
 * useWithdrawalFormState - State management hook for WithdrawalFormFiltered
 *
 * Manages:
 * - Filter state (supplier, customer, delivery_place, product)
 * - Form data state
 * - Delivery places fetching
 * - Computed values (filteredLots, filteredProducts, availableQuantity)
 * - Validation logic
 */

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { toast } from "sonner";

import type { WithdrawalCreateRequest, WithdrawalType } from "../api";

import { useSupplierFilter } from "@/features/assignments/hooks";
import { useAuth } from "@/features/auth/AuthContext";
import {
  useCustomersQuery,
  useProductsQuery,
  useSuppliersQuery,
} from "@/hooks/api/useMastersQuery";
import { http } from "@/shared/api/http-client";
import type { LotUI } from "@/shared/libs/normalize";

export interface DeliveryPlace {
  id: number;
  delivery_place_code: string;
  delivery_place_name: string;
  customer_id: number;
}

export interface FilterState {
  supplier_id: number;
  customer_id: number;
  delivery_place_id: number;
  product_group_id: number;
}

export interface WithdrawalFormData {
  lot_id: number;
  quantity: number;
  withdrawal_type: WithdrawalType;
  customer_id: number;
  delivery_place_id: number;
  ship_date: string;
  due_date: string;
  reason: string;
  reference_number: string;
}

interface UseWithdrawalFormStateProps {
  preselectedLot?: LotUI | null;
  lots: LotUI[];
  onSubmit: (data: WithdrawalCreateRequest) => Promise<void>;
}

// eslint-disable-next-line max-lines-per-function
export function useWithdrawalFormState({
  preselectedLot,
  lots,
  onSubmit,
}: UseWithdrawalFormStateProps) {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  // 担当仕入先フィルターロジック（共通フック）
  const { primarySupplierIds } = useSupplierFilter();

  // 担当仕入先が1つのみの場合、自動選択
  const initialSupplierId = primarySupplierIds.length === 1 ? primarySupplierIds[0] : 0;

  // Master data queries
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useSuppliersQuery();
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomersQuery();
  const { data: products = [], isLoading: isLoadingProducts } = useProductsQuery();

  // Delivery places state
  const [deliveryPlaces, setDeliveryPlaces] = useState<DeliveryPlace[]>([]);
  const [isLoadingDeliveryPlaces, setIsLoadingDeliveryPlaces] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    supplier_id: initialSupplierId,
    customer_id: 0,
    delivery_place_id: 0,
    product_group_id: 0,
  });

  // Form data state
  const [formData, setFormData] = useState<WithdrawalFormData>({
    lot_id: preselectedLot?.lot_id ?? 0,
    quantity: 0,
    withdrawal_type: "order_manual",
    customer_id: 0,
    delivery_place_id: 0,
    ship_date: "",
    due_date: today,
    reason: "",
    reference_number: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize filters from preselected lot
  useEffect(() => {
    if (preselectedLot) {
      setFormData((prev) => ({
        ...prev,
        lot_id: preselectedLot.lot_id,
      }));
      if (preselectedLot.supplier_id != null || preselectedLot.product_group_id) {
        setFilters((prev) => ({
          ...prev,
          ...(preselectedLot.supplier_id != null
            ? { supplier_id: preselectedLot.supplier_id }
            : {}),
          ...(preselectedLot.product_group_id
            ? { product_group_id: preselectedLot.product_group_id }
            : {}),
        }));
      }
    }
  }, [preselectedLot]);

  // 担当仕入先が変更された場合、初期値を更新（preselectedLotがない場合のみ）
  useEffect(() => {
    if (primarySupplierIds.length === 1 && !preselectedLot && filters.supplier_id === 0) {
      setFilters((prev) => ({ ...prev, supplier_id: primarySupplierIds[0] }));
    }
  }, [primarySupplierIds, preselectedLot, filters.supplier_id]);

  // Fetch delivery places when customer changes
  // Use ref to track current customer_id for race condition prevention
  const customerIdRef = useRef(filters.customer_id);
  customerIdRef.current = filters.customer_id;
  const resetDeliveryPlaces = useCallback(() => {
    setDeliveryPlaces([]);
    setFilters((prev) => ({ ...prev, delivery_place_id: 0 }));
  }, []);

  useEffect(() => {
    const currentCustomerId = filters.customer_id;

    if (!currentCustomerId) {
      resetDeliveryPlaces();
      return;
    }

    const abortController = new AbortController();
    setIsLoadingDeliveryPlaces(true);

    http
      .get<DeliveryPlace[]>(`masters/delivery-places?customer_id=${currentCustomerId}`, {
        signal: abortController.signal,
      })
      .then((places) => {
        // Check if customer_id hasn't changed during the request
        if (customerIdRef.current === currentCustomerId) {
          setDeliveryPlaces(places);
          setFilters((prev) => {
            if (!places.some((place) => place.id === prev.delivery_place_id)) {
              return { ...prev, delivery_place_id: 0 };
            }
            return prev;
          });
        }
      })
      .catch((error) => {
        // Ignore AbortError (expected when component unmounts or customer_id changes)
        if ((error as Error).name !== "AbortError") {
          console.error("納入先取得エラー:", error);
          toast.error("納入先の取得に失敗しました");
          if (customerIdRef.current === currentCustomerId) {
            setDeliveryPlaces([]);
          }
        }
      })
      .finally(() => {
        if (customerIdRef.current === currentCustomerId) {
          setIsLoadingDeliveryPlaces(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [filters.customer_id, resetDeliveryPlaces]);

  // Reset product filter when supplier changes if product is no longer available
  useEffect(() => {
    if (filters.product_group_id && filters.supplier_id) {
      const productExists = lots.some(
        (lot) =>
          lot.supplier_id === filters.supplier_id &&
          lot.product_group_id === filters.product_group_id,
      );
      if (!productExists) {
        setFilters((prev) => ({ ...prev, product_group_id: 0 }));
      }
    }
  }, [filters.supplier_id, filters.product_group_id, lots]);

  // Filtered lots
  const filteredLots = useMemo(() => {
    let filtered = lots.filter((lot) => lot.status === "active");

    if (filters.supplier_id) {
      filtered = filtered.filter((lot) => lot.supplier_id === filters.supplier_id);
    }
    if (filters.product_group_id) {
      filtered = filtered.filter((lot) => lot.product_group_id === filters.product_group_id);
    }

    return filtered;
  }, [lots, filters]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    if (!filters.supplier_id && !filters.customer_id && !filters.delivery_place_id) {
      return products;
    }

    let relevantLots = lots.filter((lot) => lot.status === "active");

    if (filters.supplier_id) {
      relevantLots = relevantLots.filter((lot) => lot.supplier_id === filters.supplier_id);
    }

    const productIds = new Set(relevantLots.map((lot) => lot.product_group_id));
    return products.filter((p) => productIds.has(p.id));
  }, [products, lots, filters.supplier_id, filters.customer_id, filters.delivery_place_id]);

  // Selected lot
  const selectedLot = filteredLots.find((l) => l.lot_id === formData.lot_id) ?? preselectedLot;

  // Available quantity
  const availableQuantity = selectedLot
    ? Number(selectedLot.current_quantity) -
      Number(selectedLot.allocated_quantity) -
      Number(selectedLot.locked_quantity || 0)
    : 0;

  // Update filter
  const updateFilter = useCallback((key: keyof FilterState, value: number) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Update form data
  const updateFormData = useCallback(
    <K extends keyof WithdrawalFormData>(key: K, value: WithdrawalFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Sync customer selection between filter and form
  const handleCustomerChange = useCallback((customerId: number) => {
    setFormData((prev) => ({ ...prev, customer_id: customerId }));
    setFilters((prev) => ({ ...prev, customer_id: customerId }));
  }, []);

  // Sync delivery place selection between filter and form
  const handleDeliveryPlaceChange = useCallback((deliveryPlaceId: number) => {
    setFormData((prev) => ({ ...prev, delivery_place_id: deliveryPlaceId }));
    setFilters((prev) => ({ ...prev, delivery_place_id: deliveryPlaceId }));
  }, []);

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    const isOrderManual = formData.withdrawal_type === "order_manual";

    if (!formData.lot_id || formData.lot_id <= 0) {
      newErrors.lot_id = "ロットを選択してください";
    }

    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = "出庫数量を入力してください";
    } else if (formData.quantity > availableQuantity) {
      newErrors.quantity = `利用可能数量（${availableQuantity}）を超えています`;
    }

    if (isOrderManual) {
      if (!formData.customer_id || formData.customer_id <= 0) {
        newErrors.customer_id = "得意先を選択してください";
      }
    }

    if (!formData.due_date) {
      newErrors.due_date = "納期を入力してください";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, availableQuantity]);

  // Submit handler
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) {
        return;
      }
      if (!user?.id) {
        toast.error("ログインしてください");
        return;
      }

      const request: WithdrawalCreateRequest = {
        lot_id: formData.lot_id,
        quantity: formData.quantity,
        withdrawal_type: formData.withdrawal_type,
        customer_id: formData.customer_id || undefined,
        delivery_place_id: formData.delivery_place_id || undefined,
        ship_date: formData.ship_date,
        due_date: formData.due_date,
        reason: formData.reason || undefined,
        reference_number: formData.reference_number || undefined,
      };

      await onSubmit(request);
    },
    [formData, validate, onSubmit, user?.id],
  );

  return {
    // Master data
    suppliers,
    customers,
    products,
    deliveryPlaces,
    isLoadingSuppliers,
    isLoadingCustomers,
    isLoadingProducts,
    isLoadingDeliveryPlaces,

    // Filter state
    filters,
    updateFilter,

    // Form state
    formData,
    updateFormData,
    errors,

    // Computed values
    filteredLots,
    filteredProducts,
    selectedLot,
    availableQuantity,

    // Handlers
    handleCustomerChange,
    handleDeliveryPlaceChange,
    handleSubmit,
  };
}
