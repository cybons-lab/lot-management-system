import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (formData: NewDestinationFormData) => void;
  customerId: number;
  customerName: string;
}

export interface NewDestinationFormData {
  jiku_code: string;
  delivery_place_name: string;
  delivery_place_code: string;
}

/* eslint-disable max-lines-per-function */
export function AddDestinationDialog({ open, onOpenChange, onConfirm, customerName }: Props) {
  const [formData, setFormData] = useState<NewDestinationFormData>({
    jiku_code: "",
    delivery_place_name: "",
    delivery_place_code: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(formData);
    // Reset form
    setFormData({
      jiku_code: "",
      delivery_place_name: "",
      delivery_place_code: "",
    });
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset form
    setFormData({
      jiku_code: "",
      delivery_place_name: "",
      delivery_place_code: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>納入先を追加</DialogTitle>
          <DialogDescription>
            新しい納入先の情報を入力してください。得意先: {customerName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="jiku_code" className="text-sm font-medium">
              次区コード <span className="text-red-500">*</span>
            </Label>
            <Input
              id="jiku_code"
              type="text"
              value={formData.jiku_code}
              onChange={(e) => setFormData({ ...formData, jiku_code: e.target.value })}
              placeholder="次区コードを入力"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery_place_name" className="text-sm font-medium">
              納入先名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="delivery_place_name"
              type="text"
              value={formData.delivery_place_name}
              onChange={(e) => setFormData({ ...formData, delivery_place_name: e.target.value })}
              placeholder="例: 横浜市神奈川区センター"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery_place_code" className="text-sm font-medium">
              納入先コード <span className="text-red-500">*</span>
            </Label>
            <Input
              id="delivery_place_code"
              type="text"
              value={formData.delivery_place_code}
              onChange={(e) => setFormData({ ...formData, delivery_place_code: e.target.value })}
              placeholder="例: DP-0122"
              required
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleCancel}>
              キャンセル
            </Button>
            <Button type="submit">追加</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
