/**
 * WithdrawalHistoryTab
 *
 * 出庫履歴タブのコンテンツ（StockHistoryPageから分離）
 */
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { RotateCcw, Search, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import {
  WITHDRAWAL_TYPE_LABELS,
  type WithdrawalResponse,
  type WithdrawalType,
} from "@/features/withdrawals/api";
import { WithdrawalCancelDialog } from "@/features/withdrawals/components/WithdrawalCancelDialog";
import { useWithdrawals } from "@/features/withdrawals/hooks";

const PAGE_SIZE = 20;

// eslint-disable-next-line max-lines-per-function
export function WithdrawalHistoryTab() {
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [filterType, setFilterType] = useState<"all" | WithdrawalType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalResponse | null>(null);

  const { useList } = useWithdrawals();
  const { data, isLoading, isError, error } = useList({
    skip: (withdrawalPage - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
    withdrawal_type: filterType === "all" ? undefined : filterType,
    search: searchQuery || undefined,
  });

  const withdrawals = useMemo(() => data?.withdrawals ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    if (searchQuery.trim()) {
      setWithdrawalPage(1);
    }
  }, [searchQuery]);

  const handleResetFilters = () => {
    setFilterType("all");
    setSearchQuery("");
    setWithdrawalPage(1);
  };

  const handleCancelClick = (withdrawal: WithdrawalResponse) => {
    setSelectedWithdrawal(withdrawal);
    setCancelDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select
                value={filterType}
                onValueChange={(v) => setFilterType(v as "all" | WithdrawalType)}
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
            <div className="flex flex-1 items-center gap-2 sm:max-w-sm">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="ロット・商品・得意先・納入先・参照番号で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="text-slate-600 hover:text-slate-900"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              リセット
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardDescription>
            {searchQuery.trim()
              ? `検索結果 ${withdrawals.length} 件`
              : `${total} 件中 ${(withdrawalPage - 1) * PAGE_SIZE + 1} - ${Math.min(
                  withdrawalPage * PAGE_SIZE,
                  total,
                )} 件を表示`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WithdrawalTableContent
            withdrawals={withdrawals}
            isLoading={isLoading}
            isError={isError}
            error={error}
            searchQuery={searchQuery}
            onCancelClick={handleCancelClick}
          />
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                ページ {withdrawalPage} / {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWithdrawalPage((p) => Math.max(1, p - 1))}
                  disabled={withdrawalPage === 1}
                >
                  前へ
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWithdrawalPage((p) => Math.min(totalPages, p + 1))}
                  disabled={withdrawalPage === totalPages}
                >
                  次へ
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <WithdrawalCancelDialog
        withdrawal={selectedWithdrawal}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
      />
    </div>
  );
}

interface WithdrawalTableContentProps {
  withdrawals: WithdrawalResponse[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  searchQuery: string;
  onCancelClick: (withdrawal: WithdrawalResponse) => void;
}

function WithdrawalTableContent({
  withdrawals,
  isLoading,
  isError,
  error,
  searchQuery,
  onCancelClick,
}: WithdrawalTableContentProps) {
  if (isError) {
    return (
      <div className="py-8 text-center text-red-600">
        データの読み込みに失敗しました: {error?.message ?? "不明なエラー"}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        <span className="ml-2 text-gray-500">読み込み中...</span>
      </div>
    );
  }

  if (withdrawals.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        {searchQuery.trim() ? "検索条件に一致する出庫履歴がありません" : "出庫履歴がありません"}
      </div>
    );
  }

  return (
    <UITable>
      <TableHeader>
        <TableRow>
          <TableHead>状態</TableHead>
          <TableHead>出庫日時</TableHead>
          <TableHead>出庫タイプ</TableHead>
          <TableHead>ロット</TableHead>
          <TableHead>商品</TableHead>
          <TableHead className="text-right">数量</TableHead>
          <TableHead>得意先</TableHead>
          <TableHead>納入場所</TableHead>
          <TableHead>出荷日</TableHead>
          <TableHead>参照番号</TableHead>
          <TableHead>操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {withdrawals.map((w) => (
          <WithdrawalRow key={w.withdrawal_id} w={w} onCancelClick={onCancelClick} />
        ))}
      </TableBody>
    </UITable>
  );
}

interface WithdrawalRowProps {
  w: WithdrawalResponse;
  onCancelClick: (withdrawal: WithdrawalResponse) => void;
}

function WithdrawalRow({ w, onCancelClick }: WithdrawalRowProps) {
  return (
    <TableRow className={w.is_cancelled ? "bg-slate-50 opacity-60" : ""}>
      <TableCell>
        {w.is_cancelled ? (
          <div className="flex flex-col">
            <span className="inline-flex items-center rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
              取消済
            </span>
            {w.cancel_reason_label && (
              <span className="mt-1 text-xs text-gray-500">{w.cancel_reason_label}</span>
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
      <TableCell className="text-sm text-gray-600">{w.reference_number || "-"}</TableCell>
      <TableCell>
        {!w.is_cancelled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCancelClick(w)}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <XCircle className="mr-1 h-4 w-4" />
            取消
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
