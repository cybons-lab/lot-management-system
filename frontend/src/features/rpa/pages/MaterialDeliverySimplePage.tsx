import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Settings } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { getCloudFlowConfigOptional } from "../api";
import { CloudFlowHelp } from "../components/CloudFlowHelp";
import { ConfigDialog } from "../components/ConfigDialog";
import { HistoryTable } from "../components/HistoryTable";
import { useExecuteMaterialDeliveryStep1, useMaterialDeliverySimpleHistory } from "../hooks";

import { Button, Input, Label } from "@/components/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/display/alert-dialog";
import { PageContainer, PageHeader } from "@/shared/components/layout";

const STEP1_CONFIG_KEY = "MATERIAL_DELIVERY_STEP1_URL";

interface Step1ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startDate: string;
  endDate: string;
  onConfirm: () => void;
}

function Step1ConfirmDialog({
  open,
  onOpenChange,
  startDate,
  endDate,
  onConfirm,
}: Step1ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Step1 実行確認</AlertDialogTitle>
          <AlertDialogDescription>
            Step1を実行しますか？
            <br />
            期間: {startDate} 〜 {endDate}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>実行する</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface Step1ExecutePanelProps {
  startDate: string;
  endDate: string;
  canExecute: boolean;
  isPending: boolean;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onExecuteClick: () => void;
}

function Step1ExecutePanel({
  startDate,
  endDate,
  canExecute,
  isPending,
  onStartDateChange,
  onEndDateChange,
  onExecuteClick,
}: Step1ExecutePanelProps) {
  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CalendarDays className="h-4 w-4" />
        Step1 実行
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="start-date">開始日</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-date">終了日</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(event) => onEndDateChange(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={onExecuteClick} disabled={!canExecute}>
            {isPending ? "実行中..." : "Step1 実行"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MaterialDeliverySimplePage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [configOpen, setConfigOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const queryClient = useQueryClient();
  const step1Mutation = useExecuteMaterialDeliveryStep1();
  const historyQuery = useMaterialDeliverySimpleHistory(50, 0);
  const canExecuteStep1 = useMemo(
    () => Boolean(startDate && endDate && !step1Mutation.isPending),
    [endDate, startDate, step1Mutation.isPending],
  );

  const handleConfirmClick = () => {
    if (!startDate || !endDate) {
      toast.error("開始日と終了日を入力してください");
      return;
    }
    setConfirmOpen(true);
  };

  const handleExecuteStep1 = async () => {
    if (!startDate || !endDate) return;

    try {
      const config = await queryClient.fetchQuery({
        queryKey: ["rpa", "config", STEP1_CONFIG_KEY],
        queryFn: () => getCloudFlowConfigOptional(STEP1_CONFIG_KEY),
        staleTime: 0,
      });
      if (!config) {
        toast.error("URL設定が見つかりません。右上の設定ボタンから設定してください。");
        setConfigOpen(true);
        return;
      }
      await step1Mutation.mutateAsync({ start_date: startDate, end_date: endDate });
      toast.success("Step1を実行しました");
      historyQuery.refetch();
    } catch (error) {
      console.error(error);
      toast.error("Step1の実行に失敗しました。");
    }
  };

  return (
    <PageContainer className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="素材納品書発行（簡易）" subtitle="Step1/Step2のみのシンプル実行フロー" />
        <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
          <Settings className="mr-2 h-4 w-4" />
          URL設定
        </Button>
      </div>

      <ConfigDialog open={configOpen} onOpenChange={setConfigOpen} />

      <Step1ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        startDate={startDate}
        endDate={endDate}
        onConfirm={handleExecuteStep1}
      />

      <Step1ExecutePanel
        startDate={startDate}
        endDate={endDate}
        canExecute={canExecuteStep1}
        isPending={step1Mutation.isPending}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onExecuteClick={handleConfirmClick}
      />

      <HistoryTable historyQuery={historyQuery} onConfigError={() => setConfigOpen(true)} />

      <div className="mt-8">
        <CloudFlowHelp />
      </div>
    </PageContainer>
  );
}
