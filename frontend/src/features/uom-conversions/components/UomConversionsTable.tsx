import { Package, Pencil, Trash2, Check, X } from "lucide-react";

import type { UomConversionResponse } from "../api";

import { Button, Input } from "@/components/ui";

/** Inline edit cell for conversion factor */
function FactorCell({
    conversion,
    editingId,
    editValue,
    setEditValue,
    isUpdating,
    onSave,
    onCancel,
}: {
    conversion: UomConversionResponse;
    editingId: number | null;
    editValue: string;
    setEditValue: (v: string) => void;
    isUpdating: boolean;
    onSave: (id: number) => void;
    onCancel: () => void;
}) {
    if (editingId !== conversion.conversion_id) {
        return <>{conversion.conversion_factor}</>;
    }
    return (
        <div className="flex items-center gap-2">
            <Input
                type="number"
                step="0.0001"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-24 h-8"
                disabled={isUpdating}
            />
            <Button
                size="sm"
                variant="ghost"
                onClick={() => onSave(conversion.conversion_id)}
                disabled={isUpdating}
                className="h-8 w-8 p-0"
            >
                <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} disabled={isUpdating} className="h-8 w-8 p-0">
                <X className="h-4 w-4 text-slate-500" />
            </Button>
        </div>
    );
}

/** Action buttons for each row */
function ActionButtons({
    conversion,
    editingId,
    onStartEdit,
    onDelete,
}: {
    conversion: UomConversionResponse;
    editingId: number | null;
    onStartEdit: (c: UomConversionResponse) => void;
    onDelete: (c: UomConversionResponse) => void;
}) {
    if (editingId === conversion.conversion_id) return null;
    return (
        <div className="flex items-center justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => onStartEdit(conversion)} className="h-8 w-8 p-0">
                <Pencil className="h-4 w-4 text-slate-500" />
            </Button>
            <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(conversion)}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}

/** Props for UomConversionsTable */
interface TableProps {
    conversions: UomConversionResponse[];
    editingId: number | null;
    editValue: string;
    setEditValue: (v: string) => void;
    isUpdating: boolean;
    handleSaveEdit: (id: number) => void;
    handleCancelEdit: () => void;
    handleStartEdit: (c: UomConversionResponse) => void;
    setDeleteTarget: (c: UomConversionResponse) => void;
}

/** UOM conversions table component */
export function UomConversionsTable({
    conversions,
    editingId,
    editValue,
    setEditValue,
    isUpdating,
    handleSaveEdit,
    handleCancelEdit,
    handleStartEdit,
    setDeleteTarget,
}: TableProps) {
    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-700 uppercase">
                            製品コード
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-700 uppercase">
                            製品名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-700 uppercase">
                            外部単位
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-700 uppercase">
                            換算係数
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-700 uppercase">
                            備考
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-slate-700 uppercase">
                            操作
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                    {conversions.map((conversion) => (
                        <tr key={conversion.conversion_id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-900">
                                <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-green-600" />
                                    {conversion.product_code}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-900">{conversion.product_name}</td>
                            <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-indigo-600">
                                {conversion.external_unit}
                            </td>
                            <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-900">
                                <FactorCell
                                    conversion={conversion}
                                    editingId={editingId}
                                    editValue={editValue}
                                    setEditValue={setEditValue}
                                    isUpdating={isUpdating}
                                    onSave={handleSaveEdit}
                                    onCancel={handleCancelEdit}
                                />
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">{conversion.remarks || "-"}</td>
                            <td className="px-6 py-4 text-sm whitespace-nowrap text-right">
                                <ActionButtons
                                    conversion={conversion}
                                    editingId={editingId}
                                    onStartEdit={handleStartEdit}
                                    onDelete={setDeleteTarget}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
