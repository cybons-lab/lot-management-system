import { AlertCircle } from "lucide-react";

import type { SmartReadValidationError } from "../api";
import { sortColumnHeaders } from "../utils/column-order";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface SmartReadCsvTableProps {
  data: Record<string, unknown>[];
  errors: SmartReadValidationError[];
  className?: string;
}

export function SmartReadCsvTable({ data, errors, className }: SmartReadCsvTableProps) {
  if (data.length === 0) {
    return <div className="p-4 text-center text-gray-500">データがありません</div>;
  }

  // カラムヘッダー取得（データから動的に生成し、定義順にソート）
  const headers = sortColumnHeaders(Object.keys(data[0]!));

  // エラーを (row, field) で高速検索できるようにマップ化
  // rowはバックエンドのenumerate()から来るため0-indexed。
  // 表示用のmap indexも0-indexedなので、そのまま使える。
  const errorMap = new Map<string, string>();
  errors.forEach((e) => {
    // e.rowは0-indexed。keyは `${ rowIndex }-${ fieldName }` とする。
    errorMap.set(`${e.row}-${e.field}`, e.message);
  });

  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">No.</TableHead>
            {headers.map((header) => (
              <TableHead key={header} className="whitespace-nowrap">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              <TableCell className="w-[50px] font-mono text-xs text-muted-foreground">
                {rowIndex + 1}
              </TableCell>
              {headers.map((header) => {
                const errorKey = `${rowIndex}-${header}`;
                const errorMessage = errorMap.get(errorKey);
                const value = row[header];

                return (
                  <TableCell
                    key={`${rowIndex}-${header}`}
                    className={cn("whitespace-nowrap", errorMessage && "bg-red-50 text-red-900")}
                    title={errorMessage} // Tooltipの代わりにtitle属性を使用
                  >
                    {errorMessage ? (
                      <div className="flex items-center gap-1 cursor-help">
                        <AlertCircle className="h-3 w-3 text-red-500" />
                        <span>{String(value ?? "")}</span>
                      </div>
                    ) : (
                      String(value ?? "")
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
