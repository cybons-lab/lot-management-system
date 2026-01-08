/* eslint-disable max-lines-per-function */
/**
 * CustomerItemsTable - Table component for customer items.
 * OCR-SAP変換フィールド対応版 + チェックボックス選択対応
 */
import { Building2, CheckCircle, Package, RotateCcw, Trash2, XCircle } from "lucide-react";

import type { CustomerItem } from "../api";

import { Button, Checkbox } from "@/components/ui";

interface CustomerItemsTableProps {
  items: CustomerItem[];
  isLoading: boolean;
  onSoftDelete: (item: CustomerItem) => void;
  onPermanentDelete: (item: CustomerItem) => void;
  onRestore: (item: CustomerItem) => void;
  onRowClick?: (item: CustomerItem) => void;
  // 選択機能（オプション）
  selectedIds?: Set<string | number>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  // 管理者なら全アイテム選択可能
  isAdmin?: boolean;
}

const isInactive = (validTo?: string) => {
  if (!validTo) return false;
  const today = new Date().toISOString().split("T")[0];
  return validTo <= today;
};

/** CustomerItem用の一意キー生成 */
const getItemKey = (item: CustomerItem) => `${item.customer_id}-${item.external_product_code}`;

interface TableHeaderProps {
  showCheckbox: boolean;
  allSelected: boolean;
  someSelected: boolean;
  onToggleSelectAll?: () => void;
  selectableCount: number;
}

function TableHeader({
  showCheckbox,
  allSelected,
  someSelected,
  onToggleSelectAll,
  selectableCount,
}: TableHeaderProps) {
  return (
    <thead className="sticky top-0 z-10 bg-gray-50">
      <tr>
        {showCheckbox && (
          <th className="w-12 px-4 py-3 text-left">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => onToggleSelectAll?.()}
              aria-label="全て選択"
              disabled={selectableCount === 0}
              className={someSelected && !allSelected ? "opacity-50" : ""}
            />
          </th>
        )}
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-700 uppercase">
          得意先
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-700 uppercase">
          得意先品番
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-700 uppercase">
          製品
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-700 uppercase">
          仕入先
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-700 uppercase">
          基本単位
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-700 uppercase">
          包装
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-700 uppercase">
          発注
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-700 uppercase">
          出荷票テキスト
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-700 uppercase">
          特記事項
        </th>
        <th className="px-4 py-3 text-right text-xs font-medium tracking-wider whitespace-nowrap text-gray-700 uppercase">
          操作
        </th>
      </tr>
    </thead>
  );
}

interface TableRowProps {
  item: CustomerItem;
  onSoftDelete: (item: CustomerItem) => void;
  onPermanentDelete: (item: CustomerItem) => void;
  onRestore: (item: CustomerItem) => void;
  onRowClick?: (item: CustomerItem) => void;
  showCheckbox: boolean;
  isSelected: boolean;
  onToggleSelect?: (id: string) => void;
  isAdmin?: boolean;
}

function TableRow({
  item,
  onSoftDelete,
  onPermanentDelete,
  onRestore,
  onRowClick,
  showCheckbox,
  isSelected,
  onToggleSelect,
  isAdmin = false,
}: TableRowProps) {
  const inactive = isInactive(item.valid_to);
  const itemKey = getItemKey(item);
  // 管理者は全アイテム選択可、非管理者はアクティブのみ（論理削除用）
  const canSelect = isAdmin ? true : !inactive;

  return (
    <tr className="cursor-pointer hover:bg-gray-50" onClick={() => onRowClick?.(item)}>
      {showCheckbox && (
        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect?.(itemKey)}
            aria-label={`${item.customer_name} - ${item.external_product_code}を選択`}
            disabled={!canSelect}
          />
        </td>
      )}
      <td className="px-4 py-4 text-sm text-gray-900">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0 text-orange-600" />
          <div className="min-w-[120px]">
            <div className="font-medium">{item.customer_code}</div>
            <div className="truncate text-xs text-gray-500" title={item.customer_name}>
              {item.customer_name}
            </div>
            {inactive && (
              <span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                削除済
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
        {item.external_product_code}
      </td>
      <td className="px-4 py-4 text-sm text-gray-900">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 shrink-0 text-green-600" />
          <div className="min-w-[120px]">
            <div className="truncate font-medium" title={item.product_name}>
              {item.product_name}
            </div>
            <div className="text-xs text-gray-500">ID: {item.product_id}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-gray-600">
        {item.supplier_name ? (
          <div className="min-w-[100px]">
            <div className="font-medium">{item.supplier_code}</div>
            <div className="truncate text-xs text-gray-500" title={item.supplier_name}>
              {item.supplier_name}
            </div>
          </div>
        ) : (
          "-"
        )}
      </td>
      <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-900">{item.base_unit}</td>
      <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-600">
        {item.pack_unit && item.pack_quantity ? (
          <span>
            {item.pack_unit} / {item.pack_quantity}
          </span>
        ) : (
          "-"
        )}
      </td>
      <td className="px-4 py-4 text-sm whitespace-nowrap">
        {item.is_procurement_required ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            <CheckCircle className="h-3 w-3" />要
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            <XCircle className="h-3 w-3" />
            不要
          </span>
        )}
      </td>
      <td className="max-w-[150px] px-4 py-4 text-sm text-gray-600">
        {item.shipping_slip_text ? (
          <div className="truncate" title={item.shipping_slip_text}>
            {item.shipping_slip_text}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="max-w-[150px] px-4 py-4 text-sm text-gray-600">
        {item.special_instructions ? (
          <div className="truncate" title={item.special_instructions}>
            {item.special_instructions}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-4 text-right text-sm whitespace-nowrap">
        {inactive ? (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRestore(item);
              }}
              title="復元"
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onPermanentDelete(item);
              }}
              title="完全に削除"
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSoftDelete(item);
              }}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}

export function CustomerItemsTable({
  items,
  isLoading,
  onSoftDelete,
  onPermanentDelete,
  onRestore,
  onRowClick,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  isAdmin = false,
}: CustomerItemsTableProps) {
  const showCheckbox = !!selectedIds && !!onToggleSelect;
  // 管理者は全アイテム、非管理者はアクティブのみ選択対象（論理削除用）
  const selectableItems = isAdmin ? items : items.filter((item) => !isInactive(item.valid_to));
  const allSelectableSelected =
    selectableItems.length > 0 &&
    selectableItems.every((item) => selectedIds?.has(getItemKey(item)));
  const someSelected = selectableItems.some((item) => selectedIds?.has(getItemKey(item)));

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="border-b p-4">
        <h3 className="text-lg font-semibold">マッピング一覧</h3>
        <p className="text-sm text-gray-600">{items.length} 件のマッピング</p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-500">読み込み中...</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          得意先品番マッピングが登録されていません
        </div>
      ) : (
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full min-w-[1200px] divide-y divide-gray-200">
            <TableHeader
              showCheckbox={showCheckbox}
              allSelected={allSelectableSelected}
              someSelected={someSelected}
              onToggleSelectAll={onToggleSelectAll}
              selectableCount={selectableItems.length}
            />
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map((item) => (
                <TableRow
                  key={getItemKey(item)}
                  item={item}
                  onSoftDelete={onSoftDelete}
                  onPermanentDelete={onPermanentDelete}
                  onRestore={onRestore}
                  onRowClick={onRowClick}
                  showCheckbox={showCheckbox}
                  isSelected={selectedIds?.has(getItemKey(item)) ?? false}
                  onToggleSelect={onToggleSelect}
                  isAdmin={isAdmin}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
