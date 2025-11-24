/**
 * ProductExportButton - 商品CSVエクスポート
 */
import { Download } from "lucide-react";
import { useCallback } from "react";

import type { Product } from "../api/products-api";
import { generateProductCsv } from "../utils/product-csv";

import { Button } from "@/components/ui";

interface Props {
  products: Product[];
  size?: "sm" | "default";
}

export function ProductExportButton({ products, size = "default" }: Props) {
  const handleExport = useCallback(() => {
    const csv = generateProductCsv(products);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [products]);

  return (
    <Button variant="outline" size={size} onClick={handleExport} disabled={products.length === 0}>
      <Download className="mr-2 h-4 w-4" />
      エクスポート
    </Button>
  );
}
