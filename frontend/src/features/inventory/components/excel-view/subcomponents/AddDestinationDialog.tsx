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

const EMPTY_FORM_DATA: NewDestinationFormData = {
  jiku_code: "",
  delivery_place_name: "",
  delivery_place_code: "",
};

function DestinationInputField({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: keyof NewDestinationFormData;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label} <span className="text-red-500">*</span>
      </Label>
      <Input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
      />
    </div>
  );
}

export function AddDestinationDialog({ open, onOpenChange, onConfirm, customerName }: Props) {
  const [formData, setFormData] = useState<NewDestinationFormData>(EMPTY_FORM_DATA);
  const updateField = (field: keyof NewDestinationFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const resetForm = () => setFormData(EMPTY_FORM_DATA);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onConfirm(formData);
    resetForm();
  };

  const handleCancel = () => {
    onOpenChange(false);
    resetForm();
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
          <DestinationInputField
            id="jiku_code"
            label="次区コード"
            value={formData.jiku_code}
            placeholder="次区コードを入力"
            onChange={(value) => updateField("jiku_code", value)}
          />
          <DestinationInputField
            id="delivery_place_name"
            label="納入先名"
            value={formData.delivery_place_name}
            placeholder="例: 横浜市神奈川区センター"
            onChange={(value) => updateField("delivery_place_name", value)}
          />
          <DestinationInputField
            id="delivery_place_code"
            label="納入先コード"
            value={formData.delivery_place_code}
            placeholder="例: DP-0122"
            onChange={(value) => updateField("delivery_place_code", value)}
          />

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
