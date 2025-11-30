/**
 * BulkImportErrorList
 * CSVパースエラー表示コンポーネント
 */

import { AlertCircle } from "lucide-react";

interface BulkImportErrorListProps {
  errors: string[];
  maxDisplay?: number;
}

export function BulkImportErrorList({ errors, maxDisplay = 5 }: BulkImportErrorListProps) {
  if (errors.length === 0) return null;

  return (
    <div className="rounded-md bg-red-50 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">CSV読み込みエラー</h3>
          <div className="mt-2 text-sm text-red-700">
            <ul className="list-disc space-y-1 pl-5">
              {errors.slice(0, maxDisplay).map((error, i) => (
                <li key={i}>{error}</li>
              ))}
              {errors.length > maxDisplay && <li>他 {errors.length - maxDisplay} 件のエラー</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
