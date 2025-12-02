/**
 * CustomerItemsListPage
 * 得意先品番マッピング一覧ページ
 */

import { Building2, Package, Plus, Upload } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";

import type { CreateCustomerItemRequest } from "../api";
import { CustomerItemExportButton } from "../components/CustomerItemExportButton";
import { CustomerItemForm } from "../components/CustomerItemForm";
import { useCustomerItems, useCreateCustomerItem, useDeleteCustomerItem } from "../hooks";

import { Button, Input } from "@/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { PageHeader } from "@/shared/components/layout/PageHeader";

// ============================================
// Component
// ============================================

export function CustomerItemsListPage() {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    customer_id: "",
    product_id: "",
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Build query params
  const queryParams = {
    customer_id: filters.customer_id ? Number(filters.customer_id) : undefined,
    product_id: filters.product_id ? Number(filters.product_id) : undefined,
  };

  // Data
  const { data: customerItems = [], isLoading, error } = useCustomerItems(queryParams);
  const { mutate: createCustomerItem, isPending: isCreating } = useCreateCustomerItem();
  const { mutate: deleteCustomerItem, isPending: isDeleting } = useDeleteCustomerItem();

  // Debug logging
  console.log("[CustomerItemsListPage] Query state:", {
    isLoading,
    error,
    queryParams,
    dataLength: customerItems?.length,
    data: customerItems,
  });

  // フィルタリング
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return customerItems;

    const query = searchQuery.toLowerCase();
    return customerItems.filter(
      (item) =>
        item.external_product_code.toLowerCase().includes(query) ||
        item.customer_id.toString().includes(query) ||
        item.product_id.toString().includes(query),
    );
  }, [customerItems, searchQuery]);

  // 新規登録
  const handleCreate = useCallback(
    (data: CreateCustomerItemRequest) => {
      createCustomerItem(data, {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          toast.success("得意先品番マッピングを登録しました");
        },
        onError: () => {
          toast.error("登録に失敗しました。既に同じマッピングが存在する可能性があります。");
        },
      });
    },
    [createCustomerItem],
  );

  // 削除
  const handleDelete = useCallback(
    (customerId: number, externalProductCode: string) => {
      if (!confirm("この得意先品番マッピングを削除してもよろしいですか？")) {
        return;
      }

      deleteCustomerItem(
        { customerId, externalProductCode },
        {
          onSuccess: () => {
            toast.success("得意先品番マッピングを削除しました");
          },
          onError: () => {
            toast.error("削除に失敗しました");
          },
        },
      );
    },
    [deleteCustomerItem],
  );

  // 統計
  const stats = useMemo(
    () => ({
      total: customerItems.length,
      filtered: filteredItems.length,
    }),
    [customerItems.length, filteredItems.length],
  );

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader
        title="得意先品番マッピング"
        subtitle="得意先品番と製品の紐付け管理"
        actions={
          <div className="flex gap-2">
            <CustomerItemExportButton size="sm" />
            <Button variant="outline" size="sm" disabled>
              <Upload className="mr-2 h-4 w-4" />
              インポート
            </Button>
            <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              新規登録
            </Button>
          </div>
        }
      />

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-1">
        <div className="rounded-lg border bg-gradient-to-r from-blue-50 to-blue-100 p-4">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">登録マッピング数</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">フィルター</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">得意先ID</label>
            <Input
              type="number"
              value={filters.customer_id}
              onChange={(e) => setFilters({ ...filters, customer_id: e.target.value })}
              placeholder="得意先IDで絞り込み"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">製品ID</label>
            <Input
              type="number"
              value={filters.product_id}
              onChange={(e) => setFilters({ ...filters, product_id: e.target.value })}
              placeholder="製品IDで絞り込み"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">検索</label>
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="品番で検索..."
            />
          </div>
        </div>
      </div>

      {/* テーブル */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="border-b p-4">
          <h3 className="text-lg font-semibold">マッピング一覧</h3>
          <p className="text-sm text-gray-600">{filteredItems.length} 件のマッピング</p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">読み込み中...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            得意先品番マッピングが登録されていません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
                    得意先
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
                    得意先品番
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
                    製品
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
                    仕入先
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
                    基本単位
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
                    包装単位
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
                    包装数量
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-700 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredItems.map((item) => (
                  <tr
                    key={`${item.customer_id}-${item.external_product_code}`}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-orange-600" />
                        <div>
                          <div className="font-medium">{item.customer_code}</div>
                          <div className="text-xs text-gray-500">{item.customer_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                      {item.external_product_code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-xs text-gray-500">ID: {item.product_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.supplier_name ? (
                        <div>
                          <div className="font-medium">{item.supplier_code}</div>
                          <div className="text-xs text-gray-500">{item.supplier_name}</div>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                      {item.base_unit}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-600">
                      {item.pack_unit || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-600">
                      {item.pack_quantity || "-"}
                    </td>
                    <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item.customer_id, item.external_product_code)}
                        disabled={isDeleting}
                      >
                        削除
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 新規登録ダイアログ */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>得意先品番マッピング新規登録</DialogTitle>
          </DialogHeader>
          <CustomerItemForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={isCreating}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
