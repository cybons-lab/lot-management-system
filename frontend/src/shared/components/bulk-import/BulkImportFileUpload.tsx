/**
 * BulkImportFileUpload
 * 一括インポート用のファイルアップロードコンポーネント
 */

import { Input } from "@/components/ui";

interface BulkImportFileUploadProps {
    id: string;
    label: string;
    hint: string;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    accept?: string;
}

export function BulkImportFileUpload({
    id,
    label,
    hint,
    onFileChange,
    disabled = false,
    accept = ".csv",
}: BulkImportFileUploadProps) {
    return (
        <div className="space-y-2">
            <label
                htmlFor={id}
                className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
                {label}
            </label>
            <div className="flex items-center gap-2">
                <Input
                    id={id}
                    type="file"
                    accept={accept}
                    onChange={onFileChange}
                    disabled={disabled}
                    className="cursor-pointer"
                />
            </div>
            <p className="text-xs text-slate-500">{hint}</p>
        </div>
    );
}
