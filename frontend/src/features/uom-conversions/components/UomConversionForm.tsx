/**
 * UomConversionForm - 単位換算登録フォーム
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useMemo } from "react";
import { useForm, type Control, type Resolver } from "react-hook-form";
import { z } from "zod";

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const schema = z.object({
  supplier_item_id: z.coerce.number().min(1, "商品を選択してください"),
  external_unit: z.string().min(1, "外部単位は必須です").max(20, "20文字以内"),
  factor: z.coerce.number().positive("正の数を入力してください"),
});

type FormValues = z.infer<typeof schema>;

interface UomConversionFormProps {
  products: {
    id: number;
    product_name: string;
    product_code: string;
    supplier_ids?: number[];
  }[];
  suppliers?: { id: number; supplier_name: string; supplier_code: string }[];
  onSubmit: (data: FormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

function SupplierFilterSection({
  selectedSupplierId,
  onSupplierChange,
  suppliers,
}: {
  selectedSupplierId: string;
  onSupplierChange: (value: string) => void;
  suppliers: { id: number; supplier_name: string; supplier_code: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label>仕入先で絞り込み</Label>
      <Select value={selectedSupplierId} onValueChange={onSupplierChange}>
        <SelectTrigger>
          <SelectValue placeholder="仕入先を選択" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべての仕入先</SelectItem>
          {suppliers.map((supplier) => (
            <SelectItem key={supplier.id} value={String(supplier.id)}>
              {supplier.supplier_code} - {supplier.supplier_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ProductField({
  control,
  filteredProducts,
}: {
  control: Control<FormValues>;
  filteredProducts: UomConversionFormProps["products"];
}) {
  return (
    <FormField
      control={control}
      name="supplier_item_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>商品</FormLabel>
          <Select
            value={field.value ? String(field.value) : ""}
            onValueChange={(v) => field.onChange(Number(v))}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="商品を選択" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {filteredProducts.map((product) => (
                <SelectItem key={product.id} value={String(product.id)}>
                  {product.product_code} - {product.product_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ExternalUnitField({ control }: { control: Control<FormValues> }) {
  return (
    <FormField
      control={control}
      name="external_unit"
      render={({ field }) => (
        <FormItem>
          <FormLabel>外部単位</FormLabel>
          <FormControl>
            <Input {...field} placeholder="例: KG, BOX, PCS" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function FactorField({ control }: { control: Control<FormValues> }) {
  return (
    <FormField
      control={control}
      name="factor"
      render={({ field }) => (
        <FormItem>
          <FormLabel>換算係数</FormLabel>
          <FormControl>
            <Input type="number" step="any" {...field} placeholder="例: 1.5" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SubmitButtons({
  isSubmitting,
  onCancel,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-2 pt-4">
      <Button type="button" variant="outline" onClick={onCancel}>
        キャンセル
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "登録中..." : "登録"}
      </Button>
    </div>
  );
}

export function UomConversionForm({
  products,
  suppliers = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
}: UomConversionFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { supplier_item_id: 0, external_unit: "", factor: 1 },
  });

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");

  const filteredProducts = useMemo(() => {
    if (selectedSupplierId === "all") return products;
    const supplierId = Number(selectedSupplierId);
    return products.filter((p) => p.supplier_ids?.includes(supplierId));
  }, [products, selectedSupplierId]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <SupplierFilterSection
          selectedSupplierId={selectedSupplierId}
          onSupplierChange={setSelectedSupplierId}
          suppliers={suppliers}
        />
        <ProductField control={form.control} filteredProducts={filteredProducts} />
        <ExternalUnitField control={form.control} />
        <FactorField control={form.control} />
        <SubmitButtons isSubmitting={isSubmitting} onCancel={onCancel} />
      </form>
    </Form>
  );
}
