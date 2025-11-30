/**
 * ConfirmedLinesPage.tsx
 *
 * 引当確定済み明細一覧 - SAP登録専用ページ
 * - 引当が完了した明細のみを表示
 * - チェックボックスで複数選択
 * - SAP一括登録機能
 */

import { ArrowLeft, RefreshCw, Send } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import type { ConfirmedOrderLine } from "@/hooks/useConfirmedOrderLines";
import { useConfirmedOrderLines } from "@/hooks/useConfirmedOrderLines";
import { useSAPBatchRegistration } from "@/hooks/useSAPBatchRegistration";
import { formatDate } from "@/shared/utils/date";

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-400" />
        <p className="mt-2 text-sm text-slate-600">読み込み中...</p>
      </div>
    </div>
  );
}

function EmptyState({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <Send className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">
          引当確定済みの明細がありません
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          受注管理ページでロット引当を完了してください
        </p>
        <Button variant="outline" className="mt-6" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          受注管理へ戻る
        </Button>
      </div>
    </div>
  );
}

interface TableHeaderProps {
  lines: ConfirmedOrderLine[];
  selectedIds: number[];
  onToggleAll: () => void;
}

function TableHeader({ lines, selectedIds, onToggleAll }: TableHeaderProps) {
  return (
    <thead className="bg-slate-50">
      <tr>
        <th className="w-12 px-4 py-3 text-left">
          <input
            type="checkbox"
            checked={lines.length > 0 && selectedIds.length === lines.length}
            onChange={onToggleAll}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-slate-700 uppercase">
          受注番号
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-slate-700 uppercase">
          顧客名
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-slate-700 uppercase">
          製品コード
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-slate-700 uppercase">
          製品名
        </th>
        <th className="px-4 py-3 text-right text-xs font-medium tracking-wide text-slate-700 uppercase">
          数量
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-slate-700 uppercase">
          納期
        </th>
      </tr>
    </thead>
  );
}

interface TableRowProps {
  line: ConfirmedOrderLine;
  isSelected: boolean;
  onToggle: (lineId: number) => void;
}

function TableRow({ line, isSelected, onToggle }: TableRowProps) {
  return (
    <tr className={`transition-colors hover:bg-slate-50 ${isSelected ? "bg-blue-50" : ""}`}>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(line.line_id)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
        />
      </td>
      <td className="px-4 py-3">
        <span className="font-medium text-slate-900">{line.order_number}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-600">{line.customer_name}</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-slate-900">{line.product_code}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-600">{line.product_name}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-medium text-slate-900">
          {line.order_quantity} {line.unit}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-600">{formatDate(line.delivery_date)}</span>
      </td>
    </tr>
  );
}

interface ConfirmedLinesTableProps {
  lines: ConfirmedOrderLine[];
  selectedIds: number[];
  onToggle: (lineId: number) => void;
  onToggleAll: () => void;
}

function ConfirmedLinesTable({
  lines,
  selectedIds,
  onToggle,
  onToggleAll,
}: ConfirmedLinesTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full">
        <TableHeader lines={lines} selectedIds={selectedIds} onToggleAll={onToggleAll} />
        <tbody className="divide-y divide-slate-200">
          {lines.map((line) => (
            <TableRow
              key={line.line_id}
              line={line}
              isSelected={selectedIds.includes(line.line_id)}
              onToggle={onToggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PageHeaderProps {
  onBack: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

function PageHeader({ onBack, onRefresh, isLoading }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">引当確定済み明細 - SAP登録</h1>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          引当が完了している明細を選択してSAPに登録します
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          更新
        </Button>
      </div>
    </div>
  );
}

interface ActionBarProps {
  totalCount: number;
  selectedCount: number;
  isAllSelected: boolean;
  isRegistering: boolean;
  onToggleAll: () => void;
  onRegister: () => void;
}

function ActionBar({
  totalCount,
  selectedCount,
  isAllSelected,
  isRegistering,
  onToggleAll,
  onRegister,
}: ActionBarProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-6 py-3 shadow-sm">
      <div className="text-sm text-slate-600">全{totalCount}件</div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToggleAll}>
          {isAllSelected ? "全解除" : "全選択"}
        </Button>
        <Button size="sm" onClick={onRegister} disabled={selectedCount === 0 || isRegistering}>
          <Send className="mr-2 h-4 w-4" />
          {isRegistering ? "登録中..." : `SAP一括登録 (${selectedCount}件)`}
        </Button>
      </div>
    </div>
  );
}

export function ConfirmedLinesPage() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { data: confirmedLines = [], isLoading, refetch } = useConfirmedOrderLines();
  const { registerToSAP, isRegistering } = useSAPBatchRegistration();

  const handleToggle = (lineId: number) => {
    setSelectedIds((prev) =>
      prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId],
    );
  };

  const handleToggleAll = () => {
    setSelectedIds(
      selectedIds.length === confirmedLines.length ? [] : confirmedLines.map((line) => line.line_id)
    );
  };

  const handleRegister = () => {
    if (selectedIds.length === 0) {
      toast.error("登録する明細を選択してください");
      return;
    }

    registerToSAP(selectedIds, {
      onSuccess: (data) => {
        toast.success(`SAP登録完了: ${data.registered_count}件`);
        setSelectedIds([]);
        refetch();
      },
    });
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (confirmedLines.length === 0) {
    return <EmptyState onBack={() => navigate("/orders")} />;
  }

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader onBack={() => navigate("/orders")} onRefresh={refetch} isLoading={isLoading} />

      <ActionBar
        totalCount={confirmedLines.length}
        selectedCount={selectedIds.length}
        isAllSelected={selectedIds.length === confirmedLines.length}
        isRegistering={isRegistering}
        onToggleAll={handleToggleAll}
        onRegister={handleRegister}
      />

      <ConfirmedLinesTable
        lines={confirmedLines}
        selectedIds={selectedIds}
        onToggle={handleToggle}
        onToggleAll={handleToggleAll}
      />

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div className="text-sm text-slate-600">選択: {selectedIds.length}件</div>
        <Button onClick={handleRegister} disabled={selectedIds.length === 0 || isRegistering}>
          <Send className="mr-2 h-4 w-4" />
          {isRegistering ? "登録中..." : "SAP一括登録"}
        </Button>
      </div>
    </div>
  );
}
