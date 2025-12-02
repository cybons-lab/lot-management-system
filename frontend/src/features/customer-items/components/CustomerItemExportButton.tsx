/**
 * CustomerItemExportButton - 得意先商品エクスポート (Backend API)
 */
import { ExportButton } from "@/shared/components/ExportButton";

export interface CustomerItemExportButtonProps {
    size?: "default" | "sm" | "lg";
}

export function CustomerItemExportButton({ size = "default" }: CustomerItemExportButtonProps) {
    return (
        <ExportButton
            apiPath="/masters/customer-items/export/download"
            filePrefix="customer_items"
            size={size}
        />
    );
}
