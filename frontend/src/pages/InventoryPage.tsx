import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, formatISO } from "date-fns";
import { Plus, Search } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  LotResponse,
  LotCreate,
  Product,
  Supplier,
  Warehouse,
} from "@/types";

// v2.0 LotCreate スキーマに合わせたZodスキーマ
const lotCreateSchema = z.object({
  product_code: z.string().min(1, "製品は必須です").optional(), // ⬅️ .optional() を追加
  supplier_code: z.string().min(1, "仕入先は必須です").optional(), // ⬅️ .optional() を追加
  lot_number: z.string().min(1, "ロット番号は必須です"),
  receipt_date: z.string().min(1, "入荷日は必須です"),
  expiry_date: z.string().optional().nullable(),
  warehouse_code: z.string().optional().nullable(),
});
type LotCreateFormInput = z.infer<typeof lotCreateSchema>;

// フォームのデフォルト値
const defaultValues: LotCreateFormInput = {
  product_code: undefined, // ⬅️ 修正
  supplier_code: undefined, // ⬅️ 修正
  lot_number: "",
  receipt_date: formatISO(new Date(), { representation: "date" }),
  expiry_date: "",
  warehouse_code: undefined, // ⬅️ 修正
};

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // React Hook Form の初期化
  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<LotCreateFormInput>({
    resolver: zodResolver(lotCreateSchema),
    defaultValues,
  });

  // --- データフェッチ ---

  // 在庫一覧
  const { data: lots = [], isLoading: isLoadingLots } = useQuery({
    queryKey: ["lots"],
    queryFn: api.getLots,
  });

  // 製品マスタ
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: api.getProducts,
  });

  // 仕入先マスタ
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: api.getSuppliers,
  });

  // 倉庫マスタ
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: api.getWarehouses,
  });

  // --- ミューテーション ---

  // ロット作成 (v2.0)
  const createLotMutation = useMutation({
    mutationFn: (data: LotCreate) => api.createLot(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      setIsAddDialogOpen(false);
      reset(defaultValues);
    },
    onError: (error) => {
      console.error(error);
      alert(`登録失敗: ${error.message}`);
    },
  });

  // --- イベントハンドラ ---

  // フォーム送信
  const onSubmit = (data: LotCreateFormInput) => {
    const input: LotCreate = {
      ...data,
      expiry_date: data.expiry_date || undefined,
      warehouse_code: data.warehouse_code || undefined,
    };
    createLotMutation.mutate(input);
  };

  // ダイアログ開閉
  const onOpenChange = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      reset(defaultValues); // 閉じたらフォームリセット
    }
  };

  // --- フィルタリングと表示ロジック ---

  // Filter lots (v2.0)
  const filteredLots = lots.filter(
    (lot) =>
      lot.lot_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lot.product_name &&
        lot.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      lot.product_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get status badge color (v2.0)
  const getExpiryStatusColor = (expiryDate: string | undefined | null) => {
    if (!expiryDate) return "bg-gray-100 text-gray-800";
    const daysLeft =
      (parseISO(expiryDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24);

    if (daysLeft <= 0) return "bg-red-100 text-red-800";
    if (daysLeft <= 30) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">在庫一覧</h2>
          <p className="text-muted-foreground">
            現在庫のあるロット情報をFEFO（有効期限順）で表示します
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新規ロット登録
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>新規ロット登録</DialogTitle>
                <DialogDescription>
                  新しいロット情報を入力してください
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* 製品 (Select) */}
                <div className="grid gap-2">
                  <Label htmlFor="product_code">製品 *</Label>
                  <Controller
                    name="product_code"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingProducts}>
                        <SelectTrigger id="product_code">
                          <SelectValue placeholder="製品を選択..." />
                        </SelectTrigger>
                        <SelectContent>
                          {/* 🔽 修正: value="" の Item を削除 */}
                          {products.map((p) => (
                            <SelectItem
                              key={p.product_code}
                              value={p.product_code}>
                              {p.product_code} - {p.product_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.product_code && (
                    <p className="text-sm text-destructive">
                      {errors.product_code.message}
                    </p>
                  )}
                </div>

                {/* 仕入先 (Select) */}
                <div className="grid gap-2">
                  <Label htmlFor="supplier_code">仕入先 *</Label>
                  <Controller
                    name="supplier_code"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingSuppliers}>
                        <SelectTrigger id="supplier_code">
                          <SelectValue placeholder="仕入先を選択..." />
                        </SelectTrigger>
                        <SelectContent>
                          {/* 🔽 修正: value="" の Item を削除 */}
                          {suppliers.map((s) => (
                            <SelectItem
                              key={s.supplier_code}
                              value={s.supplier_code}>
                              {s.supplier_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.supplier_code && (
                    <p className="text-sm text-destructive">
                      {errors.supplier_code.message}
                    </p>
                  )}
                </div>

                {/* ロット番号 (Input) */}
                <div className="grid gap-2">
                  <Label htmlFor="lot_number">ロット番号 *</Label>
                  <Input id="lot_number" {...register("lot_number")} />
                  {errors.lot_number && (
                    <p className="text-sm text-destructive">
                      {errors.lot_number.message}
                    </p>
                  )}
                </div>

                {/* 入荷日 (Input type="date") */}
                <div className="grid gap-2">
                  <Label htmlFor="receipt_date">入荷日 *</Label>
                  <Input
                    id="receipt_date"
                    type="date"
                    {...register("receipt_date")}
                  />
                  {errors.receipt_date && (
                    <p className="text-sm text-destructive">
                      {errors.receipt_date.message}
                    </p>
                  )}
                </div>

                {/* 有効期限 (Input type="date") */}
                <div className="grid gap-2">
                  <Label htmlFor="expiry_date">有効期限</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    {...register("expiry_date")}
                  />
                </div>

                {/* 倉庫 (Select) */}
                <div className="grid gap-2">
                  <Label htmlFor="warehouse_code">倉庫</Label>
                  <Controller
                    name="warehouse_code"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingWarehouses}>
                        <SelectTrigger id="warehouse_code">
                          <SelectValue placeholder="倉庫を選択..." />
                        </SelectTrigger>
                        <SelectContent>
                          {/* ⬆️ value="" の SelectItem を削除しました */}
                          {warehouses.map((w) => (
                            <SelectItem
                              key={w.warehouse_code}
                              value={w.warehouse_code}>
                              {w.warehouse_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={createLotMutation.isPending}>
                  {createLotMutation.isPending ? "登録中..." : "登録"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ロット番号、製品名、製品コードで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Table (v2.0) */}
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {/* (テーブルヘッダは変更なし) */}
              <tr className="border-b bg-muted/50">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  ロット番号
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  製品名
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  現在在庫
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  入荷日
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  有効期限
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  倉庫
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  仕入先
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoadingLots ? (
                <tr>
                  <td colSpan={7} className="h-24 text-center">
                    読み込み中...
                  </td>
                </tr>
              ) : filteredLots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="h-24 text-center">
                    データがありません
                  </td>
                </tr>
              ) : (
                filteredLots.map((lot) => (
                  <tr key={lot.id} className="border-b">
                    <td className="p-4 align-middle font-medium">
                      {lot.lot_number}
                    </td>
                    <td className="p-4 align-middle">
                      {lot.product_name || (
                        <span className="text-muted-foreground italic">
                          {lot.product_code}
                        </span>
                      )}
                    </td>
                    <td className="p-4 align-middle font-semibold">
                      {lot.current_stock ?? 0}
                    </td>
                    <td className="p-4 align-middle">
                      {format(parseISO(lot.receipt_date), "yyyy/MM/dd")}
                    </td>
                    <td className="p-4 align-middle">
                      {lot.expiry_date ? (
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getExpiryStatusColor(
                            lot.expiry_date
                          )}`}>
                          {format(parseISO(lot.expiry_date), "yyyy/MM/dd")}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      {lot.warehouse_code || "-"}
                    </td>
                    <td className="p-4 align-middle">
                      {lot.supplier_code || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
