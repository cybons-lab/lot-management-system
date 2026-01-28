/**
 * CustomerItemBasicTab
 * 得意先品番の基本情報タブ（詳細ダイアログ用）
 */

import type { CustomerItem } from "../api";

interface CustomerItemBasicTabProps {
  item: CustomerItem;
}

export function CustomerItemBasicTab({ item }: CustomerItemBasicTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-500">得意先</div>
          <div className="font-medium">
            {item.customer_code} - {item.customer_name}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">得意先品番</div>
          <div className="font-medium">{item.customer_part_no}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">商品</div>
          <div className="font-medium">
            {item.product_name} (ID: {item.product_group_id})
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">仕入先</div>
          <div className="font-medium">
            {item.supplier_name ? `${item.supplier_code} - ${item.supplier_name}` : "-"}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">基本単位</div>
          <div className="font-medium">{item.base_unit}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">包装単位 / 数量</div>
          <div className="font-medium">
            {item.pack_unit || "-"} / {item.pack_quantity || "-"}
          </div>
        </div>
      </div>
      {item.special_instructions && (
        <div>
          <div className="text-xs text-slate-500">特記事項</div>
          <div className="mt-1 rounded bg-slate-50 p-2 text-sm">{item.special_instructions}</div>
        </div>
      )}
    </div>
  );
}
