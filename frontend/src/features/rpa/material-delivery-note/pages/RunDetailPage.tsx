/* eslint-disable complexity */
/* eslint-disable max-lines-per-function */
/**
 * RunDetailPage - Step2専用ページ
 *
 * Step2のデータ確認・編集ページ。
 * - 常にStep2専用列を表示（納入量、発行チェック）
 * - step1_doneのときのみ編集可能
 * - それ以外は読取専用（履歴として閲覧可能）
 */
import { format } from "date-fns";
import { Check, CheckCircle2, ChevronLeft, X, Filter, AlertCircle, ArrowRight } from "lucide-react";
import { useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";

import { useRun, useUpdateItem, useBatchUpdateItems, useCompleteAllItems } from "../hooks";

import { Button, Input, Checkbox } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/constants/routes";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

// ステータス表示定義
const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  step1_done: { label: "Step1完了", color: "bg-gray-500" },
  step2_confirmed: { label: "Step2確認済", color: "bg-blue-500" },
  step3_running: { label: "PAD実行中", color: "bg-yellow-500" },
  step3_done: { label: "外部手順待ち", color: "bg-orange-500" },
  step4_checking: { label: "突合中", color: "bg-purple-500" },
  step4_ng_retry: { label: "NG再実行中", color: "bg-red-500" },
  step4_review: { label: "レビュー中", color: "bg-indigo-500" },
  done: { label: "完了", color: "bg-green-600" },
  cancelled: { label: "キャンセル", color: "bg-gray-400" },
};

export function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const id = parseInt(runId || "", 10);
  const navigate = useNavigate();

  const [layerFilter, setLayerFilter] = useState<string>("all");

  const { data: run, isLoading, error } = useRun(id, { refetchInterval: 5000 });
  const updateItemMutation = useUpdateItem(id);
  const batchUpdateMutation = useBatchUpdateItems(id);
  const completeRunMutation = useCompleteAllItems(id);

  // Filter Logic
  const isEditable = useMemo(() => {
    if (!run) return false;
    // Step3実行中(=step3_running)以降は閲覧のみ
    return run.status === "step1_done" || run.status === "step2_confirmed";
  }, [run]);
  const filteredItems = useMemo(() => {
    if (!run?.items) return [];
    let items = run.items;
    if (layerFilter !== "all") {
      items = items.filter((item) => item.layer_code === layerFilter);
    }
    return [...items].sort((a, b) => a.row_no - b.row_no);
  }, [run?.items, layerFilter]);

  // Unique Layer Options
  const layerOptions = useMemo(() => {
    if (!run?.items) return [];
    const uniqueCodes = Array.from(
      new Set(run.items.map((item) => item.layer_code).filter(Boolean)),
    );
    return uniqueCodes.sort().map((code) => {
      const item = run.items.find((i) => i.layer_code === code);
      const makerName = item?.maker_name;
      const label = makerName ? `${makerName} (${code})` : (code as string);
      return { value: code as string, label };
    });
  }, [run?.items]);

  if (isLoading) return <div>Loading...</div>;
  if (error || !run) return <div>Error detected.</div>;

  const statusDisplay = STATUS_DISPLAY[run.status] || { label: run.status, color: "bg-gray-400" };
  const issueCount = run.issue_count ?? run.items.filter((item) => item.issue_flag).length;
  const totalCount = run.item_count ?? run.items.length;

  // Step2編集可能: step1_doneのみ

  // ハンドラー
  const handleToggleIssue = (itemId: number, current: boolean) => {
    if (!isEditable) return;
    // 編集時は確認済み(complete_flag=true)とする
    updateItemMutation.mutate({ itemId, data: { issue_flag: !current, complete_flag: true } });
  };

  const handleUpdateQuantity = (itemId: number, value: string, current: number | null) => {
    if (!isEditable) return;
    const quantity = parseInt(value, 10);
    if (isNaN(quantity) || quantity < 0 || quantity === current) return;
    // 編集時は確認済み(complete_flag=true)とする
    updateItemMutation.mutate({
      itemId,
      data: { delivery_quantity: quantity, complete_flag: true },
    });
  };

  const handleBatchIssueToggle = () => {
    if (!isEditable) return;
    const allSelected = filteredItems.every((item) => item.issue_flag);
    const targetIds = filteredItems.map((item) => item.id);
    if (targetIds.length === 0) return;
    // 一括操作時も確認済み(complete_flag=true)とする
    batchUpdateMutation.mutate({
      itemIds: targetIds,
      data: { issue_flag: !allSelected, complete_flag: true },
    });
  };

  const isAllIssuesChecked =
    filteredItems.length > 0 && filteredItems.every((item) => item.issue_flag);

  return (
    <PageContainer>
      <div className="mb-4">
        <Link
          to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.RUNS}
          className="flex items-center text-sm text-gray-500 hover:text-gray-900"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          履歴一覧へ戻る
        </Link>
      </div>

      <PageHeader
        title={`Run #${run.id} - Step2 データ確認`}
        subtitle={`取込日時: ${format(new Date(run.created_at), "yyyy/MM/dd HH:mm")}`}
      />

      {/* ステータスバナー */}
      <div className="mb-6 flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-sm text-gray-500">ステータス</div>
            <div className="text-lg font-medium">
              <Badge className={statusDisplay.color}>{statusDisplay.label}</Badge>
            </div>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div>
            <div className="text-sm text-gray-500">発行対象数</div>
            <div className="text-lg font-medium">
              {issueCount} / {totalCount}
              <span className="ml-1 text-sm text-gray-500">件 発行対象</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Step2完了＆次へボタン */}
          {isEditable && (
            <Button
              variant="default"
              onClick={() => {
                if (
                  confirm(
                    "Step3へ進みますか？\n発行チェックONのデータのみが次で処理対象になります。",
                  )
                ) {
                  completeRunMutation.mutate();
                  navigate(ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP3);
                }
              }}
            >
              Step3へ進む <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {!isEditable && (
            <Button
              variant="outline"
              onClick={() => navigate(ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP3)}
            >
              Step3一覧へ <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 編集モードメッセージ */}
      {isEditable && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <span className="text-sm text-blue-800">
            データ編集モード: 納入量と発行フラグを編集できます
          </span>
        </div>
      )}

      {/* 読取専用メッセージ */}
      {!isEditable && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <Check className="h-5 w-5 text-gray-500" />
          <span className="text-sm text-gray-600">
            Step2は確認済みです。履歴として閲覧しています。
          </span>
        </div>
      )}

      {/* フィルタと操作エリア */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={layerFilter} onValueChange={setLayerFilter}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="メーカー・層別フィルタ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て表示</SelectItem>
              {layerOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 編集時のみ一括操作 */}
          {isEditable && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBatchIssueToggle}
              disabled={filteredItems.length === 0 || batchUpdateMutation.isPending}
              className="ml-2"
            >
              {isAllIssuesChecked ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  発行チェックを外す
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  発行チェック付与
                </>
              )}
            </Button>
          )}

          {layerFilter !== "all" && (
            <div className="ml-2 text-sm text-gray-500">{filteredItems.length} 件表示中</div>
          )}
        </div>
      </div>

      {/* テーブル - Step2専用列 */}
      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">No</TableHead>
              <TableHead>出荷先</TableHead>
              <TableHead>層別</TableHead>
              <TableHead>メーカー名</TableHead>
              <TableHead>材質コード</TableHead>
              <TableHead>納期</TableHead>
              <TableHead className="w-[100px]">納入量</TableHead>
              <TableHead>出荷便</TableHead>
              <TableHead className="text-center">発行</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.row_no}</TableCell>
                <TableCell>{item.destination}</TableCell>
                <TableCell>{item.layer_code}</TableCell>
                <TableCell className="text-sm">{item.maker_name}</TableCell>
                <TableCell>{item.material_code}</TableCell>
                <TableCell>
                  {item.delivery_date ? format(new Date(item.delivery_date), "MM/dd") : ""}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="h-8 w-20 text-right"
                    defaultValue={item.delivery_quantity ?? ""}
                    disabled={!isEditable}
                    onBlur={(e: React.FocusEvent<HTMLInputElement>) =>
                      handleUpdateQuantity(item.id, e.target.value, item.delivery_quantity)
                    }
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                  />
                </TableCell>
                <TableCell>{item.shipping_vehicle}</TableCell>
                <TableCell className="text-center">
                  <Checkbox
                    checked={item.issue_flag}
                    disabled={!isEditable}
                    onCheckedChange={() => handleToggleIssue(item.id, item.issue_flag)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageContainer>
  );
}
