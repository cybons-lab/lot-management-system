// frontend/src/features/orders/components/ForecastSection.tsx
import React from "react";

export default function ForecastSection({
  productCode,
}: {
  productCode?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border-t mt-4 pt-3">
      <div className="flex items-center justify-between">
        <button
          className="text-sm underline"
          onClick={() => setOpen((v) => !v)}>
          フォーキャストを見る
        </button>
        <a
          href={`/forecast?product=${encodeURIComponent(productCode ?? "")}`}
          className="text-xs underline text-muted-foreground">
          別ページで開く
        </a>
      </div>
      {open && (
        <div className="mt-3 rounded-lg border p-3 text-sm text-muted-foreground">
          将来的に製品別の見込み数量を表示（API結線予定）
        </div>
      )}
    </div>
  );
}
