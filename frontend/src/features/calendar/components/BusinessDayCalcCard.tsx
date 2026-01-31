/* eslint-disable max-lines-per-function */
import { useState } from "react";
import { toast } from "sonner";

import { useBusinessDayCalculator } from "../hooks";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { formatDate } from "@/shared/utils/date";

const EMPTY_EDIT = "";

export function BusinessDayCalcCard() {
  const {
    mutateAsync: calculateBusinessDay,
    data: businessDayResult,
    isPending: isCalculating,
  } = useBusinessDayCalculator();

  const [calcStartDate, setCalcStartDate] = useState(EMPTY_EDIT);
  const [calcDays, setCalcDays] = useState(1);
  const [calcDirection, setCalcDirection] = useState<"after" | "before">("after");
  const [calcIncludeStart, setCalcIncludeStart] = useState(false);

  const handleBusinessDayCalc = async () => {
    if (!calcStartDate) {
      toast.error("起算日を入力してください");
      return;
    }
    if (Number.isNaN(calcDays) || calcDays < 0) {
      toast.error("稼働日数は0以上で入力してください");
      return;
    }
    try {
      await calculateBusinessDay({
        start_date: calcStartDate,
        days: calcDays,
        direction: calcDirection,
        include_start: calcIncludeStart,
      });
    } catch {
      toast.error("営業日の計算に失敗しました");
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">営業日計算</CardTitle>
        <CardDescription>祝日・会社カレンダーを反映した稼働日計算を行います。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="calc-start-date" className="text-sm font-medium">
              起算日
            </label>
            <Input
              id="calc-start-date"
              type="date"
              value={calcStartDate}
              onChange={(e) => setCalcStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="calc-days" className="text-sm font-medium">
              稼働日数
            </label>
            <Input
              id="calc-days"
              type="number"
              min={0}
              value={calcDays}
              onChange={(e) => setCalcDays(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="calc-direction" className="text-sm font-medium">
              方向
            </label>
            <Select
              value={calcDirection}
              onValueChange={(value) => setCalcDirection(value as "after" | "before")}
            >
              <SelectTrigger id="calc-direction" aria-label="方向">
                <SelectValue placeholder="方向" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="after">○稼働日後</SelectItem>
                <SelectItem value="before">○稼働日前</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 pb-2">
            <Checkbox
              checked={calcIncludeStart}
              onCheckedChange={(value) => setCalcIncludeStart(Boolean(value))}
              id="include-start"
            />
            <label htmlFor="include-start" className="text-sm">
              当日を含める（○稼働日後・当日含む）
            </label>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleBusinessDayCalc} disabled={isCalculating}>
            計算
          </Button>
          {businessDayResult && (
            <div className="rounded border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-medium">結果:</span> {formatDate(businessDayResult.result_date)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
