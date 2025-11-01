import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Plus, Search } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { Lot, CreateLotInput } from '@/types'

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  // Fetch lots
  const { data: lots = [], isLoading } = useQuery({
    queryKey: ['lots'],
    queryFn: api.getLots,
  })

  // Create lot mutation
  const createLotMutation = useMutation({
    mutationFn: api.createLot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lots'] })
      setIsAddDialogOpen(false)
    },
  })

  // Filter lots based on search query
  const filteredLots = lots.filter(
    (lot) =>
      lot.lot_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.status.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const input: CreateLotInput = {
      lot_id: formData.get('lot_id') as string,
      product_name: formData.get('product_name') as string,
      quantity: parseInt(formData.get('quantity') as string),
      received_date: formData.get('received_date') as string,
      expiry_date: formData.get('expiry_date') as string || undefined,
      location: formData.get('location') as string || undefined,
      supplier: formData.get('supplier') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    }

    createLotMutation.mutate(input)
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'shipped':
        return 'bg-blue-100 text-blue-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">在庫一覧</h2>
          <p className="text-muted-foreground">
            ロット情報を管理します
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
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>新規ロット登録</DialogTitle>
                <DialogDescription>
                  新しいロット情報を入力してください
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="lot_id">ロットID *</Label>
                  <Input id="lot_id" name="lot_id" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="product_name">製品名 *</Label>
                  <Input id="product_name" name="product_name" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quantity">数量 *</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="received_date">入荷日 *</Label>
                  <Input
                    id="received_date"
                    name="received_date"
                    type="date"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expiry_date">有効期限</Label>
                  <Input id="expiry_date" name="expiry_date" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">保管場所</Label>
                  <Input id="location" name="location" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="supplier">仕入先</Label>
                  <Input id="supplier" name="supplier" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">備考</Label>
                  <Input id="notes" name="notes" />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={createLotMutation.isPending}>
                  {createLotMutation.isPending ? '登録中...' : '登録'}
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
            placeholder="ロットID、製品名、ステータスで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  ロットID
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  製品名
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  数量
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  入荷日
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  有効期限
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  ステータス
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  保管場所
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
                      {lot.lot_id}
                    </td>
                    <td className="p-4 align-middle">{lot.product_name}</td>
                    <td className="p-4 align-middle">{lot.quantity}</td>
                    <td className="p-4 align-middle">
                      {format(new Date(lot.received_date), 'yyyy/MM/dd')}
                    </td>
                    <td className="p-4 align-middle">
                      {lot.expiry_date
                        ? format(new Date(lot.expiry_date), 'yyyy/MM/dd')
                        : '-'}
                    </td>
                    <td className="p-4 align-middle">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                          lot.status
                        )}`}
                      >
                        {lot.status === 'active'
                          ? '在庫中'
                          : lot.status === 'shipped'
                          ? '出荷済み'
                          : '期限切れ'}
                      </span>
                    </td>
                    <td className="p-4 align-middle">
                      {lot.location || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
