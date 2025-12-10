/**
 * UomConversionCreateDialog - 単位換算新規登録ダイアログ
 */
import type { UomConversionCreate } from "../api";

import { UomConversionForm } from "./UomConversionForm";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";

interface Product {
  id: number;
  product_name: string;
  product_code: string;
}

interface UomConversionCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onSubmit: (data: UomConversionCreate) => void;
  isSubmitting: boolean;
}

export function UomConversionCreateDialog({
  open,
  onOpenChange,
  products,
  onSubmit,
  isSubmitting,
}: UomConversionCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>単位換算を登録</DialogTitle>
        </DialogHeader>
        <UomConversionForm
          products={products}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
