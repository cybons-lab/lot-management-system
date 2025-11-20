/**
 * CustomerItemsListPage (v2.2 - Phase G-1)
 * Customer item mappings list page
 */

import { useState } from "react";
import { useCustomerItems, useCreateCustomerItem, useDeleteCustomerItem } from "../hooks";
import { CustomerItemTable } from "../components/CustomerItemTable";
import { CustomerItemForm } from "../components/CustomerItemForm";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import type { CreateCustomerItemRequest } from "../api";

export function CustomerItemsListPage() {
  const [filters, setFilters] = useState({
    customer_id: "",
    product_id: "",
  });

  const [showForm, setShowForm] = useState(false);

  // Build query params
  const queryParams = {
    customer_id: filters.customer_id ? Number(filters.customer_id) : undefined,
    product_id: filters.product_id ? Number(filters.product_id) : undefined,
  };

  // Fetch customer items
  const { data: customerItems, isLoading, isError } = useCustomerItems(queryParams);

  // Create mutation
  const createMutation = useCreateCustomerItem();

  // Delete mutation
  const deleteMutation = useDeleteCustomerItem();

  const handleCreateNew = () => {
    setShowForm(true);
  };

  const handleCancelCreate = () => {
    setShowForm(false);
  };

  const handleSubmitCreate = async (data: CreateCustomerItemRequest) => {
    try {
      await createMutation.mutateAsync(data);
      setShowForm(false);
      alert("得意先品番マッピングを登録しました");
    } catch (error) {
      console.error("Failed to create customer item:", error);
      alert("登録に失敗しました。既に同じマッピングが存在する可能性があります。");
    }
  };

  const handleDelete = async (customerId: number, externalProductCode: string) => {
    if (!confirm("この得意先品番マッピングを削除してもよろしいですか？")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ customerId, externalProductCode });
      alert("得意先品番マッピングを削除しました");
    } catch (error) {
      console.error("Failed to delete customer item:", error);
      alert("削除に失敗しました");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">得意先品番マッピング</h2>
          <p className="mt-1 text-gray-600">得意先品番と製品の紐付け管理</p>
        </div>
        {!showForm && <Button onClick={handleCreateNew}>新規登録</Button>}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">得意先品番マッピング登録</h3>
          <CustomerItemForm
            onSubmit={handleSubmitCreate}
            onCancel={handleCancelCreate}
            isSubmitting={createMutation.isPending}
          />
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="mb-2 block text-sm font-medium">得意先ID</Label>
            <Input
              type="number"
              value={filters.customer_id}
              onChange={(e) => setFilters({ ...filters, customer_id: e.target.value })}
              placeholder="得意先IDで絞り込み"
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">製品ID</Label>
            <Input
              type="number"
              value={filters.product_id}
              onChange={(e) => setFilters({ ...filters, product_id: e.target.value })}
              placeholder="製品IDで絞り込み"
            />
          </div>
        </div>
      </div>

      {/* Data display area */}
      {isLoading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          読み込み中...
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          データの取得に失敗しました
        </div>
      ) : !customerItems || customerItems.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          得意先品番マッピングが登録されていません
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">{customerItems.length} 件のマッピング</div>

          <CustomerItemTable
            items={customerItems}
            onDelete={handleDelete}
            isDeleting={deleteMutation.isPending}
          />
        </div>
      )}
    </div>
  );
}
