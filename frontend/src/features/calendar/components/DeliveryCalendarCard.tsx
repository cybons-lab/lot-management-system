/* eslint-disable max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため */
import { Pencil, Plus, Trash2, CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { OriginalDeliveryCalendar } from "../api";
import { useOriginalDeliveryCalendar } from "../hooks";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { formatDate } from "@/shared/utils/date";

const EMPTY_EDIT = "";

export function DeliveryCalendarCard() {
  const {
    useList: useDeliveryList,
    useCreate: useDeliveryCreate,
    useUpdate: useDeliveryUpdate,
    useDelete: useDeliveryDelete,
  } = useOriginalDeliveryCalendar();

  const deliveryQuery = useDeliveryList();
  const { mutateAsync: createDeliveryDate, isPending: isCreatingDelivery } = useDeliveryCreate();
  const { mutateAsync: updateDeliveryDate, isPending: isUpdatingDelivery } = useDeliveryUpdate();
  const { mutateAsync: deleteDeliveryDate, isPending: isDeletingDelivery } = useDeliveryDelete();

  const [deliveryDate, setDeliveryDate] = useState(EMPTY_EDIT);
  const [deliveryDescription, setDeliveryDescription] = useState(EMPTY_EDIT);
  const [editingDelivery, setEditingDelivery] = useState<{
    id: number;
    delivery_date: string;
    description: string;
  } | null>(null);

  const { holidayRangeStart, holidayRangeEnd } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 7, 0);
    return {
      holidayRangeStart: start.toISOString().split("T")[0],
      holidayRangeEnd: end.toISOString().split("T")[0],
    };
  }, []);

  const sortedDeliveryDates = useMemo(() => {
    const list = deliveryQuery.data ?? [];
    return list
      .filter((d) => d.delivery_date >= holidayRangeStart && d.delivery_date <= holidayRangeEnd)
      .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date));
  }, [deliveryQuery.data, holidayRangeStart, holidayRangeEnd]);

  const handleDeliveryCreate = async () => {
    if (!deliveryDate) {
      toast.error("配信日を入力してください");
      return;
    }
    try {
      await createDeliveryDate({
        delivery_date: deliveryDate,
        description: deliveryDescription.trim() ? deliveryDescription.trim() : null,
      });
      toast.success("配信日を登録しました");
      setDeliveryDate(EMPTY_EDIT);
      setDeliveryDescription(EMPTY_EDIT);
    } catch {
      toast.error("配信日の登録に失敗しました");
    }
  };

  const handleDeliveryUpdate = async () => {
    if (!editingDelivery) return;
    if (!editingDelivery.delivery_date) {
      toast.error("配信日を入力してください");
      return;
    }
    try {
      await updateDeliveryDate({
        id: editingDelivery.id,
        payload: {
          delivery_date: editingDelivery.delivery_date,
          description: editingDelivery.description.trim()
            ? editingDelivery.description.trim()
            : null,
        },
      });
      toast.success("配信日を更新しました");
      setEditingDelivery(null);
    } catch {
      toast.error("配信日の更新に失敗しました");
    }
  };

  const handleDeliveryDelete = async (delivery: OriginalDeliveryCalendar) => {
    if (!confirm(`${formatDate(delivery.delivery_date)} を削除しますか？`)) return;
    try {
      await deleteDeliveryDate(delivery.id);
      toast.success("配信日を削除しました");
    } catch {
      toast.error("配信日の削除に失敗しました");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-purple-600" />
            オリジナル配信日カレンダー
          </CardTitle>
          <CardDescription>オリジナル配信日を管理します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <label htmlFor="delivery-create-date" className="text-sm font-medium">
                配信日
              </label>
              <Input
                id="delivery-create-date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label htmlFor="delivery-create-desc" className="text-sm font-medium">
                説明
              </label>
              <Input
                id="delivery-create-desc"
                placeholder="例: 月次配信"
                value={deliveryDescription}
                onChange={(e) => setDeliveryDescription(e.target.value)}
              />
            </div>
            <Button onClick={handleDeliveryCreate} disabled={isCreatingDelivery}>
              <Plus className="mr-2 h-4 w-4" />
              追加
            </Button>
          </div>

          {deliveryQuery.isError && (
            <QueryErrorFallback error={deliveryQuery.error} resetError={deliveryQuery.refetch} />
          )}

          {!deliveryQuery.isError && deliveryQuery.isLoading && (
            <div className="text-sm text-muted-foreground">読み込み中...</div>
          )}

          {!deliveryQuery.isError && !deliveryQuery.isLoading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">配信日</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead className="w-[120px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDeliveryDates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      配信日がまだ登録されていません。
                    </TableCell>
                  </TableRow>
                )}
                {sortedDeliveryDates.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell>{formatDate(delivery.delivery_date)}</TableCell>
                    <TableCell>{delivery.description ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setEditingDelivery({
                              id: delivery.id,
                              delivery_date: delivery.delivery_date,
                              description: delivery.description ?? "",
                            })
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeliveryDelete(delivery)}
                          disabled={isDeletingDelivery}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingDelivery} onOpenChange={(open) => !open && setEditingDelivery(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>配信日を編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="delivery-edit-date" className="text-sm font-medium">
                配信日
              </label>
              <Input
                id="delivery-edit-date"
                type="date"
                value={editingDelivery?.delivery_date ?? EMPTY_EDIT}
                onChange={(e) =>
                  setEditingDelivery((prev) =>
                    prev ? { ...prev, delivery_date: e.target.value } : prev,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="delivery-edit-desc" className="text-sm font-medium">
                説明
              </label>
              <Input
                id="delivery-edit-desc"
                value={editingDelivery?.description ?? EMPTY_EDIT}
                onChange={(e) =>
                  setEditingDelivery((prev) =>
                    prev ? { ...prev, description: e.target.value } : prev,
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDelivery(null)}>
              キャンセル
            </Button>
            <Button onClick={handleDeliveryUpdate} disabled={isUpdatingDelivery}>
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
