import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useOrderLineAllocation } from "../hooks/useOrderLineAllocation";
import { useOrderLock } from "../hooks/useOrderLock";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LotAllocationPanel } from "@/features/allocations/components/lots/LotAllocationPanel";
import { useAuth } from "@/features/auth/AuthContext";
import * as ordersApi from "@/features/orders/api";
import { OrderLockBanner } from "@/features/orders/components/OrderLockBanner";
import { OrderStatusBadge } from "@/shared/components/data/StatusBadge";
import type { OrderLine, OrderWithLinesResponse } from "@/shared/types/aliases";
import { formatDate } from "@/shared/utils/date";
import { formatQuantity } from "@/shared/utils/formatQuantity";
import { formatOrderCode } from "@/shared/utils/order";

// --- Sub-components ---

function OrderDetailHeader({
  order,
  customerName,
}: {
  order: OrderWithLinesResponse;
  customerName: string;
}) {
  return (
    <div className="space-y-4">
      <Link
        to="/orders"
        className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        受注一覧に戻る
      </Link>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {formatOrderCode(order)}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <span>{customerName}</span>
            <span>•</span>
            <span>{formatDate(order.order_date)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function -- Table component with multiple columns
function OrderLinesTable({
  order,
  onSelectLine,
}: {
  order: OrderWithLinesResponse;
  onSelectLine: (line: OrderLine) => void;
}) {
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold text-slate-900">受注明細</h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>行No</TableHead>
            <TableHead>製品</TableHead>
            <TableHead>納入先</TableHead>
            <TableHead>得意先受注No</TableHead>
            <TableHead>SAP受注No</TableHead>
            <TableHead>数量</TableHead>
            <TableHead>納期</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead className="text-right">引当済</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.lines?.map((line, index) => (
            <TableRow key={line.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <div className="font-medium">{line.product_name}</div>
                <div className="text-xs text-slate-500">{line.product_code}</div>
              </TableCell>
              <TableCell>{line.delivery_place_name}</TableCell>
              <TableCell>
                {line.customer_order_no ? (
                  <div>
                    <span className="font-medium">{line.customer_order_no}</span>
                    {line.customer_order_line_no && (
                      <span className="text-xs text-slate-500">-{line.customer_order_line_no}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </TableCell>
              <TableCell>
                {line.sap_order_no ? (
                  <div>
                    <span className="font-medium">{line.sap_order_no}</span>
                    {line.sap_order_item_no && (
                      <span className="text-xs text-slate-500">/{line.sap_order_item_no}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </TableCell>
              <TableCell>
                {formatQuantity(Number(line.order_quantity), line.unit)} {line.unit}
              </TableCell>
              <TableCell>{formatDate(line.delivery_date)}</TableCell>
              <TableCell>
                <OrderStatusBadge status={line.status} />
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatQuantity(Number(line.allocated_quantity ?? 0), line.unit)}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => onSelectLine(line)}>
                  引当操作
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {(!order.lines || order.lines.length === 0) && (
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center text-slate-500">
                明細がありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// --- Main Component ---

// 受注詳細ページのUIを一箇所にまとめるため分割しない
export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const id = Number(orderId);

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["order", id],
    queryFn: () => ordersApi.getOrder(id),
    enabled: !isNaN(id),
  });

  const { user } = useAuth();

  // 編集ロックの統合
  // ページが表示されている間（かつデータ取得後）ロックを取得
  useOrderLock(id, !!order && !isLoading && !isError);

  const [selectedLine, setSelectedLine] = useState<OrderLine | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError || !order) {
    return <div className="p-8 text-center text-red-500">受注データの取得に失敗しました。</div>;
  }

  const customerName = order.lines?.[0]?.customer_name || `ID: ${order.customer_id}`;

  return (
    <div className="space-y-6">
      {order && user && <OrderLockBanner order={order} currentUserId={user.id} />}

      <OrderDetailHeader order={order} customerName={customerName} />

      <OrderLinesTable order={order} onSelectLine={setSelectedLine} />

      {/* Allocation Dialog */}
      <AllocationDialog
        open={!!selectedLine}
        onOpenChange={(open) => !open && setSelectedLine(null)}
        line={selectedLine}
        order={order}
        onSuccess={() => {
          setSelectedLine(null);
          refetch();
        }}
      />
    </div>
  );
}

function AllocationDialog({
  open,
  onOpenChange,
  line,
  order,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line: OrderLine | null;
  order: OrderWithLinesResponse;
  onSuccess: () => void;
}) {
  const {
    candidateLots,
    lotAllocations,
    hardAllocated,
    softAllocated,
    softAllocatedDb,
    isLoadingCandidates,
    isSaving,
    changeAllocation,
    clearAllocations,
    autoAllocate,
    saveAllocations,
    saveAndConfirmAllocations,
    confirmAllocations,
  } = useOrderLineAllocation({
    orderLine: line,
    onSuccess: () => {
      onSuccess();
    },
  });

  if (!line) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0">
        <DialogHeader className="px-6 py-4">
          <DialogTitle>ロット引当</DialogTitle>
          <DialogDescription className="sr-only">
            受注明細に対するロット引当を行います。
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-0">
          <LotAllocationPanel
            order={order}
            orderLine={line}
            candidateLots={candidateLots}
            lotAllocations={lotAllocations}
            onLotAllocationChange={changeAllocation}
            onAutoAllocate={autoAllocate}
            onClearAllocations={clearAllocations}
            onSaveAllocations={saveAllocations}
            onSaveAndConfirm={saveAndConfirmAllocations}
            onConfirmHard={confirmAllocations}
            isLoading={isLoadingCandidates}
            isSaving={isSaving}
            canSave={Object.keys(lotAllocations).length > 0}
            isActive={true}
            hardAllocated={hardAllocated}
            softAllocated={softAllocated}
            softAllocatedDb={softAllocatedDb}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
