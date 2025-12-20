/* eslint-disable max-lines-per-function, complexity */
import { format } from "date-fns";
import { Check, CheckCircle2, ChevronLeft, Play, X, Filter, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import { useRun, useUpdateItem, useBatchUpdateItems, useExecuteStep2 } from "../hooks";

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

  // UI State
  const [layerFilter, setLayerFilter] = useState<string>("all");

  const { data: run, isLoading, error } = useRun(id, { refetchInterval: 3000 });
  const updateItemMutation = useUpdateItem(id);
  const batchUpdateMutation = useBatchUpdateItems(id);
  const executeMutation = useExecuteStep2(id);

  // Filter Logic
  const filteredItems = useMemo(() => {
    if (!run?.items) return [];

    let items = run.items;
    if (layerFilter !== "all") {
      items = items.filter((item) => item.layer_code === layerFilter);
    }

    // Sort by row_no securely
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

      return {
        value: code as string,
        label,
      };
    });
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

  const handleBatchIssueToggle = () => {
    const allSelected = filteredItems.every((item) => item.issue_flag);
    const targetIds = filteredItems.map((item) => item.id);

    if (targetIds.length === 0) return;

    // Toggle: If all selected, uncheck all. Otherwise, check all.
    const newValue = !allSelected;

    batchUpdateMutation.mutate({
      itemIds: targetIds,
      data: { issue_flag: newValue },
    });
  };

  const handleExecuteStep2 = async () => {
    if (!run) return;
    if (!confirm(`本当に実行してよろしいですか？\nRun ID: ${run.id}`)) return;

    try {
      await executeMutation.mutateAsync({});
    } catch {
      // error handled by hook
    }
  };

  const isEditable = run.status === "draft" || run.status === "ready_for_step2";
  const isAllIssuesChecked =
    filteredItems.length > 0 && filteredItems.every((item) => item.issue_flag);

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
            {run.status === "ready_for_step2" && (
              <Button onClick={handleExecuteStep2} disabled={executeMutation.isPending}>
                {executeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    起動中...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    実行
                  </>
                )}
              </Button>
            )}
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

          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchIssueToggle}
            disabled={!isEditable || filteredItems.length === 0 || batchUpdateMutation.isPending}
            className="ml-2"
          >
            {isAllIssuesChecked ? (
              <>
                <X className="mr-2 h-4 w-4" />
                表示中の発行チェックを外す
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                表示中に発行チェックを付与
              </>
            )}
          </Button>

          {layerFilter !== "all" && (
            <div className="ml-2 text-sm text-gray-500">{filteredItems.length} 件表示中</div>
          )}
        </div>
      </div>

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">No</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>出荷先</TableHead>
              <TableHead>層別</TableHead>
              <TableHead>メーカー名</TableHead>
              <TableHead>材質コード</TableHead>
              <TableHead>納期</TableHead>
              <TableHead className="w-[100px]">納入量</TableHead>
              <TableHead>出荷便</TableHead>
              <TableHead className="text-center">発行</TableHead>
              <TableHead className="text-center">発行完了</TableHead>
              <TableHead className="text-center">突合</TableHead>
              <TableHead className="text-center">SAP</TableHead>
              <TableHead>受発注No</TableHead>
              <TableHead>結果</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.row_no}</TableCell>
                <TableCell className="text-xs">{item.status}</TableCell>
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
                    disabled={!isEditable}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox
                    checked={item.complete_flag}
                    onCheckedChange={() => handleToggleComplete(item.id, item.complete_flag)}
                    disabled={!isEditable}
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
                <TableCell>
                  {item.result_status === "success" && (
                    <Badge className="bg-green-600 hover:bg-green-700">成功</Badge>
                  )}
                  {item.result_status === "failure" && (
                    <Badge className="bg-orange-500 hover:bg-orange-600">失敗</Badge>
                  )}
                  {item.result_status === "error" && <Badge variant="destructive">エラー</Badge>}
                  {item.result_status === "pending" && <Badge variant="secondary">待機</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageContainer>
  );
}
