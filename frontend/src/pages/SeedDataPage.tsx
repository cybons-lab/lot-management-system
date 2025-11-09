// frontend/src/pages/SeedDataPage.tsx
import { useMutation } from "@tanstack/react-query";
import * as React from "react";


import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postSeeds, type SeedRequest, type SeedResponse } from "@/features/admin/api/admin-seeds";
import { useToast } from "@/hooks/ui";

export default function SeedDataPage() {
  const toast = useToast();
  const [form, setForm] = React.useState<SeedRequest>({
    seed: 42,
    dry_run: false,
    customers: 10,
    products: 20,
    warehouses: 3,
    lots: 80,
    orders: 25,
  });

  const mut = useMutation({
    mutationFn: (payload: SeedRequest) => postSeeds(payload),
    onSuccess: (res: SeedResponse) => {
      const summary = `customers:${res.summary.customers}, products:${res.summary.products}, warehouses:${res.summary.warehouses}, lots:${res.summary.lots}, orders:${res.summary.orders}, lines:${res.summary.order_lines}, alloc:${res.summary.allocations}`;
      toast.success(
        res.dry_run ? `Dry Run 完了 - ${summary}` : `投入完了 - ${summary}`
      );
    },
    onError: (err: Error) => {
      toast.error(`失敗: ${err.message}`);
    },
  });

  const onChangeNum = (key: keyof SeedRequest) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s: SeedRequest) => ({ ...s, [key]: Number(e.target.value || 0) }));

  return (
    <div className="p-6 grid gap-4 max-w-3xl">
      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Seed Test Data</h2>
          <p className="mt-1 text-sm text-gray-600">テストデータを投入します</p>
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Seed</Label>
              <Input type="number" value={form.seed ?? 42} onChange={onChangeNum("seed")} />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Checkbox
                checked={!!form.dry_run}
                onCheckedChange={(v: boolean) => setForm((s: SeedRequest) => ({ ...s, dry_run: v }))}
                id="dryrun"
              />
              <Label htmlFor="dryrun">Dry Run</Label>
            </div>
            <div>
              <Label>Customers</Label>
              <Input
                type="number"
                value={form.customers ?? 0}
                onChange={onChangeNum("customers")}
              />
            </div>
            <div>
              <Label>Products</Label>
              <Input type="number" value={form.products ?? 0} onChange={onChangeNum("products")} />
            </div>
            <div>
              <Label>Warehouses</Label>
              <Input
                type="number"
                value={form.warehouses ?? 0}
                onChange={onChangeNum("warehouses")}
              />
            </div>
            <div>
              <Label>Lots</Label>
              <Input type="number" value={form.lots ?? 0} onChange={onChangeNum("lots")} />
            </div>
            <div>
              <Label>Orders</Label>
              <Input type="number" value={form.orders ?? 0} onChange={onChangeNum("orders")} />
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => mut.mutate(form)} disabled={mut.isPending}>
              {form.dry_run ? "プレビュー実行" : "投入する"}
            </Button>
            <Button variant="outline" onClick={() => setForm({ ...form, dry_run: true })}>
              Dry Runに切替
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
