/**
 * ConfirmedLinesPage.tsx - Refactored
 *
 * 引当確定済み明細一覧 - SAP登録専用ページ
 */
import { ArrowLeft, RefreshCw, Send } from "lucide-react";

import { ConfirmedLinesTable } from "../components/ConfirmedLinesTable";
import { useConfirmedLinesPage } from "../hooks/useConfirmedLinesPage";

import { Button } from "@/components/ui";
import { PageHeader } from "@/shared/components/layout/PageHeader";

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
        <p className="mt-2 text-sm text-slate-600">受注管理ページでロット引当を完了してください</p>
        <Button variant="outline" className="mt-6" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          受注管理へ戻る
        </Button>
      </div>
    </div>
  );
}

export function ConfirmedLinesPage() {
  const {
    confirmedLines,
    isLoading,
    selectedIds,
    isRegistering,
    handleToggle,
    handleToggleAll,
    handleRegister,
    handleBack,
    refetch,
  } = useConfirmedLinesPage();

  if (isLoading) {
    return <LoadingState />;
  }

  if (confirmedLines.length === 0) {
    return <EmptyState onBack={handleBack} />;
  }

  const isAllSelected = selectedIds.length === confirmedLines.length;

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PageHeader
            title="引当確定済み明細 - SAP登録"
            subtitle="引当が完了している明細を選択してSAPに登録します"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            更新
          </Button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div className="text-sm text-slate-600">全{confirmedLines.length}件</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToggleAll}>
            {isAllSelected ? "全解除" : "全選択"}
          </Button>
          <Button
            size="sm"
            onClick={handleRegister}
            disabled={selectedIds.length === 0 || isRegistering}
          >
            <Send className="mr-2 h-4 w-4" />
            {isRegistering ? "登録中..." : `SAP一括登録 (${selectedIds.length}件)`}
          </Button>
        </div>
      </div>

      <ConfirmedLinesTable
        lines={confirmedLines}
        selectedIds={selectedIds}
        onToggle={handleToggle}
        onToggleAll={handleToggleAll}
      />

      {/* Bottom Action Bar */}
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
