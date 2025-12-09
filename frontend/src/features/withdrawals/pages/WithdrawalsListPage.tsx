/**
 * WithdrawalsListPage
 *
 * 出庫履歴一覧ページ
 */

import { formatDistanceToNow } from "date-fns";
/* eslint-disable max-lines-per-function */
import { ja } from "date-fns/locale";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { WITHDRAWAL_TYPE_LABELS } from "../api";
import type { WithdrawalType } from "../api";
import { useWithdrawals } from "../hooks";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";

const PAGE_SIZE = 20;

export function WithdrawalsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<WithdrawalType | "all">("all");

  const { useList } = useWithdrawals();
  const { data, isLoading, isError, error } = useList({
    skip: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
    withdrawal_type: filterType === "all" ? undefined : filterType,
  });

  const withdrawals = data?.withdrawals ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleBack = () => {
    navigate("/inventory");
  };

  const handleCreate = () => {
    navigate("/inventory/withdrawals/new");
  };

  if (isError) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-red-300 bg-red-50">
          <CardContent className="py-6">
            <p className="text-red-600">
              データの読み込みに失敗しました: {error?.message ?? "不明なエラー"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            在庫管理
          </Button>
          <div>
            <h1 className="text-2xl font-bold">出庫履歴</h1>
            <p className="text-sm text-gray-500">受注外出庫の履歴一覧</p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          出庫登録
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-48">
              <Select
                value={filterType}
                onValueChange={(v) => {
                  setFilterType(v as WithdrawalType | "all");
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="出庫タイプ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="order_manual">受注（手動）</SelectItem>
                  <SelectItem value="internal_use">社内使用</SelectItem>
                  <SelectItem value="disposal">廃棄処理</SelectItem>
                  <SelectItem value="return">返品対応</SelectItem>
                  <SelectItem value="sample">サンプル出荷</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardDescription>
            {total} 件中 {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, total)} 件を表示
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              <span className="ml-2 text-gray-500">読み込み中...</span>
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="py-8 text-center text-gray-500">出庫履歴がありません</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>出庫日時</TableHead>
                    <TableHead>出庫タイプ</TableHead>
                    <TableHead>ロット</TableHead>
                    <TableHead>製品</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead>得意先</TableHead>
                    <TableHead>納入場所</TableHead>
                    <TableHead>出荷日</TableHead>
                    <TableHead>参照番号</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((w) => (
                    <TableRow key={w.withdrawal_id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(w.withdrawn_at), {
                            addSuffix: true,
                            locale: ja,
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(w.withdrawn_at).toLocaleDateString("ja-JP")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-block rounded bg-gray-100 px-2 py-1 text-xs font-medium">
                          {WITHDRAWAL_TYPE_LABELS[w.withdrawal_type] ?? w.withdrawal_type}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{w.lot_number}</TableCell>
                      <TableCell>
                        <div className="text-sm">{w.product_name}</div>
                        <div className="text-xs text-gray-500">{w.product_code}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{w.quantity}</TableCell>
                      <TableCell>
                        <div className="text-sm">{w.customer_name}</div>
                        <div className="text-xs text-gray-500">{w.customer_code}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{w.delivery_place_name}</div>
                        <div className="text-xs text-gray-500">{w.delivery_place_code}</div>
                      </TableCell>
                      <TableCell>{w.ship_date}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {w.reference_number || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    ページ {page} / {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      前へ
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      次へ
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
