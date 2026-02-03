import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import React, { useState } from "react";

import { shippingMasterApi } from "../api";

import { Button } from "@/components/ui/base/button";
import { Label } from "@/components/ui/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/layout/dialog";

interface ShippingMasterSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShippingMasterSyncDialog: React.FC<ShippingMasterSyncDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [policy, setPolicy] = useState<string>("create-only");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (syncPolicy: string) => shippingMasterApi.sync(syncPolicy),
    onSuccess: (data) => {
      alert(
        `同期が完了しました。\n処理件数: ${data.processed}\n作成件数: ${data.created}\n更新件数: ${data.updated}\nスキップ: ${data.skipped}`,
      );
      queryClient.invalidateQueries({ queryKey: ["shipping-masters"] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Sync failed:", error);
      alert("同期に失敗しました。詳細はログを確認してください。");
    },
  });

  const handleSync = () => {
    mutation.mutate(policy);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            マスタ同期の実行
          </DialogTitle>
          <DialogDescription>
            登録済みの出荷用マスタデータを元に、得意先・仕入先・品目などの基本マスタを更新または新規作成します。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sync-policy">同期ポリシー</Label>
            <Select value={policy} onValueChange={setPolicy}>
              <SelectTrigger id="sync-policy">
                <SelectValue placeholder="ポリシーを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="create-only">新規作成のみ（既存データは維持）</SelectItem>
                <SelectItem value="update-if-empty">
                  空項目のみ補完（既存データが空の場合のみ更新）
                </SelectItem>
                <SelectItem value="upsert">全ての項目を同期（常に最新データで上書き）</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              ※同期処理には時間がかかる場合があります。
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            キャンセル
          </Button>
          <Button onClick={handleSync} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                同期中...
              </>
            ) : (
              "同期を実行"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
