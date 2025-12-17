/* eslint-disable max-lines-per-function, complexity */
import { format } from "date-fns";
import { Check, CheckCircle2, ChevronLeft, Play, X, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useCompleteAllItems, useRun, useUpdateItem, useBatchUpdateItems } from "../hooks";

import { Button } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/form/checkbox";
import { Input } from "@/components/ui/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
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

export function RunDetailPage() {
  const { runId } = useParams();
  const id = parseInt(runId || "0", 10);

  const navigate = useNavigate();

  // UI State
  const [layerFilter, setLayerFilter] = useState<string>("all");

  const { data: run, isLoading, error } = useRun(id);
  const updateItemMutation = useUpdateItem(id);
  const batchUpdateMutation = useBatchUpdateItems(id);
  const completeAllMutation = useCompleteAllItems(id);

  // Filter Logic
  const filteredItems = useMemo(() => {
    if (!run?.items) return [];
    if (layerFilter === "all") return run.items;
    return run.items.filter((item) => item.layer_code === layerFilter);
  }, [run?.items, layerFilter]);

  // Unique Layer Codes
  const layerOptions = useMemo(() => {
    if (!run?.items) return [];
    const codes = new Set(run.items.map((item) => item.layer_code).filter(Boolean));
    return Array.from(codes).sort();
  }, [run?.items]);

  if (isLoading) return <div>Loading...</div>;
  if (error || !run) return <div>Error detected.</div>;

  const handleToggleIssue = (itemId: number, current: boolean) => {
    updateItemMutation.mutate({
      itemId,
      data: { issue_flag: !current },
    });
  };

  const handleToggleComplete = (itemId: number, current: boolean) => {
    updateItemMutation.mutate({
      itemId,
      data: { complete_flag: !current },
    });
  };

  const handleUpdateQuantity = (itemId: number, value: string, current: number | null) => {
    const quantity = parseInt(value, 10);
    if (isNaN(quantity) || quantity < 0) return;
    if (quantity === current) return;

    updateItemMutation.mutate({
      itemId,
      data: { delivery_quantity: quantity },
    });
  };

  const handleBatchComplete = () => {
    const targetIds = filteredItems.filter((item) => !item.complete_flag).map((item) => item.id);

    if (targetIds.length === 0) {
      alert("完了対象のデータがありません（全て完了済みです）");
      return;
    }

    const message =
      layerFilter === "all"
        ? "全ての明細を完了にしますか？"
        : `表示中の${filteredItems.length}件（未完了${targetIds.length}件）を完了にしますか？`;

    if (confirm(message)) {
      if (layerFilter === "all") {
        completeAllMutation.mutate();
      } else {
        batchUpdateMutation.mutate({
          itemIds: targetIds,
          data: { complete_flag: true },
        });
      }
    }
  };

  const handleGoToStep3 = () => {
    navigate(ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP3_EXECUTE(id));
  };

  const isEditable = run.status === "draft" || run.status === "ready_for_step2";

  return (
    <PageContainer>
      <div className="mb-4">
        <Link
          to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.ROOT}
          className="flex items-center text-sm text-gray-500 hover:text-gray-900"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          メニューへ戻る
        </Link>
      </div>

      <PageHeader
        title={`Run #${run.id} 詳細`}
        subtitle={`取込日時: ${format(new Date(run.created_at), "yyyy/MM/dd HH:mm")}`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleBatchComplete}
              disabled={
                run.all_items_complete ||
                completeAllMutation.isPending ||
                batchUpdateMutation.isPending ||
                !isEditable
              }
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {layerFilter === "all" ? "全チェック完了" : "表示中を一括完了"}
            </Button>

            <Button
              onClick={handleGoToStep3}
              disabled={!run.all_items_complete || run.status !== "ready_for_step2"}
            >
              <Play className="mr-2 h-4 w-4" />
              Step3へ進む（実行）
            </Button>
          </div>
        }
      />

      {/* ステータスバナー */}
      <div className="mb-6 flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-sm text-gray-500">ステータス</div>
            <div className="text-lg font-medium">
              <Badge
                variant={
                  run.status === "step2_running" || run.status === "done" ? "default" : "secondary"
                }
              >
                {run.status}
              </Badge>
            </div>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div>
            <div className="text-sm text-gray-500">進捗</div>
            <div className="text-lg font-medium">
              {run.complete_count} / {run.item_count}
              <span className="ml-1 text-sm text-gray-500">件 完了</span>
            </div>
          </div>
        </div>
        {run.step2_executed_at && (
          <div className="text-right">
            <div className="text-sm text-gray-500">Step2実行日時</div>
            <div className="font-medium">
              {format(new Date(run.step2_executed_at), "yyyy/MM/dd HH:mm")}
            </div>
          </div>
        )}
      </div>

      {/* フィルタエリア */}
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <Select value={layerFilter} onValueChange={setLayerFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="層別フィルタ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全て表示</SelectItem>
            {layerOptions.map((code) => (
              <SelectItem key={code} value={code as string}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {layerFilter !== "all" && (
          <div className="ml-2 text-sm text-gray-500">{filteredItems.length} 件表示中</div>
        )}
      </div>

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">No</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>出荷先</TableHead>
              <TableHead>層別</TableHead>
              <TableHead>材質コード</TableHead>
              <TableHead>納期</TableHead>
              <TableHead className="w-[100px]">納入量</TableHead>
              <TableHead>出荷便</TableHead>
              <TableHead className="text-center">発行</TableHead>
              <TableHead className="text-center">完了</TableHead>
              <TableHead className="text-center">突合</TableHead>
              <TableHead className="text-center">SAP</TableHead>
              <TableHead>受発注No</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.row_no}</TableCell>
                <TableCell className="text-xs">{item.status}</TableCell>
                <TableCell>{item.destination}</TableCell>
                <TableCell>
                  <Badge variant="outline">{item.layer_code}</Badge>
                </TableCell>
                <TableCell>{item.material_code}</TableCell>
                <TableCell>
                  {item.delivery_date ? format(new Date(item.delivery_date), "MM/dd") : ""}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="h-8 w-20 text-right"
                    defaultValue={item.delivery_quantity ?? ""}
                    onBlur={(e) =>
                      handleUpdateQuantity(item.id, e.target.value, item.delivery_quantity)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                    disabled={!isEditable}
                  />
                </TableCell>
                <TableCell>{item.shipping_vehicle}</TableCell>
                <TableCell className="text-center">
                  <Checkbox
                    checked={item.issue_flag}
                    onCheckedChange={() => handleToggleIssue(item.id, item.issue_flag)}
                    disabled={updateItemMutation.isPending || !isEditable}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox
                    checked={item.complete_flag}
                    onCheckedChange={() => handleToggleComplete(item.id, item.complete_flag)}
                    disabled={updateItemMutation.isPending || !isEditable}
                  />
                </TableCell>
                <TableCell className="text-center">
                  {item.match_result === true && (
                    <Check className="mx-auto h-4 w-4 text-green-600" />
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {item.sap_registered === true && (
                    <Check className="mx-auto h-4 w-4 text-blue-600" />
                  )}
                  {item.sap_registered === false && <X className="mx-auto h-4 w-4 text-red-400" />}
                </TableCell>
                <TableCell className="text-xs text-gray-500">{item.order_no}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageContainer>
  );
}
