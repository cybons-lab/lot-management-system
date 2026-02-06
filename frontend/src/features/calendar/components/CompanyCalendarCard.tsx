/* eslint-disable max-lines-per-function, complexity -- 関連する画面ロジックを1箇所で管理するため */
import { Pencil, Plus, Trash2, CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { CompanyCalendar } from "../api";
import { useCompanyCalendar } from "../hooks";

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
import { formatDate } from "@/shared/utils/date";

const EMPTY_EDIT = "";

export function CompanyCalendarCard() {
  const {
    useList: useCompanyList,
    useCreate: useCompanyCreate,
    useUpdate: useCompanyUpdate,
    useDelete: useCompanyDelete,
  } = useCompanyCalendar();

  const companyQuery = useCompanyList();
  const { mutateAsync: createCompanyDay, isPending: isCreatingCompany } = useCompanyCreate();
  const { mutateAsync: updateCompanyDay, isPending: isUpdatingCompany } = useCompanyUpdate();
  const { mutateAsync: deleteCompanyDay, isPending: isDeletingCompany } = useCompanyDelete();

  const [companyDate, setCompanyDate] = useState(EMPTY_EDIT);
  const [companyType, setCompanyType] = useState("holiday");
  const [companyDescription, setCompanyDescription] = useState(EMPTY_EDIT);
  const [editingCompany, setEditingCompany] = useState<{
    id: number;
    calendar_date: string;
    is_workday: boolean;
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

  const sortedCompanyDates = useMemo(() => {
    const list = companyQuery.data ?? [];
    return list
      .filter((c) => c.calendar_date >= holidayRangeStart && c.calendar_date <= holidayRangeEnd)
      .sort((a, b) => a.calendar_date.localeCompare(b.calendar_date));
  }, [companyQuery.data, holidayRangeStart, holidayRangeEnd]);

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

  return (
    <>
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

      {/* Edit Dialog */}
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
    </>
  );
}
