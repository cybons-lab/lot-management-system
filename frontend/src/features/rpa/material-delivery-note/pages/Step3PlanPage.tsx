/**
 * Step3PlanPage
 * 素材納品書発行 Step3 - 発行リスト作成（グルーピング/分割）
 */

import { ArrowRight, ChevronLeft, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

import type { RpaRunSummary } from "../api";
import { useStep3PlanData } from "../hooks/useStep3PlanData";
import {
  computeGroupedRuns,
  type GroupingMethod,
  type GroupingResult,
  type PlannedRun,
} from "../utils/grouping";

import { Button, Input, Checkbox, Label } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

/** グルーピング方法のオプション */
const GROUPING_OPTIONS: { value: GroupingMethod; label: string; disabled?: boolean }[] = [
  { value: "supplier", label: "仕入先ごと" },
  { value: "period", label: "対象期間ごと" },
  { value: "user", label: "実行ユーザーごと" },
  { value: "custom", label: "カスタム（ルール指定）", disabled: true },
];

function RunPreviewItem({ run }: { run: PlannedRun }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="font-mono">
          Run {run.id}
        </Badge>
        <span className="font-medium text-gray-900">{run.groupKey}</span>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span>{run.items.length} 件</span>
        <span>推定: {run.estimatedMinutes} 分</span>
      </div>
    </div>
  );
}

function InputSummaryCard({
  totalIssueCount,
  confirmedRuns,
}: {
  totalIssueCount: number;
  confirmedRuns: RpaRunSummary[];
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">入力:</div>
          <div className="text-lg font-medium">
            Step2で選択した <span className="text-blue-600">{totalIssueCount} 件</span>
          </div>
          {confirmedRuns.length > 0 && (
            <div className="text-sm text-gray-500">（{confirmedRuns.length} Run から）</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function GroupingMethodRadio({
  groupingMethod,
  setGroupingMethod,
}: {
  groupingMethod: GroupingMethod;
  setGroupingMethod: (m: GroupingMethod) => void;
}) {
  return (
    <div className="space-y-2">
      {GROUPING_OPTIONS.map((option) => (
        <div key={option.value} className="flex items-center space-x-2">
          <input
            type="radio"
            id={`grouping-${option.value}`}
            name="grouping-method"
            value={option.value}
            checked={groupingMethod === option.value}
            onChange={(e) => setGroupingMethod(e.target.value as GroupingMethod)}
            disabled={option.disabled}
            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <Label
            htmlFor={`grouping-${option.value}`}
            className={option.disabled ? "text-gray-400" : "cursor-pointer"}
          >
            {option.label}
            {option.disabled && <span className="ml-2 text-xs text-gray-400">（後日実装）</span>}
          </Label>
        </div>
      ))}
    </div>
  );
}

function AdditionalOptions({
  maxItemsEnabled,
  setMaxItemsEnabled,
  maxItems,
  setMaxItems,
}: {
  maxItemsEnabled: boolean;
  setMaxItemsEnabled: (v: boolean) => void;
  maxItems: number;
  setMaxItems: (v: number) => void;
}) {
  return (
    <div className="border-t pt-4">
      <div className="mb-3 text-sm font-medium text-gray-700">追加オプション</div>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Checkbox
            id="max-items-enabled"
            checked={maxItemsEnabled}
            onCheckedChange={(checked) => setMaxItemsEnabled(checked === true)}
          />
          <Label htmlFor="max-items-enabled">1 Run あたり最大件数:</Label>
          <Input
            type="number"
            className="w-20"
            value={maxItems}
            onChange={(e) => setMaxItems(parseInt(e.target.value, 10) || 20)}
            min={1}
            max={100}
            disabled={!maxItemsEnabled}
          />
          <span className="text-sm text-gray-500">（目安: 20件 = 約18分）</span>
        </div>
        <div className="flex items-center gap-4">
          <Checkbox id="parallel-enabled" checked={false} disabled />
          <Label htmlFor="parallel-enabled" className="text-gray-400">
            並列実行:
          </Label>
          <Input type="number" className="w-20" value={1} min={1} max={5} disabled />
          <span className="text-xs text-gray-400">（将来拡張枠）</span>
        </div>
      </div>
    </div>
  );
}

interface GroupingOptionsProps {
  groupingMethod: GroupingMethod;
  setGroupingMethod: (m: GroupingMethod) => void;
  maxItemsEnabled: boolean;
  setMaxItemsEnabled: (v: boolean) => void;
  maxItems: number;
  setMaxItems: (v: number) => void;
}

function GroupingOptionsCard(props: GroupingOptionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">発行単位（グルーピング）を選択</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <GroupingMethodRadio
          groupingMethod={props.groupingMethod}
          setGroupingMethod={props.setGroupingMethod}
        />
        <AdditionalOptions
          maxItemsEnabled={props.maxItemsEnabled}
          setMaxItemsEnabled={props.setMaxItemsEnabled}
          maxItems={props.maxItems}
          setMaxItems={props.setMaxItems}
        />
      </CardContent>
    </Card>
  );
}

function PreviewSummary({ groupingResult }: { groupingResult: GroupingResult }) {
  if (groupingResult.runs.length === 0) return null;
  return (
    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-blue-600">合計見込み時間</div>
          <div className="text-2xl font-bold text-blue-900">
            {groupingResult.totalEstimatedMinutes} 分
          </div>
        </div>
        <div className="text-right text-sm text-blue-600">
          <div>{groupingResult.runs.length} Run に分割</div>
          <div>{groupingResult.totalItems} 件の発行対象</div>
        </div>
      </div>
      <p className="mt-2 text-xs text-blue-500">
        ※ 1件あたり約0.9分で計算（100件 = 90分の実績に基づく）
      </p>
    </div>
  );
}

function PreviewCard({ groupingResult }: { groupingResult: GroupingResult }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">プレビュー</CardTitle>
          <Badge variant="secondary">作成されるRun（予定）: {groupingResult.runs.length} 本</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {groupingResult.runs.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            発行対象のアイテムがありません。Step2で発行チェックを付けてください。
          </div>
        ) : (
          <div className="space-y-2">
            {groupingResult.runs.map((run) => (
              <RunPreviewItem key={run.id} run={run} />
            ))}
          </div>
        )}
        <PreviewSummary groupingResult={groupingResult} />
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );
}

function ErrorState({ error, refetch }: { error: Error; refetch: () => void }) {
  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-red-600">データの取得に失敗しました</p>
        <p className="text-sm text-gray-500">{error.message}</p>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          再試行
        </Button>
      </div>
    </PageContainer>
  );
}

export function Step3PlanPage() {
  const navigate = useNavigate();
  const { allIssueItems, totalIssueCount, isLoading, error, refetch, confirmedRuns } =
    useStep3PlanData();

  const [groupingMethod, setGroupingMethod] = useState<GroupingMethod>("supplier");
  const [maxItemsEnabled, setMaxItemsEnabled] = useState(false);
  const [maxItems, setMaxItems] = useState(20);

  const groupingResult = useMemo(() => {
    if (allIssueItems.length === 0) return { runs: [], totalItems: 0, totalEstimatedMinutes: 0 };
    return computeGroupedRuns(allIssueItems, groupingMethod, maxItemsEnabled ? maxItems : null);
  }, [allIssueItems, groupingMethod, maxItemsEnabled, maxItems]);

  const handleProceed = () => {
    if (groupingResult.runs.length === 0) return alert("発行対象のアイテムがありません。");
    const msg = `${groupingResult.runs.length} 個のRunを作成して次へ進みますか？\n総件数: ${groupingResult.totalItems} 件\n推定時間: ${groupingResult.totalEstimatedMinutes} 分`;
    if (confirm(msg)) navigate(ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP3);
  };

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} refetch={refetch} />;

  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between">
        <Link
          to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP2}
          className="flex items-center text-sm text-gray-500 hover:text-gray-900"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Step2一覧へ戻る
        </Link>
        <Link to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.ROOT}>
          <Button variant="outline" size="sm">
            メニューへ戻る
          </Button>
        </Link>
      </div>
      <PageHeader
        title="Step3: 発行リスト作成"
        subtitle="Step2で選択した発行対象をグルーピングし、実行単位を決定します"
      />
      <div className="space-y-6">
        <InputSummaryCard totalIssueCount={totalIssueCount} confirmedRuns={confirmedRuns} />
        <GroupingOptionsCard
          groupingMethod={groupingMethod}
          setGroupingMethod={setGroupingMethod}
          maxItemsEnabled={maxItemsEnabled}
          setMaxItemsEnabled={setMaxItemsEnabled}
          maxItems={maxItems}
          setMaxItems={setMaxItems}
        />
        <PreviewCard groupingResult={groupingResult} />
        <div className="flex justify-end">
          <Button onClick={handleProceed} disabled={groupingResult.runs.length === 0}>
            リストを作成して次へ
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
