/**
 * SupplierFilterSet - 仕入先フィルタの統合コンポーネント
 *
 * 担当仕入先フィルタに必要な要素をセットで提供します：
 * 1. SupplierAssignmentWarning - 担当仕入先未設定時の警告
 * 2. SupplierSelect - 仕入先選択（オプション）
 * 3. SupplierFilterCheckbox - 担当仕入先のみチェックボックス
 *
 * 使用例:
 * ```tsx
 * // 警告 + チェックボックスのみ
 * <SupplierFilterSet showSupplierSelect={false} />
 *
 * // 警告 + 仕入先セレクト + チェックボックス
 * <SupplierFilterSet
 *   selectedSupplierId={supplierId}
 *   onSupplierChange={setSupplierId}
 * />
 *
 * // 警告のみ（詳細ページなど）
 * <SupplierFilterSet warningOnly />
 * ```
 */

import { useSupplierFilter } from "../hooks/useSupplierFilter";

import { SupplierAssignmentWarning } from "./SupplierAssignmentWarning";
import { SupplierFilterCheckbox } from "./SupplierFilterCheckbox";

import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import { useSuppliers } from "@/features/suppliers";

interface SupplierFilterSetProps {
  /** 仕入先セレクトを表示するか（デフォルト: false） */
  showSupplierSelect?: boolean;

  /** 選択中の仕入先ID */
  selectedSupplierId?: number | string | null;

  /** 仕入先変更時のコールバック */
  onSupplierChange?: (id: number | null) => void;

  /** 警告のみ表示（チェックボックスなし） */
  warningOnly?: boolean;

  /** フィルタの有効状態（外部で管理する場合） */
  filterEnabled?: boolean;

  /** フィルタ切り替えコールバック（外部で管理する場合） */
  onToggleFilter?: (enabled: boolean) => void;

  /** 追加のクラス名（警告バナー用） */
  warningClassName?: string;

  /** 追加のクラス名（フィルタ行用） */
  filterClassName?: string;
}

/**
 * 仕入先フィルタの統合コンポーネント
 *
 * - 警告バナーはフィルタの上に表示
 * - チェックボックスはフィルタ行の一部として表示
 */
export function SupplierFilterSet({
  showSupplierSelect = false,
  selectedSupplierId,
  onSupplierChange,
  warningOnly = false,
  filterEnabled: externalFilterEnabled,
  onToggleFilter: externalOnToggleFilter,
  warningClassName,
  filterClassName,
}: SupplierFilterSetProps) {
  const {
    filterEnabled: internalFilterEnabled,
    toggleFilter: internalToggleFilter,
    hasAssignedSuppliers,
  } = useSupplierFilter();

  const { useList } = useSuppliers();
  const { data: suppliers = [] } = useList();

  // 外部管理の場合はそちらを使用、なければ内部状態を使用
  const filterEnabled = externalFilterEnabled ?? internalFilterEnabled;
  const toggleFilter = externalOnToggleFilter ?? internalToggleFilter;

  return (
    <>
      {/* 警告バナー（フィルタの上） */}
      <SupplierAssignmentWarning {...(warningClassName ? { className: warningClassName } : {})} />

      {/* フィルタ行（警告のみモードでなければ表示） */}
      {!warningOnly && (
        <div className={`flex items-center gap-4 ${filterClassName ?? ""}`}>
          {/* 仕入先セレクト（オプション） */}
          {showSupplierSelect && (
            <div className="w-64">
              <SearchableSelect
                options={suppliers.map((s) => ({
                  value: String(s.id),
                  label: `${s.supplier_name} (${s.supplier_code})`,
                }))}
                value={selectedSupplierId ? String(selectedSupplierId) : ""}
                onChange={(val) => onSupplierChange?.(val ? Number(val) : null)}
                placeholder="仕入先を選択..."
              />
            </div>
          )}

          {/* チェックボックス */}
          <SupplierFilterCheckbox
            enabled={filterEnabled}
            onToggle={toggleFilter}
            disabled={!hasAssignedSuppliers}
          />
        </div>
      )}
    </>
  );
}
