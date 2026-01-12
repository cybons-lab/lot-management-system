import { Plus, Route } from "lucide-react";
import { useState, useCallback, useMemo, useEffect } from "react";

import type { WarehouseDeliveryRoute, WarehouseDeliveryRouteCreate } from "../api";
import { WarehouseDeliveryRouteForm } from "../components";
import { useWarehouseDeliveryRoutes } from "../hooks";

import { createColumns } from "./columns";
import * as styles from "./styles";

import { Button, Checkbox, Input } from "@/components/ui";
import { Label } from "@/components/ui/form/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { useDeliveryPlaces } from "@/features/delivery-places/hooks";
import { useProducts } from "@/features/products/hooks";
import { useWarehouses } from "@/features/warehouses/hooks";
import { useTable } from "@/hooks/ui";
import type { SortConfig } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { ConfirmDialog } from "@/shared/components/form/FormDialog";
import { PageHeader } from "@/shared/components/layout/PageHeader";

// フォーム用のシンプルな型定義
interface WarehouseOption {
  id: number;
  warehouse_code: string;
  warehouse_name: string;
  warehouse_type: string;
}

interface DeliveryPlaceOption {
  id: number;
  delivery_place_code: string;
  delivery_place_name: string;
}

interface ProductOption {
  id: number;
  maker_part_code: string;
  product_name: string;
}

/* eslint-disable max-lines-per-function, complexity */
export function WarehouseDeliveryRoutesListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ column: "warehouse_code", direction: "asc" });
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<WarehouseDeliveryRoute | null>(null);
  const [deletingRoute, setDeletingRoute] = useState<WarehouseDeliveryRoute | null>(null);
  const table = useTable({ initialPageSize: 25 });

  // Data
  const { useList, useCreate, useUpdate, useDelete } = useWarehouseDeliveryRoutes();
  const { data: routes = [], isLoading, isError, error, refetch } = useList();
  const { mutate: createRoute, isPending: isCreating } = useCreate();
  const { mutate: updateRoute, isPending: isUpdating } = useUpdate();
  const { mutate: deleteRoute, isPending: isDeleting } = useDelete();

  // Master data for selects
  const { useList: useWarehouseList } = useWarehouses();
  const { data: warehousesRaw = [] } = useWarehouseList();
  const { data: deliveryPlacesRaw = [] } = useDeliveryPlaces();
  const { useList: useProductList } = useProducts();
  const { data: productsRaw = [] } = useProductList();

  // Map for form compatibility
  const warehouses: WarehouseOption[] = useMemo(
    () =>
      warehousesRaw.map((w) => ({
        id: w.id,
        warehouse_code: w.warehouse_code,
        warehouse_name: w.warehouse_name,
        warehouse_type: w.warehouse_type,
      })),
    [warehousesRaw],
  );

  const deliveryPlaces: DeliveryPlaceOption[] = useMemo(
    () =>
      deliveryPlacesRaw.map((d) => ({
        id: d.id,
        delivery_place_code: d.delivery_place_code,
        delivery_place_name: d.delivery_place_name,
      })),
    [deliveryPlacesRaw],
  );

  const products: ProductOption[] = useMemo(
    () =>
      productsRaw.map((p) => ({
        id: p.id,
        maker_part_code:
          (p as { maker_part_code?: string }).maker_part_code ??
          (p as { product_code?: string }).product_code ??
          "",
        product_name: p.product_name,
      })),
    [productsRaw],
  );

  // Filter
  const filteredRoutes = useMemo(() => {
    let result = routes;
    if (!showInactive) result = result.filter((r) => r.is_active);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.warehouse_code?.toLowerCase().includes(q) ||
          r.warehouse_name?.toLowerCase().includes(q) ||
          r.delivery_place_code?.toLowerCase().includes(q) ||
          r.delivery_place_name?.toLowerCase().includes(q) ||
          r.maker_part_code?.toLowerCase().includes(q) ||
          r.product_name?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [routes, searchQuery, showInactive]);

  useEffect(() => {
    table.setPage(1);
  }, [searchQuery, showInactive, table]);

  // Sort
  const sortedRoutes = useMemo(() => {
    const sorted = [...filteredRoutes];
    sorted.sort((a, b) => {
      const aVal = a[sort.column as keyof WarehouseDeliveryRoute];
      const bVal = b[sort.column as keyof WarehouseDeliveryRoute];
      if (aVal === undefined || bVal === undefined) return 0;
      const cmp = String(aVal).localeCompare(String(bVal), "ja");
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredRoutes, sort]);
  const paginatedRoutes = table.paginateData(sortedRoutes);

  const columns = useMemo(
    () =>
      createColumns(
        (r) => setEditingRoute(r),
        (r) => setDeletingRoute(r),
      ),
    [],
  );

  const handleCreate = useCallback(
    (data: WarehouseDeliveryRouteCreate) => {
      createRoute(data, { onSuccess: () => setIsCreateOpen(false) });
    },
    [createRoute],
  );

  const handleUpdate = useCallback(
    (data: WarehouseDeliveryRouteCreate) => {
      if (!editingRoute) return;
      updateRoute(
        {
          id: editingRoute.id,
          data: {
            transport_lead_time_days: data.transport_lead_time_days,
            is_active: data.is_active,
            notes: data.notes,
          },
        },
        { onSuccess: () => setEditingRoute(null) },
      );
    },
    [updateRoute, editingRoute],
  );

  const handleDelete = useCallback(() => {
    if (!deletingRoute) return;
    deleteRoute(deletingRoute.id, { onSuccess: () => setDeletingRoute(null) });
  }, [deleteRoute, deletingRoute]);

  if (isError) {
    return (
      <div className={styles.root}>
        <PageHeader title="輸送経路マスタ" subtitle="倉庫→納入先の輸送リードタイム管理" />
        <QueryErrorFallback error={error} resetError={refetch} />
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <PageHeader
        title="輸送経路マスタ"
        subtitle="倉庫→納入先の輸送リードタイム管理"
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新規登録
          </Button>
        }
      />

      <div className={styles.statsGrid}>
        <div className={styles.statsCard({ variant: "blue" })}>
          <div className="flex items-center gap-3">
            <Route className="h-8 w-8 text-blue-600" />
            <div>
              <p className={styles.statsLabel}>登録経路数</p>
              <p className={styles.statsValue({ color: "blue" })}>{routes.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>輸送経路一覧</h3>
          <div className={styles.tableActions}>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={(c) => setShowInactive(c as boolean)}
              />
              <Label htmlFor="show-inactive" className="cursor-pointer text-sm">
                無効を含む
              </Label>
            </div>
            <Input
              type="search"
              placeholder="倉庫・納入先・品番・品名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>
        <DataTable
          data={paginatedRoutes}
          columns={columns}
          sort={sort}
          onSortChange={setSort}
          getRowId={(r) => r.id}
          isLoading={isLoading}
          emptyMessage="輸送経路が登録されていません"
        />
        {sortedRoutes.length > 0 && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <TablePagination
              currentPage={table.calculatePagination(sortedRoutes.length).page ?? 1}
              pageSize={table.calculatePagination(sortedRoutes.length).pageSize ?? 25}
              totalCount={
                table.calculatePagination(sortedRoutes.length).totalItems ?? sortedRoutes.length
              }
              onPageChange={table.setPage}
              onPageSizeChange={table.setPageSize}
            />
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>輸送経路 新規登録</DialogTitle>
          </DialogHeader>
          <WarehouseDeliveryRouteForm
            warehouses={warehouses}
            deliveryPlaces={deliveryPlaces}
            products={products}
            onSubmit={handleCreate}
            onCancel={() => setIsCreateOpen(false)}
            isSubmitting={isCreating}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRoute} onOpenChange={(o) => !o && setEditingRoute(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>輸送経路 編集</DialogTitle>
          </DialogHeader>
          {editingRoute && (
            <WarehouseDeliveryRouteForm
              route={editingRoute}
              warehouses={warehouses}
              deliveryPlaces={deliveryPlaces}
              products={products}
              onSubmit={handleUpdate}
              onCancel={() => setEditingRoute(null)}
              isSubmitting={isUpdating}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingRoute}
        onClose={() => setDeletingRoute(null)}
        title="輸送経路を削除しますか？"
        description={`${deletingRoute?.warehouse_code} → ${deletingRoute?.delivery_place_code} の経路を削除します。`}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        confirmVariant="destructive"
      />
    </div>
  );
}
/* eslint-enable max-lines-per-function */
