import { useState } from "react";
import { useQuery } from "@tanstack/react-query"; // useMutation, useQueryClient は一旦削除
import { format, parseISO } from "date-fns"; // parseISO を追加
import { Plus, Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { Label } from '@/components/ui/label' // フォームを使わないので一旦削除
import {
  Dialog,
  DialogContent,
  DialogDescription,
  // DialogFooter, // フォームを使わないので一旦削除
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { LotResponse } from "@/types"; // Lot, CreateLotInput -> LotResponse

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  // const queryClient = useQueryClient() // 登録機能を使わないので一旦削除

  // Fetch lots (v2.0)
  const { data: lots = [], isLoading } = useQuery({
    queryKey: ["lots"],
    queryFn: api.getLots,
  });

  // Create lot mutation (v1.0) - 一旦コメントアウト
  /*
  const createLotMutation = useMutation({
    mutationFn: api.createLot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lots'] })
      setIsAddDialogOpen(false)
    },
  })
  */

  // Filter lots (v2.0)
  const filteredLots = lots.filter(
    (lot) =>
      lot.lot_number.toLowerCase().includes(searchQuery.toLowerCase()) || // lot_id -> lot_number
      (lot.product_name && // product_name
        lot.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      lot.product_code.toLowerCase().includes(searchQuery.toLowerCase()) // product_code
  );

  // Handle form submission (v1.0) - 一旦コメントアウト
  /*
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // ... (v1.0 logic) ...
    // createLotMutation.mutate(input)
  }
  */

  // Get status badge color (v1.0) - v2.0では期限で色分け
  const getExpiryStatusColor = (expiryDate: string | undefined | null) => {
    if (!expiryDate) return "bg-gray-100 text-gray-800";
    const daysLeft =
      (parseISO(expiryDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24);

    if (daysLeft <= 0) return "bg-red-100 text-red-800"; // 期限切れ
    if (daysLeft <= 30) return "bg-yellow-100 text-yellow-800"; // 30日以内
    return "bg-green-100 text-green-800"; // 正常
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

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新規ロット登録
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            {/* <form onSubmit={handleSubmit}> */}
            <DialogHeader>
              <DialogTitle>新規ロット登録</DialogTitle>
              <DialogDescription>
                （この機能はv2.0 APIに合わせて現在改修中です）
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <p className="text-sm text-muted-foreground">
                次のステップで、製品・仕入先・倉庫を選択するドロップダウンを実装します。
              </p>
            </div>
            {/* </form> */}
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ロット番号、製品名、製品コードで検索..." // 検索対象を明記
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
              {isLoading ? (
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
                      {lot.current_stock}
                    </td>
                    <td className="p-4 align-middle">
                      {/* date-fns v4 は parseISO を使います */}
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
