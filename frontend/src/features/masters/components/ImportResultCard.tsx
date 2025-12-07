/**
 * ImportResultCard - インポート結果表示コンポーネント
 */

import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

import type { ImportResultDetail, MasterImportResponse } from "../types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";

interface ImportResultCardProps {
  result: MasterImportResponse;
}

export function ImportResultCard({ result }: ImportResultCardProps) {
  const statusConfig = {
    success: {
      icon: CheckCircle,
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      iconColor: "text-green-500",
      label: result.dry_run ? "検証成功" : "インポート成功",
    },
    partial: {
      icon: AlertCircle,
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-800",
      iconColor: "text-yellow-500",
      label: "一部エラー",
    },
    failed: {
      icon: XCircle,
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      iconColor: "text-red-500",
      label: "失敗",
    },
  };

  const config = statusConfig[result.status];
  const StatusIcon = config.icon;

  const totals = result.results.reduce(
    (acc, r) => ({
      created: acc.created + r.created,
      updated: acc.updated + r.updated,
      failed: acc.failed + r.failed,
    }),
    { created: 0, updated: 0, failed: 0 },
  );

  return (
    <Card className={`${config.bg} ${config.border} border`}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${config.text}`}>
          <StatusIcon className={`h-5 w-5 ${config.iconColor}`} />
          {config.label}
          {result.dry_run && (
            <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              ドライラン
            </span>
          )}
        </CardTitle>
        <CardDescription className={config.text}>
          作成: {totals.created}件 / 更新: {totals.updated}件 / 失敗: {totals.failed}件
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.results.length > 0 && (
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>テーブル</TableHead>
                  <TableHead className="text-right">作成</TableHead>
                  <TableHead className="text-right">更新</TableHead>
                  <TableHead className="text-right">失敗</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.results.map((detail) => (
                  <TableResultRow key={detail.table_name} detail={detail} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {result.errors.length > 0 && <GlobalErrors errors={result.errors} />}
      </CardContent>
    </Card>
  );
}

function TableResultRow({ detail }: { detail: ImportResultDetail }) {
  const tableNameMap: Record<string, string> = {
    suppliers: "仕入先",
    products: "商品",
    product_suppliers: "仕入先-商品",
    customers: "得意先",
    delivery_places: "配送先",
    customer_items: "得意先商品",
  };

  const displayName = tableNameMap[detail.table_name] || detail.table_name;
  const hasErrors = detail.errors.length > 0;

  return (
    <>
      <TableRow className={hasErrors ? "bg-red-50" : ""}>
        <TableCell className="font-medium">{displayName}</TableCell>
        <TableCell className="text-right">{detail.created}</TableCell>
        <TableCell className="text-right">{detail.updated}</TableCell>
        <TableCell className="text-right">
          {detail.failed > 0 ? (
            <span className="text-red-600">{detail.failed}</span>
          ) : (
            detail.failed
          )}
        </TableCell>
      </TableRow>
      {hasErrors && (
        <TableRow>
          <TableCell colSpan={4} className="bg-red-50 py-2">
            <ul className="list-inside list-disc text-xs text-red-600">
              {detail.errors.slice(0, 5).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {detail.errors.length > 5 && (
                <li className="text-gray-500">...他 {detail.errors.length - 5} 件</li>
              )}
            </ul>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function GlobalErrors({ errors }: { errors: string[] }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <h4 className="mb-2 font-medium text-red-800">グローバルエラー</h4>
      <ul className="list-inside list-disc space-y-1 text-sm text-red-700">
        {errors.map((err, i) => (
          <li key={i}>{err}</li>
        ))}
      </ul>
    </div>
  );
}
