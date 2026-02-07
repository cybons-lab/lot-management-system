/* eslint-disable max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため */
import { Download, Pencil, Plus, RefreshCw, Trash2, CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { HolidayCalendar } from "../api";
import { useHolidayCalendar } from "../hooks";

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
  Textarea,
} from "@/components/ui";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { formatDate } from "@/shared/utils/date";

const EMPTY_EDIT = "";

export function HolidayCalendarCard() {
  const {
    useList: useHolidayList,
    useCreate: useHolidayCreate,
    useUpdate: useHolidayUpdate,
    useDelete: useHolidayDelete,
    useSync: useHolidaySync,
    useImport: useHolidayImport,
  } = useHolidayCalendar();

  const holidaysQuery = useHolidayList();
  const { mutateAsync: createHoliday, isPending: isCreatingHoliday } = useHolidayCreate();
  const { mutateAsync: updateHoliday, isPending: isUpdatingHoliday } = useHolidayUpdate();
  const { mutateAsync: deleteHoliday, isPending: isDeletingHoliday } = useHolidayDelete();
  const { mutateAsync: syncHolidays, isPending: isSyncingHolidays } = useHolidaySync();
  const { mutateAsync: importHolidays, isPending: isImportingHolidays } = useHolidayImport();

  const [holidayDate, setHolidayDate] = useState(EMPTY_EDIT);
  const [holidayName, setHolidayName] = useState(EMPTY_EDIT);
  const [editingHoliday, setEditingHoliday] = useState<{
    id: number;
    holiday_date: string;
    holiday_name: string;
  } | null>(null);

  const [importTsvData, setImportTsvData] = useState(EMPTY_EDIT);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const { holidayRangeStart, holidayRangeEnd } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 7, 0);
    return {
      holidayRangeStart: start.toISOString().split("T")[0]!,
      holidayRangeEnd: end.toISOString().split("T")[0]!,
    };
  }, []);

  const sortedHolidays = useMemo(() => {
    const list = holidaysQuery.data ?? [];
    return list
      .filter((h) => h.holiday_date >= holidayRangeStart && h.holiday_date <= holidayRangeEnd)
      .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
  }, [holidaysQuery.data, holidayRangeStart, holidayRangeEnd]);

  const handleHolidayCreate = async () => {
    if (!holidayDate) {
      toast.error("祝日の日付を入力してください");
      return;
    }
    try {
      await createHoliday({
        holiday_date: holidayDate,
        holiday_name: holidayName.trim() ? holidayName.trim() : null,
      });
      toast.success("祝日を登録しました");
      setHolidayDate(EMPTY_EDIT);
      setHolidayName(EMPTY_EDIT);
    } catch {
      toast.error("祝日の登録に失敗しました");
    }
  };

  const handleHolidayUpdate = async () => {
    if (!editingHoliday) return;
    if (!editingHoliday.holiday_date) {
      toast.error("祝日の日付を入力してください");
      return;
    }
    try {
      await updateHoliday({
        id: editingHoliday.id,
        payload: {
          holiday_date: editingHoliday.holiday_date,
          holiday_name: editingHoliday.holiday_name.trim()
            ? editingHoliday.holiday_name.trim()
            : null,
        },
      });
      toast.success("祝日を更新しました");
      setEditingHoliday(null);
    } catch {
      toast.error("祝日の更新に失敗しました");
    }
  };

  const handleHolidayDelete = async (holiday: HolidayCalendar) => {
    if (!confirm(`${formatDate(holiday.holiday_date)} を削除しますか？`)) return;
    try {
      await deleteHoliday(holiday.id);
      toast.success("祝日を削除しました");
    } catch {
      toast.error("祝日の削除に失敗しました");
    }
  };

  const handleHolidaySync = async () => {
    try {
      const result = await syncHolidays();
      toast.success(result.message);
    } catch {
      toast.error("祝日の同期に失敗しました");
    }
  };

  const handleHolidayImport = async () => {
    if (!importTsvData.trim()) {
      toast.error("インポートするデータを入力してください");
      return;
    }
    try {
      const result = await importHolidays({ tsv_data: importTsvData });
      toast.success(result.message);
      setImportTsvData(EMPTY_EDIT);
      setIsImportDialogOpen(false);
    } catch {
      toast.error("祝日のインポートに失敗しました");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-teal-600" />
            祝日カレンダー
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleHolidaySync}
              disabled={isSyncingHolidays}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncingHolidays ? "animate-spin" : ""}`} />
              祝日同期
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              インポート
            </Button>
          </div>
          <CardDescription>国民の祝日や社内で管理したい祝日を登録します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <label htmlFor="holiday-create-date" className="text-sm font-medium">
                祝日
              </label>
              <Input
                id="holiday-create-date"
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label htmlFor="holiday-create-name" className="text-sm font-medium">
                祝日名
              </label>
              <Input
                id="holiday-create-name"
                placeholder="例: 海の日"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
              />
            </div>
            <Button onClick={handleHolidayCreate} disabled={isCreatingHoliday}>
              <Plus className="mr-2 h-4 w-4" />
              追加
            </Button>
          </div>

          {holidaysQuery.isError && (
            <QueryErrorFallback error={holidaysQuery.error} resetError={holidaysQuery.refetch} />
          )}

          {!holidaysQuery.isError && holidaysQuery.isLoading && (
            <div className="text-sm text-muted-foreground">読み込み中...</div>
          )}

          {!holidaysQuery.isError && !holidaysQuery.isLoading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">祝日</TableHead>
                  <TableHead>祝日名</TableHead>
                  <TableHead className="w-[120px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHolidays.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      祝日がまだ登録されていません。
                    </TableCell>
                  </TableRow>
                )}
                {sortedHolidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell>{formatDate(holiday.holiday_date)}</TableCell>
                    <TableCell>{holiday.holiday_name ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setEditingHoliday({
                              id: holiday.id,
                              holiday_date: holiday.holiday_date,
                              holiday_name: holiday.holiday_name ?? "",
                            })
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleHolidayDelete(holiday)}
                          disabled={isDeletingHoliday}
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

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>祝日インポート</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              Excel等から「日付 [Tab] 祝日名」の形式でコピーしたデータを貼り付けてください。
              <br />
              例: 2026/01/01 [Tab] 元日
            </div>
            <div className="space-y-2">
              <label htmlFor="holiday-import-tsv" className="text-sm font-medium">
                インポートデータ (TSV形式)
              </label>
              <Textarea
                id="holiday-import-tsv"
                placeholder="2026/01/01&#9;元日&#10;2026/01/12&#9;成人の日"
                rows={10}
                value={importTsvData}
                onChange={(e) => setImportTsvData(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleHolidayImport} disabled={isImportingHolidays}>
              インポート実行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingHoliday} onOpenChange={(open) => !open && setEditingHoliday(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>祝日を編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="holiday-edit-date" className="text-sm font-medium">
                祝日
              </label>
              <Input
                id="holiday-edit-date"
                type="date"
                value={editingHoliday?.holiday_date ?? EMPTY_EDIT}
                onChange={(e) =>
                  setEditingHoliday((prev) =>
                    prev ? { ...prev, holiday_date: e.target.value } : prev,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="holiday-edit-name" className="text-sm font-medium">
                祝日名
              </label>
              <Input
                id="holiday-edit-name"
                value={editingHoliday?.holiday_name ?? EMPTY_EDIT}
                onChange={(e) =>
                  setEditingHoliday((prev) =>
                    prev ? { ...prev, holiday_name: e.target.value } : prev,
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingHoliday(null)}>
              キャンセル
            </Button>
            <Button onClick={handleHolidayUpdate} disabled={isUpdatingHoliday}>
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
