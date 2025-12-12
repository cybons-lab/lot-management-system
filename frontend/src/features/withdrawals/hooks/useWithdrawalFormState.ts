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

import { useEffect, useMemo, useState, useCallback } from "react";

import type { WithdrawalCreateRequest, WithdrawalType } from "../api";

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
  product_id: number;
}

export interface WithdrawalFormData {
  lot_id: number;
  quantity: number;
  withdrawal_type: WithdrawalType;
  customer_id: number;
  delivery_place_id: number;
  ship_date: string;
  reason: string;
  reference_number: string;
}

interface UseWithdrawalFormStateProps {
  preselectedLot?: LotUI | null;
  lots: LotUI[];
  onSubmit: (data: WithdrawalCreateRequest) => Promise<void>;
}

export function useWithdrawalFormState({
  preselectedLot,
  lots,
  onSubmit,
}: UseWithdrawalFormStateProps) {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  // Master data queries
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useSuppliersQuery();
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomersQuery();
  const { data: products = [], isLoading: isLoadingProducts } = useProductsQuery();

  // Delivery places state
  const [deliveryPlaces, setDeliveryPlaces] = useState<DeliveryPlace[]>([]);
  const [isLoadingDeliveryPlaces, setIsLoadingDeliveryPlaces] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    supplier_id: 0,
    customer_id: 0,
    delivery_place_id: 0,
    product_id: 0,
  });

  // Form data state
  const [formData, setFormData] = useState<WithdrawalFormData>({
    lot_id: preselectedLot?.lot_id ?? 0,
    quantity: 0,
    withdrawal_type: "order_manual",
    customer_id: 0,
    delivery_place_id: 0,
    ship_date: today,
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
      if (preselectedLot.supplier_id != null) {
        setFilters((prev) => ({ ...prev, supplier_id: preselectedLot.supplier_id! }));
      }
      if (preselectedLot.product_id) {
        setFilters((prev) => ({ ...prev, product_id: preselectedLot.product_id }));
      }
    }
  }, [preselectedLot]);

  // Fetch delivery places when customer changes
  useEffect(() => {
    if (filters.customer_id) {
      setIsLoadingDeliveryPlaces(true);
      http
        .get<DeliveryPlace[]>(`masters/delivery-places?customer_id=${filters.customer_id}`)
        .then((places) => {
          setDeliveryPlaces(places);
          setFilters((prev) => ({ ...prev, delivery_place_id: 0 }));
        })
        .catch(() => {
          setDeliveryPlaces([]);
        })
        .finally(() => {
          setIsLoadingDeliveryPlaces(false);
        });
    } else {
      setDeliveryPlaces([]);
      setFilters((prev) => ({ ...prev, delivery_place_id: 0 }));
    }
  }, [filters.customer_id]);

  // Reset product filter when supplier changes if product is no longer available
  useEffect(() => {
    if (filters.product_id && filters.supplier_id) {
      const productExists = lots.some(
        (lot) => lot.supplier_id === filters.supplier_id && lot.product_id === filters.product_id,
      );
      if (!productExists) {
        setFilters((prev) => ({ ...prev, product_id: 0 }));
      }
    }
  }, [filters.supplier_id, filters.product_id, lots]);

  // Filtered lots
  const filteredLots = useMemo(() => {
    let filtered = lots.filter((lot) => lot.status === "active");

    if (filters.supplier_id) {
      filtered = filtered.filter((lot) => lot.supplier_id === filters.supplier_id);
    }
    if (filters.product_id) {
      filtered = filtered.filter((lot) => lot.product_id === filters.product_id);
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

    const productIds = new Set(relevantLots.map((lot) => lot.product_id));
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
  const updateFormData = useCallback(<K extends keyof WithdrawalFormData>(
    key: K,
    value: WithdrawalFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

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

    if (!formData.lot_id || formData.lot_id <= 0) {
      newErrors.lot_id = "ロットを選択してください";
    }

    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = "出庫数量を入力してください";
    } else if (formData.quantity > availableQuantity) {
      newErrors.quantity = `利用可能数量（${availableQuantity}）を超えています`;
    }

    if (formData.withdrawal_type === "order_manual") {
      if (!formData.customer_id || formData.customer_id <= 0) {
        newErrors.customer_id = "得意先を選択してください";
      }
    }

    if (!formData.ship_date) {
      newErrors.ship_date = "出荷日を入力してください";
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

      const request: WithdrawalCreateRequest = {
        lot_id: formData.lot_id,
        quantity: formData.quantity,
        withdrawal_type: formData.withdrawal_type,
        customer_id: formData.customer_id || undefined,
        delivery_place_id: formData.delivery_place_id || undefined,
        ship_date: formData.ship_date,
        reason: formData.reason || undefined,
        reference_number: formData.reference_number || undefined,
        withdrawn_by: user?.id ?? 1,
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
