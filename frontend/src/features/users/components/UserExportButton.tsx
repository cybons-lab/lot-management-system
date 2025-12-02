/**
 * UserExportButton - ユーザーエクスポート (Backend API)
 */
import { ExportButton } from "@/shared/components/ExportButton";

export interface UserExportButtonProps {
    size?: "default" | "sm" | "lg";
}

export function UserExportButton({ size = "default" }: UserExportButtonProps) {
    return (
        <ExportButton apiPath="/admin/users/export/download" filePrefix="users" size={size} />
    );
}
