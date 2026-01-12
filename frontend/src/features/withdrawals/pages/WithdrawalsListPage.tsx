/**
 * WithdrawalsListPage
 *
 * 出庫履歴一覧ページ（フィルタ永続化対応）
 */

import { formatDistanceToNow } from "date-fns";
/* eslint-disable max-lines-per-function */
import { ja } from "date-fns/locale";
import { ArrowLeft, Plus, Search, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { WITHDRAWAL_TYPE_LABELS, type WithdrawalResponse } from "../api";
import { WithdrawalCancelDialog } from "../components/WithdrawalCancelDialog";
import { useWithdrawals } from "../hooks";
import { useWithdrawalsPageState } from "../hooks/useWithdrawalsPageState";

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
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";

const PAGE_SIZE = 20;

export function WithdrawalsListPage() {
  const navigate = useNavigate();

  // フィルタ・ページ状態（sessionStorageで永続化）
  const { page, filterType, setPage, setFilterType } = useWithdrawalsPageState();

  // 取消ダイアログの状態
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCancelClick = (withdrawal: WithdrawalResponse) => {
    setSelectedWithdrawal(withdrawal);
    setCancelDialogOpen(true);
  };

  const { useList } = useWithdrawals();
  const { data, isLoading, isError, error } = useList({
    skip: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
    withdrawal_type: filterType === "all" ? undefined : filterType,
  });

  const withdrawals = data?.withdrawals ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const filteredWithdrawals = useMemo(() => {
    if (!searchQuery.trim()) return withdrawals;
    const query = searchQuery.toLowerCase();
    return withdrawals.filter((w) => {
      return [
        w.lot_number,
        w.product_name,
        w.product_code,
        w.customer_name,
        w.customer_code,
        w.delivery_place_name,
        w.delivery_place_code,
        w.reference_number,
        w.ship_date,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [searchQuery, withdrawals]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setPage(1);
    }
  }, [searchQuery, setPage]);

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
        <div className="flex gap-2">
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            出庫登録
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select value={filterType} onValueChange={setFilterType}>
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
            <div className="flex flex-1 items-center gap-2 sm:max-w-sm">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="ロット・製品・得意先・納入先・参照番号で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardDescription>
            {searchQuery.trim()
              ? `検索結果 ${filteredWithdrawals.length} 件`
              : `${total} 件中 ${(page - 1) * PAGE_SIZE + 1} - ${Math.min(
                  page * PAGE_SIZE,
                  total,
                )} 件を表示`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              <span className="ml-2 text-gray-500">読み込み中...</span>
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {searchQuery.trim()
                ? "検索条件に一致する出庫履歴がありません"
                : "出庫履歴がありません"}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>状態</TableHead>
                    <TableHead>出庫日時</TableHead>
                    <TableHead>出庫タイプ</TableHead>
                    <TableHead>ロット</TableHead>
                    <TableHead>製品</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead>得意先</TableHead>
                    <TableHead>納入場所</TableHead>
                    <TableHead>出荷日</TableHead>
                    <TableHead>参照番号</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWithdrawals.map((w) => (
                    <TableRow
                      key={w.withdrawal_id}
                      className={w.is_cancelled ? "bg-slate-50 opacity-60" : ""}
                    >
                      <TableCell>
                        {w.is_cancelled ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                              取消済
                            </span>
                            {w.cancel_reason_label && (
                              <span className="mt-1 text-xs text-gray-500">
                                {w.cancel_reason_label}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                            有効
                          </span>
                        )}
                      </TableCell>
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
                      <TableCell className="text-right font-medium">
                        <span className={w.is_cancelled ? "line-through" : ""}>{w.quantity}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{w.customer_name}</div>
                        <div className="text-xs text-gray-500">{w.customer_code}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{w.delivery_place_name || "納入先未設定"}</div>
                        {w.delivery_place_code && (
                          <div className="text-xs text-gray-500">{w.delivery_place_code}</div>
                        )}
                      </TableCell>
                      <TableCell>{w.ship_date}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {w.reference_number || "-"}
                      </TableCell>
                      <TableCell>
                        {!w.is_cancelled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelClick(w)}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            取消
                          </Button>
                        )}
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

      {/* 取消ダイアログ */}
      <WithdrawalCancelDialog
        withdrawal={selectedWithdrawal}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
      />
    </div>
  );
}
