/**
 * ProductMappingsListPage - 商品マスタ一覧
 */
import { Package, Plus, Pencil, Trash2 } from "lucide-react";
import { useState, useCallback, useMemo } from "react";

import type { ProductMapping, ProductMappingCreate, ProductMappingUpdate } from "../api";
import { ProductMappingForm } from "../components/ProductMappingForm";
import {
  useProductMappings,
  useCreateProductMapping,
  useUpdateProductMapping,
  useDeleteProductMapping,
} from "../hooks";

import { Button, Input } from "@/components/ui";
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
import { useProducts } from "@/features/products/hooks";
import { useSuppliers } from "@/features/suppliers/hooks";
import { useTable } from "@/hooks/ui";
import { DataTable, type Column, type SortConfig } from "@/shared/components/data/DataTable";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { PageHeader } from "@/shared/components/layout/PageHeader";

// eslint-disable-next-line max-lines-per-function
export function ProductMappingsListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({
    column: "customer_part_code",
    direction: "asc",
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductMapping | null>(null);
  const [deletingItem, setDeletingItem] = useState<ProductMapping | null>(null);
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
      },
      {
        id: "product_id",
        header: "商品",
        cell: (row) => {
          const product = productMap.get(row.product_id);
          if (!product) return `ID: ${row.product_id}`;
          return `${product.product_code} - ${product.product_name}`;
        },
        sortable: true,
      },
      {
        id: "base_unit",
        header: "基本単位",
        cell: (row) => row.base_unit,
      },
      {
        id: "is_active",
        header: "有効",
        cell: (row) => (row.is_active ? "有効" : "無効"),
      },
    ];
  }, [customerMap, supplierMap, productMap]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return productMappings;
    const query = searchQuery.toLowerCase();
    return productMappings.filter((m) => {
      const customer = customerMap.get(m.customer_id);
      const supplier = supplierMap.get(m.supplier_id);
      const product = productMap.get(m.product_id);
      return (
        m.customer_part_code.toLowerCase().includes(query) ||
        customer?.customer_name.toLowerCase().includes(query) ||
        supplier?.supplier_name.toLowerCase().includes(query) ||
        product?.product_name.toLowerCase().includes(query)
      );
    });
  }, [productMappings, searchQuery, customerMap, supplierMap, productMap]);

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
        <PageHeader title="商品マスタ" subtitle="商品マッピングの作成・編集・削除" />
        <QueryErrorFallback error={error} resetError={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader
        title="商品マスタ"
        subtitle="商品マッピングの作成・編集・削除"
        actions={
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新規登録
          </Button>
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
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">商品マッピング一覧</h3>
          <Input
            type="search"
            placeholder="品番・名称で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
        </div>
        <DataTable
          data={paginatedData}
          columns={[...columns, actionColumn]}
          sort={sort}
          onSortChange={setSort}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="商品マッピングが登録されていません"
        />
        {sortedData.length > 0 && (
          <TablePagination
            currentPage={table.calculatePagination(sortedData.length).page ?? 1}
            pageSize={table.calculatePagination(sortedData.length).pageSize ?? 25}
            totalCount={sortedData.length}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            pageSizeOptions={[25, 50, 100]}
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
    </div>
  );
}
