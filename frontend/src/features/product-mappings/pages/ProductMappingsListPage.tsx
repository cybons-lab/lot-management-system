/**
 * ProductMappingsListPage - 商品マスタ一覧
 */
/* eslint-disable max-lines */
import { Package, Pencil, Trash2 } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";

import type { ProductMapping, ProductMappingCreate, ProductMappingUpdate } from "../api";
import { ProductMappingForm } from "../components/ProductMappingForm";
import {
  useProductMappings,
  useCreateProductMapping,
  useUpdateProductMapping,
  useDeleteProductMapping,
} from "../hooks";

import { BulkPermanentDeleteDialog } from "@/components/common";
import {
  Button,
  Input,
  Checkbox,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/display/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { useCustomers } from "@/features/customers/hooks";
import { MasterImportDialog } from "@/features/masters/components/MasterImportDialog";
import { useProducts } from "@/features/products/hooks";
import { useSuppliers } from "@/features/suppliers/hooks";
import { useTable } from "@/hooks/ui";
import { DataTable, type Column, type SortConfig } from "@/shared/components/data/DataTable";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { MasterPageActions } from "@/shared/components/layout/MasterPageActions";
import { PageHeader } from "@/shared/components/layout/PageHeader";

// eslint-disable-next-line max-lines-per-function, complexity
export function ProductMappingsListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [sort, setSort] = useState<SortConfig>({
    column: "customer_part_code",
    direction: "asc",
  });
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductMapping | null>(null);
  const [deletingItem, setDeletingItem] = useState<ProductMapping | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const table = useTable({ initialPageSize: 25 });

  const { data: productMappings = [], isLoading, isError, error, refetch } = useProductMappings();
  const { useList: useCustomerList } = useCustomers();
  const { data: customers = [] } = useCustomerList();
  const { useList: useSupplierList } = useSuppliers();
  const { data: suppliers = [] } = useSupplierList();
  const { useList: useProductList } = useProducts();
  const { data: products = [] } = useProductList();

  const { mutate: create, isPending: isCreating } = useCreateProductMapping();
  const { mutate: update, isPending: isUpdating } = useUpdateProductMapping();
  const { mutate: remove, isPending: isDeleting } = useDeleteProductMapping();

  const customerMap = useMemo(() => {
    return new Map(
      customers.map((c) => [
        c.id,
        { customer_code: c.customer_code, customer_name: c.customer_name },
      ]),
    );
  }, [customers]);

  const supplierMap = useMemo(() => {
    return new Map(
      suppliers.map((s) => [
        s.id,
        { supplier_code: s.supplier_code, supplier_name: s.supplier_name },
      ]),
    );
  }, [suppliers]);

  const productMap = useMemo(() => {
    return new Map(
      products.map((p) => [p.id, { product_code: p.product_code, product_name: p.product_name }]),
    );
  }, [products]);

  const columns = useMemo((): Column<ProductMapping>[] => {
    return [
      {
        id: "customer_part_code",
        header: "先方品番",
        cell: (row) => row.customer_part_code,
        sortable: true,
        width: 180,
        minWidth: 150,
        className: "truncate font-medium",
      },
      {
        id: "customer_id",
        header: "得意先",
        cell: (row) => {
          const customer = customerMap.get(row.customer_id);
          if (!customer) return `ID: ${row.customer_id}`;
          return `${customer.customer_code} - ${customer.customer_name}`;
        },
        sortable: true,
        width: 200,
        minWidth: 150,
        className: "truncate",
      },
      {
        id: "supplier_id",
        header: "仕入先",
        cell: (row) => {
          const supplier = supplierMap.get(row.supplier_id);
          if (!supplier) return `ID: ${row.supplier_id}`;
          return `${supplier.supplier_code} - ${supplier.supplier_name}`;
        },
        sortable: true,
        width: 200,
        minWidth: 150,
        className: "truncate",
      },
      {
        id: "product_group_id",
        header: "商品",
        cell: (row) => {
          const product = productMap.get(row.product_group_id);
          if (!product) return `ID: ${row.product_group_id}`;
          return `${product.product_code} - ${product.product_name}`;
        },
        sortable: true,
        width: 250,
        minWidth: 200,
        className: "truncate",
      },
      {
        id: "base_unit",
        header: "基本単位",
        cell: (row) => row.base_unit,
        width: 100,
      },
      {
        id: "is_active",
        header: "有効",
        cell: (row) => (row.is_active ? "有効" : "無効"),
        width: 80,
      },
    ];
  }, [customerMap, supplierMap, productMap]);

  const filteredData = useMemo(() => {
    let result = productMappings;

    // Inactive filter
    if (!showInactive) {
      result = result.filter((m) => m.is_active);
    }

    // Customer filter
    if (selectedCustomerId !== "all") {
      result = result.filter((m) => m.customer_id === Number(selectedCustomerId));
    }

    // Supplier filter
    if (selectedSupplierId !== "all") {
      result = result.filter((m) => m.supplier_id === Number(selectedSupplierId));
    }

    // Product filter
    if (selectedProductId !== "all") {
      result = result.filter((m) => m.product_group_id === Number(selectedProductId));
    }

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((m) => {
        const customer = customerMap.get(m.customer_id);
        const supplier = supplierMap.get(m.supplier_id);
        const product = productMap.get(m.product_group_id);
        return (
          m.customer_part_code.toLowerCase().includes(query) ||
          customer?.customer_name.toLowerCase().includes(query) ||
          supplier?.supplier_name.toLowerCase().includes(query) ||
          product?.product_name.toLowerCase().includes(query)
        );
      });
    }
    return result;
  }, [
    productMappings,
    searchQuery,
    showInactive,
    selectedCustomerId,
    selectedSupplierId,
    selectedProductId,
    customerMap,
    supplierMap,
    productMap,
  ]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const aVal = a[sort.column as keyof ProductMapping];
      const bVal = b[sort.column as keyof ProductMapping];
      if (aVal === undefined || bVal === undefined) return 0;
      const cmp = String(aVal).localeCompare(String(bVal), "ja");
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredData, sort]);

  // ページネーション
  const paginatedData = table.paginateData(sortedData);

  const handleCreate = useCallback(
    (data: ProductMappingCreate) => {
      create(data, { onSuccess: () => setIsCreateDialogOpen(false) });
    },
    [create],
  );

  const handleUpdate = useCallback(
    (data: ProductMappingUpdate) => {
      if (!editingItem) return;
      update({ id: editingItem.id, data }, { onSuccess: () => setEditingItem(null) });
    },
    [editingItem, update],
  );

  const handleDelete = useCallback(() => {
    if (!deletingItem) return;
    remove(deletingItem.id, { onSuccess: () => setDeletingItem(null) });
  }, [deletingItem, remove]);

  const handleBulkDelete = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
      // Parallel delete
      await Promise.all(selectedIds.map((id) => remove(Number(id))));

      setSelectedIds([]);
      setIsBulkDeleteDialogOpen(false);
      refetch();
      toast.success(`${selectedIds.length}件を削除しました`);
    } catch {
      toast.error("一括削除に失敗しました");
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedIds, remove, refetch]);

  const selectedCount = selectedIds.length;

  const actionColumn: Column<ProductMapping> = {
    id: "actions",
    header: "操作",
    cell: (row) => (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setEditingItem(row);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setDeletingItem(row);
          }}
        >
          <Trash2 className="text-destructive h-4 w-4" />
        </Button>
      </div>
    ),
  };

  if (isError) {
    return (
      <div className="space-y-6 px-6 py-6 md:px-8">
        <PageHeader
          title="商品マスタ"
          subtitle="商品マッピングの作成・編集・削除"
          backLink={{ to: "/masters", label: "マスタ管理" }}
        />
        <QueryErrorFallback error={error} resetError={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader
        title="商品マスタ"
        subtitle="商品マッピングの作成・編集・削除"
        backLink={{ to: "/masters", label: "マスタ管理" }}
        actions={
          <MasterPageActions
            exportApiPath="masters/product-mappings/export/download"
            exportFilePrefix="product-mappings"
            onImportClick={() => setIsImportDialogOpen(true)}
            onCreateClick={() => setIsCreateDialogOpen(true)}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-sm text-emerald-600">登録商品マッピング数</p>
              <p className="text-2xl font-bold text-emerald-700">{productMappings.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="space-y-4 border-b px-4 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h3 className="font-semibold">商品マッピング一覧</h3>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type="search"
                placeholder="品番・名称で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64"
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-inactive"
                  checked={showInactive}
                  onCheckedChange={(checked) => setShowInactive(checked as boolean)}
                />
                <Label htmlFor="show-inactive" className="cursor-pointer text-sm">
                  削除済みを表示
                </Label>
              </div>
            </div>
          </div>

          {/* Detailed Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="w-full sm:w-48">
              <Label className="text-muted-foreground mb-1 text-xs">得意先</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="すべての得意先" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての得意先</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-48">
              <Label className="text-muted-foreground mb-1 text-xs">仕入先</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="すべての仕入先" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての仕入先</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.supplier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-48">
              <Label className="text-muted-foreground mb-1 text-xs">商品</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="すべての商品" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての商品</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedCount > 0 && (
            <div className="mx-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3">
              <span className="text-sm font-medium text-red-800">{selectedCount} 件選択中</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsBulkDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                一括削除
              </Button>
            </div>
          )}
        </div>

        <DataTable
          data={paginatedData}
          columns={[...columns, actionColumn]}
          sort={sort}
          onSortChange={setSort}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="商品マッピングが登録されていません"
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
        {sortedData.length > 0 && (
          <TablePagination
            currentPage={table.calculatePagination(sortedData.length).page ?? 1}
            pageSize={table.calculatePagination(sortedData.length).pageSize ?? 25}
            totalCount={sortedData.length}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            pageSizeOptions={[25, 50, 75, 100]}
          />
        )}
      </div>

      {/* 新規登録ダイアログ */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>商品マッピング新規登録</DialogTitle>
          </DialogHeader>
          <ProductMappingForm
            customers={customers}
            suppliers={suppliers}
            products={products}
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={isCreating}
          />
        </DialogContent>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>商品マッピング編集</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <ProductMappingForm
              initialData={editingItem}
              customers={customers}
              suppliers={suppliers}
              products={products}
              onSubmit={handleUpdate}
              onCancel={() => setEditingItem(null)}
              isSubmitting={isUpdating}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog
        open={!!deletingItem}
        onOpenChange={(open: boolean) => !open && setDeletingItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>商品マッピングを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              先方品番: {deletingItem?.customer_part_code} を削除します。 この操作は元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* インポートダイアログ */}
      <MasterImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        title="商品マッピング一括登録"
        group="product_mappings"
      />

      <BulkPermanentDeleteDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        selectedCount={selectedCount}
        onConfirm={handleBulkDelete}
        isPending={isBulkDeleting}
        title="選択したマッピングを完全に削除しますか？"
        description={`選択された ${selectedCount} 件の得意先品番マッピングを完全に削除します。この操作は取り消せません。`}
      />
    </div>
  );
}
