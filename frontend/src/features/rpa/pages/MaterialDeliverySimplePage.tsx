import { format } from "date-fns";
import { CalendarDays, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  useCloudFlowConfigOptional,
  useExecuteMaterialDeliveryStep1,
  useExecuteMaterialDeliveryStep2,
  useMaterialDeliverySimpleHistory,
  useUpdateCloudFlowConfig,
} from "../hooks";

import { Button, Input, Label } from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageContainer, PageHeader } from "@/shared/components/layout";

const STEP1_CONFIG_KEY = "MATERIAL_DELIVERY_STEP1_URL";
const STEP2_CONFIG_KEY = "MATERIAL_DELIVERY_STEP2_URL";

export function MaterialDeliverySimplePage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [step1Url, setStep1Url] = useState("");
  const [step2Url, setStep2Url] = useState("");

  const { data: step1Config } = useCloudFlowConfigOptional(STEP1_CONFIG_KEY);
  const { data: step2Config } = useCloudFlowConfigOptional(STEP2_CONFIG_KEY);
  const updateConfigMutation = useUpdateCloudFlowConfig();

  const step1Mutation = useExecuteMaterialDeliveryStep1();
  const step2Mutation = useExecuteMaterialDeliveryStep2();
  const historyQuery = useMaterialDeliverySimpleHistory(50, 0);

  useEffect(() => {
    if (step1Config) setStep1Url(step1Config.config_value);
  }, [step1Config]);

  useEffect(() => {
    if (step2Config) setStep2Url(step2Config.config_value);
  }, [step2Config]);

  const canExecuteStep1 = useMemo(
    () => Boolean(startDate && endDate && !step1Mutation.isPending),
    [startDate, endDate, step1Mutation.isPending],
  );

  const handleSaveConfig = async () => {
    try {
      await Promise.all([
        updateConfigMutation.mutateAsync({
          key: STEP1_CONFIG_KEY,
          data: { config_value: step1Url, description: "Material Delivery Step1 URL" },
        }),
        updateConfigMutation.mutateAsync({
          key: STEP2_CONFIG_KEY,
          data: { config_value: step2Url, description: "Material Delivery Step2 URL" },
        }),
      ]);
      toast.success("URL設定を保存しました");
    } catch {
      toast.error("URL設定の保存に失敗しました");
    }
  };

  const handleExecuteStep1 = async () => {
    if (!startDate || !endDate) {
      toast.error("開始日と終了日を入力してください");
      return;
    }
    try {
      await step1Mutation.mutateAsync({ start_date: startDate, end_date: endDate });
      toast.success("Step1を実行しました");
      historyQuery.refetch();
    } catch (error) {
      toast.error("Step1の実行に失敗しました");
      console.error(error);
    }
  };

  const handleExecuteStep2 = async (rowStartDate: string, rowEndDate: string) => {
    try {
      await step2Mutation.mutateAsync({ start_date: rowStartDate, end_date: rowEndDate });
      toast.success("Step2を実行しました");
    } catch (error) {
      toast.error("Step2の実行に失敗しました");
      console.error(error);
    }
  };

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="素材納品書発行（簡易）"
        subtitle="Step1/Step2のみのシンプル実行フロー"
      />

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Settings className="h-4 w-4" />
          URL設定
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="step1-url">Step1 URL</Label>
            <Input
              id="step1-url"
              value={step1Url}
              onChange={(event) => setStep1Url(event.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="step2-url">Step2 URL</Label>
            <Input
              id="step2-url"
              value={step2Url}
              onChange={(event) => setStep2Url(event.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
        <div>
          <Button onClick={handleSaveConfig} disabled={updateConfigMutation.isPending}>
            {updateConfigMutation.isPending ? "保存中..." : "URLを保存"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
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
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">終了日</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleExecuteStep1} disabled={!canExecuteStep1}>
              {step1Mutation.isPending ? "実行中..." : "Step1 実行"}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="text-sm font-semibold">Step1 履歴</div>
        {historyQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : historyQuery.data && historyQuery.data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>実行日時</TableHead>
                <TableHead>期間</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>実行者</TableHead>
                <TableHead>Step2</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyQuery.data.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    {format(new Date(job.requested_at), "yyyy/MM/dd HH:mm")}
                  </TableCell>
                  <TableCell>
                    {job.start_date} 〜 {job.end_date}
                  </TableCell>
                  <TableCell>{job.status}</TableCell>
                  <TableCell>{job.requested_by ?? "system"}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExecuteStep2(job.start_date, job.end_date)}
                      disabled={step2Mutation.isPending}
                    >
                      Step2 実行
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">履歴がありません</p>
        )}
      </div>
    </PageContainer>
  );
}
