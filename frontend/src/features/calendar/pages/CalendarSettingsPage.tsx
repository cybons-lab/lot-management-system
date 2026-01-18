/* eslint-disable max-lines, max-lines-per-function, complexity */
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { type CompanyCalendar, type HolidayCalendar, type OriginalDeliveryCalendar } from "../api";
import {
  useBusinessDayCalculator,
  useCompanyCalendar,
  useHolidayCalendar,
  useOriginalDeliveryCalendar,
} from "../hooks";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { formatDate } from "@/shared/utils/date";

const EMPTY_EDIT = "";

export function CalendarSettingsPage() {
  const {
    useList: useHolidayList,
    useCreate: useHolidayCreate,
    useUpdate: useHolidayUpdate,
    useDelete: useHolidayDelete,
  } = useHolidayCalendar();
  const {
    useList: useCompanyList,
    useCreate: useCompanyCreate,
    useUpdate: useCompanyUpdate,
    useDelete: useCompanyDelete,
  } = useCompanyCalendar();
  const {
    useList: useDeliveryList,
    useCreate: useDeliveryCreate,
    useUpdate: useDeliveryUpdate,
    useDelete: useDeliveryDelete,
  } = useOriginalDeliveryCalendar();

  const holidaysQuery = useHolidayList();
  const companyQuery = useCompanyList();
  const deliveryQuery = useDeliveryList();

  const { mutateAsync: createHoliday, isPending: isCreatingHoliday } = useHolidayCreate();
  const { mutateAsync: updateHoliday, isPending: isUpdatingHoliday } = useHolidayUpdate();
  const { mutateAsync: deleteHoliday, isPending: isDeletingHoliday } = useHolidayDelete();

  const { mutateAsync: createCompanyDay, isPending: isCreatingCompany } = useCompanyCreate();
  const { mutateAsync: updateCompanyDay, isPending: isUpdatingCompany } = useCompanyUpdate();
  const { mutateAsync: deleteCompanyDay, isPending: isDeletingCompany } = useCompanyDelete();

  const { mutateAsync: createDeliveryDate, isPending: isCreatingDelivery } = useDeliveryCreate();
  const { mutateAsync: updateDeliveryDate, isPending: isUpdatingDelivery } = useDeliveryUpdate();
  const { mutateAsync: deleteDeliveryDate, isPending: isDeletingDelivery } = useDeliveryDelete();

  const {
    mutateAsync: calculateBusinessDay,
    data: businessDayResult,
    isPending: isCalculating,
  } = useBusinessDayCalculator();

  const [holidayDate, setHolidayDate] = useState(EMPTY_EDIT);
  const [holidayName, setHolidayName] = useState(EMPTY_EDIT);
  const [editingHoliday, setEditingHoliday] = useState<{
    id: number;
    holiday_date: string;
    holiday_name: string;
  } | null>(null);

  const [companyDate, setCompanyDate] = useState(EMPTY_EDIT);
  const [companyType, setCompanyType] = useState("holiday");
  const [companyDescription, setCompanyDescription] = useState(EMPTY_EDIT);
  const [editingCompany, setEditingCompany] = useState<{
    id: number;
    calendar_date: string;
    is_workday: boolean;
    description: string;
  } | null>(null);

  const [deliveryDate, setDeliveryDate] = useState(EMPTY_EDIT);
  const [deliveryDescription, setDeliveryDescription] = useState(EMPTY_EDIT);
  const [editingDelivery, setEditingDelivery] = useState<{
    id: number;
    delivery_date: string;
    description: string;
  } | null>(null);

  const [calcStartDate, setCalcStartDate] = useState(EMPTY_EDIT);
  const [calcDays, setCalcDays] = useState(1);
  const [calcDirection, setCalcDirection] = useState<"after" | "before">("after");
  const [calcIncludeStart, setCalcIncludeStart] = useState(false);

  const sortedHolidays = useMemo(() => {
    const list = holidaysQuery.data ?? [];
    return [...list].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
  }, [holidaysQuery.data]);

  const sortedCompanyDates = useMemo(() => {
    const list = companyQuery.data ?? [];
    return [...list].sort((a, b) => a.calendar_date.localeCompare(b.calendar_date));
  }, [companyQuery.data]);

  const sortedDeliveryDates = useMemo(() => {
    const list = deliveryQuery.data ?? [];
    return [...list].sort((a, b) => a.delivery_date.localeCompare(b.delivery_date));
  }, [deliveryQuery.data]);

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

  const handleCompanyCreate = async () => {
    if (!companyDate) {
      toast.error("日付を入力してください");
      return;
    }
    try {
      await createCompanyDay({
        calendar_date: companyDate,
        is_workday: companyType === "workday",
        description: companyDescription.trim() ? companyDescription.trim() : null,
      });
      toast.success("会社カレンダーを登録しました");
      setCompanyDate(EMPTY_EDIT);
      setCompanyType("holiday");
      setCompanyDescription(EMPTY_EDIT);
    } catch {
      toast.error("会社カレンダーの登録に失敗しました");
    }
  };

  const handleCompanyUpdate = async () => {
    if (!editingCompany) return;
    if (!editingCompany.calendar_date) {
      toast.error("日付を入力してください");
      return;
    }
    try {
      await updateCompanyDay({
        id: editingCompany.id,
        payload: {
          calendar_date: editingCompany.calendar_date,
          is_workday: editingCompany.is_workday,
          description: editingCompany.description.trim() ? editingCompany.description.trim() : null,
        },
      });
      toast.success("会社カレンダーを更新しました");
      setEditingCompany(null);
    } catch {
      toast.error("会社カレンダーの更新に失敗しました");
    }
  };

  const handleCompanyDelete = async (companyDay: CompanyCalendar) => {
    if (!confirm(`${formatDate(companyDay.calendar_date)} を削除しますか？`)) return;
    try {
      await deleteCompanyDay(companyDay.id);
      toast.success("会社カレンダーを削除しました");
    } catch {
      toast.error("会社カレンダーの削除に失敗しました");
    }
  };

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
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader title="カレンダー設定" subtitle="祝日・会社カレンダー・配信日を管理します" />

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-teal-600" />
            祝日カレンダー
          </CardTitle>
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

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-amber-600" />
            会社の休日・稼働日カレンダー
          </CardTitle>
          <CardDescription>
            会社独自の休日や休日出勤日（稼働日）を登録して営業日計算に反映します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <label htmlFor="company-create-date" className="text-sm font-medium">
                日付
              </label>
              <Input
                id="company-create-date"
                type="date"
                value={companyDate}
                onChange={(e) => setCompanyDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="company-create-type" className="text-sm font-medium">
                区分
              </label>
              <Select value={companyType} onValueChange={setCompanyType}>
                <SelectTrigger id="company-create-type" className="w-[140px]" aria-label="区分">
                  <SelectValue placeholder="区分" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holiday">休日</SelectItem>
                  <SelectItem value="workday">稼働日</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label htmlFor="company-create-desc" className="text-sm font-medium">
                説明
              </label>
              <Input
                id="company-create-desc"
                placeholder="例: 年末年始休暇"
                value={companyDescription}
                onChange={(e) => setCompanyDescription(e.target.value)}
              />
            </div>
            <Button onClick={handleCompanyCreate} disabled={isCreatingCompany}>
              <Plus className="mr-2 h-4 w-4" />
              追加
            </Button>
          </div>

          {companyQuery.isError && (
            <QueryErrorFallback error={companyQuery.error} resetError={companyQuery.refetch} />
          )}

          {!companyQuery.isError && companyQuery.isLoading && (
            <div className="text-sm text-muted-foreground">読み込み中...</div>
          )}

          {!companyQuery.isError && !companyQuery.isLoading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">日付</TableHead>
                  <TableHead className="w-[140px]">区分</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead className="w-[120px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCompanyDates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      会社カレンダーがまだ登録されていません。
                    </TableCell>
                  </TableRow>
                )}
                {sortedCompanyDates.map((companyDay) => (
                  <TableRow key={companyDay.id}>
                    <TableCell>{formatDate(companyDay.calendar_date)}</TableCell>
                    <TableCell>{companyDay.is_workday ? "稼働日" : "休日"}</TableCell>
                    <TableCell>{companyDay.description ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setEditingCompany({
                              id: companyDay.id,
                              calendar_date: companyDay.calendar_date,
                              is_workday: companyDay.is_workday,
                              description: companyDay.description ?? "",
                            })
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCompanyDelete(companyDay)}
                          disabled={isDeletingCompany}
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
            <div className="flex items-end gap-2">
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
                <span className="font-medium">結果:</span>{" "}
                {formatDate(businessDayResult.result_date)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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

      <Dialog open={!!editingCompany} onOpenChange={(open) => !open && setEditingCompany(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>会社カレンダーを編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="company-edit-date" className="text-sm font-medium">
                日付
              </label>
              <Input
                id="company-edit-date"
                type="date"
                value={editingCompany?.calendar_date ?? EMPTY_EDIT}
                onChange={(e) =>
                  setEditingCompany((prev) =>
                    prev ? { ...prev, calendar_date: e.target.value } : prev,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="company-edit-type" className="text-sm font-medium">
                区分
              </label>
              <Select
                value={editingCompany?.is_workday ? "workday" : "holiday"}
                onValueChange={(value) =>
                  setEditingCompany((prev) =>
                    prev ? { ...prev, is_workday: value === "workday" } : prev,
                  )
                }
              >
                <SelectTrigger id="company-edit-type" aria-label="区分">
                  <SelectValue placeholder="区分" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holiday">休日</SelectItem>
                  <SelectItem value="workday">稼働日</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="company-edit-desc" className="text-sm font-medium">
                説明
              </label>
              <Input
                id="company-edit-desc"
                value={editingCompany?.description ?? EMPTY_EDIT}
                onChange={(e) =>
                  setEditingCompany((prev) =>
                    prev ? { ...prev, description: e.target.value } : prev,
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCompany(null)}>
              キャンセル
            </Button>
            <Button onClick={handleCompanyUpdate} disabled={isUpdatingCompany}>
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
